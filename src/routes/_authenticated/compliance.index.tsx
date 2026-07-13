import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  ChevronDown, Activity, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { AddTempCandidateModal } from "@/components/add-temp-candidate-modal";

type ActivityItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  label: string;
  at: string;
  source: "document" | "reference";
};

const DOC_LABELS: Record<string, string> = {
  proof_of_id: "Proof of ID",
  proof_of_address_1: "Proof of Address 1",
  proof_of_address_2: "Proof of Address 2",
  passport_photo: "Passport Photo",
  dbs_certificate: "DBS Certificate",
  right_to_work: "Right to Work",
  ni_number_check: "NI Number",
  qualification_certificates: "Qualification Certificate",
  paediatric_first_aid_cert: "Paediatric First Aid",
  safeguarding_training_cert: "Safeguarding Certificate",
  cv: "CV",
  signature: "Signature",
};

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
  welcome_call_booked_at: string | null;
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
    (k) => c.checklist![k] === "approved" || c.checklist![k] === "not_required"
  ).length;
  return { done, total: REQUIRED_KEYS.length };
}

function isFlagged(c: Candidate) {
  if (!c.checklist) return false;
  return (Object.keys(c.checklist) as ChecklistKey[]).some((k) => c.checklist![k] === "rejected");
}

function ItemIcon({ status }: { status: string | null }) {
  if (status === "approved")     return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "rejected")     return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (status === "uploaded")     return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "not_required") return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  return <Circle className="h-4 w-4 text-muted-foreground/25" />;
}


function WelcomeCallIcon({ date }: { date: string | null }) {
  if (!date) return <Circle className="h-4 w-4 text-muted-foreground/25" />;
  const isPast = new Date(date) <= new Date();
  if (isPast) return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <Clock className="h-4 w-4 text-blue-500" />;
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
  const [activityOpen, setActivityOpen] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select(`id,first_name,last_name,email,phone,status_temp,source,dbs_next_check_due,paediatric_first_aid_expiry,welcome_call_booked_at,updated_at,compliance_checklists(id,proof_of_id,passport_photo,proof_of_address_1,proof_of_address_2,right_to_work,ni_number_check,dbs_certificate,dbs_update_service_check,childrens_barred_list,safeguarding_training_cert,paediatric_first_aid_cert,qualification_certificates,work_reference_1,work_reference_2,character_reference,overall_status,updated_at)`)
      .in("candidate_type", ["temp", "both"])
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load"); setLoading(false); return; }
    const mapped: Candidate[] = ((data ?? []) as any[]).map((c) => ({
      id: c.id, first_name: c.first_name, last_name: c.last_name,
      email: c.email, phone: c.phone, status_temp: c.status_temp, source: c.source,
      dbs_next_check_due: c.dbs_next_check_due, paediatric_first_aid_expiry: c.paediatric_first_aid_expiry,
      welcome_call_booked_at: c.welcome_call_booked_at ?? null,
      updated_at: c.updated_at, checklist: c.compliance_checklists?.[0] ?? null,
    }));
    setCandidates(mapped);

    // Load recent activity: document uploads + reference submissions
    const [{ data: docData }, { data: refData }] = await Promise.all([
      (supabase as any)
        .from("candidate_documents")
        .select("id, candidate_id, document_type, file_name, uploaded_at, candidates(first_name, last_name)")
        .order("uploaded_at", { ascending: false })
        .limit(30),
      (supabase as any)
        .from("references")
        .select("id, candidate_id, ref_type, ref_number, created_at, candidates(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const docItems: ActivityItem[] = (docData ?? []).map((d: any) => ({
      id: `doc-${d.id}`,
      candidateId: d.candidate_id,
      candidateName: `${d.candidates?.first_name ?? ""} ${d.candidates?.last_name ?? ""}`.trim() || "Unknown",
      label: `uploaded ${DOC_LABELS[d.document_type] ?? d.document_type}`,
      at: d.uploaded_at,
      source: "document",
    }));
    const refItems: ActivityItem[] = (refData ?? []).map((r: any) => ({
      id: `ref-${r.id}`,
      candidateId: r.candidate_id,
      candidateName: `${r.candidates?.first_name ?? ""} ${r.candidates?.last_name ?? ""}`.trim() || "Unknown",
      label: `submitted ${r.ref_type === "character" ? "Character Reference" : `Work Reference ${r.ref_number}`} details`,
      at: r.created_at,
      source: "reference",
    }));
    const merged = [...docItems, ...refItems].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20);
    setActivity(merged);
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

      {/* Latest Activity */}
      {activity.length > 0 && (
        <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
          <button
            onClick={() => setActivityOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-foreground" />
              <span className="text-sm font-semibold">Latest Activity</span>
              <span className="text-xs text-muted-foreground ml-1">({activity.length} recent actions)</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${activityOpen ? "rotate-180" : ""}`} />
          </button>
          {activityOpen && (
            <ul className="divide-y border-t">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${item.source === "document" ? "bg-teal" : "bg-purple-400"}`} />
                    <span className="font-medium text-foreground flex-shrink-0">{item.candidateName}</span>
                    <span className="text-muted-foreground truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
                      {new Date(item.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link
                      to="/compliance/$id"
                      params={{ id: item.candidateId }}
                      className="text-xs text-teal font-medium hover:opacity-80 whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
                  <th className="text-center font-semibold py-2.5 px-2" title="Welcome Call"><Phone className="h-3.5 w-3.5 mx-auto" /></th>
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
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center"><WelcomeCallIcon date={c.welcome_call_booked_at} /></div>
                      </td>
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

      <AddTempCandidateModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
    </div>
  );
}
