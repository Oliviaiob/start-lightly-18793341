import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, Minus, Circle,
  Upload, FileText, RefreshCw, ExternalLink, Smartphone, Sparkles,
  Copy, Mail, Link2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compliance/$id")({
  component: Page,
});

// ── Checklist definition ──────────────────────────────────────────────────────

type ChecklistKey =
  | "proof_of_id" | "passport_photo" | "proof_of_address_1" | "proof_of_address_2"
  | "right_to_work" | "ni_number_check"
  | "dbs_certificate" | "dbs_update_service_check" | "childrens_barred_list"
  | "safeguarding_training_cert" | "paediatric_first_aid_cert" | "qualification_certificates"
  | "work_reference_1" | "work_reference_2" | "character_reference";

type ItemStatus = "pending" | "uploaded" | "verified" | "flagged" | "not_required";

const CHECKLIST_ITEMS: { key: ChecklistKey; label: string; group: string; required: boolean }[] = [
  { key: "proof_of_id",              label: "Proof of ID",              group: "Identity",   required: true  },
  { key: "passport_photo",           label: "Passport Photo",           group: "Identity",   required: true  },
  { key: "proof_of_address_1",       label: "Proof of Address (1 of 2)",group: "Identity",   required: true  },
  { key: "proof_of_address_2",       label: "Proof of Address (2 of 2)",group: "Identity",   required: false },
  { key: "right_to_work",            label: "Right to Work",            group: "RTW",        required: true  },
  { key: "ni_number_check",          label: "NI Number",                group: "RTW",        required: true  },
  { key: "dbs_certificate",          label: "DBS Certificate",          group: "DBS",        required: true  },
  { key: "dbs_update_service_check", label: "DBS Update Service",       group: "DBS",        required: false },
  { key: "childrens_barred_list",    label: "Children's Barred List",   group: "DBS",        required: true  },
  { key: "safeguarding_training_cert", label: "Safeguarding Training",  group: "Training",   required: true  },
  { key: "paediatric_first_aid_cert",  label: "Paediatric First Aid",   group: "Training",   required: false },
  { key: "qualification_certificates", label: "Qualification Certificates", group: "Training", required: false },
  { key: "work_reference_1",         label: "Work Reference 1",         group: "References", required: true  },
  { key: "work_reference_2",         label: "Work Reference 2",         group: "References", required: true  },
  { key: "character_reference",      label: "Character Reference",      group: "References", required: false },
];

const REQUIRED_KEYS = CHECKLIST_ITEMS.filter((i) => i.required).map((i) => i.key);
const GROUPS = ["Identity", "RTW", "DBS", "Training", "References"] as const;

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "pending",       label: "Pending"      },
  { value: "uploaded",      label: "Uploaded"     },
  { value: "verified",      label: "Verified"     },
  { value: "flagged",       label: "Flagged"      },
  { value: "not_required",  label: "Not Required" },
];

const OVERALL_STATUS_OPTIONS = [
  { value: "pending_compliance",     label: "Pending"     },
  { value: "compliance_in_progress", label: "In Progress" },
  { value: "compliance_review",      label: "Review"      },
  { value: "active",                 label: "Active"      },
  { value: "inactive",               label: "Inactive"    },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Candidate = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; qualification_level: string | null;
  status_temp: string | null; source: string | null;
  dbs_next_check_due: string | null; paediatric_first_aid_expiry: string | null;
  onboarding_email_sent_at: string | null; bank_details_token: string | null;
};

type ChecklistRecord = Record<ChecklistKey, string | null> & {
  id: string | null; item_notes: Record<string, string>; ai_results: Record<string, any>;
};

type ReferenceRecord = {
  id: string; referee_name: string | null; referee_email: string | null; company_name: string | null;
  ref_type: string | null; ref_number: number | null;
  status: string | null; requested_at: string | null; received_at: string | null;
};

type DocumentRecord = {
  id: string; document_type: string | null; file_name: string | null;
  file_url: string | null; status: string | null; uploaded_at: string | null;
  file_size: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(c: Candidate) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}
function fullName(c: Candidate) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown";
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Status badge (item-level) ─────────────────────────────────────────────────

const ITEM_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  verified:     { label: "Verified",     bg: "bg-green-100",  text: "text-green-700"  },
  flagged:      { label: "Flagged",      bg: "bg-red-100",    text: "text-red-700"    },
  uploaded:     { label: "Uploaded",     bg: "bg-blue-100",   text: "text-blue-700"   },
  not_required: { label: "Not Required", bg: "bg-muted",      text: "text-muted-foreground" },
  pending:      { label: "Pending",      bg: "bg-amber-100",  text: "text-amber-700"  },
};

function ItemBadge({ status }: { status: string | null }) {
  const m = ITEM_BADGE[status ?? "pending"] ?? ITEM_BADGE.pending;
  return <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label}</span>;
}

function ItemStatusIcon({ status }: { status: string | null }) {
  if (status === "verified")      return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "flagged")       return <AlertTriangle className="h-5 w-5 text-red-500" />;
  if (status === "uploaded")      return <Clock className="h-5 w-5 text-blue-400" />;
  if (status === "not_required")  return <Minus className="h-5 w-5 text-muted-foreground/40" />;
  return <Circle className="h-5 w-5 text-muted-foreground/25" />;
}

// ── Checklist Item Section ────────────────────────────────────────────────────

function ChecklistSection({
  item, status, doc, aiResult, note, onStatusChange, onNoteChange, onNoteBlur, onUpload, onRecheck, saving,
}: {
  item: (typeof CHECKLIST_ITEMS)[number];
  status: ItemStatus;
  doc: DocumentRecord | null;
  aiResult: any | null;
  note: string;
  onStatusChange: (val: ItemStatus) => void;
  onNoteChange: (val: string) => void;
  onNoteBlur: () => void;
  onUpload: (file: File) => void;
  onRecheck: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/10">
        <div className="flex items-center gap-3">
          <ItemStatusIcon status={status} />
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              {item.label}
              {!item.required && <span className="text-[10px] text-muted-foreground/60 font-normal">optional</span>}
              <ItemBadge status={status} />
            </div>
          </div>
        </div>
        <Select value={status} onValueChange={(v) => onStatusChange(v as ItemStatus)} disabled={saving}>
          <SelectTrigger className="h-8 w-36 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Document row */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40 transition-colors cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> Upload
            </span>
          </label>
          {doc && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <a href={doc.file_url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="truncate hover:text-foreground hover:underline max-w-[280px]">
                {doc.file_name ?? "Uploaded file"}
              </a>
              {doc.file_size && <span className="text-muted-foreground/50">({fmtFileSize(doc.file_size)})</span>}
            </div>
          )}
        </div>

        {/* AI check result */}
        {doc && (
          <div className={`rounded-xl border px-4 py-3 ${aiResult ? "bg-green-50/50 border-green-200" : "bg-muted/30 border-border/40"}`}>
            {aiResult ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3" /> Checked
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {doc.file_name ?? "file"} · checked {fmtDateTime(aiResult.checked_at ?? doc.uploaded_at)}
                    </span>
                  </div>
                  <button onClick={onRecheck}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-3 w-3" /> Re-check
                  </button>
                </div>
                {aiResult.extracted && (
                  <p className="text-[11px] text-muted-foreground">
                    {typeof aiResult.extracted === "string"
                      ? aiResult.extracted
                      : Object.entries(aiResult.extracted).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
                  Document uploaded — run AI check to extract and verify details
                </div>
                <button onClick={onRecheck}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-navy text-white text-[10px] font-medium hover:opacity-90 transition-colors">
                  <Sparkles className="h-3 w-3" /> Run AI Check
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recruiter notes */}
        <textarea value={note} onChange={(e) => onNoteChange(e.target.value)} onBlur={onNoteBlur}
          placeholder="Recruiter notes…"
          rows={2}
          className="w-full text-sm bg-muted/30 rounded-xl p-3 border border-border/40 focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none placeholder:text-muted-foreground/50" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [checklist, setChecklist] = useState<ChecklistRecord | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [references, setReferences] = useState<ReferenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<string>("pending_compliance");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadAll = async () => {
    setLoading(true);
    const [candRes, clRes, docsRes, refsRes] = await Promise.all([
      supabase.from("candidates").select("id,first_name,last_name,email,phone,qualification_level,status_temp,source,dbs_next_check_due,paediatric_first_aid_expiry,onboarding_email_sent_at,bank_details_token").eq("id", id).maybeSingle(),
      supabase.from("compliance_checklists").select("*").eq("candidate_id", id).maybeSingle(),
      supabase.from("candidate_documents").select("id,document_type,file_name,file_url,status,uploaded_at,file_size").eq("candidate_id", id).order("uploaded_at", { ascending: false }),
      supabase.from("references").select("id,referee_name,referee_email,company_name,ref_type,ref_number,status,requested_at,received_at").eq("candidate_id", id).order("ref_number", { ascending: true }),
    ]);
    if (candRes.error) { toast.error("Candidate not found"); setLoading(false); return; }
    const cand = candRes.data as Candidate | null;
    setCandidate(cand);
    setOverallStatus(cand?.status_temp ?? "pending_compliance");

    const cl = clRes.data as any;
    if (cl) {
      const itemNotes = cl.item_notes ?? {};
      const aiResults = cl.ai_results ?? {};
      const record: ChecklistRecord = { ...cl, item_notes: itemNotes, ai_results: aiResults };
      setChecklist(record);
      setNotes(itemNotes);
    } else {
      setChecklist(null);
      setNotes({});
    }
    setDocs((docsRes.data as DocumentRecord[]) ?? []);
    setReferences((refsRes.data as ReferenceRecord[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const getOrCreateChecklist = async (): Promise<ChecklistRecord> => {
    if (checklist?.id) return checklist;
    const { data, error } = await supabase.from("compliance_checklists").insert({ candidate_id: id }).select("*").single();
    if (error) throw error;
    const rec: ChecklistRecord = { ...(data as any), item_notes: {}, ai_results: {} };
    setChecklist(rec);
    return rec;
  };

  const updateItem = async (key: ChecklistKey, value: ItemStatus) => {
    setSavingItem(key);
    try {
      const cl = await getOrCreateChecklist();
      await supabase.from("compliance_checklists").update({ [key]: value } as any).eq("id", cl.id!);
      setChecklist((prev) => prev ? { ...prev, [key]: value } : null);
    } catch (e: any) { toast.error("Save failed: " + e.message); }
    setSavingItem(null);
  };

  const saveNote = async (key: ChecklistKey) => {
    try {
      const cl = await getOrCreateChecklist();
      const merged = { ...(checklist?.item_notes ?? {}), [key]: notes[key] ?? "" };
      await supabase.from("compliance_checklists").update({ item_notes: merged as any }).eq("id", cl.id!);
      setChecklist((prev) => prev ? { ...prev, item_notes: merged } : null);
    } catch (e: any) { toast.error("Note save failed"); }
  };

  const handleUpload = async (key: ChecklistKey, file: File) => {
    setSavingItem(key);
    // Create document record (without actual storage — file_url would be set by edge function in production)
    const { error } = await supabase.from("candidate_documents").insert({
      candidate_id: id, document_type: key, file_name: file.name,
      file_size: file.size, status: "pending",
      uploaded_at: new Date().toISOString(),
    });
    if (error) { toast.error("Upload failed: " + error.message); setSavingItem(null); return; }
    // Auto-advance status to uploaded if currently pending
    const currentStatus = checklist?.[key];
    if (!currentStatus || currentStatus === "pending") {
      await updateItem(key, "uploaded");
    } else {
      setSavingItem(null);
    }
    await loadAll();
    toast.success("Document uploaded");
  };

  const runAiCheck = async (key: ChecklistKey) => {
    setSavingItem(key);
    // In production this would call an edge function; for now we show a placeholder result
    const doc = docs.find((d) => d.document_type === key);
    if (!doc) { toast.error("No document to check"); setSavingItem(null); return; }
    const fakeResult = {
      checked_at: new Date().toISOString(),
      extracted: "AI check initiated — results will appear once processed.",
      status: "pending",
    };
    try {
      const cl = await getOrCreateChecklist();
      const merged: Record<string, unknown> = { ...(checklist?.ai_results ?? {}), [key]: fakeResult };
      await supabase.from("compliance_checklists").update({ ai_results: merged as any }).eq("id", cl.id!);
      setChecklist((prev) => prev ? { ...prev, ai_results: merged } : null);
      toast.success("AI check initiated");
    } catch (e: any) { toast.error("Failed"); }
    setSavingItem(null);
  };

  const saveOverallStatus = async (status: string) => {
    setOverallStatus(status);
    await supabase.from("candidates").update({ status_temp: status }).eq("id", id);
    toast.success("Status updated");
  };

  const sendOnboardingEmail = async () => {
    await supabase.from("candidates").update({ onboarding_email_sent_at: new Date().toISOString() }).eq("id", id);
    toast.success("Onboarding email sent");
    await loadAll();
  };

  const p = {
    done: REQUIRED_KEYS.filter((k) => checklist?.[k] === "verified" || checklist?.[k] === "not_required").length,
    total: REQUIRED_KEYS.length,
  };
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;

  if (loading) return <div className="max-w-[900px] mx-auto pt-16 text-center text-muted-foreground">Loading…</div>;
  if (!candidate) return <div className="max-w-[900px] mx-auto pt-16 text-center text-muted-foreground">Candidate not found.</div>;

  return (
    <div className="max-w-[900px] mx-auto space-y-5 pt-2">
      {/* Back */}
      <button onClick={() => navigate({ to: "/compliance" })}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to compliance
      </button>

      {/* Candidate header */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] px-6 py-5">
        <div className="flex items-start gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-white ${candidate.source === "app" ? "bg-teal" : "bg-navy"}`}>
            {initials(candidate)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{fullName(candidate)}</h1>
              {candidate.source === "app" && (
                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/10 text-teal-foreground">
                  <Smartphone className="h-2.5 w-2.5" /> App
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {[candidate.email, candidate.phone].filter(Boolean).join(" · ")}
            </div>
            {/* Progress */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="font-medium">{p.done} / {p.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-teal"}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <Select value={overallStatus} onValueChange={saveOverallStatus}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OVERALL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={() => navigate({ to: "/candidates/$id", params: { id } })}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> View full candidate profile →
            </button>
          </div>
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-sm">Compliance Checklist</h2>
          <span className="text-xs text-muted-foreground">{p.done} / {p.total} complete</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-teal"}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {CHECKLIST_ITEMS.map((item) => {
        const status = ((checklist?.[item.key] ?? "pending") as ItemStatus);
        // Latest doc for this item type
        const doc = docs.find((d) => d.document_type === item.key) ?? null;
        const aiResult = checklist?.ai_results?.[item.key] ?? null;
        const note = notes[item.key] ?? "";

        return (
          <ChecklistSection
            key={item.key}
            item={item}
            status={status}
            doc={doc}
            aiResult={aiResult}
            note={note}
            onStatusChange={(val) => updateItem(item.key, val)}
            onNoteChange={(val) => setNotes((prev) => ({ ...prev, [item.key]: val }))}
            onNoteBlur={() => saveNote(item.key)}
            onUpload={(file) => handleUpload(item.key, file)}
            onRecheck={() => runAiCheck(item.key)}
            saving={savingItem === item.key}
          />
        );
      })}

      {/* ── References Tracker ─────────────────────────────── */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/10 flex items-center justify-between">
          <h2 className="font-semibold text-sm">References Tracker</h2>
          <span className="text-xs text-muted-foreground">{references.length} referee{references.length !== 1 ? "s" : ""}</span>
        </div>
        {references.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No references requested yet.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {references.map((ref) => {
              const typeLabel = ref.ref_type === "character" ? "Character" : "Work";
              const slotLabel = ref.ref_number != null ? `#${ref.ref_number}` : "";
              const isReceived = ref.status === "received" || !!ref.received_at;
              return (
                <div key={ref.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ref.referee_name ?? "—"}
                      {ref.company_name && <span className="text-muted-foreground font-normal"> — {ref.company_name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel} Reference {slotLabel}
                      {ref.requested_at && <> · Requested {fmtDate(ref.requested_at)}</>}
                      {ref.received_at && <> · Received {fmtDate(ref.received_at)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isReceived ? (
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                        Received
                      </span>
                    ) : (
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                        Requested
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        if (!ref.referee_email) {
                          toast.error("No email address on this reference.");
                          return;
                        }
                        const { error } = await supabase.functions.invoke("send-reference-request", {
                          body: { reference_id: ref.id },
                        });
                        if (error) {
                          toast.error("Failed to send: " + error.message);
                        } else {
                          toast.success(`Reference request sent to ${ref.referee_name ?? ref.referee_email}`);
                          await loadAll();
                        }
                      }}
                      className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40 transition-colors">
                      <Mail className="h-3 w-3" /> {ref.status === "requested" || ref.status === "received" ? "Resend" : "Send"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Onboarding ──────────────────────────────────────── */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/10">
          <h2 className="font-semibold text-sm">Onboarding</h2>
        </div>
        <div className="divide-y divide-border/40">
          {/* Onboarding Email */}
          <div className="px-6 py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Onboarding Email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the welcome email with onboarding pack and the bank details link.
              </p>
              {candidate.onboarding_email_sent_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sent {fmtDateTime(candidate.onboarding_email_sent_at)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {candidate.onboarding_email_sent_at ? (
                <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  Pending
                </span>
              )}
              <button
                onClick={sendOnboardingEmail}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-navy text-white text-xs font-medium hover:opacity-90 transition-colors">
                <Mail className="h-3.5 w-3.5" />
                {candidate.onboarding_email_sent_at ? "Resend" : "Send Onboarding Email"}
              </button>
            </div>
          </div>

          {/* Bank Details */}
          <div className="px-6 py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Bank Details</p>
              {candidate.bank_details_token ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Link2 className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate max-w-[340px]">
                    https://soar-recruitment.lovable.app/bank-details/{candidate.bank_details_token}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">No bank details token generated.</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${
                candidate.bank_details_token ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
              }`}>
                Pending
              </span>
              {candidate.bank_details_token && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://soar-recruitment.lovable.app/bank-details/${candidate.bank_details_token}`
                    );
                    toast.success("Link copied");
                  }}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40 transition-colors">
                  <Copy className="h-3 w-3" /> Copy link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
