import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886"; // Twilio sandbox default

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { candidate_id, recruiter_id, content, channel, candidate_phone } = await req.json();

    let whatsapp_message_sid: string | null = null;
    let status = "sent";

    // Send via WhatsApp if requested and Twilio is configured
    if (channel === "whatsapp" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && candidate_phone) {
      const toNumber = candidate_phone.startsWith("whatsapp:") ? candidate_phone : `whatsapp:${candidate_phone}`;
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: new URLSearchParams({
            From: TWILIO_WHATSAPP_FROM,
            To: toNumber,
            Body: content,
          }),
        }
      );
      const twilioData = await twilioRes.json();
      if (twilioData.sid) {
        whatsapp_message_sid = twilioData.sid;
      } else {
        status = "failed";
        console.error("Twilio error:", twilioData);
      }
    }

    // Store message in DB
    const { data, error } = await supabase.from("messages").insert({
      candidate_id,
      recruiter_id,
      content,
      direction: "outbound",
      channel: channel ?? "internal",
      status,
      whatsapp_message_sid,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ message: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
