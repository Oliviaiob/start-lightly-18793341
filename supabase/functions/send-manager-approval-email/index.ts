import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { submission_id } = await req.json();
    if (!submission_id) return new Response(JSON.stringify({ error: "submission_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Fetch submission + candidate + client
    const { data: sub, error: subErr } = await supabase
      .from("timesheet_submissions")
      .select("*, candidates(first_name, last_name), clients(name, contact_email, contact_name)")
      .eq("id", submission_id)
      .single();
    if (subErr || !sub) return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    // Refresh token + set expiry
    const token = sub.manager_approval_token ?? crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const managerEmail = sub.manager_email ?? sub.clients?.contact_email;
    if (!managerEmail) return new Response(JSON.stringify({ error: "No manager email on record" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    await supabase.from("timesheet_submissions").update({
      manager_approval_token: token,
      manager_approval_token_expires_at: expires,
      manager_email: managerEmail,
      status: "awaiting_manager",
      approval_method: "email_link",
      updated_at: new Date().toISOString(),
    }).eq("id", submission_id);

    // Log
    await supabase.from("timesheet_status_log").insert({
      submission_id, previous_status: sub.status, new_status: "awaiting_manager",
      changed_by: "crm_staff", note: `Approval email sent to ${managerEmail}`,
    });

    const candidateName = `${sub.candidates?.first_name ?? ""} ${sub.candidates?.last_name ?? ""}`.trim();
    const weekLabel = new Date(sub.week_ending).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const approvalUrl = `https://app.soarrecruitment.co.uk/timesheet-approval/${token}`;

    // Shift count
    const { count } = await supabase.from("timesheet_submission_shifts").select("id", { count: "exact", head: true }).eq("submission_id", submission_id);

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    const emailHtml = `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8f9fc;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:#0a1628;padding:28px 32px;">
    <div style="color:#5eead4;font-weight:700;font-size:18px;letter-spacing:0.05em;">SOAR RECRUITMENT</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Timesheet approval request</div>
  </div>
  <div style="padding:32px;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 8px;">Hi ${sub.clients?.contact_name ?? "there"},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#0f172a;">${candidateName}</strong> has submitted their timesheet for your review and approval.
    </p>
    <div style="background:#f8f9fc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#64748b;padding:4px 0;">Setting</td><td style="color:#0f172a;font-weight:500;text-align:right;">${sub.clients?.name}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Role</td><td style="color:#0f172a;font-weight:500;text-align:right;">${sub.role ?? "—"}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Week ending</td><td style="color:#0f172a;font-weight:500;text-align:right;">${weekLabel}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Booking ref</td><td style="color:#0f172a;font-weight:500;font-family:monospace;text-align:right;">${sub.booking_reference ?? "—"}</td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Shifts</td><td style="color:#0f172a;font-weight:500;text-align:right;">${count ?? "—"}</td></tr>
      </table>
    </div>
    <a href="${approvalUrl}" style="display:block;text-align:center;background:#14b8a6;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:20px;">
      Review &amp; approve timesheet →
    </a>
    <p style="color:#94a3b8;font-size:11px;text-align:center;line-height:1.5;margin:0;">
      This link is secure and unique to you. Please do not share it.<br>
      It will expire on ${new Date(expires).toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" })}.
    </p>
  </div>
  <div style="background:#f8f9fc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">SOAR Recruitment · <a href="mailto:hello@soarrecruitment.co.uk" style="color:#14b8a6;">hello@soarrecruitment.co.uk</a></p>
  </div>
</div>
</body></html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SOAR Recruitment <noreply@soarrecruitment.co.uk>",
        to: [managerEmail],
        subject: `Timesheet approval request — ${candidateName} · Week ending ${weekLabel}`,
        html: emailHtml,
      }),
    });

    return new Response(JSON.stringify({ ok: true, sent_to: managerEmail }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
