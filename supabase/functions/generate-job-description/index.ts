import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { title, qualification_required, location, salary_min, salary_max, hours, room, description, client_name, existing_description, instruction } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const salaryStr = salary_min && salary_max ? `£${salary_min.toLocaleString()} – £${salary_max.toLocaleString()}` : salary_min ? `£${salary_min.toLocaleString()}` : "";
    const context = [
      `Job title: ${title}`,
      qualification_required && `Qualification required: ${qualification_required.replace(/_/g," ")}`,
      location && `Location: ${location}`,
      salaryStr && `Salary: ${salaryStr}`,
      hours && `Hours: ${hours}`,
      room && `Room/setting: ${room}`,
      client_name && `Setting/employer: ${client_name}`,
      description && `Job details: ${description}`,
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: `You are a recruitment consultant at SOAR Recruitment writing a job advert for a childcare/early years role. 

Write in SOAR's voice — warm, enthusiastic, personal, encouraging. Follow this structure exactly:

1. Opening paragraph (2-3 sentences): Describe the ideal candidate with enthusiasm. Start with something like "We are seeking candidates who are passionate about early childhood education..."
2. Setting description (1-2 sentences): Describe the setting positively. E.g. "This beautiful outstanding setting offers their staff, support, career progression, rewards and so much more!"
3. Personal recruiter line (1 sentence): E.g. "I am very excited to be recruiting for exceptional childcare professionals to join their amazing team..."
4. "Benefits:" heading followed by 6-8 bullet points of realistic benefits for this type of role
5. "Responsibilities:" heading followed by 6-8 bullet points relevant to the role
6. "Requirements:" heading followed by 4-6 bullet points
7. Closing line: "For more information regarding this position, get in touch!"

Use plain text with no markdown formatting except for the section headings (write them as "Benefits:", "Responsibilities:", "Requirements:" on their own lines). Use line breaks between sections. Keep bullet points as plain hyphens (- item).

Job details:
${context}`,
        }],
      }),
    });

    const ai = await resp.json();
    const text = ai?.content?.[0]?.text?.trim() ?? "";
    return new Response(JSON.stringify({ success: true, description: text }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
