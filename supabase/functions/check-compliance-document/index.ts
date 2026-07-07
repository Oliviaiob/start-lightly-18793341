import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// ── Per-document rules ────────────────────────────────────────────────────────

const RULES: Record<string, string> = {
  proof_of_id: `
You are checking a Proof of Identity document for a UK childcare/early years worker.
PASS if: The document is a valid, unexpired government-issued photo ID — UK/foreign passport, UK driving licence, or national identity card. The candidate's name and photo are clearly visible and the document is not expired.
FAIL if: The document is expired, has no photo (e.g. birth certificate alone), is too blurry/cropped to read, or is not a government-issued document.
Extract: document_type, expiry_date, name_on_document.`,

  passport_photo: `
You are checking a passport-style identity photo for a UK childcare/early years worker.
PASS if: Plain light/white background, full face clearly visible and centred, no hats, scarves, or sunglasses, photo appears to be a physical or high-quality digital photo (not a screenshot or photo of a screen).
FAIL if: Background is busy or dark, face is partially obscured or off-centre, person is wearing a hat or sunglasses, the image appears to be a screenshot, photo of a screen, or is very low resolution.
Extract: background_ok (true/false), face_visible (true/false), no_accessories (true/false), appears_genuine (true/false).`,

  proof_of_address_1: `
You are checking a Proof of Address document (first of two) for a UK childcare/early years worker.
PASS if: The document is dated within the last 3 months, shows the candidate's full name and a residential address (not a PO Box), and is from an accepted source: bank statement, utility bill (gas/electric/water), HMRC letter, council tax bill, or TV licence.
FAIL if: The document is older than 3 months, shows a PO Box, is a mobile phone bill, is addressed to someone else, or is not from an accepted source.
Extract: document_type, issue_date, name_on_document, address, is_po_box (true/false).`,

  proof_of_address_2: `
You are checking a Proof of Address document (second of two) for a UK childcare/early years worker. This must be from a DIFFERENT provider than the first proof of address.
PASS if: The document is dated within the last 3 months, shows the candidate's full name and a residential address (not a PO Box), and is from an accepted source: bank statement, utility bill (gas/electric/water), HMRC letter, council tax bill, or TV licence. It must be from a different issuing organisation than the first proof of address.
FAIL if: The document is older than 3 months, shows a PO Box, is a mobile phone bill, is from the same provider as the first proof of address, or is not from an accepted source.
Extract: document_type, issue_date, name_on_document, address, is_po_box (true/false).`,

  right_to_work: `
You are checking a Right to Work declaration or document for a UK childcare/early years worker.
PASS if: The candidate has provided a signed declaration stating they hold the right to work in the UK, OR a valid right to work document such as a UK/Irish passport, BRP card, share code result, or settled/pre-settled status confirmation. A written declaration alone is sufficient — no document image is required.
FAIL if: There is no declaration and no document, or a share code result shows restricted working rights.
Extract: declaration_present (true/false), document_type_if_provided, any_restrictions (true/false).`,

  ni_number_check: `
You are checking for a National Insurance number for a UK childcare/early years worker.
PASS if: A valid NI number is present in the format: two letters, six digits, one letter (e.g. AB 12 34 56 C or AB123456C). Written/typed is fine — no document image is required.
FAIL if: No NI number is present, or the format does not match the expected pattern.
Extract: ni_number (masked to first 2 chars + XXXX + last char), format_valid (true/false).`,

  dbs_certificate: `
You are checking a DBS (Disclosure and Barring Service) certificate for a UK childcare/early years worker.
PASS if: The certificate is an ENHANCED DBS (not Basic or Standard), issued within the last 3 years OR the candidate is registered on the DBS Update Service, and the name on the certificate matches the candidate's name.
FAIL if: The certificate is Basic or Standard level only, is more than 3 years old and not on the Update Service, or the name does not match the candidate record.
Extract: dbs_level (Basic/Standard/Enhanced), certificate_date, certificate_number, name_on_certificate, on_update_service (true/false/unknown).`,

  dbs_update_service_check: `
You are reviewing a DBS Update Service check for a UK childcare/early years worker.
NOTE: This check must be performed manually on the government website at https://secure.crbonline.gov.uk/crsc/check — you cannot verify it from a document alone.
If a screenshot or confirmation of the Update Service status has been uploaded, PASS if it shows an active/current subscription with no changes since issue. FAIL if the subscription has lapsed or there has been a change since issue.
If no screenshot is provided, flag for manual review.
Extract: subscription_status (active/lapsed/unknown), changes_since_issue (true/false/unknown), manual_review_required (true/false).`,

  childrens_barred_list: `
You are checking a Children's Barred List check result for a UK childcare/early years worker.
PASS if: The document clearly confirms the individual is NOT on the Children's Barred List.
FAIL if: The individual is on the Children's Barred List, the result is unclear, or no check result is present.
Extract: barred_status (not_barred/barred/unknown), check_date.`,

  safeguarding_training_cert: `
You are checking a Safeguarding Training certificate for a UK childcare/early years worker.
PASS if: The certificate covers safeguarding at Level 1 or above (e.g. Safeguarding Children Level 1, 2, or 3), is dated within the last 2 years, and is from a recognised training provider (e.g. CACHE, NCFE, local authority, NHS, Skills for Care, NSPCC).
FAIL if: The certificate is older than 2 years, covers only basic awareness with no specific level, or is from an unrecognised/self-made provider.
Extract: training_level, issue_date, expiry_date_if_stated, provider_name.`,

  paediatric_first_aid_cert: `
You are checking a Paediatric First Aid certificate for a UK childcare/early years worker.
PASS if: The certificate covers the FULL Paediatric First Aid course (typically 12 hours / 2 days, required by Ofsted), is dated within the last 3 years, and is from a recognised/accredited provider (e.g. St John Ambulance, British Red Cross, Bluebird Care, or another HSE/Ofsted-recognised provider).
FAIL if: The certificate is for Emergency Paediatric First Aid only (6-hour / 1 day course), is older than 3 years, or is from an unrecognised provider.
Extract: course_type (full/emergency/unknown), issue_date, expiry_date, provider_name, duration_hours.`,

  qualification_certificates: `
You are checking qualification certificates for a UK childcare/early years worker. The candidate's stated qualification level will be provided.
PASS if: The certificate is from a recognised awarding body (e.g. CACHE, NCFE, City & Guilds, BTEC/Pearson, NVQ, NNEB, QCF, EYFS-related degree), and the qualification level matches or exceeds the level stated on the candidate's record.
FAIL if: The qualification level is lower than stated on the candidate's record, or the awarding body is not recognised.
If the candidate has not stated a qualification level, mark as not_required.
Extract: awarding_body, qualification_name, qualification_level, completion_date.`,

  work_reference_1: `
You are checking a Work Reference (Reference 1) for a UK childcare/early years worker.
PASS if ALL of the following are true:
1. The reference is from a line manager, supervisor, or someone senior to the candidate
2. It covers employment at the candidate's most recent or a recent workplace
3. Employment dates are confirmed
4. The referee's email address is a BUSINESS/professional email (not Gmail, Hotmail, Yahoo, Outlook.com, iCloud, or other free personal email services)
5. The overall tone and content of the reference is positive — it recommends the candidate for childcare/early years work
FAIL if: The referee used a personal email address, the reference is from a peer or family member, employment dates are absent, or the content raises concerns about the candidate's suitability.
Extract: referee_name, referee_job_title, referee_email, email_is_business (true/false), employer_name, employment_dates, overall_sentiment (positive/neutral/negative/concerning).`,

  work_reference_2: `
You are checking a Work Reference (Reference 2) for a UK childcare/early years worker. This is the second of two required work references.
PASS if ALL of the following are true:
1. The reference is from a line manager, supervisor, or someone senior to the candidate
2. It covers a different employer to Reference 1
3. Employment dates are confirmed
4. The referee's email address is a BUSINESS/professional email (not Gmail, Hotmail, Yahoo, Outlook.com, iCloud, or other free personal email services)
5. The overall tone and content of the reference is positive
FAIL if: Personal email address used, reference from peer or family, same employer as Reference 1, dates absent, or content raises concerns.
Extract: referee_name, referee_job_title, referee_email, email_is_business (true/false), employer_name, employment_dates, overall_sentiment (positive/neutral/negative/concerning).`,

  character_reference: `
You are checking a Character Reference for a UK childcare/early years worker.
PASS if: The reference is from someone who is NOT a direct family member (parent, sibling, spouse/partner, child, grandparent). Professional contacts, teachers, community leaders, friends of long standing, or distant relatives are acceptable.
FAIL if: The reference is from a direct family member (parent, sibling, spouse, partner, or child), or there is clear indication of a very close personal/family relationship.
Extract: referee_name, referee_relationship_to_candidate, is_family_member (true/false), any_concerns (true/false).`,
};

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      document_type,
      candidate_id,
      doc_id,              // candidate_documents.id
      text_content,        // for NI / RTW declaration / reference text
      candidate_name,
      candidate_qualification_level,
    } = await req.json();

    const rules = RULES[document_type];
    if (!rules) throw new Error(`Unknown document type: ${document_type}`);

    // Build message content for Claude
    const messageContent: unknown[] = [];

    // If it's a text-only check (NI, RTW declaration)
    if (text_content) {
      messageContent.push({ type: "text", text: `Document content / declaration:\n\n${text_content}` });
    }

    // If there's a doc record, fetch file from storage for vision check
    if (doc_id) {
      const { data: doc } = await supabase
        .from("candidate_documents")
        .select("file_url, file_name")
        .eq("id", doc_id)
        .maybeSingle();

      if (doc?.file_url) {
        // Fetch headers only first to get content-type and size
        const headRes = await fetch(doc.file_url, { method: "HEAD" });
        const contentType = headRes.headers.get("content-type") ?? "image/jpeg";
        const contentLength = Number(headRes.headers.get("content-length") ?? "0");
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit

        if (contentLength > MAX_BYTES) {
          messageContent.push({
            type: "text",
            text: `Note: The uploaded file (${doc.file_name}, ${(contentLength / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB analysis limit. Please ask the candidate to upload a smaller/compressed version. This check cannot be completed automatically.`,
          });
        } else if (contentType.startsWith("image/")) {
          // Use URL source — no base64 needed, no size issues, bucket is public
          messageContent.push({
            type: "image",
            source: { type: "url", url: doc.file_url },
          });
          messageContent.push({ type: "text", text: `File name: ${doc.file_name}` });
        } else if (contentType === "application/pdf") {
          // PDFs need base64 — use chunked encoding to avoid stack overflow on large files
          const fileBuffer = await (await fetch(doc.file_url)).arrayBuffer();
          const bytes = new Uint8Array(fileBuffer);
          let binary = "";
          const CHUNK = 8192;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
          }
          messageContent.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: btoa(binary) },
          });
          messageContent.push({ type: "text", text: `File name: ${doc.file_name}` });
        } else {
          messageContent.push({ type: "text", text: `File name: ${doc.file_name} (unsupported format — manual review required)` });
        }
      }
    }

    if (messageContent.length === 0) {
      messageContent.push({ type: "text", text: "No document or text content provided." });
    }

    // Add candidate context
    const context: string[] = [];
    if (candidate_name) context.push(`Candidate name: ${candidate_name}`);
    if (candidate_qualification_level) context.push(`Stated qualification level: ${candidate_qualification_level}`);
    if (context.length > 0) {
      messageContent.push({ type: "text", text: `Candidate context:\n${context.join("\n")}` });
    }

    // Call Claude
    const systemPrompt = `${rules}

Respond ONLY with a JSON object in this exact format (no markdown, no explanation outside the JSON):
{
  "status": "verified" | "flagged" | "manual_review",
  "summary": "One sentence plain-English summary of the outcome",
  "reasons": ["Specific reason 1", "Specific reason 2"],
  "extracted": { ...key fields extracted from the document... },
  "confidence": 0.0 to 1.0
}

Use "verified" if the document clearly passes all rules.
Use "flagged" if the document fails one or more rules.
Use "manual_review" if you cannot determine pass/fail from the content provided (e.g. DBS Update Service — requires gov website check).`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text ?? "{}";

    // Parse JSON from response
    let result: Record<string, unknown>;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      result = { status: "manual_review", summary: "Could not parse AI response", reasons: [rawText], extracted: {}, confidence: 0 };
    }

    // Save result back to compliance_checklist ai_results
    if (candidate_id) {
      const { data: checklist } = await supabase
        .from("compliance_checklists")
        .select("id, ai_results")
        .eq("candidate_id", candidate_id)
        .maybeSingle();

      if (checklist) {
        const existing = (checklist.ai_results as Record<string, unknown>) ?? {};
        const updated = {
          ...existing,
          [document_type]: {
            ...result,
            checked_at: new Date().toISOString(),
          },
        };
        await supabase
          .from("compliance_checklists")
          .update({ ai_results: updated })
          .eq("id", checklist.id);

        // Auto-update item status based on AI result
        if (result.status === "verified" || result.status === "flagged") {
          await supabase
            .from("compliance_checklists")
            .update({ [document_type]: result.status === "verified" ? "verified" : "flagged" } as any)
            .eq("id", checklist.id);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
