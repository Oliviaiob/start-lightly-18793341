import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) throw new Error("pdf_base64 is required");

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdf_base64 },
          } as any,
          {
            type: "text",
            text: `Extract candidate information from this CV/resume and return ONLY a valid JSON object. Use null for any field not found.

{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "town": "",
  "postcode": "",
  "current_position": "",
  "current_employer": "",
  "qualification_level": "",
  "qualifications_text": ""
}

For qualification_level pick the closest match from: unqualified, level_2, level_3, room_leader, deputy_manager, manager — or leave null.
For qualifications_text write a brief summary of all qualifications and certifications listed.
Return ONLY the JSON object, no other text.`,
          },
        ],
      }],
    });

    const raw = (response.content[0] as any).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const extracted = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
