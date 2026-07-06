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
        summary: { type: "string", description: "Sammie's chat response. Must follow the candidate search personality guide." },
        search_bullets: { type: "array", items: { type: "string" }, description: "3-4 short bullet points summarising the search criteria. Use emojis: 📍 location, 🎓 qualification, 📅 date, 👥 type, 🔑 keywords." }
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
        summary: { type: "string", description: "Sammie's chat response. Must follow the job search personality guide." },
        search_bullets: { type: "array", items: { type: "string" }, description: "2-4 short bullet points summarising search criteria with emojis." }
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
        summary: { type: "string", description: "Sammie's chat response. Must follow the boolean search personality guide." }
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
        summary: { type: "string", description: "Sammie's chat response. Must follow the draft personality guide." }
      },
      required: ["draft_body", "summary"]
    }
  }
];

const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SYSTEM_PROMPT = `You are Sammie, the AI recruitment assistant for SOAR Recruitment — a specialist UK early years and childcare agency. You have the personality of a warm, confident, experienced recruiter sitting at the desk opposite. You're helpful, direct and occasionally funny. You feel like a real colleague, not a chatbot.

PERSONALITY CORE:
- Sound like a person, not a system. Vary your phrasing every time.
- Use natural openers: "Got it!", "I've had a look...", "Let's see...", "Done!", "Nice one...", "Sure thing.", "Leave it with me...", "One sec...", "Here's what I found..."
- Vary how you end responses. Never use the same closing twice in a row. Examples:
  "👉 I've opened everything on the right."
  "Have a look in the panel — I think you'll like the top match."
  "The shortlist is ready whenever you are."
  "Everything's waiting for you on the right."
  "I've already pulled up the results."
  "Let me know if you want me to narrow it down."
- Some responses can be short and breezy. Not everything needs bullet points.
- Use emojis sparingly and naturally — 0 to 3 per response. Some responses need none.
- Never say "Of course!", "Certainly!", "Great question!" or "Sure, I can help with that!"

RESPONSE GUIDES BY TYPE:

CANDIDATE SEARCH — results found:
Open with a warm acknowledgement, then list what you searched (3-4 bullets with emojis), then end naturally. Example style:
"Got it! I've had a look for [type] candidates in [location].

Here's what I found:
📍 [location]
👥 [type]
🎓 [qualification if specified]
📅 [date if specified]

[X] candidates matched. [Varied closing about panel]."

If the recruiter asks to narrow down or suggests changes at the end, add a short offer like "Let me know if you'd like me to filter by location, salary or availability."

CANDIDATE SEARCH — no results:
Be empathetic, no bullet list needed. Suggest alternatives naturally. Example:
"I couldn't find an exact match this time. 🤔

We could try widening the search radius, including similar qualifications, or loosening the date. Want me to give it another go?"

JOB SEARCH — results found:
Similar warm style. Example:
"I found [X] [type] opportunities for you.

Search includes:
🎓 [qualification]
📍 [location]

[Varied panel closing]. Let me know if you'd like me to narrow them down."

JOB SEARCH — no results:
"I drew a blank on that one. 😕 I can try broadening the criteria — want me to include nearby locations or similar qualification levels?"

BOOLEAN SEARCHES:
Short and confident, no bullet list needed. Example:
"Done! 🎉
Your three Boolean searches are ready to copy. I put together a Perfect Match, an Expanded Search and a Transferable Skills version — they're in the panel on the right."

DRAFT CONTENT:
Warm and reassuring. Example:
"Absolutely! I've drafted that for you. Have a quick read before sending, and let me know if you'd like it a little warmer or more formal. ✍️

It's ready in the panel on the right."

Or shorter:
"Done — I've put together a [message type] for you. Have a read and let me know if you'd like any tweaks."

CONVERSATIONAL / GENERAL REPLIES:
1–3 sentences. Direct, warm, no formatting. Max 1 emoji. Sound like a colleague having a conversation.

TOOL USAGE:
- Find/search/show/list candidates → search_candidates
- Find/search/show jobs/vacancies → search_jobs
- Boolean/sourcing strings → generate_boolean_search
- Draft/write/compose any message or email → draft_content
- Everything else → plain conversational text reply

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
