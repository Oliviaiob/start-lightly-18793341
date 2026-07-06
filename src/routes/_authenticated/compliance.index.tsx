import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
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
  ShieldCheck, AlertTriangle, CheckCircle, Clock,
  UserPlus, Search, Minus, Circle, Upload, User, RefreshCw, FileText, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compliance/")({
  component: Page,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type ChecklistKey =
  | "proof_of_id" | "passport_photo" | "proof_of_address_1" | "proof_of_address_2"
  | "right_to_work" | "ni_number_check"
  | "dbs_certificate" | "dbs_update_service_check" | "childrens_barred_list"
  | "safeguarding_training_cert" | "paediatric_first_aid_cert" | "qualification_certificates"
  | "work_reference_1" | "work_reference_2" | "character_reference";

const REQUIRED_KEYS: ChecklistKey[] = [
  "proof_of_id", "passport_photo", "proof_of_address_1", "right_to_work", "ni_number_check",
  "dbs_certificate", "childrens_barred_list", "safeguarding_training_cert",
  "work_reference_1", "work_reference_2",
];

const TABLE_COLS: { key: ChecklistKey; short: string }[] = [
  { key: "proof_of_id",    short: "ID"   },
  { key: "dbs_certificate",short: "DBS"  },
  { key: "right_to_work",  short: "RTW"  },
  { key: "work_reference_1",short:"Ref1" },
  { key: "work_reference_2",short:"Ref2" },
  { key: "paediatric_first_aid_cert", short: "PFA" },
];

type ChecklistRow = Record<ChecklistKey, string | null> & {
  id: string | null; overall_status: string | null; updated_at: string | null;
};

type Candidate = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  status_temp: string | null; source: string | null;
  dbs_next_check_due: string | null; paediatric_first_aid_expiry: string | null;
  updated_at: string | null;
  checklist: ChecklistRow | null;
};

function initials(c: Candidate) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}
function fullName(c: Candidate) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown";
}
function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
  return (Object.keys(c.checklist) as ChecklistKey[]).some((k) => c.checklist![k] === "flagged");
}

function ItemIcon({ status }: { status: string | null }) {
  if (status === "verified")     return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "flagged")      return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (status === "uploaded")     return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "not_required") return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  return <Circle className="h-4 w-4 text-muted-foreground/25" />;
}

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending_compliance:     { label: "Pending",     dot: "bg-amber-400",  text: "text-amber-700",  bg: "bg-amber-100"  },
  compliance_in_progress: { label: "In Progress", dot: "bg-blue-400",   text: "text-blue-700",   bg: "bg-blue-100"   },
  compliance_review:      { label: "Review",      dot: "bg-purple-400", text: "text-purple-700", bg: "bg-purple-100" },
  active:                 { label: "Active",      dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-100"  },
  inactive:               { label: "Inactive",    dot: "bg-muted-foreground/40", text: "text-muted-foreground", bg: "bg-muted" },
};

function StatusBadge({ status }: { status: string | null }) {
  const m = STATUS_META[status ?? ""] ?? { label: status ?? "—", dot: "bg-muted-foreground/40", text: "text-muted-foreground", bg: "bg-muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[10px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ── QUAL options ──────────────────────────────────────────────────────────────
const QUAL_OPTIONS = [
  { value: "unqualified", label: "Unqualified" },
  { value: "level_2", label: "Level 2" },
  { value: "level_3", label: "Level 3" },
  { value: "room_leader", label: "Room Leader" },
  { value: "deputy_manager", label: "Deputy Manager" },
  { value: "manager", label: "Manager" },
];

// ── Add Candidate Modal ───────────────────────────────────────────────────────

function AddCandidateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "manual" | "convert">("upload");
  const [saving, setSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", ni_number: "", qualification_level: "__none__", address_line_1: "", city: "", postcode: "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const [permSearch, setPermSearch] = useState("");
  const [permDropOpen, setPermDropOpen] = useState(false);
  const [permCandidates, setPermCandidates] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [selectedPerm, setSelectedPerm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) { setTab("upload"); setFileLabel(null); setForm({ first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", ni_number: "", qualification_level: "__none__", address_line_1: "", city: "", postcode: "" }); setSelectedPerm(null); setPermSearch(""); }
  }, [open]);

  useEffect(() => {
    if (tab !== "convert") return;
    supabase.from("candidates").select("id,first_name,last_name").in("candidate_type", ["perm"]).order("first_name").then(({ data }) => setPermCandidates((data as any[]) ?? []));
  }, [tab]);

  const filteredPerm = permCandidates.filter((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(permSearch.toLowerCase()));

  const createChecklist = async (candidateId: string) => {
    await supabase.from("compliance_checklists").insert({ candidate_id: candidateId });
  };

  const saveManual = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error("Name and email required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("candidates").insert({
      first_name: form.first_name, last_name: form.last_name, email: form.email || null,
      phone: form.phone || null, date_of_birth: form.date_of_birth || null,
      ni_number: form.ni_number || null,
      qualification_level: form.qualification_level === "__none__" ? null : form.qualification_level,
      address_line1: form.address_line_1 || null, city: form.city || null, postcode: form.postcode || null,
      candidate_type: "temp", status_temp: "pending_compliance", source: "manual",
    }).select("id").single();
    if (error) { toast.error("Failed: " + error.message); setSaving(false); return; }
    await createChecklist(data.id);
    toast.success("Candidate created");
    setSaving(false); onCreated();
  };

  const saveConvert = async () => {
    if (!selectedPerm) { toast.error("Select a candidate"); return; }
    setSaving(true);
    await supabase.from("candidates").update({ candidate_type: "both", status_temp: "pending_compliance" }).eq("id", selectedPerm.id);
    await createChecklist(selectedPerm.id);
    toast.success(`${selectedPerm.name} added to temp compliance`);
    setSaving(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Temp Candidate</DialogTitle><DialogDescription>Add a candidate to the compliance pipeline.</DialogDescription></DialogHeader>
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 mt-1">
          {([{ key: "upload" as const, label: "Upload Form", Icon: Upload }, { key: "manual" as const, label: "Enter Manually", Icon: User }, { key: "convert" as const, label: "Convert Perm", Icon: RefreshCw }]).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
        {tab === "upload" && (
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">Upload a completed SOAR temp registration form (PDF). Details will be extracted for review.</p>
            <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-colors">
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFileLabel(e.target.files?.[0]?.name ?? null)} />
              {fileLabel ? <div className="flex items-center justify-center gap-2"><FileText className="h-5 w-5 text-teal" /><span className="text-sm font-medium text-teal">{fileLabel}</span></div>
                : <><Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" /><span className="text-sm text-muted-foreground">Click to upload PDF</span></>}
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { toast.info("Form uploaded — candidate will be created once reviewed"); onCreated(); }} disabled={!fileLabel}
                className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">Submit for review</button>
            </div>
          </div>
        )}
        {tab === "manual" && (
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">First name *</label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-10" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Last name *</label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-10" /></div>
              <div className="space-y-1 col-span-2"><label className="text-xs font-medium text-muted-foreground">Email *</label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-10" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-10" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Date of birth</label><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className="h-10" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">NI number</label><Input value={form.ni_number} onChange={(e) => set("ni_number", e.target.value)} className="h-10" /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Qualification</label>
                <Select value={form.qualification_level} onValueChange={(v) => set("qualification_level", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">— Select —</SelectItem>{QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1 col-span-2"><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={form.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} placeholder="Address line 1" className="h-10" /></div>
              <div className="space-y-1"><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className="h-10" /></div>
              <div className="space-y-1"><Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} placeholder="Postcode" className="h-10" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveManual} disabled={saving} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Creating…" : "Create candidate"}</button>
            </div>
          </div>
        )}
        {tab === "convert" && (
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">Select an existing permanent candidate to add to the temp compliance pipeline.</p>
            <div className="relative">
              {selectedPerm && !permDropOpen
                ? <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40" onClick={() => { setPermDropOpen(true); setPermSearch(""); }}><span className="font-medium">{selectedPerm.name}</span><span className="text-xs text-muted-foreground">change</span></div>
                : <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={permSearch} onChange={(e) => { setPermSearch(e.target.value); setPermDropOpen(true); }} onFocus={() => setPermDropOpen(true)} placeholder="Search permanent candidates…" className="h-10 pl-9" /></div>}
              {permDropOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredPerm.length === 0 ? <div className="px-4 py-3 text-sm text-muted-foreground">No permanent candidates found</div>
                    : filteredPerm.map((c) => (<button key={c.id} onMouseDown={() => { setSelectedPerm({ id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() }); setPermDropOpen(false); setPermSearch(""); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60">{c.first_name} {c.last_name}</button>))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveConvert} disabled={saving || !selectedPerm} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Converting…" : "Add to temp compliance"}</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterKey = "all" | "pending_compliance" | "compliance_in_progress" | "compliance_review" | "active";

const STAT_TILES: { key: FilterKey; label: string; dotClass: string; textClass: string; borderClass: string }[] = [
  { key: "all",                    label: "All",         dotClass: "bg-navy",          textClass: "text-navy",          borderClass: "border-navy/20"    },
  { key: "pending_compliance",     label: "Pending",     dotClass: "bg-amber-400",     textClass: "text-amber-400",     borderClass: "border-amber-200"  },
  { key: "compliance_in_progress", label: "In Progress", dotClass: "bg-blue-400",      textClass: "text-blue-700",      borderClass: "border-blue-200"   },
  { key: "compliance_review",      label: "Review",      dotClass: "bg-purple-400",    textClass: "text-purple-700",    borderClass: "border-purple-200" },
  { key: "active",                 label: "Active",      dotClass: "bg-green-500",     textClass: "text-green-700",     borderClass: "border-green-200"  },
];

function Page() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select(`id,first_name,last_name,email,phone,status_temp,source,dbs_next_check_due,paediatric_first_aid_expiry,updated_at,compliance_checklists(id,proof_of_id,passport_photo,proof_of_address_1,proof_of_address_2,right_to_work,ni_number_check,dbs_certificate,dbs_update_service_check,childrens_barred_list,safeguarding_training_cert,paediatric_first_aid_cert,qualification_certificates,work_reference_1,work_reference_2,character_reference,overall_status,updated_at)`)
      .in("candidate_type", ["temp", "both"])
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load"); setLoading(false); return; }
    const mapped: Candidate[] = ((data ?? []) as any[]).map((c) => ({
      id: c.id, first_name: c.first_name, last_name: c.last_name,
      email: c.email, phone: c.phone, status_temp: c.status_temp, source: c.source,
      dbs_next_check_due: c.dbs_next_check_due, paediatric_first_aid_expiry: c.paediatric_first_aid_expiry,
      updated_at: c.updated_at, checklist: c.compliance_checklists?.[0] ?? null,
    }));
    setCandidates(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: candidates.length, pending_compliance: 0, compliance_in_progress: 0, compliance_review: 0, active: 0 };
    candidates.forEach((cand) => { const s = cand.status_temp ?? ""; if (c[s] !== undefined) c[s]++; });
    return c;
  }, [candidates]);

  const today = new Date().toISOString().slice(0, 10);
  const in60  = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in90  = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dbsDue    = candidates.filter((c) => c.dbs_next_check_due && c.dbs_next_check_due <= in60 && c.dbs_next_check_due >= today);
  const pfaDue    = candidates.filter((c) => c.paediatric_first_aid_expiry && c.paediatric_first_aid_expiry <= in90 && c.paediatric_first_aid_expiry >= today);
  const flagged   = candidates.filter(isFlagged);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return candidates.filter((c) => {
      if (activeFilter !== "all" && c.status_temp !== activeFilter) return false;
      if (needle) {
        const hay = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [candidates, activeFilter, q]);

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

      {/* Alert banners */}
      {!loading && (flagged.length > 0 || dbsDue.length > 0 || pfaDue.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {flagged.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <strong>{flagged.length} candidate{flagged.length > 1 ? "s" : ""}</strong> with flagged items —{" "}
              {flagged.slice(0, 2).map(fullName).join(", ")}{flagged.length > 2 ? ` +${flagged.length - 2} more` : ""}
            </div>
          )}
          {dbsDue.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <strong>{dbsDue.length}</strong> DBS re-check{dbsDue.length > 1 ? "s" : ""} due within 60 days
            </div>
          )}
          {pfaDue.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <strong>{pfaDue.length}</strong> PFA certificate{pfaDue.length > 1 ? "s" : ""} expiring within 90 days
            </div>
          )}
        </div>
      )}

      {/* Clickable stat tiles — these ARE the filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_TILES.map((tile) => {
          const isActive = activeFilter === tile.key;
          return (
            <button key={tile.key} onClick={() => setActiveFilter(tile.key)}
              className={`rounded-2xl p-4 text-left border transition-all hover:shadow-md ${
                isActive
                  ? `border-2 ${tile.borderClass} bg-card shadow-md`
                  : "border-transparent bg-card shadow-[var(--shadow-card)] opacity-70 hover:opacity-100"
              }`}>
              <div className={`text-[11px] uppercase tracking-widest font-semibold mb-1 ${isActive ? tile.textClass : "text-muted-foreground"}`}>
                {tile.label}
              </div>
              <div className={`text-3xl font-bold ${isActive ? tile.textClass : "text-foreground"}`}>
                {counts[tile.key] ?? 0}
              </div>
              {isActive && <div className={`h-0.5 rounded-full mt-2 ${tile.dotClass}`} />}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates…"
              className="pl-9 h-8 rounded-full bg-muted/50 border-transparent text-xs" />
          </div>
        </div>

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
                  {TABLE_COLS.map((col) => <th key={col.key} className="text-center font-semibold py-2.5 px-2">{col.short}</th>)}
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
                    <tr key={c.id} onClick={() => navigate({ to: "/compliance/$id", params: { id: c.id } })}
                      className={`border-b last:border-0 hover:bg-muted/10 cursor-pointer transition-colors ${flaggedRow ? "bg-red-50/40" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${c.source === "app" ? "bg-teal" : "bg-navy"}`}>
                            {initials(c)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{fullName(c)}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {c.source === "app" ? <><Smartphone className="h-2.5 w-2.5 text-teal" /><span className="text-teal font-medium">App</span></> : <span>Manual</span>}
                              {c.email && <span className="truncate max-w-[140px]">· {c.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={c.status_temp} /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-teal"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{p.done}/{p.total}</span>
                        </div>
                      </td>
                      {TABLE_COLS.map((col) => (
                        <td key={col.key} className="py-3 px-2 text-center">
                          <div className="flex justify-center"><ItemIcon status={c.checklist?.[col.key] ?? null} /></div>
                        </td>
                      ))}
                      <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtShort(c.updated_at)}
                        {dbsWarn && <div className="text-[10px] text-amber-600 font-medium">DBS {fmtShort(c.dbs_next_check_due)}</div>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={(e) => { e.stopPropagation(); navigate({ to: "/compliance/$id", params: { id: c.id } }); }}
                          className="h-7 px-3 rounded-full bg-navy/10 text-navy text-xs font-medium hover:bg-navy/20 transition-colors">
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

      <AddCandidateModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
    </div>
  );
}
