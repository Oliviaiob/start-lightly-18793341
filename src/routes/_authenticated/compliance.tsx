import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle, XCircle,
  UserPlus, Search, ChevronRight, X, FileText, Smartphone,
  Minus, Circle, RefreshCw, Upload, User, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compliance")({
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
  { key: "proof_of_id",              label: "Proof of ID",              group: "Identity",    required: true  },
  { key: "passport_photo",           label: "Passport Photo",           group: "Identity",    required: true  },
  { key: "proof_of_address_1",       label: "Proof of Address 1",       group: "Identity",    required: true  },
  { key: "proof_of_address_2",       label: "Proof of Address 2",       group: "Identity",    required: false },
  { key: "right_to_work",            label: "Right to Work",            group: "RTW",         required: true  },
  { key: "ni_number_check",          label: "NI Number",                group: "RTW",         required: true  },
  { key: "dbs_certificate",          label: "DBS Certificate",          group: "DBS",         required: true  },
  { key: "dbs_update_service_check", label: "DBS Update Service",       group: "DBS",         required: false },
  { key: "childrens_barred_list",    label: "Children's Barred List",   group: "DBS",         required: true  },
  { key: "safeguarding_training_cert", label: "Safeguarding Training",  group: "Training",    required: true  },
  { key: "paediatric_first_aid_cert",  label: "Paediatric First Aid",   group: "Training",    required: false },
  { key: "qualification_certificates", label: "Qualifications",         group: "Training",    required: false },
  { key: "work_reference_1",         label: "Work Reference 1",         group: "References",  required: true  },
  { key: "work_reference_2",         label: "Work Reference 2",         group: "References",  required: true  },
  { key: "character_reference",      label: "Character Reference",      group: "References",  required: false },
];

const REQUIRED_KEYS = CHECKLIST_ITEMS.filter((i) => i.required).map((i) => i.key);
const GROUPS = ["Identity", "RTW", "DBS", "Training", "References"] as const;

// Summary columns shown in the table
const TABLE_COLS: { key: ChecklistKey; short: string }[] = [
  { key: "proof_of_id",    short: "ID"   },
  { key: "dbs_certificate",short: "DBS"  },
  { key: "right_to_work",  short: "RTW"  },
  { key: "work_reference_1",short: "Ref1"},
  { key: "work_reference_2",short: "Ref2"},
  { key: "paediatric_first_aid_cert", short: "PFA" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ChecklistRow = Record<ChecklistKey, string | null> & {
  id: string | null; overall_status: string | null; updated_at: string | null;
  item_notes: Record<string, string>;
};

type Candidate = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  status_temp: string | null; source: string | null;
  dbs_next_check_due: string | null; paediatric_first_aid_expiry: string | null;
  updated_at: string | null; onboarding_complete: boolean | null;
  checklist: ChecklistRow | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(c: Candidate) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}
function fullName(c: Candidate) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown";
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function progress(c: Candidate) {
  if (!c.checklist) return { done: 0, total: REQUIRED_KEYS.length };
  const done = REQUIRED_KEYS.filter(
    (k) => c.checklist![k] === "verified" || c.checklist![k] === "not_required"
  ).length;
  return { done, total: REQUIRED_KEYS.length };
}

function isFlagged(c: Candidate) {
  if (!c.checklist) return false;
  return CHECKLIST_ITEMS.some((i) => c.checklist![i.key] === "flagged");
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending_compliance:     { label: "Pending",     bg: "bg-amber-100",    text: "text-amber-700"    },
  compliance_in_progress: { label: "In Progress", bg: "bg-blue-100",     text: "text-blue-700"     },
  compliance_review:      { label: "Review",      bg: "bg-purple-100",   text: "text-purple-700"   },
  active:                 { label: "Active",      bg: "bg-green-100",    text: "text-green-700"    },
  inactive:               { label: "Inactive",    bg: "bg-muted",        text: "text-muted-foreground" },
  placed:                 { label: "Placed",      bg: "bg-navy/10",      text: "text-navy"         },
};

function StatusBadge({ status }: { status: string | null }) {
  const m = STATUS_META[status ?? ""] ?? { label: status ?? "—", bg: "bg-muted", text: "text-muted-foreground" };
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ── Item status icon ──────────────────────────────────────────────────────────

function ItemIcon({ status }: { status: string | null }) {
  if (status === "verified")      return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "flagged")       return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (status === "uploaded")      return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "not_required")  return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  return <Circle className="h-4 w-4 text-muted-foreground/25" />;
}

// ── Review Panel ──────────────────────────────────────────────────────────────

const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "pending",      label: "Pending"      },
  { value: "uploaded",     label: "Uploaded"     },
  { value: "verified",     label: "Verified"     },
  { value: "flagged",      label: "Flagged"      },
  { value: "not_required", label: "Not Required" },
];

function ReviewPanel({ candidate, onClose, onUpdated }: {
  candidate: Candidate | null; onClose: () => void; onUpdated: () => void;
}) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    if (!candidate) { setChecklist(null); return; }
    setChecklist(candidate.checklist ? { ...candidate.checklist } : null);
    setNewStatus(candidate.status_temp ?? "pending_compliance");
  }, [candidate]);

  if (!candidate) return null;

  const updateItem = async (key: ChecklistKey, value: ItemStatus) => {
    setSaving(key);
    const cl = checklist;
    const base = { candidate_id: candidate.id, [key]: value };

    if (cl?.id) {
      await supabase.from("compliance_checklists").update({ [key]: value }).eq("id", cl.id);
    } else {
      await supabase.from("compliance_checklists").insert(base);
    }
    setSaving(null);
    setChecklist((prev) => prev ? { ...prev, [key]: value } : { ...Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, null])) as any, id: null, overall_status: null, updated_at: null, item_notes: {}, [key]: value });
    onUpdated();
  };

  const saveStatus = async () => {
    if (!newStatus || newStatus === candidate.status_temp) return;
    await supabase.from("candidates").update({ status_temp: newStatus }).eq("id", candidate.id);
    toast.success("Status updated");
    onUpdated();
  };

  const p = progress(candidate);
  const allRequired = p.done === p.total;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[480px] bg-card shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-navy flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{initials(candidate)}</span>
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{fullName(candidate)}</div>
              <div className="text-white/60 text-xs">{candidate.email ?? candidate.phone ?? "—"}</div>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 ml-3">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          {/* Status + progress */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newStatus !== candidate.status_temp && (
                    <button onClick={saveStatus}
                      className="h-8 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90">
                      Save
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                {candidate.source === "app" && (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/10 text-teal-foreground mb-1">
                    <Smartphone className="h-2.5 w-2.5" /> App
                  </span>
                )}
                <span className="text-sm font-bold">{p.done}/{p.total}</span>
                <span className="text-[10px] text-muted-foreground">required items</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-teal rounded-full transition-all"
                style={{ width: `${(p.done / p.total) * 100}%` }} />
            </div>
            {allRequired && (
              <div className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> All required items complete
              </div>
            )}
          </div>

          {/* Expiry alerts */}
          {(() => {
            const dbsDays = daysUntil(candidate.dbs_next_check_due);
            const pfaDays = daysUntil(candidate.paediatric_first_aid_expiry);
            const alerts = [];
            if (dbsDays !== null && dbsDays <= 60)
              alerts.push({ label: "DBS re-check due", date: candidate.dbs_next_check_due, days: dbsDays });
            if (pfaDays !== null && pfaDays <= 90)
              alerts.push({ label: "PFA expiry", date: candidate.paediatric_first_aid_expiry, days: pfaDays });
            if (alerts.length === 0) return null;
            return (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.label} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${a.days <= 14 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{a.label}: <strong>{fmtDate(a.date)}</strong></span>
                    <span className="ml-auto font-medium">{a.days <= 0 ? "Overdue" : `${a.days}d`}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Checklist groups */}
          {GROUPS.map((group) => {
            const items = CHECKLIST_ITEMS.filter((i) => i.group === group);
            return (
              <div key={group} className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground px-1">{group}</div>
                {items.map((item) => {
                  const val = (checklist?.[item.key] ?? "pending") as ItemStatus;
                  return (
                    <div key={item.key} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2.5">
                      <div className="flex-shrink-0"><ItemIcon status={val} /></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">{item.label}</span>
                        {!item.required && <span className="ml-1.5 text-[10px] text-muted-foreground/60">optional</span>}
                      </div>
                      <Select value={val} onValueChange={(v) => updateItem(item.key, v as ItemStatus)}
                        disabled={saving === item.key}>
                        <SelectTrigger className="h-7 w-32 text-[10px] rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => navigate({ to: "/candidates/$id", params: { id: candidate.id } })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Full profile
          </button>
          <button onClick={onClose} className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Candidate Modal ───────────────────────────────────────────────────────

const QUAL_OPTIONS = [
  { value: "unqualified", label: "Unqualified" },
  { value: "level_2",     label: "Level 2"     },
  { value: "level_3",     label: "Level 3"     },
  { value: "room_leader", label: "Room Leader" },
  { value: "deputy_manager", label: "Deputy Manager" },
  { value: "manager",     label: "Manager"     },
];

function AddCandidateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "manual" | "convert">("upload");
  const [saving, setSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  // Manual form
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    date_of_birth: "", ni_number: "", qualification_level: "__none__",
    address_line_1: "", city: "", postcode: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Convert perm
  const [permSearch, setPermSearch] = useState("");
  const [permDropOpen, setPermDropOpen] = useState(false);
  const [permCandidates, setPermCandidates] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([]);
  const [selectedPerm, setSelectedPerm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) { setTab("upload"); setFileLabel(null); setForm({ first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", ni_number: "", qualification_level: "__none__", address_line_1: "", city: "", postcode: "" }); setSelectedPerm(null); setPermSearch(""); }
  }, [open]);

  useEffect(() => {
    if (tab !== "convert") return;
    supabase.from("candidates").select("id,first_name,last_name,email")
      .in("candidate_type", ["perm"]).order("first_name")
      .then(({ data }) => setPermCandidates((data as any[]) ?? []));
  }, [tab]);

  const filteredPerm = permCandidates.filter((c) =>
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(permSearch.toLowerCase())
  );

  const createChecklist = async (candidateId: string) => {
    await supabase.from("compliance_checklists").insert({ candidate_id: candidateId });
  };

  const saveManual = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error("Name and email required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("candidates").insert({
      first_name: form.first_name, last_name: form.last_name,
      email: form.email || null, phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      ni_number: form.ni_number || null,
      qualification_level: form.qualification_level === "__none__" ? null : form.qualification_level,
      address_line1: form.address_line_1 || null,
      city: form.city || null, postcode: form.postcode || null,
      candidate_type: "temp", status_temp: "pending_compliance",
      source: "manual",
    }).select("id").single();
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }
    await createChecklist(data.id);
    toast.success("Candidate created");
    setSaving(false);
    onCreated();
  };

  const saveUpload = async () => {
    if (!fileLabel) { toast.error("Please select a file"); return; }
    toast.info("Form uploaded — candidate will be created once reviewed");
    onCreated();
  };

  const saveConvert = async () => {
    if (!selectedPerm) { toast.error("Select a candidate to convert"); return; }
    setSaving(true);
    await supabase.from("candidates").update({ candidate_type: "both", status_temp: "pending_compliance" }).eq("id", selectedPerm.id);
    await createChecklist(selectedPerm.id);
    toast.success(`${selectedPerm.name} added to temp compliance`);
    setSaving(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Temp Candidate</DialogTitle>
          <DialogDescription>Add a candidate to the compliance pipeline.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 mt-1">
          {([
            { key: "upload", label: "Upload Form", Icon: Upload },
            { key: "manual", label: "Enter Manually", Icon: User },
            { key: "convert", label: "Convert Perm", Icon: RefreshCw },
          ] as const).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Upload Form */}
        {tab === "upload" && (
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">Upload a completed SOAR temp registration form (PDF). We'll extract the details for you to review.</p>
            <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-colors">
              <input type="file" accept=".pdf" className="hidden"
                onChange={(e) => setFileLabel(e.target.files?.[0]?.name ?? null)} />
              {fileLabel ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-teal" />
                  <span className="text-sm font-medium text-teal">{fileLabel}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload PDF</span>
                </>
              )}
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveUpload} disabled={!fileLabel}
                className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Submit for review
              </button>
            </div>
          </div>
        )}

        {/* Enter Manually */}
        {tab === "manual" && (
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">First name *</label>
                <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Last name *</label>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date of birth</label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">NI number</label>
                <Input value={form.ni_number} onChange={(e) => set("ni_number", e.target.value)} className="h-10" placeholder="e.g. AB 12 34 56 C" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Qualification</label>
                <Select value={form.qualification_level} onValueChange={(v) => set("qualification_level", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <Input value={form.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} placeholder="Address line 1" className="h-10" />
              </div>
              <div className="space-y-1">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className="h-10" />
              </div>
              <div className="space-y-1">
                <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} placeholder="Postcode" className="h-10" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveManual} disabled={saving}
                className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Creating…" : "Create candidate"}
              </button>
            </div>
          </div>
        )}

        {/* Convert Perm */}
        {tab === "convert" && (
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">Select an existing permanent candidate to add to the temp compliance pipeline. Their profile will be updated to include temporary work.</p>
            <div className="relative">
              {selectedPerm && !permDropOpen ? (
                <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => { setPermDropOpen(true); setPermSearch(""); }}>
                  <span className="font-medium">{selectedPerm.name}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={permSearch} onChange={(e) => { setPermSearch(e.target.value); setPermDropOpen(true); }}
                    onFocus={() => setPermDropOpen(true)} placeholder="Search permanent candidates…" className="h-10 pl-9" />
                </div>
              )}
              {permDropOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredPerm.length === 0
                    ? <div className="px-4 py-3 text-sm text-muted-foreground">No permanent candidates found</div>
                    : filteredPerm.map((c) => (
                      <button key={c.id}
                        onMouseDown={() => { setSelectedPerm({ id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() }); setPermDropOpen(false); setPermSearch(""); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60">
                        {c.first_name} {c.last_name}
                        {c.email && <span className="text-xs text-muted-foreground ml-2">{c.email}</span>}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveConvert} disabled={saving || !selectedPerm}
                className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Converting…" : "Add to temp compliance"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "all",                   label: "All"         },
  { key: "pending_compliance",    label: "Pending"     },
  { key: "compliance_in_progress",label: "In Progress" },
  { key: "compliance_review",     label: "Review"      },
  { key: "active",                label: "Active"      },
];

function Page() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [reviewing, setReviewing] = useState<Candidate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select(`id,first_name,last_name,email,phone,status_temp,source,dbs_next_check_due,paediatric_first_aid_expiry,updated_at,onboarding_complete,compliance_checklists(id,proof_of_id,passport_photo,proof_of_address_1,proof_of_address_2,right_to_work,ni_number_check,dbs_certificate,dbs_update_service_check,childrens_barred_list,safeguarding_training_cert,paediatric_first_aid_cert,qualification_certificates,work_reference_1,work_reference_2,character_reference,overall_status,updated_at,item_notes)`)
      .in("candidate_type", ["temp", "both"])
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load"); setLoading(false); return; }

    const mapped: Candidate[] = ((data ?? []) as any[]).map((c) => {
      const cl = c.compliance_checklists?.[0] ?? null;
      return {
        id: c.id, first_name: c.first_name, last_name: c.last_name,
        email: c.email, phone: c.phone, status_temp: c.status_temp,
        source: c.source, dbs_next_check_due: c.dbs_next_check_due,
        paediatric_first_aid_expiry: c.paediatric_first_aid_expiry,
        updated_at: c.updated_at, onboarding_complete: c.onboarding_complete,
        checklist: cl ? { ...cl, item_notes: cl.item_notes ?? {} } : null,
      };
    });
    setCandidates(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    STATUS_TABS.forEach((t) => { if (t.key !== "all") c[t.key] = 0; });
    candidates.forEach((cand) => {
      c["all"]++;
      const s = cand.status_temp ?? "";
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [candidates]);

  // Summary alerts
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dbsDue    = candidates.filter((c) => c.dbs_next_check_due && c.dbs_next_check_due <= in60 && c.dbs_next_check_due >= today);
  const pfaDue    = candidates.filter((c) => c.paediatric_first_aid_expiry && c.paediatric_first_aid_expiry <= in90 && c.paediatric_first_aid_expiry >= today);
  const flagged   = candidates.filter(isFlagged);
  const forReview = candidates.filter((c) => c.status_temp === "compliance_review");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return candidates.filter((c) => {
      if (tab !== "all" && c.status_temp !== tab) return false;
      if (needle) {
        const hay = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [candidates, tab, q]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pt-2">
      <PageHeader eyebrow="Operations" title="Compliance"
        description="Track DBS, references and safeguarding documents across temp candidates."
        icon={ShieldCheck}
        actions={
          <button onClick={() => setShowAdd(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Add Candidate
          </button>
        }
      />

      {/* Summary alert tiles */}
      {!loading && (forReview.length > 0 || flagged.length > 0 || dbsDue.length > 0 || pfaDue.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => setTab("compliance_review")}
            className={`rounded-2xl p-4 text-left border transition-colors hover:shadow-md ${forReview.length > 0 ? "bg-purple-50 border-purple-200" : "bg-card border-transparent shadow-[var(--shadow-card)]"}`}>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-purple-600 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-purple-700">{forReview.length}</div>
            <div className="text-xs text-purple-500 mt-0.5">awaiting sign-off</div>
          </button>
          <button onClick={() => setTab("all")}
            className={`rounded-2xl p-4 text-left border transition-colors hover:shadow-md ${flagged.length > 0 ? "bg-red-50 border-red-200" : "bg-card border-transparent shadow-[var(--shadow-card)]"}`}>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-red-600 mb-1">Flagged Items</div>
            <div className="text-2xl font-bold text-red-700">{flagged.length}</div>
            <div className="text-xs text-red-500 mt-0.5">{flagged.map((c) => fullName(c)).slice(0, 2).join(", ")}{flagged.length > 2 ? " …" : ""}</div>
          </button>
          <div className={`rounded-2xl p-4 border ${dbsDue.length > 0 ? "bg-amber-50 border-amber-200" : "bg-card border-transparent shadow-[var(--shadow-card)]"}`}>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-amber-600 mb-1">DBS Re-check Due</div>
            <div className="text-2xl font-bold text-amber-700">{dbsDue.length === 0 ? "None" : dbsDue.length}</div>
            <div className="text-xs text-amber-500 mt-0.5">{dbsDue.length > 0 ? "within 60 days" : "all up to date"}</div>
          </div>
          <div className={`rounded-2xl p-4 border ${pfaDue.length > 0 ? "bg-amber-50 border-amber-200" : "bg-card border-transparent shadow-[var(--shadow-card)]"}`}>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-amber-600 mb-1">PFA Expiry</div>
            <div className="text-2xl font-bold text-amber-700">{pfaDue.length === 0 ? "None" : pfaDue.length}</div>
            <div className="text-xs text-amber-500 mt-0.5">{pfaDue.length > 0 ? "within 90 days" : "all current"}</div>
          </div>
        </div>
      )}

      {/* Stats + filter */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 divide-x border-b text-center">
          {[
            { label: "All", count: counts["all"] ?? 0, color: "" },
            { label: "Pending",     count: counts["pending_compliance"] ?? 0,     color: "text-amber-600"  },
            { label: "In Progress", count: counts["compliance_in_progress"] ?? 0, color: "text-blue-600"   },
            { label: "Review",      count: counts["compliance_review"] ?? 0,      color: "text-purple-600" },
            { label: "Active",      count: counts["active"] ?? 0,                 color: "text-green-600"  },
          ].map((s) => (
            <div key={s.label} className="py-3 px-2">
              <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates…"
              className="pl-9 h-8 rounded-full bg-muted/50 border-transparent text-xs" />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  tab === t.key ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted/60"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No candidates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b">
                  <th className="text-left font-semibold py-2.5 px-4">Candidate</th>
                  <th className="text-left font-semibold py-2.5 px-3">Status</th>
                  <th className="text-left font-semibold py-2.5 px-3">Progress</th>
                  {TABLE_COLS.map((col) => (
                    <th key={col.key} className="text-center font-semibold py-2.5 px-2">{col.short}</th>
                  ))}
                  <th className="text-left font-semibold py-2.5 px-3">Updated</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const p = progress(c);
                  const pct = Math.round((p.done / p.total) * 100);
                  const flaggedRow = isFlagged(c);
                  const dbsWarn = c.dbs_next_check_due && daysUntil(c.dbs_next_check_due)! <= 60;
                  return (
                    <tr key={c.id}
                      onClick={() => setReviewing(c)}
                      className={`border-b last:border-0 hover:bg-muted/10 cursor-pointer transition-colors ${flaggedRow ? "bg-red-50/30" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${c.source === "app" ? "bg-teal" : "bg-navy"}`}>
                            {initials(c)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{fullName(c)}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {c.source === "app"
                                ? <><Smartphone className="h-2.5 w-2.5 text-teal" /><span className="text-teal font-medium">App</span></>
                                : <span>Manual</span>}
                              {c.email && <span className="truncate max-w-[140px]">· {c.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={c.status_temp} /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-teal"}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{p.done}/{p.total}</span>
                        </div>
                      </td>
                      {TABLE_COLS.map((col) => (
                        <td key={col.key} className="py-3 px-2 text-center">
                          <div className="flex justify-center">
                            <ItemIcon status={c.checklist?.[col.key] ?? null} />
                          </div>
                        </td>
                      ))}
                      <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtShort(c.updated_at)}
                        {dbsWarn && <div className="text-[10px] text-amber-600 font-medium">DBS due {fmtShort(c.dbs_next_check_due)}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={(e) => { e.stopPropagation(); setReviewing(c); }}
                          className="h-7 px-3 rounded-full bg-navy/10 text-navy text-xs font-medium hover:bg-navy/20 transition-colors whitespace-nowrap">
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddCandidateModal open={showAdd} onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); load(); }} />

      <ReviewPanel
        candidate={reviewing}
        onClose={() => setReviewing(null)}
        onUpdated={() => { load(); setReviewing((prev) => {
          if (!prev) return null;
          return candidates.find((c) => c.id === prev.id) ?? prev;
        }); }}
      />
    </div>
  );
}
