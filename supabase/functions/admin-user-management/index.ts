import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserSnapshot {
  profile_role: string | null;
  is_active: boolean | null;
  is_ai: boolean | null;
  user_roles: string[];
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Service-role client for all DB operations
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identify caller from their JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authErr } = await callerClient.auth.getUser();
  if (!user || authErr) return respond({ error: "Unauthorized" }, 401);

  const callerId = user.id;

  // All actions require Owner role — verified server-side
  const { data: callerRoleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);

  if (!callerRoleRows?.some((r: { role: string }) => r.role === "owner")) {
    return respond({ error: "Owner access required" }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return respond({ error: "Invalid JSON body" }, 400); }

  const { action } = body;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async function getSnapshot(userId: string): Promise<UserSnapshot> {
    const [{ data: p }, { data: r }] = await Promise.all([
      admin.from("profiles").select("role, is_active, is_ai").eq("id", userId).single(),
      admin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      profile_role: (p as any)?.role ?? null,
      is_active:    (p as any)?.is_active ?? null,
      is_ai:        (p as any)?.is_ai ?? null,
      user_roles:   ((r ?? []) as any[]).map((x: any) => x.role),
    };
  }

  async function writeAudit(
    auditAction: string,
    targetId: string,
    before: UserSnapshot,
    after: UserSnapshot,
    note?: string,
  ) {
    await admin.from("role_change_audit").insert({
      changed_by:       callerId,
      target_user:      targetId,
      action:           auditAction,
      old_profile_role: before.profile_role,
      new_profile_role: after.profile_role,
      old_user_roles:   before.user_roles,
      new_user_roles:   after.user_roles,
      old_is_active:    before.is_active,
      new_is_active:    after.is_active,
      old_is_ai:        before.is_ai,
      new_is_ai:        after.is_ai,
      note:             note ?? null,
    });
  }

  async function aiConfirmationRequired(targetId: string, confirmFlag: unknown): Promise<boolean> {
    const { data: p } = await admin.from("profiles").select("is_ai").eq("id", targetId).single();
    if ((p as any)?.is_ai && !confirmFlag) return true;
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST USERS
  // Returns all accounts enriched with auth metadata, roles, and linked records
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "list_users") {
    const { data: authData, error: authListErr } =
      await admin.auth.admin.listUsers({ perPage: 1000 });
    if (authListErr) return respond({ error: authListErr.message }, 500);

    const [{ data: profiles }, { data: roleRows }, { data: candidates }] = await Promise.all([
      admin.from("profiles").select("id, first_name, last_name, display_name, email, role, is_active, is_ai"),
      admin.from("user_roles").select("user_id, role"),
      admin.from("candidates").select("id, candidate_user_id, first_name, last_name"),
    ]);

    const profileMap = new Map(((profiles ?? []) as any[]).map((p: any) => [p.id, p]));

    const rolesMap = new Map<string, string[]>();
    ((roleRows ?? []) as any[]).forEach(({ user_id, role }: any) => {
      const arr = rolesMap.get(user_id) ?? [];
      arr.push(role);
      rolesMap.set(user_id, arr);
    });

    const candidateMap = new Map(
      ((candidates ?? []) as any[]).map((c: any) => [
        c.candidate_user_id,
        {
          id: c.id,
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
        },
      ])
    );

    const users = authData.users.map((au: any) => {
      const p: any = profileMap.get(au.id) ?? {};
      const roles = rolesMap.get(au.id) ?? [];
      const isOwner   = roles.includes("owner");
      const isCrmStaff = roles.includes("admin");
      const isAi      = p.is_ai ?? false;

      let displayRole = "User";
      if (isOwner)         displayRole = "Owner";
      else if (isCrmStaff) displayRole = isAi ? "Recruiter AI" : "Recruiter";

      const firstName = p.first_name ?? "";
      const lastName  = p.last_name  ?? "";

      return {
        id:               au.id,
        email:            au.email ?? "",
        first_name:       firstName,
        last_name:        lastName,
        display_name:     p.display_name ?? `${firstName} ${lastName}`.trim() || au.email,
        profile_role:     p.role ?? "candidate",
        display_role:     displayRole,
        user_roles:       roles,
        is_ai:            isAi,
        is_active:        p.is_active ?? true,
        is_owner:         isOwner,
        last_sign_in_at:  au.last_sign_in_at ?? null,
        created_at:       au.created_at ?? null,
        linked_candidate: candidateMap.get(au.id) ?? null,
      };
    });

    return respond({ users });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE ROLE
  // Promotes User → Recruiter, or demotes Recruiter → User
  // Atomically updates profiles.role AND user_roles
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "change_role") {
    const targetId = body.target_user_id as string;
    const newRole  = body.new_role as string;
    if (!targetId || !newRole) return respond({ error: "Missing target_user_id or new_role" }, 400);

    if (await aiConfirmationRequired(targetId, body.confirm_ai_change)) {
      return respond({ error: "AI_CONFIRMATION_REQUIRED" }, 422);
    }

    const { data: tp } = await admin.from("profiles")
      .select("first_name, last_name")
      .eq("id", targetId)
      .single();

    const before = await getSnapshot(targetId);

    if (newRole === "recruiter") {
      const name = `${(tp as any)?.first_name ?? ""}${(tp as any)?.last_name ?? ""}`.trim();
      if (!name) return respond({ error: "INCOMPLETE_PROFILE" }, 422);

      await admin.from("profiles").update({ role: "recruiter" }).eq("id", targetId);
      await admin.from("user_roles").delete().eq("user_id", targetId).eq("role", "user");
      await admin.from("user_roles")
        .upsert({ user_id: targetId, role: "admin" }, { onConflict: "user_id,role" });

    } else if (newRole === "user") {
      if (targetId === callerId) return respond({ error: "Cannot demote your own account" }, 400);

      await admin.from("profiles").update({ role: "candidate" }).eq("id", targetId);
      await admin.from("user_roles").delete().eq("user_id", targetId).eq("role", "admin");
      await admin.from("user_roles")
        .upsert({ user_id: targetId, role: "user" }, { onConflict: "user_id,role" });

    } else {
      return respond({ error: "Invalid new_role. Valid values: recruiter, user" }, 400);
    }

    const after = await getSnapshot(targetId);
    await writeAudit("role_changed", targetId, before, after, body.note as string | undefined);
    return respond({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGN OWNER — adds 'owner' role; also ensures 'admin' is present
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "assign_owner") {
    const targetId = body.target_user_id as string;
    if (!targetId) return respond({ error: "Missing target_user_id" }, 400);

    if (await aiConfirmationRequired(targetId, body.confirm_ai_change)) {
      return respond({ error: "AI_CONFIRMATION_REQUIRED" }, 422);
    }

    const before = await getSnapshot(targetId);
    await admin.from("user_roles").upsert({ user_id: targetId, role: "owner" }, { onConflict: "user_id,role" });
    await admin.from("user_roles").upsert({ user_id: targetId, role: "admin" }, { onConflict: "user_id,role" });
    const after = await getSnapshot(targetId);
    await writeAudit("owner_assigned", targetId, before, after, body.note as string | undefined);
    return respond({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVOKE OWNER — removes 'owner' role; keeps 'admin' so they remain a recruiter
  // Blocked if: caller is target, or this would remove the last owner
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "revoke_owner") {
    const targetId = body.target_user_id as string;
    if (!targetId) return respond({ error: "Missing target_user_id" }, 400);
    if (targetId === callerId) return respond({ error: "Cannot revoke your own Owner access" }, 400);

    const { data: ownerRows } = await admin.from("user_roles").select("user_id").eq("role", "owner");
    if ((ownerRows?.length ?? 0) <= 1) {
      return respond({ error: "Cannot remove the last Owner. Assign another Owner first." }, 400);
    }

    const before = await getSnapshot(targetId);
    await admin.from("user_roles").delete().eq("user_id", targetId).eq("role", "owner");
    const after = await getSnapshot(targetId);
    await writeAudit("owner_revoked", targetId, before, after, body.note as string | undefined);
    return respond({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET ACTIVE / INACTIVE — soft deactivation; no permanent deletion
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "set_active") {
    const targetId  = body.target_user_id as string;
    const isActive  = body.is_active as boolean;
    if (!targetId)                    return respond({ error: "Missing target_user_id" }, 400);
    if (typeof isActive !== "boolean") return respond({ error: "Missing is_active boolean" }, 400);
    if (targetId === callerId)         return respond({ error: "Cannot change your own active status" }, 400);

    if (await aiConfirmationRequired(targetId, body.confirm_ai_change)) {
      return respond({ error: "AI_CONFIRMATION_REQUIRED" }, 422);
    }

    const before = await getSnapshot(targetId);
    await admin.from("profiles").update({ is_active: isActive }).eq("id", targetId);
    const after = await getSnapshot(targetId);
    await writeAudit(
      isActive ? "reactivated" : "deactivated",
      targetId, before, after,
      body.note as string | undefined,
    );
    return respond({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET IS_AI — toggle AI flag; always requires explicit confirmation
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "set_is_ai") {
    const targetId = body.target_user_id as string;
    const isAi     = body.is_ai as boolean;
    if (!targetId)                  return respond({ error: "Missing target_user_id" }, 400);
    if (typeof isAi !== "boolean")  return respond({ error: "Missing is_ai boolean" }, 400);
    if (!body.confirm_ai_change)    return respond({ error: "AI_CONFIRMATION_REQUIRED" }, 422);

    const before = await getSnapshot(targetId);
    await admin.from("profiles").update({ is_ai: isAi }).eq("id", targetId);
    const after = await getSnapshot(targetId);
    await writeAudit("ai_flag_changed", targetId, before, after, body.note as string | undefined);
    return respond({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE PROFILE NAME — used when profile is incomplete before promotion
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === "update_profile_name") {
    const targetId  = body.target_user_id as string;
    const firstName = body.first_name as string | undefined;
    const lastName  = body.last_name  as string | undefined;
    if (!targetId)              return respond({ error: "Missing target_user_id" }, 400);
    if (!firstName && !lastName) return respond({ error: "Nothing to update" }, 400);

    const updates: Record<string, string> = {};
    if (firstName) updates.first_name = firstName;
    if (lastName)  updates.last_name  = lastName;

    const before = await getSnapshot(targetId);
    await admin.from("profiles").update(updates).eq("id", targetId);
    const after = await getSnapshot(targetId);
    await writeAudit(
      "profile_name_updated", targetId, before, after,
      `Name set to: ${firstName ?? ""} ${lastName ?? ""}`.trim(),
    );
    return respond({ success: true });
  }

  return respond({ error: `Unknown action: ${String(action)}` }, 400);
});
