import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, Minus, Circle,
  Upload, FileText, RefreshCw, ExternalLink, Smartphone, Sparkles,
  Copy, Mail, Link2, BanIcon, PartyPopper, ChevronRight, Trash2, Plus, X, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowPanel, type WorkflowStateData, type WorkflowActivityData, type ActionOwner, type DerivedWorkflowState } from "@/components/workflow-panel";

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

type ItemStatus = "pending" | "awaiting_candidate" | "uploaded" | "under_review"
  | "approved" | "verified" | "rejected" | "flagged"
  | "manual_review" | "awaiting_referee" | "awaiting_manager" | "not_required";

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
  { value: "pending",            label: "Pending"            },
  { value: "awaiting_candidate", label: "Awaiting Candidate" },
  { value: "uploaded",           label: "Uploaded"           },
  { value: "under_review",       label: "Under Review"       },
  { value: "approved",           label: "Approved"           },
  { value: "rejected",           label: "Rejected"           },
  { value: "manual_review",      label: "Manual Review"      },
  { value: "awaiting_referee",   label: "Awaiting Referee"   },
  { value: "awaiting_manager",   label: "Awaiting Manager"   },
  { value: "not_required",       label: "Not Required"       },
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
  ref_type: string | null; ref_number: number | null; referee_job_title: string | null;
  relationship_to_candidate: string | null; known_duration: string | null;
  is_current_role: boolean | null; candidate_position: string | null;
  employment_start_date: string | null; employment_end_date: string | null;
  reason_for_leaving: string | null; referee_phone: string | null;
  status: string | null; requested_at: string | null; received_at: string | null;
  reminder_stage: number | null; next_reminder_at: string | null;
  short_code: string | null;
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
  pending:            { label: "Pending",            bg: "bg-amber-100",  text: "text-amber-700"  },
  awaiting_candidate: { label: "Awaiting Candidate", bg: "bg-blue-100",   text: "text-blue-700"   },
  uploaded:           { label: "Uploaded",           bg: "bg-blue-100",   text: "text-blue-700"   },
  under_review:       { label: "Under Review",       bg: "bg-indigo-100", text: "text-indigo-700" },
  approved:           { label: "Approved",           bg: "bg-green-100",  text: "text-green-700"  },
  verified:           { label: "Verified",           bg: "bg-green-100",  text: "text-green-700"  },
  rejected:           { label: "Rejected",           bg: "bg-red-100",    text: "text-red-700"    },
  flagged:            { label: "Flagged",            bg: "bg-red-100",    text: "text-red-700"    },
  manual_review:      { label: "Manual Review",      bg: "bg-amber-100",  text: "text-amber-700"  },
  awaiting_referee:   { label: "Awaiting Referee",   bg: "bg-orange-100", text: "text-orange-700" },
  awaiting_manager:   { label: "Awaiting Manager",   bg: "bg-purple-100", text: "text-purple-700" },
  not_required:       { label: "Not Required",       bg: "bg-muted",      text: "text-muted-foreground" },
};

function ItemBadge({ status }: { status: string | null }) {
  const m = ITEM_BADGE[status ?? "pending"] ?? ITEM_BADGE.pending;
  return <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label}</span>;
}

function ItemStatusIcon({ status }: { status: string | null }) {
  if (status === "verified" || status === "approved") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "flagged"  || status === "rejected") return <AlertTriangle className="h-5 w-5 text-red-500" />;
  if (status === "uploaded" || status === "under_review") return <Clock className="h-5 w-5 text-blue-400" />;
  if (status === "manual_review" || status === "awaiting_manager") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (status === "not_required")  return <Minus className="h-5 w-5 text-muted-foreground/40" />;
  return <Circle className="h-5 w-5 text-muted-foreground/25" />;
}

// ── Checklist Item Section ────────────────────────────────────────────────────

function deriveWorkflowState(
  item: (typeof CHECKLIST_ITEMS)[number],
  status: string,
  hasDoc: boolean
): DerivedWorkflowState {
  const isRef = item.key.includes("reference");
  switch (status) {
    case "approved": case "verified": case "not_required":
      return { waitingOn: "System", nextAction: "No action required", aiRecommendation: "No action required", priority: 9 };
    case "uploaded":
      return { waitingOn: "Sophie", nextAction: `Review ${item.label.toLowerCase()}`, aiRecommendation: "Run AI check to verify document", priority: 3 };
    case "under_review":
      return { waitingOn: "Sophie", nextAction: "AI check in progress", aiRecommendation: "Awaiting AI analysis", priority: 3 };
    case "flagged": case "rejected":
      return { waitingOn: "Sophie", nextAction: "Review flagged document", aiRecommendation: "Review AI flag — request replacement if needed", priority: 2 };
    case "manual_review":
      return { waitingOn: "Manager", nextAction: "Manual review required", aiRecommendation: "Escalate to Manager", priority: 3 };
    case "awaiting_referee":
      return { waitingOn: "Referee", nextAction: "Awaiting referee response", aiRecommendation: "Chase referee", priority: 4 };
    case "awaiting_manager":
      return { waitingOn: "Manager", nextAction: "Awaiting manager approval", aiRecommendation: "Escalate to Manager", priority: 3 };
    case "awaiting_candidate":
      return { waitingOn: "Candidate", nextAction: "Awaiting candidate upload", aiRecommendation: "Await candidate response", priority: 5 };
    default:
      if (hasDoc) return { waitingOn: "Sophie", nextAction: `Run AI check on ${item.label.toLowerCase()}`, aiRecommendation: "Run AI check to verify document", priority: 3 };
      if (isRef)  return { waitingOn: "Referee", nextAction: "Send reference request", aiRecommendation: "Chase referee", priority: 6 };
      return { waitingOn: "Candidate", nextAction: `Upload ${item.label.toLowerCase()}`, aiRecommendation: "Send candidate reminder", priority: 5 };
  }
}

function ChecklistSection({
  item, status, doc, aiResult, note, workflowState, workflowActivity,
  onStatusChange, onNoteChange, onNoteBlur, onUpload, onRemove, onRecheck,
  onWorkflowUpdate, onWorkflowLog, saving,
}: {
  item: (typeof CHECKLIST_ITEMS)[number];
  status: ItemStatus;
  doc: DocumentRecord | null;
  aiResult: any | null;
  note: string;
  workflowState: WorkflowStateData | null;
  workflowActivity: WorkflowActivityData[];
  onStatusChange: (val: ItemStatus) => void;
  onNoteChange: (val: string) => void;
  onNoteBlur: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onRecheck: () => void;
  onWorkflowUpdate: (updates: Partial<WorkflowStateData>) => Promise<void>;
  onWorkflowLog: (desc: string, source?: "system" | "ai" | "recruiter") => Promise<void>;
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
          {item.key === "dbs_update_service_check" && (
            <a href="https://secure.crbonline.gov.uk/crsc/check?execution=e1s1" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/5 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Check on Gov Website
            </a>
          )}
          {doc && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <a href={doc.file_url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="truncate hover:text-foreground hover:underline max-w-[280px]">
                {doc.file_name ?? "Uploaded file"}
              </a>
              {doc.file_size && <span className="text-muted-foreground/50">({fmtFileSize(doc.file_size)})</span>}
              <button
                onClick={onRemove}
                className="ml-1 p-0.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground/40 transition-colors"
                title="Remove document"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* AI check result */}
        {doc && (
          <div className={`rounded-xl border px-4 py-3 ${
            !aiResult ? "bg-muted/30 border-border/40"
            : aiResult.status === "flagged" ? "bg-red-50/50 border-red-200"
            : aiResult.status === "manual_review" ? "bg-amber-50/50 border-amber-200"
            : "bg-green-50/50 border-green-200"
          }`}>
            {aiResult ? (
              <div className="space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {aiResult.status === "flagged" ? (
                      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Flagged
                      </span>
                    ) : aiResult.status === "manual_review" ? (
                      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" /> Manual Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" /> Checked
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {doc.file_name ?? "file"} · checked {fmtDateTime(aiResult.checked_at ?? doc.uploaded_at)}
                    </span>
                  </div>
                  <button onClick={onRecheck}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <RefreshCw className="h-3 w-3" /> Re-check
                  </button>
                </div>
                {/* Summary */}
                {aiResult.summary && (
                  <p className="text-[11px] text-foreground/80 font-medium">{aiResult.summary}</p>
                )}
                {/* Extracted fields */}
                {aiResult.extracted && typeof aiResult.extracted === "object" && Object.keys(aiResult.extracted).length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {Object.entries(aiResult.extracted as Record<string, unknown>)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`).join(" · ")}
                  </p>
                )}
                {/* Legacy plain-text extracted (old placeholder format) */}
                {aiResult.extracted && typeof aiResult.extracted === "string" && aiResult.extracted !== "AI check initiated — results will appear once processed." && (
                  <p className="text-[11px] text-muted-foreground">{aiResult.extracted}</p>
                )}
                {/* Reasons if flagged */}
                {aiResult.status === "flagged" && aiResult.reasons && Array.isArray(aiResult.reasons) && aiResult.reasons.length > 0 && (
                  <ul className="space-y-0.5">
                    {(aiResult.reasons as string[]).map((r, i) => (
                      <li key={i} className="text-[11px] text-red-700 flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Manual review instructions */}
                {aiResult.status === "manual_review" && aiResult.reasons && Array.isArray(aiResult.reasons) && aiResult.reasons.length > 0 && (
                  <ul className="space-y-0.5">
                    {(aiResult.reasons as string[]).map((r, i) => (
                      <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
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

        {/* AI Workflow Panel */}
        <WorkflowPanel
          state={workflowState}
          activity={workflowActivity}
          derived={deriveWorkflowState(item, status, !!doc)}
          onUpdate={onWorkflowUpdate}
          onLogActivity={onWorkflowLog}
          agent="sophie"
          variant="compact"
        />

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
  const [lastMessage, setLastMessage] = useState<{ content: string; direction: string; created_at: string } | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateData[]>([]);
  const [workflowActivity, setWorkflowActivity] = useState<WorkflowActivityData[]>([]);
  const [workflowAvailable, setWorkflowAvailable] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [candRes, clRes, docsRes, refsRes, msgRes] = await Promise.all([
      supabase.from("candidates").select("id,first_name,last_name,email,phone,qualification_level,status_temp,source,dbs_next_check_due,paediatric_first_aid_expiry,onboarding_email_sent_at,bank_details_token").eq("id", id).maybeSingle(),
      supabase.from("compliance_checklists").select("*").eq("candidate_id", id).maybeSingle(),
      supabase.from("candidate_documents").select("id,document_type,file_name,file_url,status,uploaded_at,file_size").eq("candidate_id", id).order("uploaded_at", { ascending: false }),
      supabase.from("references").select("id,referee_name,referee_email,referee_phone,referee_job_title,company_name,ref_type,ref_number,candidate_position,employment_start_date,employment_end_date,is_current_role,reason_for_leaving,relationship_to_candidate,known_duration,status,requested_at,received_at,reminder_stage,next_reminder_at,short_code").eq("candidate_id", id).order("ref_number", { ascending: true }),
      (supabase as any).from("messages").select("content,direction,created_at").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    // Load workflow engine data (graceful fallback if migration not yet run)
    if (workflowAvailable) {
      try {
        const [wsRes, waRes] = await Promise.all([
          (supabase as any).from("workflow_states").select("*").eq("entity_type", "compliance_item").eq("entity_id", id),
          (supabase as any).from("workflow_activity").select("*").eq("entity_type", "compliance_item").eq("entity_id", id).order("created_at", { ascending: false }).limit(100),
        ]);
        if (wsRes.error?.code === "42P01") { setWorkflowAvailable(false); }
        else {
          setWorkflowStates(wsRes.data ?? []);
          setWorkflowActivity(waRes.data ?? []);
        }
      } catch { setWorkflowAvailable(false); }
    }
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
    setLastMessage((msgRes as any)?.data ?? null);
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

    // 1. Upload file to Supabase Storage
    const ext = file.name.split(".").pop() ?? "bin";
    const filePath = `${id}/${key}/${Date.now()}.${ext}`;
    const { error: storageError } = await supabase.storage
      .from("compliance")
      .upload(filePath, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (storageError) {
      toast.error("Upload failed: " + storageError.message);
      setSavingItem(null);
      return;
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage.from("compliance").getPublicUrl(filePath);
    const fileUrl = urlData?.publicUrl ?? null;

    // 3. Remove any existing doc record for this key then insert new one
    await supabase.from("candidate_documents").delete().eq("candidate_id", id).eq("document_type", key);
    const { error } = await supabase.from("candidate_documents").insert({
      candidate_id: id, document_type: key, file_name: file.name,
      file_size: file.size, file_url: fileUrl, status: "pending",
      uploaded_at: new Date().toISOString(),
    });
    if (error) { toast.error("Record failed: " + error.message); setSavingItem(null); return; }

    // 4. Auto-advance status to uploaded
    const currentStatus = checklist?.[key];
    if (!currentStatus || currentStatus === "pending" || currentStatus === "awaiting_candidate") {
      await updateItem(key, "uploaded");
    } else {
      setSavingItem(null);
    }
    await loadAll();
    await logWorkflowActivity(key, `${file.name} uploaded`, "system");
    toast.success("Document uploaded");
  };

  const handleRemove = async (key: ChecklistKey) => {
    const doc = docs.find((d) => d.document_type === key);
    if (!doc) return;
    const confirmed = window.confirm(`Remove ${doc.file_name ?? "this document"}? You can upload a replacement after.`);
    if (!confirmed) return;
    setSavingItem(key);
    const { error } = await supabase.from("candidate_documents").delete().eq("id", doc.id);
    if (error) { toast.error("Remove failed: " + error.message); setSavingItem(null); return; }
    // Reset status to pending
    await updateItem(key, "pending");
    await loadAll();
    await logWorkflowActivity(key, `Document removed — awaiting replacement`, "system");
    toast.success("Document removed");
  };

  const upsertWorkflowState = async (key: string, updates: Partial<WorkflowStateData>) => {
    if (!workflowAvailable) return;
    try {
      const { data, error } = await (supabase as any).from("workflow_states").upsert({
        entity_type: "compliance_item", entity_id: id, item_key: key,
        assigned_agent: "sophie", ...updates, updated_at: new Date().toISOString(),
      }, { onConflict: "entity_type,entity_id,item_key" }).select("*").single();
      if (!error && data) setWorkflowStates(prev => { const rest = prev.filter(s => s.item_key !== key); return [...rest, data]; });
    } catch {}
  };

  const logWorkflowActivity = async (key: string, description: string, source: "system" | "ai" | "recruiter" = "system") => {
    if (!workflowAvailable) return;
    try {
      const { data } = await (supabase as any).from("workflow_activity").insert({
        entity_type: "compliance_item", entity_id: id, item_key: key,
        description, source, agent: source === "ai" ? "sophie" : null,
      }).select("*").single();
      if (data) {
        setWorkflowActivity(prev => [data, ...prev]);
        await upsertWorkflowState(key, { last_activity_at: data.created_at, last_activity_desc: description });
      }
    } catch {}
  };

  const runAiCheck = async (key: ChecklistKey) => {
    setSavingItem(key);
    const doc = docs.find((d) => d.document_type === key);
    // Text-only checks don't need an uploaded document
    const textOnlyKeys = ["right_to_work", "ni_number_check"];
    if (!doc && !textOnlyKeys.includes(key)) {
      toast.error("Upload a document first before running an AI check");
      setSavingItem(null);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-compliance-document", {
        body: {
          document_type: key,
          candidate_id: id,
          doc_id: doc?.id ?? null,
          text_content: null,
          candidate_name: candidate ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() : null,
          candidate_qualification_level: candidate?.qualification_level ?? null,
        },
      });
      if (error) throw error;
      // Refresh checklist to pick up auto-updated status and ai_results
      await loadAll();
      const aiStatus = data?.status ?? "unknown";
      const rawConfidence = typeof data?.confidence === "number" ? data.confidence : null;
      const confidenceScore = rawConfidence != null ? Math.round(rawConfidence * 100) : null;
      await logWorkflowActivity(key, `AI check completed — ${aiStatus}${confidenceScore != null ? ` (${confidenceScore}% confidence)` : ""}`, "ai");
      const derived = deriveWorkflowState(CHECKLIST_ITEMS.find(i => i.key === key)!, aiStatus, true);
      await upsertWorkflowState(key, {
        current_status: aiStatus,
        waiting_on: derived.waitingOn as ActionOwner,
        next_action: derived.nextAction,
        ai_recommendation: derived.aiRecommendation,
        priority: derived.priority,
        confidence_score: confidenceScore,
        due_status: (aiStatus === "verified" || aiStatus === "approved") ? "no_action_needed" : undefined,
      });
      if (data?.status === "flagged") toast.error("AI check flagged an issue — review notes");
      else toast.info("Manual review required for this item");
    } catch (e: any) {
      toast.error("AI check failed: " + (e?.message ?? "Unknown error"));
    }
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

      {/* Blocker Summary */}
      <ComplianceSummary
        candidate={candidate}
        checklist={checklist}
        docs={docs}
        references={references}
        lastMessage={lastMessage}
      />

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
            onRemove={() => handleRemove(item.key)}
            onRecheck={() => runAiCheck(item.key)}
            workflowState={workflowStates.find(s => s.item_key === item.key) ?? null}
            workflowActivity={workflowActivity.filter(a => a.item_key === item.key)}
            onWorkflowUpdate={(updates) => upsertWorkflowState(item.key, updates)}
            onWorkflowLog={(desc, src) => logWorkflowActivity(item.key, desc, src)}
            saving={savingItem === item.key}
          />
        );
      })}

      {/* ── References Tracker ─────────────────────────────── */}
      <ReferencesTracker candidateId={id} references={references} onRefresh={loadAll} />

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

// ── ComplianceSummary ─────────────────────────────────────────────────────────

type SummaryProps = {
  candidate: { first_name: string | null; last_name: string | null } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checklist: Record<string, any> | null;
  docs: { document_type: string | null; uploaded_at: string | null }[];
  references: { ref_number: number | null; status: string | null; requested_at: string | null; received_at: string | null; referee_name: string | null }[];
  lastMessage: { content: string; direction: string; created_at: string } | null;
};

type Blocker = {
  label: string;
  status: string | null;
  detail: string;
  nextAction: string;
  expectedCompletion?: string;
  urgent?: boolean;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "unknown";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function buildBlockers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checklist: Record<string, any> | null,
  docs: SummaryProps["docs"],
  references: SummaryProps["references"],
  lastMessage: SummaryProps["lastMessage"]
): Blocker[] {
  const blockers: Blocker[] = [];
  const lastContactStr = lastMessage
    ? `Last contacted ${relativeTime(lastMessage.created_at)}`
    : "Not yet contacted";
  const daysSinceContact = lastMessage ? daysSince(lastMessage.created_at) : 999;
  const chaseAction = daysSinceContact < 1
    ? "Awaiting response"
    : daysSinceContact < 3
    ? "Follow up with candidate"
    : "Contact candidate — overdue";

  const addDocBlocker = (key: string, label: string, urgent = false) => {
    const status = checklist?.[key] ?? "pending";
    if (status === "verified" || status === "not_required") return;
    const doc = docs.find(d => d.document_type === key);
    if (status === "flagged") {
      blockers.push({ label, status, detail: "Document uploaded but flagged by AI — review required.", nextAction: "Review AI flag", urgent: true });
    } else if (doc) {
      blockers.push({ label, status: "uploaded", detail: `Document uploaded ${relativeTime(doc.uploaded_at)} — AI check not yet run.`, nextAction: "Run AI check" });
    } else {
      blockers.push({ label, status: "pending", detail: `No document uploaded. ${lastContactStr}.`, nextAction: chaseAction, urgent, expectedCompletion: daysSinceContact < 1 ? "Expected today" : undefined });
    }
  };

  const addTextBlocker = (key: string, label: string, thing: string) => {
    const status = checklist?.[key] ?? "pending";
    if (status === "verified" || status === "not_required") return;
    blockers.push({ label, status, detail: `${thing} not yet received. ${lastContactStr}.`, nextAction: chaseAction });
  };

  const addRefBlocker = (refNum: number, label: string) => {
    const key = refNum === 1 ? "work_reference_1" : refNum === 2 ? "work_reference_2" : "character_reference";
    const status = checklist?.[key] ?? "pending";
    if (status === "verified" || status === "not_required") return;
    const ref = references.find(r => r.ref_number === refNum);

    if (status === "flagged") {
      blockers.push({ label, status, detail: `Reference received from ${ref?.referee_name ?? "referee"} but flagged — review content.`, nextAction: "Review reference", urgent: true });
    } else if (ref?.received_at) {
      blockers.push({ label, status: "uploaded", detail: `Reference received from ${ref.referee_name ?? "referee"} — AI check not yet run.`, nextAction: "Run AI check" });
    } else if (ref?.requested_at) {
      const days = daysSince(ref.requested_at);
      const sent = relativeTime(ref.requested_at);
      if (days < 3) {
        blockers.push({ label, status: "pending", detail: `Reference request sent ${sent} to ${ref.referee_name ?? "referee"}.`, nextAction: "Awaiting response", expectedCompletion: "Expected within 2–3 days" });
      } else if (days < 7) {
        blockers.push({ label, status: "pending", detail: `Reference request sent ${sent} — no response yet.`, nextAction: "Send reminder to referee", urgent: days > 5, expectedCompletion: "Expected within 1–2 days if chased" });
      } else {
        blockers.push({ label, status: "pending", detail: `Reference request sent ${sent} — overdue with no response.`, nextAction: "Chase referee or request alternative", urgent: true });
      }
    } else {
      blockers.push({ label, status: "pending", detail: "Reference request not yet sent.", nextAction: "Send reference request" });
    }
  };

  // Identity
  addDocBlocker("proof_of_id", "Proof of ID");
  addDocBlocker("passport_photo", "Passport Photo");
  addDocBlocker("proof_of_address_1", "Proof of Address (1)");
  addDocBlocker("proof_of_address_2", "Proof of Address (2)");
  // RTW
  addTextBlocker("right_to_work", "Right to Work", "Right to work declaration");
  addTextBlocker("ni_number_check", "NI Number", "NI number");
  // DBS
  addDocBlocker("dbs_certificate", "DBS Certificate", true);
  const dbsUpdateStatus = checklist?.["dbs_update_service_check"] ?? "pending";
  if (dbsUpdateStatus !== "verified" && dbsUpdateStatus !== "not_required") {
    blockers.push({ label: "DBS Update Service", status: dbsUpdateStatus, detail: "Manual check required on the government website.", nextAction: "Check gov.uk Update Service portal" });
  }
  addDocBlocker("childrens_barred_list", "Children's Barred List", true);
  // Training
  addDocBlocker("safeguarding_training_cert", "Safeguarding Training");
  addDocBlocker("paediatric_first_aid_cert", "Paediatric First Aid");
  // References
  addRefBlocker(1, "Work Reference 1");
  addRefBlocker(2, "Work Reference 2");

  return blockers;
}

function ComplianceSummary({ candidate, checklist, docs, references, lastMessage }: SummaryProps) {
  const firstName = candidate?.first_name ?? "Candidate";
  const blockers = buildBlockers(checklist, docs, references, lastMessage);
  const urgent = blockers.filter(b => b.urgent);
  const nonUrgent = blockers.filter(b => !b.urgent);
  const ordered = [...urgent, ...nonUrgent];

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50/60 px-5 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-green-500 grid place-items-center shrink-0">
          <PartyPopper className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">{firstName} is cleared to work ✓</p>
          <p className="text-xs text-green-700 mt-0.5">All required compliance items are complete.</p>
        </div>
      </div>
    );
  }

  // Show top 3 blockers max to keep it scannable
  const shown = ordered.slice(0, 3);
  const remaining = ordered.length - shown.length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-200/60 bg-amber-100/40">
        <div className="h-8 w-8 rounded-full bg-amber-500 grid place-items-center shrink-0">
          <BanIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {firstName} cannot work — {ordered.length} blocker{ordered.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-amber-700">
            {urgent.length > 0 ? `${urgent.length} urgent · ` : ""}{nonUrgent.length} pending
          </p>
        </div>
      </div>

      {/* Blockers */}
      <div className="divide-y divide-amber-100">
        {shown.map((b, i) => (
          <div key={i} className={`px-5 py-3.5 flex items-start gap-3 ${b.urgent ? "bg-red-50/40" : ""}`}>
            <div className={`mt-0.5 h-5 w-5 rounded-full grid place-items-center shrink-0 ${b.urgent ? "bg-red-100" : "bg-amber-100"}`}>
              {b.urgent
                ? <AlertTriangle className="h-3 w-3 text-red-500" />
                : <Clock className="h-3 w-3 text-amber-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{b.label}</span>
                {b.urgent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Urgent</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.detail}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  <ChevronRight className="h-3 w-3" /> {b.nextAction}
                </span>
                {b.expectedCompletion && (
                  <span className="text-[11px] text-muted-foreground">{b.expectedCompletion}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-5 py-2.5 text-xs text-muted-foreground">
            + {remaining} more blocker{remaining !== 1 ? "s" : ""} — see checklist below
          </div>
        )}
      </div>
    </div>
  );
}

// ── ReferencesTracker ────────────────────────────────────────────────────────
type AddRefereeForm = {
  ref_type: "work" | "character";
  referee_name: string;
  referee_email: string;
  referee_phone: string;
  referee_job_title: string;
  company_name: string;
  candidate_position: string;
  employment_start_date: string;
  employment_end_date: string;
  is_current_role: boolean;
  reason_for_leaving: string;
  relationship_to_candidate: string;
  known_duration: string;
};

const EMPTY_FORM: AddRefereeForm = {
  ref_type: "work", referee_name: "", referee_email: "", referee_phone: "",
  referee_job_title: "", company_name: "", candidate_position: "",
  employment_start_date: "", employment_end_date: "", is_current_role: false,
  reason_for_leaving: "", relationship_to_candidate: "", known_duration: "",
};

const CHASE_STAGE_LABELS = [
  "Request sent",
  "Day 2 reminder sent", "Day 4 reminder sent", "Day 5 reminder sent",
  "Day 7 reminder sent", "Day 10 reminder sent", "Day 14 final reminder sent",
];

function RefField({ label, value, onChange, type = "text", disabled = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder}
        className="w-full h-8 px-3 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-teal/40 disabled:opacity-40" />
    </div>
  );
}

function ReferencesTracker({ candidateId, references, onRefresh }: {
  candidateId: string;
  references: ReferenceRecord[];
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddRefereeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Per-row edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AddRefereeForm & { referee_email: string }>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Per-row email update state
  const [emailRowId, setEmailRowId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const set = (k: keyof AddRefereeForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const setEdit = (k: keyof typeof editForm, v: string | boolean) =>
    setEditForm(prev => ({ ...prev, [k]: v }));

  const startEdit = (ref: ReferenceRecord) => {
    setEditingId(ref.id);
    setEmailRowId(null);
    setEditForm({
      ref_type: (ref.ref_type === "character" ? "character" : "work") as "work" | "character",
      referee_name: ref.referee_name ?? "",
      referee_phone: ref.referee_phone ?? "",
      referee_job_title: ref.referee_job_title ?? "",
      company_name: ref.company_name ?? "",
      candidate_position: ref.candidate_position ?? "",
      employment_start_date: ref.employment_start_date ?? "",
      employment_end_date: ref.employment_end_date ?? "",
      is_current_role: ref.is_current_role ?? false,
      reason_for_leaving: ref.reason_for_leaving ?? "",
      relationship_to_candidate: ref.relationship_to_candidate ?? "",
      known_duration: ref.known_duration ?? "",
    });
  };

  const saveEdit = async (ref: ReferenceRecord) => {
    if (!editForm.referee_name?.trim()) { toast.error("Referee name is required"); return; }
    setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {
        referee_name:              editForm.referee_name ?? ref.referee_name,
        referee_phone:             editForm.referee_phone || null,
        referee_job_title:         editForm.referee_job_title || null,
        company_name:              editForm.company_name || null,
        candidate_position:        editForm.candidate_position || null,
        employment_start_date:     editForm.employment_start_date || null,
        employment_end_date:       editForm.is_current_role ? null : (editForm.employment_end_date || null),
        is_current_role:           editForm.is_current_role ?? false,
        reason_for_leaving:        editForm.reason_for_leaving || null,
        relationship_to_candidate: editForm.relationship_to_candidate || null,
        known_duration:            editForm.known_duration || null,
      };
      const { error } = await supabase.from("references").update(payload).eq("id", ref.id);
      if (error) throw error;
      toast.success("Referee details updated");
      setEditingId(null);
      await onRefresh();
    } catch (e: unknown) {
      toast.error("Failed to update: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEditSaving(false);
    }
  };

  const sendUpdateEmail = async (refId: string) => {
    if (!newEmail.trim() || !newEmail.includes("@")) { toast.error("Enter a valid email address"); return; }
    setEmailSending(true);
    try {
      const { error } = await supabase.functions.invoke("update-reference-email", {
        body: { reference_id: refId, new_email: newEmail.trim() },
      });
      if (error) throw error;
      toast.success("Email updated and reference request resent");
      setEmailRowId(null);
      setNewEmail("");
      await onRefresh();
    } catch (e: unknown) {
      toast.error("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEmailSending(false);
    }
  };

  const save = async () => {
    if (!form.referee_name.trim() || !form.referee_email.trim()) {
      toast.error("Referee name and email are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("create-reference-rows", {
        body: {
          candidate_id: candidateId,
          referees: [{
            ref_type:                  form.ref_type,
            referee_name:              form.referee_name,
            referee_email:             form.referee_email,
            referee_phone:             form.referee_phone || null,
            referee_job_title:         form.referee_job_title || null,
            company_name:              form.company_name || null,
            candidate_position:        form.candidate_position || null,
            employment_start_date:     form.employment_start_date || null,
            employment_end_date:       form.employment_end_date || null,
            is_current_role:           form.is_current_role,
            reason_for_leaving:        form.reason_for_leaving || null,
            relationship_to_candidate: form.relationship_to_candidate || null,
            known_duration:            form.known_duration || null,
          }],
        },
      });
      if (error) throw error;
      toast.success(`Referee added: ${form.referee_name}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await onRefresh();
    } catch (e: unknown) {
      toast.error("Failed to add referee: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/10 flex items-center justify-between">
        <h2 className="font-semibold text-sm">References Tracker</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{references.length} referee{references.length !== 1 ? "s" : ""}</span>
          <button onClick={() => { setShowForm(v => !v); setEditingId(null); setEmailRowId(null); }}
            className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40 transition-colors">
            {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showForm ? "Cancel" : "Add Referee"}
          </button>
        </div>
      </div>

      {/* Add Referee Form */}
      {showForm && (
        <div className="px-6 py-5 border-b bg-muted/5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reference Type</label>
              <div className="flex gap-2">
                {(["work", "character"] as const).map(t => (
                  <button key={t} onClick={() => set("ref_type", t)}
                    className={`h-7 px-3 rounded-lg border text-xs font-medium transition-colors ${form.ref_type === t ? "bg-navy text-white border-navy" : "border-border hover:bg-muted/40"}`}>
                    {t === "work" ? "Work / Professional" : "Character"}
                  </button>
                ))}
              </div>
            </div>
            <RefField label="Referee Name *" value={form.referee_name} onChange={v => set("referee_name", v)} />
            <RefField label="Referee Email *" value={form.referee_email} onChange={v => set("referee_email", v)} type="email" />
            <RefField label="Referee Phone" value={form.referee_phone} onChange={v => set("referee_phone", v)} />
            {form.ref_type === "work" ? (<>
              <RefField label="Their Job Title" value={form.referee_job_title} onChange={v => set("referee_job_title", v)} />
              <RefField label="Company Name" value={form.company_name} onChange={v => set("company_name", v)} />
              <RefField label="Candidate's Job Title There" value={form.candidate_position} onChange={v => set("candidate_position", v)} />
              <RefField label="Start Date" value={form.employment_start_date} onChange={v => set("employment_start_date", v)} type="date" />
              <RefField label="End Date" value={form.employment_end_date} onChange={v => set("employment_end_date", v)} type="date" disabled={form.is_current_role} />
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="add_current_role" checked={form.is_current_role}
                  onChange={e => { set("is_current_role", e.target.checked); if (e.target.checked) set("employment_end_date", ""); }}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="add_current_role" className="text-xs text-muted-foreground">Current role</label>
              </div>
              <div className="col-span-2">
                <RefField label="Reason for Leaving" value={form.reason_for_leaving} onChange={v => set("reason_for_leaving", v)} />
              </div>
            </>) : (<>
              <RefField label="Relationship to Candidate" value={form.relationship_to_candidate} onChange={v => set("relationship_to_candidate", v)} placeholder="e.g. Friend, Mentor, Colleague" />
              <RefField label="How Long Known" value={form.known_duration} onChange={v => set("known_duration", v)} placeholder="e.g. 3 years" />
            </>)}
          </div>
          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="h-8 px-4 rounded-lg bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? "Saving…" : "Save Referee"}
            </button>
          </div>
        </div>
      )}

      {/* Reference rows */}
      {references.length === 0 && !showForm ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No referees added yet. Click &ldquo;Add Referee&rdquo; to add one manually, or they will be imported automatically when the candidate submits their registration form.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {references.map((ref) => {
            const typeLabel = ref.ref_type === "character" ? "Character" : "Work";
            const slotLabel = ref.ref_number != null ? `#${ref.ref_number}` : "";
            const isReceived = ref.status === "received" || !!ref.received_at;
            const isPending = ref.status === "pending" || !ref.status;
            const stage = ref.reminder_stage ?? 0;
            const stageLabel = CHASE_STAGE_LABELS[Math.min(stage, 6)];
            const nextChase = ref.next_reminder_at ? new Date(ref.next_reminder_at) : null;
            const nextChaseStr = nextChase
              ? nextChase.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
              : null;
            const isEditing = editingId === ref.id;
            const isEmailRow = emailRowId === ref.id;

            return (
              <div key={ref.id} className="px-6 py-4">
                {/* Main row */}
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {ref.referee_name ?? "—"}
                        {ref.company_name && <span className="text-muted-foreground font-normal"> — {ref.company_name}</span>}
                      </p>
                      {ref.short_code && (
                        <span
                          title="Short code for phone/verbal reference submission"
                          className="inline-flex items-center h-5 px-2 rounded font-mono text-[10px] tracking-widest bg-slate-100 text-slate-600 border border-slate-200 cursor-default select-all"
                          onClick={() => { navigator.clipboard.writeText(ref.short_code!); toast.success("Code copied"); }}
                        >
                          {ref.short_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel} Reference {slotLabel}
                      {ref.referee_email && <> · {ref.referee_email}</>}
                      {ref.requested_at && <> · Requested {fmtDate(ref.requested_at)}</>}
                      {ref.received_at && <> · Received {fmtDate(ref.received_at)}</>}
                    </p>
                    {!isReceived && !isPending && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Bell className="h-3 w-3 text-amber-500" />
                        <span>{stageLabel}</span>
                        {nextChaseStr && stage < 6 && (
                          <span className="text-amber-600">· Next chase {nextChaseStr}</span>
                        )}
                        {stage >= 6 && <span className="text-red-500">· Chase sequence complete — no response</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isReceived ? (
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Received</span>
                    ) : isPending ? (
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Pending Send</span>
                    ) : (
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Chasing</span>
                    )}
                    {/* Edit button */}
                    <button
                      onClick={() => {
                        if (isEditing) { setEditingId(null); } else { startEdit(ref); }
                        setEmailRowId(null);
                      }}
                      className={`inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium transition-colors ${isEditing ? "bg-muted/60" : "hover:bg-muted/40"}`}>
                      {isEditing ? <X className="h-3 w-3" /> : null}
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    {/* Send / Resend */}
                    {!isReceived && (
                      <button
                        onClick={async () => {
                          if (!ref.referee_email) { toast.error("No email address on this reference."); return; }
                          const { error } = await supabase.functions.invoke("send-reference-request", { body: { reference_id: ref.id } });
                          if (error) { toast.error("Failed to send: " + error.message); }
                          else { toast.success(`Request sent to ${ref.referee_name ?? ref.referee_email}`); await onRefresh(); }
                        }}
                        className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40 transition-colors">
                        <Mail className="h-3 w-3" /> {isPending ? "Send" : "Resend"}
                      </button>
                    )}
                    {/* Update email button (only if not received) */}
                    {!isReceived && (
                      <button
                        onClick={() => {
                          if (isEmailRow) { setEmailRowId(null); setNewEmail(""); }
                          else { setEmailRowId(ref.id); setNewEmail(ref.referee_email ?? ""); setEditingId(null); }
                        }}
                        className={`inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium transition-colors ${isEmailRow ? "bg-muted/60" : "hover:bg-muted/40"}`}>
                        {isEmailRow ? <X className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {isEmailRow ? "Cancel" : "Update Email"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Update Email panel */}
                {isEmailRow && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/10 border border-border/60 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">New Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="referee@example.com"
                        className="w-full h-8 px-3 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-teal/40"
                      />
                    </div>
                    <button
                      onClick={() => sendUpdateEmail(ref.id)}
                      disabled={emailSending}
                      className="mt-4 h-8 px-4 rounded-lg bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0">
                      {emailSending ? "Sending…" : "Update & Resend"}
                    </button>
                    <p className="mt-4 text-[10px] text-muted-foreground max-w-[180px] leading-tight shrink-0">
                      Old link and short code will be invalidated. A fresh request is sent to the new address.
                    </p>
                  </div>
                )}

                {/* Edit details panel */}
                {isEditing && (
                  <div className="mt-3 p-4 rounded-lg bg-muted/10 border border-border/60 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Edit referee details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <RefField label="Referee Name *" value={editForm.referee_name ?? ""} onChange={v => setEdit("referee_name", v)} />
                      <RefField label="Referee Phone" value={editForm.referee_phone ?? ""} onChange={v => setEdit("referee_phone", v)} />
                      {ref.ref_type === "work" ? (<>
                        <RefField label="Their Job Title" value={editForm.referee_job_title ?? ""} onChange={v => setEdit("referee_job_title", v)} />
                        <RefField label="Company Name" value={editForm.company_name ?? ""} onChange={v => setEdit("company_name", v)} />
                        <RefField label="Candidate's Job Title There" value={editForm.candidate_position ?? ""} onChange={v => setEdit("candidate_position", v)} />
                        <RefField label="Start Date" value={editForm.employment_start_date ?? ""} onChange={v => setEdit("employment_start_date", v)} type="date" />
                        <RefField label="End Date" value={editForm.employment_end_date ?? ""} onChange={v => setEdit("employment_end_date", v)} type="date" disabled={editForm.is_current_role ?? false} />
                        <div className="flex items-center gap-2 pt-1">
                          <input type="checkbox" id={`edit_current_${ref.id}`} checked={editForm.is_current_role ?? false}
                            onChange={e => { setEdit("is_current_role", e.target.checked); if (e.target.checked) setEdit("employment_end_date", ""); }}
                            className="h-4 w-4 rounded border-border" />
                          <label htmlFor={`edit_current_${ref.id}`} className="text-xs text-muted-foreground">Current role</label>
                        </div>
                        <div className="col-span-2">
                          <RefField label="Reason for Leaving" value={editForm.reason_for_leaving ?? ""} onChange={v => setEdit("reason_for_leaving", v)} />
                        </div>
                      </>) : (<>
                        <RefField label="Relationship to Candidate" value={editForm.relationship_to_candidate ?? ""} onChange={v => setEdit("relationship_to_candidate", v)} placeholder="e.g. Friend, Mentor, Colleague" />
                        <RefField label="How Long Known" value={editForm.known_duration ?? ""} onChange={v => setEdit("known_duration", v)} placeholder="e.g. 3 years" />
                      </>)}
                    </div>
                    <div className="flex items-center gap-2 justify-between pt-1">
                      <p className="text-[10px] text-muted-foreground">To change the email address, use &ldquo;Update Email&rdquo; — this generates a fresh link and short code.</p>
                      <button onClick={() => saveEdit(ref)} disabled={editSaving}
                        className="h-8 px-4 rounded-lg bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0">
                        {editSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

