import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { first_name, last_name, qualification_level, current_position, current_employer, qualifications_text } = await req.json();
    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are writing a professional CV for a childcare/early years recruitment agency called SOAR Staffing Group.

Candidate details:
- Name: ${first_name} ${last_name}
- Qualification: ${qualification_level || "Not specified"}
- Current/Recent Role: ${current_position || "Not specified"}
- Current/Recent Employer: ${current_employer || "Not specified"}
- Additional qualifications: ${qualifications_text || "None"}

Return ONLY a valid JSON object with these fields:
{
  "profile_summary": "3-4 sentence professional profile summary in third person. Highlight their childcare experience, qualification, and career motivation. Do not use asterisks or markdown.",
  "availability_text": "1 short sentence about their availability and what they are seeking.",
  "employment_description": "2-3 sentence description of their responsibilities in their current/most recent role.",
  "skills": ["8 relevant childcare/early years skills as short phrases, no more than 4 words each"]
}

Return ONLY the JSON object, no other text.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
