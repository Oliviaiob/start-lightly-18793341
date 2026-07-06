import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { first_name, last_name, current_position, current_employer, qualification_level, qualifications_text, candidate_type } = await req.json();

    const name = [first_name, last_name].filter(Boolean).join(" ");
    const parts: string[] = [];
    if (current_position && current_employer) parts.push(`Currently working as ${current_position} at ${current_employer}.`);
    else if (current_position) parts.push(`Currently working as ${current_position}.`);
    else if (current_employer) parts.push(`Currently working at ${current_employer}.`);
    if (qualification_level) parts.push(`Holds a ${qualification_level.replace(/_/g, " ")} qualification.`);
    if (qualifications_text) parts.push(`Additional detail: ${qualifications_text}`);

    const contextStr = parts.length ? parts.join(" ") : "No detailed work history provided.";
    const typeLabel = (candidate_type || "").toLowerCase().includes("temp") ? "early years / childcare" : "professional";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `Write a 1–2 sentence professional recruiter summary for a ${typeLabel} candidate named ${name}. Be specific and concrete. Do not use filler phrases like "dedicated professional". Context: ${contextStr}`,
        }],
      }),
    });

    const ai = await resp.json();
    const summary = ai?.content?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
