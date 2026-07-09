import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sub } = await supabase
      .from("timesheet_submissions")
      .select("*, candidates(first_name, last_name), clients(name, contact_name)")
      .eq("manager_approval_token", token)
      .maybeSingle();

    if (!sub) return new Response(JSON.stringify({ error: "link_expired" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if (sub.status !== "awaiting_manager") return new Response(JSON.stringify({ error: "already_actioned" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (sub.manager_approval_token_expires_at && new Date(sub.manager_approval_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "link_expired" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: shifts } = await supabase.from("timesheet_submission_shifts").select("*").eq("submission_id", sub.id).order("shift_date");

    return new Response(JSON.stringify({ submission: sub, shifts: shifts ?? [] }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
