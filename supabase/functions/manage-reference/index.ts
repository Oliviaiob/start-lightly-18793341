import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "compliance-documents";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Identify actor for audit fields
    const authHeader = req.headers.get("Authorization") || "";
    let actorId: string | null = null;
    let actorName: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token);
      if (u?.user) {
        actorId = u.user.id;
        const { data: prof } = await admin
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", actorId)
          .maybeSingle();
        if (prof) actorName = [prof.first_name, prof.last_name].filter(Boolean).join(" ") || null;
      }
    }

    const contentType = req.headers.get("content-type") || "";
    let action = "";
    let reference_id = "";
    let payload: Record<string, unknown> = {};
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      action = String(form.get("action") || "");
      reference_id = String(form.get("reference_id") || "");
      file = form.get("file") as File | null;
    } else {
      const body = await req.json();
      action = body.action;
      reference_id = body.reference_id;
      payload = body;
    }

    if (!action || !reference_id) throw new Error("action and reference_id required");

    const { data: ref, error: refErr } = await admin
      .from("references")
      .select("*, candidates!candidate_id(first_name, last_name)")
      .eq("id", reference_id)
      .single();
    if (refErr || !ref) throw new Error("Reference not found");

    const logEvent = async (event_type: string, metadata: Record<string, unknown> = {}) => {
      await admin.from("reference_activity_log").insert({
        reference_id, event_type, actor_id: actorId, actor_name: actorName, metadata,
      });
    };

    switch (action) {
      case "manual_upload": {
        if (!file) throw new Error("file required");
        const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
        const path = `references/${ref.candidate_id}/${reference_id}-${Date.now()}.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
          contentType: file.type || "application/octet-stream", upsert: true,
        });
        if (upErr) throw upErr;

        await admin.from("references").update({
          document_path: path,
          document_file_name: file.name,
          document_uploaded_at: new Date().toISOString(),
          document_uploaded_by: actorId,
          status: "received",
          received_at: ref.received_at ?? new Date().toISOString(),
        }).eq("id", reference_id);

        await logEvent("manual_upload", { file_name: file.name, uploaded_by: actorName });
        return json({ success: true, path });
      }

      case "get_document_url": {
        if (!ref.document_path) throw new Error("No document");
        const { data, error } = await admin.storage.from(BUCKET)
          .createSignedUrl(ref.document_path, 60 * 10);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }

      case "run_ai_review": {
        await admin.from("references").update({ ai_review_status: "running" }).eq("id", reference_id);

        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

        const cand = ref.candidates as { first_name?: string | null; last_name?: string | null } | null;
        const candidateName = `${cand?.first_name ?? ""} ${cand?.last_name ?? ""}`.trim() || "the candidate";

        // Build context from stored response fields (structured referee submission).
        const responseContext = {
          relationship: ref.response_relationship,
          known_duration: ref.response_known_duration,
          honesty_rating: ref.response_honesty_rating,
          teamwork_rating: ref.response_teamwork_rating,
          conduct_rating: ref.response_conduct_rating,
          suitable_for_children: ref.response_suitable_for_children,
          suitability_notes: ref.response_suitability_notes,
          disciplinary_awareness: ref.response_disciplinary_awareness,
          disciplinary_notes: ref.response_disciplinary_notes,
          additional_comments: ref.response_additional_comments,
        };

        const prompt = `You are reviewing a ${ref.ref_type} reference for ${candidateName} from referee ${ref.referee_name} (${ref.company_name ?? "no company"}). Assess suitability for childcare work. Return strict JSON only: {"verdict":"pass"|"flag"|"fail","summary":"1-2 sentence summary","concerns":["..."],"strengths":["..."]}. Reference data: ${JSON.stringify(responseContext)}`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!aiRes.ok) {
          const t = await aiRes.text();
          await admin.from("references").update({ ai_review_status: "failed" }).eq("id", reference_id);
          throw new Error(`AI review failed: ${t}`);
        }
        const aiJson = await aiRes.json();
        const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
        let parsed: unknown = null;
        try {
          const match = content.match(/\{[\s\S]*\}/);
          parsed = match ? JSON.parse(match[0]) : { summary: content };
        } catch { parsed = { summary: content }; }

        await admin.from("references").update({
          ai_review_status: "complete",
          ai_review_result: parsed,
          ai_reviewed_at: new Date().toISOString(),
        }).eq("id", reference_id);

        await logEvent("ai_review", { result: parsed });
        return json({ success: true, result: parsed });
      }

      case "set_notes": {
        const notes = String(payload.notes ?? "");
        await admin.from("references").update({ recruiter_notes: notes }).eq("id", reference_id);
        return json({ success: true });
      }

      case "approve": {
        await admin.from("references").update({
          approval_status: "approved",
          approved_by: actorId,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        }).eq("id", reference_id);
        await logEvent("approved", { by: actorName });
        return json({ success: true });
      }

      case "reject": {
        const reason = String(payload.reason ?? "");
        await admin.from("references").update({
          approval_status: "rejected",
          approved_by: actorId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        }).eq("id", reference_id);
        await logEvent("rejected", { by: actorName, reason });
        return json({ success: true });
      }

      case "reset_approval": {
        await admin.from("references").update({
          approval_status: null, approved_by: null, approved_at: null, rejection_reason: null,
        }).eq("id", reference_id);
        await logEvent("approval_reset", { by: actorName });
        return json({ success: true });
      }

      case "get_activity": {
        const { data } = await admin.from("reference_activity_log")
          .select("*").eq("reference_id", reference_id)
          .order("created_at", { ascending: false });
        return json({ activity: data ?? [] });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
