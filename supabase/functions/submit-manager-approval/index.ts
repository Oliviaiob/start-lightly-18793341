import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, manager_name, manager_position, manager_signature } = await req.json();
    if (!token || !manager_name || !manager_signature) {
      return new Response(JSON.stringify({ error: "token, manager_name and manager_signature required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sub } = await supabase
      .from("timesheet_submissions")
      .select("id, status, manager_approval_token_expires_at, status_history")
      .eq("manager_approval_token", token)
      .maybeSingle();

    if (!sub) return new Response(JSON.stringify({ error: "link_expired" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if (sub.status !== "awaiting_manager") return new Response(JSON.stringify({ error: "already_actioned" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (sub.manager_approval_token_expires_at && new Date(sub.manager_approval_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "link_expired" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Calculate total hours
    const { data: shifts } = await supabase.from("timesheet_submission_shifts").select("*").eq("submission_id", sub.id);
    let totalMins = 0; let totalBreak = 0;
    (shifts ?? []).forEach((s: any) => {
      if (s.submitted_start && s.submitted_end) {
        const [sh, sm] = s.submitted_start.split(":").map(Number);
        const [eh, em] = s.submitted_end.split(":").map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
        totalBreak += s.break_minutes ?? 0;
      }
    });
    const totalHours = Math.max(0, (totalMins - totalBreak) / 60);

    const now = new Date().toISOString();
    await supabase.from("timesheet_submissions").update({
      manager_name, manager_position: manager_position ?? null, manager_signature,
      manager_signed_at: now, status: "submitted_to_soar",
      approval_method: "email_link",
      total_submitted_hours: Math.round(totalHours * 100) / 100,
      total_break_minutes: totalBreak,
      status_history: [...((sub.status_history as unknown[]) ?? []), { status: "submitted_to_soar", changed_at: now, changed_by: "manager" }],
      updated_at: now,
    }).eq("id", sub.id);

    await supabase.from("timesheet_status_log").insert({
      submission_id: sub.id, previous_status: "awaiting_manager", new_status: "submitted_to_soar",
      changed_by: "manager", note: `Approved by ${manager_name}`,
    });

    // Check for discrepancies
    const hasDisc = (shifts ?? []).some((s: any) =>
      s.submitted_start !== s.scheduled_start || s.submitted_end !== s.scheduled_end
    );
    if (hasDisc) {
      await supabase.from("timesheet_submissions").update({ hours_discrepancy: true }).eq("id", sub.id);
      for (const s of (shifts ?? []) as any[]) {
        if (s.submitted_start !== s.scheduled_start || s.submitted_end !== s.scheduled_end) {
          await supabase.from("timesheet_submission_shifts").update({ hours_discrepancy_flagged: true }).eq("id", s.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, manager_name }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
