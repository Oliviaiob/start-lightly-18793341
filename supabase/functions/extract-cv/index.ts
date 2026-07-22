import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractTextFromDocx(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const files = unzipSync(bytes);
  const xmlBytes = files["word/document.xml"];
  if (!xmlBytes) throw new Error("word/document.xml not found in docx");
  const xml = new TextDecoder().decode(xmlBytes);
  return xml
    .replace(/<w:p[ >][^>]*>/gi, "\n")
    .replace(/<w:tab[^>]*>/gi, "\t")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdf_base64, docx_base64, text_content } = await req.json();
    if (!pdf_base64 && !docx_base64 && !text_content) throw new Error("pdf_base64, docx_base64, or text_content is required");

    let resolvedTextContent: string | null = text_content ?? null;
    if (docx_base64) {
      resolvedTextContent = extractTextFromDocx(docx_base64);
    }

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const prompt = `Extract candidate information from this CV/resume and return ONLY a valid JSON object. Use null for any field not found.

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
Return ONLY the JSON object, no other text.`;

    const messageContent: any[] = pdf_base64
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf_base64 } },
          { type: "text", text: prompt },
        ]
      : [{ type: "text", text: `${prompt}\n\nCV TEXT:\n${resolvedTextContent}` }];

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: messageContent }],
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
