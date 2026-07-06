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
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdf_base64 },
          } as any,
          {
            type: "text",
            text: `Extract all candidate information from this registration form and return ONLY a valid JSON object with these exact keys. Use null for any field not found. For arrays, use [] if not found. For dates use YYYY-MM-DD format.

{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "date_of_birth": "",
  "postcode": "",
  "address_line_1": "",
  "city": "",
  "ni_number": "",
  "qualification_level": "",
  "experience_summary": "",
  "has_vehicle": false,
  "has_dbs": false,
  "dbs_update_service": false,
  "dbs_certificate_number": "",
  "preferred_fields": [],
  "available_days": [],
  "shift_types_available": [],
  "work_referee_1": {
    "referee_name": "",
    "referee_email": "",
    "referee_phone": "",
    "company_name": "",
    "referee_job_title": "",
    "candidate_position": "",
    "employment_start": "",
    "employment_end": "",
    "reason_for_leaving": ""
  },
  "work_referee_2": {
    "referee_name": "",
    "referee_email": "",
    "referee_phone": "",
    "company_name": "",
    "referee_job_title": "",
    "candidate_position": "",
    "employment_start": "",
    "employment_end": "",
    "reason_for_leaving": ""
  },
  "character_referee": {
    "referee_name": "",
    "referee_email": "",
    "referee_phone": "",
    "company_name": "",
    "relationship": ""
  }
}

Return ONLY the JSON object, no other text.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Strip any markdown code fences
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const extracted = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
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
