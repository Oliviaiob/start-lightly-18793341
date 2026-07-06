const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const tools = [
  {
    name: "search_candidates",
    description: "Search for candidates based on qualification, location, availability, type (temp/perm), or keywords.",
    input_schema: {
      type: "object",
      properties: {
        candidate_type: { type: "string", enum: ["temp", "perm", "both", "any"] },
        qualification_level: { type: "string" },
        location: { type: "string" },
        available_date: { type: "string" },
        max_miles: { type: "number" },
        keywords: { type: "string" },
        similar_to: { type: "string" },
        summary: { type: "string", description: "Sammie's response shown in chat. Follow the candidate search response format exactly." },
        search_bullets: { type: "array", items: { type: "string" }, description: "3-4 short bullet points summarising criteria. Each starts with an emoji: 📍 for location, 🎓 for qualification, 📅 for date, 👥 for candidate type, 🔑 for keywords." }
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
        summary: { type: "string", description: "Sammie's response shown in chat. Follow the job search response format exactly." },
        search_bullets: { type: "array", items: { type: "string" }, description: "3-4 short bullet points with emojis summarising the search." }
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
        summary: { type: "string", description: "Sammie's response shown in chat. Follow the boolean search response format exactly." }
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
        summary: { type: "string", description: "Sammie's response shown in chat. Follow the draft content response format exactly." }
      },
      required: ["draft_body", "summary"]
    }
  }
];

const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SYSTEM_PROMPT = `You are Sammie, the AI recruitment assistant for SOAR Recruitment — a specialist UK early years and childcare agency. You are warm, confident and direct, like an experienced recruitment colleague. Never sound like a generic chatbot.

RESPONSE STYLE — CRITICAL:
- Always concise. Never write paragraphs.
- Use short bullet points and line breaks to make responses easy to scan.
- Use 2–3 emojis per response maximum — purposefully, not decoratively.
- Every response ends with a clear next-step instruction.
- No filler phrases like "Of course!", "Great question!", "Sure thing!" or "Certainly!".

RESPONSE FORMATS — follow these exactly:

CANDIDATE SEARCH (use search_candidates tool, set summary to):
"🔎 Search complete!
[X] candidates found

• [emoji] [criterion 1]
• [emoji] [criterion 2]
• [emoji] [criterion 3]

⭐ Ranked by match score — results are in the panel →"

JOB SEARCH (use search_jobs tool, set summary to):
"💼 [X] jobs found

• [emoji] [criterion 1]
• [emoji] [criterion 2]

📋 Results are in the panel →"

BOOLEAN SEARCH (use generate_boolean_search tool, set summary to):
"✅ Three Boolean searches generated

• Perfect Match • Expanded Search • Broad Search

📋 Ready to copy from the panel →"

DRAFT CONTENT (use draft_content tool, set summary to):
"✉️ Your [message type] is ready

• [key detail 1] • [key detail 2]

👀 Review and edit before sending — it's in the panel →"

CONVERSATIONAL REPLIES (no tool needed):
- Short, direct, warm. 1–3 sentences max.
- No bullet points unless listing actual items.
- Never use more than 1 emoji for conversational replies.

TOOL USAGE:
- Find/search/show candidates → search_candidates
- Find/search/show jobs/vacancies/roles → search_jobs
- Boolean/sourcing strings → generate_boolean_search
- Draft/write/compose any message or email → draft_content
- Anything else → plain text reply

UK EARLY YEARS CONTEXT:
Qualifications: Level 2, Level 3, EYPS, EYTS, QTS, Level 6.
Settings: nurseries, pre-schools, primary schools, SEN, childminders.
Key terms: EYFS, Ofsted, safeguarding, DBS, paediatric first aid, keyperson, room leader.

Today: ${today}.`;

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
