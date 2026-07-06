import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { job, candidates } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const jobSummary = [
      `Title: ${job.title}`,
      job.qualification_required && `Qualification required: ${job.qualification_required.replace(/_/g," ")}`,
      job.location && `Location: ${job.location}`,
      job.hours && `Hours: ${job.hours}`,
      job.room && `Room/setting: ${job.room}`,
      job.description && `Description: ${job.description.slice(0, 800)}`,
    ].filter(Boolean).join("\n");

    const candidateList = candidates.map((c: any, i: number) =>
      `[${i}] ID:${c.id} | ${c.name} | Position: ${c.current_position ?? "—"} | Employer: ${c.current_employer ?? "—"} | Quals: ${c.qualifications_text ?? "—"} | Notes: ${c.notes ?? "—"} | Availability: ${c.availability_notes ?? "—"} | Commute: ${c.commute_radius ?? "—"}`
    ).join("\n");

    const prompt = `You are a specialist early years recruitment consultant. Score each candidate's suitability for this job based on their experience, skills, preferences and notes.

JOB:
${jobSummary}

CANDIDATES:
${candidateList}

For each candidate return a JSON array with objects:
{ "id": "<candidate id>", "ai_score": <0-100>, "reason": "<1 sentence why>", "highlights": ["<key strength 1>", "<key strength 2>"] }

Score based on: relevant childcare experience, role-specific skills, location/commute fit, stated preferences, qualifications text. Be discerning — not everyone is a strong match.
Return ONLY the JSON array, no other text.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const ai = await resp.json();
    const raw = ai?.content?.[0]?.text?.trim() ?? "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ success: true, scores }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
