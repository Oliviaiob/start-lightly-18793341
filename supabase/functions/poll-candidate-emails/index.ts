import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Gmail helpers ──────────────────────────────────────────────────────────────

async function getGmailAccessToken(serviceAccountJson: string, userEmail: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: userEmail,   // impersonate the mailbox
    scope: "https://www.googleapis.com/auth/gmail.modify",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import RSA private key
  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Gmail auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function listUnreadMessages(token: string, userId: string): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages?q=is:unread&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return (data.messages ?? []).map((m: { id: string }) => m.id);
}

async function getMessage(token: string, userId: string, msgId: string) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${msgId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}

async function markAsRead(token: string, userId: string, msgId: string) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${msgId}/modify`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    }
  );
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  try { return atob(b64); } catch { return ""; }
}

function extractParts(payload: Record<string, unknown>): { text: string; attachments: Array<{ filename: string; mimeType: string; data: string }> } {
  let text = "";
  const attachments: Array<{ filename: string; mimeType: string; data: string }> = [];

  function walk(part: Record<string, unknown>) {
    const mime = part.mimeType as string ?? "";
    const body = part.body as Record<string, unknown> ?? {};
    const data = body.data as string ?? "";

    if (mime === "text/plain" && data) {
      text += decodeBase64Url(data) + "\n";
    } else if (
      (mime === "application/pdf" || mime.includes("msword") || mime.includes("wordprocessingml")) &&
      part.filename
    ) {
      attachments.push({ filename: part.filename as string, mimeType: mime, data });
    }
    const parts = part.parts as Record<string, unknown>[] ?? [];
    parts.forEach(walk);
  }

  walk(payload);
  return { text, attachments };
}

// ── Job reference matcher ──────────────────────────────────────────────────────

function extractJobRef(text: string): string | null {
  const match = text.match(/SOAR-\d{4}/i);
  return match ? match[0].toUpperCase() : null;
}

function detectSource(from: string, subject: string): string {
  const combined = `${from} ${subject}`.toLowerCase();
  if (combined.includes("indeed")) return "email_indeed";
  if (combined.includes("cv-library") || combined.includes("cvlibrary")) return "email_cvlibrary";
  if (combined.includes("reed")) return "email_reed";
  if (combined.includes("totaljobs")) return "email_totaljobs";
  return "email_other";
}

// ── Claude extraction ──────────────────────────────────────────────────────────

async function extractCandidateFromText(
  anthropicKey: string,
  emailText: string,
  subject: string
): Promise<{
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  qualification_level: string | null;
  summary: string | null;
}> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Extract candidate details from this job board application email. Respond ONLY with JSON, no markdown.

Subject: ${subject}
Email body:
${emailText.slice(0, 3000)}

JSON format:
{
  "first_name": string or null,
  "last_name": string or null,
  "email": string or null,
  "phone": string or null,
  "postcode": string or null,
  "qualification_level": string or null,
  "summary": "one sentence about their background"
}`,
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "{}";
  try {
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { first_name: null, last_name: null, email: null, phone: null, postcode: null, qualification_level: null, summary: null };
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const serviceAccountJson = Deno.env.get("GMAIL_SERVICE_ACCOUNT_JSON")!;
    const mailboxEmail = "candidates@soarrecruitment.co.uk";

    if (!serviceAccountJson) {
      return new Response(JSON.stringify({ error: "GMAIL_SERVICE_ACCOUNT_JSON secret not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getGmailAccessToken(serviceAccountJson, mailboxEmail);
    const messageIds = await listUnreadMessages(token, mailboxEmail);

    const results = { processed: 0, created: 0, deduplicated: 0, errors: 0 };

    for (const msgId of messageIds) {
      try {
        const msg = await getMessage(token, mailboxEmail, msgId);
        const headers = msg.payload?.headers ?? [];
        const subject = extractHeader(headers, "subject");
        const from = extractHeader(headers, "from");
        const { text, attachments } = extractParts(msg.payload ?? {});

        // Skip if already processed (check raw_email_id)
        const { data: existing } = await supabase
          .from("candidate_applications")
          .select("id")
          .eq("raw_email_id", msgId)
          .maybeSingle();

        if (existing) {
          await markAsRead(token, mailboxEmail, msgId);
          continue;
        }

        // Extract job reference
        const jobRef = extractJobRef(`${subject} ${text}`);
        const source = detectSource(from, subject);

        // Resolve job_id from reference
        let jobId: string | null = null;
        if (jobRef) {
          const { data: jobData } = await supabase
            .from("jobs")
            .select("id")
            .eq("job_reference", jobRef)
            .maybeSingle();
          jobId = jobData?.id ?? null;
        }

        // Extract candidate details via Claude
        const extracted = await extractCandidateFromText(anthropicKey, text, subject);

        // Upload CV attachment if present
        let cvUrl: string | null = null;
        const cvAttachment = attachments.find(a =>
          a.mimeType === "application/pdf" || a.mimeType.includes("word")
        );
        if (cvAttachment?.data) {
          // Fetch attachment data from Gmail if it's a large attachment (attachmentId)
          const ext = cvAttachment.filename.split(".").pop() ?? "pdf";
          const path = `applications/email_${msgId}/${Date.now()}.${ext}`;
          const binary = Uint8Array.from(atob(cvAttachment.data.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
          const { error: upErr } = await supabase.storage
            .from("cvs")
            .upload(path, binary, { contentType: cvAttachment.mimeType, upsert: true });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("cvs").getPublicUrl(path);
            cvUrl = urlData.publicUrl;
          }
        }

        // Deduplication
        let candidateId: string | null = null;
        if (extracted.email || extracted.phone) {
          const orClause = [
            extracted.email ? `email.eq.${extracted.email}` : null,
            extracted.phone ? `phone.eq.${extracted.phone}` : null,
          ].filter(Boolean).join(",");

          const { data: dup } = await supabase
            .from("candidates")
            .select("id")
            .or(orClause)
            .maybeSingle();

          if (dup) {
            candidateId = dup.id;
            results.deduplicated++;
          }
        }

        if (!candidateId) {
          if (!extracted.first_name && !extracted.last_name && !extracted.email) {
            // Can't create without any identifying info — log and skip
            console.warn(`Email ${msgId}: no candidate info extracted, skipping`);
            await markAsRead(token, mailboxEmail, msgId);
            results.errors++;
            continue;
          }

          const { data: newCand, error: cErr } = await supabase
            .from("candidates")
            .insert({
              first_name: extracted.first_name ?? "Unknown",
              last_name: extracted.last_name ?? "",
              email: extracted.email ?? null,
              phone: extracted.phone ?? null,
              postcode: extracted.postcode ?? null,
              qualification_level: extracted.qualification_level ?? null,
              status: "not_contacted",
              candidate_type: "perm",
              source,
              notes: extracted.summary ?? null,
            })
            .select("id")
            .single();

          if (cErr) { results.errors++; continue; }
          candidateId = newCand.id;
          results.created++;

          if (cvUrl) {
            await supabase.from("candidate_documents").upsert({
              candidate_id: candidateId,
              document_type: "cv",
              file_url: cvUrl,
              file_name: cvAttachment?.filename ?? "cv",
              status: "pending",
              uploaded_at: new Date().toISOString(),
            }, { onConflict: "candidate_id,document_type" });
          }
        }

        // Record application
        await supabase.from("candidate_applications").insert({
          candidate_id: candidateId,
          job_id: jobId,
          job_reference: jobRef,
          source,
          raw_email_id: msgId,
          notes: `From: ${from}\nSubject: ${subject}`,
          applied_at: new Date().toISOString(),
        });

        await markAsRead(token, mailboxEmail, msgId);
        results.processed++;
      } catch (msgErr) {
        console.error(`Error processing message ${msgId}:`, msgErr);
        results.errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poll-candidate-emails error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
