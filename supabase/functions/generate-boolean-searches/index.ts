import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, qualification_required, location_postcode, description, room, hours } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const jobContext = [
      title && `Job title: ${title}`,
      qualification_required && `Qualification required: ${qualification_required.replace(/_/g, " ")}`,
      location_postcode && `Location: ${location_postcode}`,
      room && `Room/setting: ${room}`,
      hours && `Hours: ${hours}`,
      description && `Description: ${description}`,
    ].filter(Boolean).join("\n");

    const prompt = `You are a specialist early years / childcare recruitment consultant building LinkedIn and job board boolean search strings.

Job details:
${jobContext}

Generate exactly 3 boolean search strings:
1. BROAD - wide net, just the core role type and sector keywords
2. STANDARD - role + qualification level + location area
3. PERFECT MATCH - highly specific, full qualification + experience + location + any key requirements

Rules:
- Use standard boolean operators: AND, OR, NOT, parentheses, quotes for exact phrases
- Keep strings practical for LinkedIn Recruiter or CV-Library
- Do not include explanations, just the search strings
- Return as JSON: { "broad": "...", "standard": "...", "perfect": "..." }`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const ai = await resp.json();
    const raw = ai?.content?.[0]?.text?.trim() ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify({ success: true, searches: parsed }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
