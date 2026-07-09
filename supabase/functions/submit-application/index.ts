import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const form = await req.formData();
    const jobId        = form.get("job_id") as string;
    const jobRef       = form.get("job_reference") as string;
    const firstName    = (form.get("first_name") as string ?? "").trim();
    const lastName     = (form.get("last_name") as string ?? "").trim();
    const email        = (form.get("email") as string ?? "").trim().toLowerCase();
    const phone        = (form.get("phone") as string ?? "").trim();
    const postcode     = (form.get("postcode") as string ?? "").trim().toUpperCase();
    const qualification = form.get("qualification_level") as string ?? null;
    const coverNote    = form.get("cover_note") as string ?? null;
    const source       = form.get("source") as string ?? "jobs_site";
    const cvFile       = form.get("cv") as File | null;

    if (!firstName || !lastName || !email || !phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deduplication ─────────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("candidates")
      .select("id, first_name, last_name")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    let candidateId: string;
    let isNew = false;

    if (existing) {
      // Existing candidate — update any missing fields, don't overwrite
      candidateId = existing.id;
      await supabase.from("candidates").update({
        postcode: postcode || undefined,
        qualification_level: qualification || undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", candidateId);
    } else {
      // New candidate
      const { data: newCand, error: candErr } = await supabase
        .from("candidates")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          postcode: postcode || null,
          qualification_level: qualification || null,
          status: "not_contacted",
          candidate_type: "perm",
          source: source === "jobs_site" ? "jobs_site" : "job_board",
        })
        .select("id")
        .single();

      if (candErr) throw new Error(`Failed to create candidate: ${candErr.message}`);
      candidateId = newCand.id;
      isNew = true;
    }

    // ── Upload CV ──────────────────────────────────────────────────────────────
    let cvUrl: string | null = null;
    if (cvFile && cvFile.size > 0) {
      const ext = cvFile.name.split(".").pop() ?? "pdf";
      const path = `applications/${candidateId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("cvs")
        .upload(path, cvFile, { contentType: cvFile.type, upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("cvs").getPublicUrl(path);
        cvUrl = urlData.publicUrl;

        // Save to candidate_documents
        await supabase.from("candidate_documents").upsert({
          candidate_id: candidateId,
          document_type: "cv",
          file_url: cvUrl,
          file_name: cvFile.name,
          status: "pending",
          uploaded_at: new Date().toISOString(),
        }, { onConflict: "candidate_id,document_type" });
      }
    }

    // ── Record application ─────────────────────────────────────────────────────
    await supabase.from("candidate_applications").insert({
      candidate_id: candidateId,
      job_id: jobId || null,
      job_reference: jobRef || null,
      source,
      notes: coverNote || null,
      applied_at: new Date().toISOString(),
    });

    // ── Workflow state ─────────────────────────────────────────────────────────
    await supabase.from("workflow_states").upsert({
      entity_type: "candidate",
      entity_id: candidateId,
      item_key: "inbound_application",
      current_status: "not_contacted",
      last_activity_at: new Date().toISOString(),
      last_activity_desc: `Inbound application: ${jobRef ?? "direct"} via ${source}`,
    }, { onConflict: "entity_type,entity_id,item_key" });

    return new Response(
      JSON.stringify({ success: true, candidateId, isNew }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-application error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
