import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const tools = [
  {
    name: "search_candidates",
    description: "Search for candidates based on qualification, location, availability, type (temp/perm), or keywords.",
    input_schema: {
      type: "object",
      properties: {
        candidate_type: { type: "string", enum: ["temp", "perm", "both", "any"] },
        qualification_level: { type: "string", description: "e.g. level_2, level_3, level_6, eyts, qts" },
        location: { type: "string", description: "Town, city or postcode area" },
        available_date: { type: "string", description: "ISO date YYYY-MM-DD or relative: today, tomorrow, weekday name" },
        max_miles: { type: "number" },
        keywords: { type: "string", description: "Keywords to match across candidate profiles" },
        similar_to: { type: "string", description: "Find candidates similar to this named candidate" },
        summary: { type: "string", description: "Friendly sentence Sammie says in chat" },
        search_bullets: { type: "array", items: { type: "string" }, description: "3-4 bullet points summarising criteria" }
      },
      required: ["summary"]
    }
  },
  {
    name: "search_jobs",
    description: "Search for jobs or vacancies in the CRM.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        location: { type: "string" },
        qualification: { type: "string" },
        keywords: { type: "string" },
        summary: { type: "string" },
        search_bullets: { type: "array", items: { type: "string" } }
      },
      required: ["summary"]
    }
  },
  {
    name: "generate_boolean_search",
    description: "Generate Boolean search strings (broad, standard, perfect) for a job vacancy.",
    input_schema: {
      type: "object",
      properties: {
        job_title: { type: "string" },
        qualification: { type: "string" },
        location: { type: "string" },
        broad: { type: "string" },
        standard: { type: "string" },
        perfect: { type: "string" },
        summary: { type: "string" }
      },
      required: ["summary", "broad", "standard", "perfect"]
    }
  },
  {
    name: "draft_content",
    description: "Draft an email, message or document: interview invitations, job offers, rejections, availability checks, reference requests.",
    input_schema: {
      type: "object",
      properties: {
        content_type: { type: "string", enum: ["interview_invite", "job_offer", "rejection", "availability_check", "reference_request", "general_email", "general_message"] },
        recipient_name: { type: "string" },
        subject: { type: "string" },
        draft_body: { type: "string" },
        summary: { type: "string" }
      },
      required: ["draft_body", "summary"]
    }
  }
];

const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SYSTEM_PROMPT = `You are Sammie, SOAR Recruitment's AI assistant. SOAR is a specialist UK early years and childcare recruitment agency.

Use tools whenever the recruiter wants to find candidates, search jobs, generate boolean searches, or draft communications. For conversational/informational replies, respond with plain text.

When generating boolean searches, write proper Boolean strings with AND, OR, NOT, and quoted phrases tailored to early years/childcare.

When drafting, use warm professional British English suitable for UK recruitment.

UK early years context: qualifications are Level 2, Level 3, EYPS, EYTS, QTS, Level 6. Settings include nurseries, pre-schools, primary schools, SEN, childminders. Key terms: EYFS, Ofsted, safeguarding, DBS, paediatric first aid, keyperson.

Today's date: ${today}. Keep responses concise — recruiters are busy.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2048, system: SYSTEM_PROMPT, tools, messages }),
    });

    const data = await res.json();

    if (data.stop_reason === "tool_use") {
      const toolUse = data.content.find((c: any) => c.type === "tool_use");
      const textContent = data.content.find((c: any) => c.type === "text");
      return new Response(JSON.stringify({ type: toolUse.name, params: toolUse.input, text: textContent?.text || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const textContent = data.content.find((c: any) => c.type === "text");
    return new Response(JSON.stringify({ type: "text", content: textContent?.text || "I'm not sure how to help with that." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
