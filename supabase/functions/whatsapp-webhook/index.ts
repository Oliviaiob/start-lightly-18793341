import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio sends form-encoded POST — no CORS needed, no auth header
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.text();
    const params = new URLSearchParams(body);
    const from = params.get("From") ?? "";       // e.g. whatsapp:+447700900123
    const messageBody = params.get("Body") ?? "";
    const messageSid = params.get("MessageSid") ?? "";

    // Normalise phone number — strip whatsapp: prefix
    const phone = from.replace("whatsapp:", "").trim();

    // Look up candidate by phone
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (candidate) {
      await supabase.from("messages").insert({
        candidate_id: candidate.id,
        content: messageBody,
        direction: "inbound",
        channel: "whatsapp",
        status: "delivered",
        whatsapp_message_sid: messageSid,
      });
    } else {
      // Unknown number — log it so recruiters can see it
      console.log(`Inbound WhatsApp from unknown number: ${phone} — "${messageBody}"`);
    }

    // Twilio expects a TwiML response (can be empty)
    return new Response(`<Response></Response>`, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error(err);
    return new Response(`<Response></Response>`, { headers: { "Content-Type": "text/xml" } });
  }
});
