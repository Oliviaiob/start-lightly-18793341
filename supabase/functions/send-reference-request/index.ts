import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference_id } = await req.json();
    if (!reference_id) throw new Error("reference_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch reference + candidate name
    const { data: ref, error: refErr } = await supabase
      .from("references")
      .select("*, candidates!candidate_id(first_name, last_name)")
      .eq("id", reference_id)
      .single();

    if (refErr || !ref) throw new Error("Reference not found");
    if (!ref.referee_email) throw new Error("No referee email on this reference");

    const cand = ref.candidates as { first_name: string | null; last_name: string | null } | null;
    const candidateName = `${cand?.first_name ?? ""} ${cand?.last_name ?? ""}`.trim() || "our candidate";
    const refTypeLabel = ref.ref_type === "character" ? "Character Reference" : "Work Reference";
    const formUrl = `https://soar-recruitment.lovable.app/reference/${ref.unique_token}`;
    const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@placeholder.com";

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f6f9; margin:0; padding:32px 16px;">
  <div style="max-width:580px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1B2B4B; padding:28px 32px;">
      <h1 style="margin:0; color:#fff; font-size:20px; font-weight:700;">SOAR Recruitment</h1>
      <p style="margin:4px 0 0; color:#2DD4BF; font-size:13px;">Compliance &amp; Reference Team</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1B2B4B; font-size:18px; margin:0 0 16px;">Reference Request — ${refTypeLabel}</h2>
      <p style="color:#374151; font-size:15px; line-height:1.6;">Dear ${ref.referee_name ?? "Referee"},</p>
      <p style="color:#374151; font-size:15px; line-height:1.6;">
        You have been named as a <strong>${refTypeLabel}</strong> for <strong>${candidateName}</strong>,
        who has applied to work with one of our clients through SOAR Recruitment.
      </p>
      <p style="color:#374151; font-size:15px; line-height:1.6;">
        We would be very grateful if you could complete a short online reference form — it takes around 5 minutes.
      </p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${formUrl}"
           style="display:inline-block; background:#2DD4BF; color:#1B2B4B; text-decoration:none;
                  font-weight:700; font-size:15px; padding:14px 32px; border-radius:8px;">
          Complete Reference Form →
        </a>
      </div>
      <p style="color:#6b7280; font-size:12px; word-break:break-all;">
        Or paste this link into your browser:<br>${formUrl}
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">
        This request was sent on behalf of SOAR Recruitment. If you have any questions please reply to this email.
        Your reference will be kept confidential.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ref.referee_email],
        subject: `Reference request for ${candidateName} — SOAR Recruitment`,
        html: emailBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      throw new Error(`Resend API error: ${errText}`);
    }

    // Mark as requested
    await supabase
      .from("references")
      .update({ status: "requested", requested_at: new Date().toISOString() })
      .eq("id", reference_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
