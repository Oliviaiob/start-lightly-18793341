import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdf_base64 } = await req.json();
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
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdf_base64 },
            },
            {
              type: "text",
              text: `Extract job details from this job specification document. Return ONLY valid JSON with these fields:
{
  "title": "job title",
  "client_name": "company/employer name if mentioned",
  "location_postcode": "postcode if mentioned",
  "qualification_required": "one of: unqualified, level_2, level_3, room_leader, deputy_manager, manager — pick the closest match or empty string",
  "salary_min": number or null,
  "salary_max": number or null,
  "hours": "hours description if mentioned",
  "room": "room or setting e.g. Toddler Room, Baby Room",
  "description": "full role description, responsibilities, requirements"
}
Return only the JSON object, no other text.`,
            },
          ],
        }],
      }),
    });

    const ai = await resp.json();
    const raw = ai?.content?.[0]?.text?.trim() ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
