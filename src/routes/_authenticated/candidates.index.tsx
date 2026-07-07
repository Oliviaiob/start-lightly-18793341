import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Star, Search, Plus, X, Check, HelpCircle, Upload, FileText } from "lucide-react";
import { useNavigate as useNav } from "@tanstack/react-router";
import { AddTempCandidateModal } from "@/components/add-temp-candidate-modal";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";
import { fmtQual } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/candidates/")({
  validateSearch: (s: Record<string,unknown>) => ({ open: (s.open as string | undefined) }),
  component: Page,
});

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  town: string | null;
  postcode: string | null;
  candidate_type: string | null;
  status_perm: string | null;
  status_temp: string | null;
  qualification_level: string | null;
  fields_of_work: string[] | null;
  drives: boolean | null;
  current_position: string | null;
  current_employer: string | null;
  is_starred: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  dbs_verified: boolean | null;
  right_to_work_verified: boolean | null;
  contract_agreed: boolean | null;
};

const ALL = "__all__";

function initials(f?: string | null, l?: string | null) {
  return `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "?";
}

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function isCompliant(c: Candidate) {
  return !!(c.dbs_verified && c.right_to_work_verified && c.contract_agreed);
}

function TypeBadge({ type }: { type: "Perm" | "Temp" }) {
  if (type === "Perm")
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-navy text-navy-foreground">
        Perm
      </span>
    );
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-teal text-teal-foreground">
      Temp
    </span>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "navy" | "teal" }) {
  const cls =
    tone === "navy"
      ? "bg-navy/10 text-navy"
      : "bg-teal/20 text-teal-foreground";
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Page() {
  const navigate = useNavigate({ from: "/candidates" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [addTempOpen, setAddTempOpen] = useState(false);
  const [addPermOpen, setAddPermOpen] = useState(false);
  const { open: openParam } = useSearch({ from: "/_authenticated/candidates/" });
  useEffect(() => {
    if (openParam === "temp") { setAddTempOpen(true); }
    else if (openParam === "perm") { setAddPermOpen(true); }
  }, [openParam]);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  // availability: submittedThisWeek = Set of candidate_ids; timeOffToday = Map<id, title>
  const [submittedIds, setSubmittedIds]   = useState<Set<string>>(new Set());
  const [timeOffToday, setTimeOffToday]   = useState<Map<string, string>>(new Map());
  const [q, setQ] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [type, setType] = useState<string>(ALL);
  const [permStatus, setPermStatus] = useState<string>(ALL);
  const [tempStatus, setTempStatus] = useState<string>(ALL);
  const [qual, setQual] = useState<string>(ALL);
  const [field, setField] = useState<string>(ALL);
  const [drives, setDrives] = useState<string>(ALL);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("candidates")
        .select(
          "id,first_name,last_name,email,town,postcode,candidate_type,status_perm,status_temp,qualification_level,fields_of_work,drives,current_position,current_employer,is_starred,updated_at,created_at,dbs_verified,right_to_work_verified,contract_agreed",
        )
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (scope === "mine") query = query.eq("created_by", userId);
      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load candidates");
      }
      const candidates = (data as Candidate[]) || [];
      setRows(candidates);
      setLoading(false);

      // Batch-fetch availability status for temp candidates
      const tempIds = candidates
        .filter((c) => {
          const t = (c.candidate_type || "").toLowerCase();
          return t.includes("temp") || t.includes("both");
        })
        .map((c) => c.id);
      if (tempIds.length > 0) {
        const today = new Date();
        const dow = today.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        const weekStart = monday.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        const [subRes, toRes] = await Promise.all([
          (supabase as any).from("candidate_availability_submissions")
            .select("candidate_id")
            .in("candidate_id", tempIds)
            .eq("week_starting", weekStart),
          (supabase as any).from("candidate_time_off")
            .select("candidate_id,title")
            .in("candidate_id", tempIds)
            .lte("start_date", todayStr)
            .gte("end_date", todayStr),
        ]);
        setSubmittedIds(new Set((subRes.data ?? []).map((r: any) => r.candidate_id)));
        setTimeOffToday(new Map((toRes.data ?? []).map((r: any) => [r.candidate_id, r.title])));
      }
    })();
  }, [userId, scope]);

  const permStatuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status_perm).filter(Boolean))) as string[],
    [rows],
  );
  const tempStatuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status_temp).filter(Boolean))) as string[],
    [rows],
  );
  const qualifications = useMemo(
    () => Array.from(new Set(rows.map((r) => r.qualification_level).filter(Boolean))) as string[],
    [rows],
  );
  const fields = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.fields_of_work?.forEach((f) => f && s.add(f)));
    return Array.from(s);
  }, [rows]);

  const starredCount = rows.filter((r) => r.is_starred).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (starredOnly && !r.is_starred) return false;
      if (type !== ALL) {
        const t = (r.candidate_type || "").toLowerCase();
        if (type === "perm" && !t.includes("perm") && !t.includes("both")) return false;
        if (type === "temp" && !t.includes("temp") && !t.includes("both")) return false;
      }
      if (permStatus !== ALL && r.status_perm !== permStatus) return false;
      if (tempStatus !== ALL && r.status_temp !== tempStatus) return false;
      if (qual !== ALL && r.qualification_level !== qual) return false;
      if (field !== ALL && !(r.fields_of_work || []).includes(field)) return false;
      if (drives !== ALL) {
        if (drives === "yes" && r.drives !== true) return false;
        if (drives === "no" && r.drives !== false) return false;
        if (drives === "unknown" && r.drives !== null) return false;
      }
      if (needle) {
        const hay = `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.email ?? ""} ${r.postcode ?? ""} ${r.town ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, starredOnly, type, permStatus, tempStatus, qual, field, drives]);

  const hasFilters =
    !!q ||
    starredOnly ||
    type !== ALL ||
    permStatus !== ALL ||
    tempStatus !== ALL ||
    qual !== ALL ||
    field !== ALL ||
    drives !== ALL;

  const clearFilters = () => {
    setQ("");
    setStarredOnly(false);
    setType(ALL);
    setPermStatus(ALL);
    setTempStatus(ALL);
    setQual(ALL);
    setField(ALL);
    setDrives(ALL);
  };

  const toggleStar = async (id: string, current: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_starred: !current } : r)));
    const { error } = await supabase
      .from("candidates")
      .update({ is_starred: !current })
      .eq("id", id);
    if (error) {
      toast.error("Couldn't update star");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_starred: current } : r)));
    }
  };

  const openCandidate = (id: string) => {
    navigate({ to: "/candidates/$id", params: { id } });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Candidates"
        description={
          loading
            ? "Loading candidate pool…"
            : `${rows.length} total — ${filtered.length} shown`
        }
        icon={Users}
        actions={
          <>
            <button
              onClick={() => setAddTempOpen(true)}
              className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/20 inline-flex items-center gap-1.5"
            >
              Add Temporary Candidate
            </button>
            <button
              onClick={() => setAddPermOpen(true)}
              className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Permanent Candidate
            </button>
          </>
        }
      />

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, postcode..."
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>

          <button
            onClick={() => setStarredOnly((s) => !s)}
            className={`h-9 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors border ${
              starredOnly
                ? "bg-warning/20 text-[oklch(0.45_0.12_75)] border-warning/40"
                : "bg-muted/40 text-foreground/70 border-transparent hover:bg-muted"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-warning text-warning" : ""}`} />
            Starred
            <span className="ml-0.5 text-[10px] opacity-70">({starredCount})</span>
          </button>

          <FilterSelect value={type} onChange={setType} placeholder="Type" options={[
            { value: "perm", label: "Perm" },
            { value: "temp", label: "Temp" },
          ]} />

          <FilterSelect value={permStatus} onChange={setPermStatus} placeholder="Perm Status"
            options={permStatuses.map((s) => ({ value: s, label: s }))} />

          <FilterSelect value={tempStatus} onChange={setTempStatus} placeholder="Temp Status"
            options={tempStatuses.map((s) => ({ value: s, label: s }))} />

          <FilterSelect value={qual} onChange={setQual} placeholder="Qualification"
            options={qualifications.map((s) => ({ value: s, label: s }))} />

          <FilterSelect value={field} onChange={setField} placeholder="Field"
            options={fields.map((s) => ({ value: s, label: s }))} />

          <FilterSelect value={drives} onChange={setDrives} placeholder="Drives" options={[
            { value: "yes", label: "Drives" },
            { value: "no", label: "No car" },
            { value: "unknown", label: "Unknown" },
          ]} />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 h-9 px-2"
            >
              Clear filters <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                <th className="text-left font-semibold py-3 px-4">Candidate</th>
                <th className="text-left font-semibold py-3 px-3">Type</th>
                <th className="text-left font-semibold py-3 px-3">Status</th>
                <th className="text-left font-semibold py-3 px-3">Qualification</th>
                <th className="text-left font-semibold py-3 px-3">Location</th>
                <th className="text-center font-semibold py-3 px-3">Drives</th>
                <th className="text-left font-semibold py-3 px-3">Compliant</th>
                <th className="text-left font-semibold py-3 px-3">Current Position</th>
                <th className="text-right font-semibold py-3 px-4">Last Activity</th>
                <th className="text-center font-semibold py-3 px-3">Avail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    Loading candidates…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-muted-foreground">
                    {rows.length === 0 ? "No candidates yet." : "No candidates match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const type = (r.candidate_type || "").toLowerCase();
                  const isPerm = type.includes("perm") || type.includes("both");
                  const isTemp = type.includes("temp") || type.includes("both");
                  const compliant = isCompliant(r);
                  return (
                    <tr
                      key={r.id}
                      data-candidate-id={r.id}
                      onClick={() => openCandidate(r.id)}
                      className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(r.id, !!r.is_starred);
                            }}
                            className="p-1 -ml-1 rounded hover:bg-muted"
                            aria-label={r.is_starred ? "Unstar" : "Star"}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                r.is_starred ? "fill-warning text-warning" : "text-muted-foreground/50"
                              }`}
                            />
                          </button>
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-navy text-navy-foreground text-xs font-medium">
                              {initials(r.first_name, r.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {r.first_name} {r.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {r.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {isPerm && <TypeBadge type="Perm" />}
                          {isTemp && <TypeBadge type="Temp" />}
                          {!isPerm && !isTemp && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {r.status_perm && <StatusPill label={r.status_perm} tone="navy" />}
                          {r.status_temp && <StatusPill label={r.status_temp} tone="teal" />}
                          {!r.status_perm && !r.status_temp && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {fmtQual(r.qualification_level)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs">
                          <div className="font-medium">{r.town || "—"}</div>
                          <div className="text-muted-foreground">{r.postcode || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.drives === true ? (
                          <Check className="h-4 w-4 text-success inline" />
                        ) : r.drives === false ? (
                          <X className="h-4 w-4 text-destructive inline" />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-muted-foreground/60 inline" />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${
                            compliant
                              ? "bg-success/20 text-[oklch(0.4_0.12_155)]"
                              : "bg-warning/20 text-[oklch(0.45_0.12_75)]"
                          }`}
                        >
                          {compliant ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs">
                          <div className="font-medium truncate max-w-[180px]">
                            {r.current_position || "—"}
                          </div>
                          <div className="text-muted-foreground truncate max-w-[180px]">
                            {r.current_employer || ""}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {relTime(r.updated_at || r.created_at)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const t = (r.candidate_type || "").toLowerCase();
                          const isTemp = t.includes("temp") || t.includes("both");
                          if (!isTemp) return <span className="text-muted-foreground/30">—</span>;
                          const timeOff = timeOffToday.get(r.id);
                          if (timeOff) return (
                            <span title={`Time off: ${timeOff}`} className="inline-flex items-center gap-1 cursor-default">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
                            </span>
                          );
                          if (submittedIds.has(r.id)) return <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" title="Availability submitted this week" />;
                          return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" title="No availability submitted this week" />;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add candidate modals */}
      <AddTempCandidateModal
        open={addTempOpen}
        onClose={() => setAddTempOpen(false)}
        onCreated={() => { setAddTempOpen(false); setLoading(true); }}
      />
      <AddPermCandidateModal
        open={addPermOpen}
        onClose={() => setAddPermOpen(false)}
        onCreated={(id) => { setAddPermOpen(false); navigate({ to: "/candidates/$id", params: { id } }); }}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── AddPermCandidateModal ─────────────────────────────────────────────────────
function AddPermCandidateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (id: string) => void;
}) {
  const [step, setStep] = useState<"choose" | "extracting" | "review">("choose");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    town: "", postcode: "", current_position: "", current_employer: "",
    qualification_level: "__none__", qualifications_text: "", expected_salary: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) { setStep("choose"); setExtractError(null); setForm({ first_name:"",last_name:"",email:"",phone:"",town:"",postcode:"",current_position:"",current_employer:"",qualification_level:"__none__",qualifications_text:"",expected_salary:"" }); }
  }, [open]);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(pdf)$/i)) { setExtractError("Please upload a PDF file."); return; }
    setStep("extracting"); setExtractError(null);
    try {
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const { data, error } = await supabase.functions.invoke("extract-cv", { body: { pdf_base64: b64 } });
      if (error) throw new Error(error.message);
      const d = data?.data ?? {};
      setForm({
        first_name: d.first_name ?? "", last_name: d.last_name ?? "",
        email: d.email ?? "", phone: d.phone ?? "",
        town: d.town ?? "", postcode: d.postcode ?? "",
        current_position: d.current_position ?? "", current_employer: d.current_employer ?? "",
        qualification_level: d.qualification_level ?? "__none__",
        qualifications_text: d.qualifications_text ?? "",
        expected_salary: d.expected_salary ?? "",
      });
      toast.success("CV extracted — review the details below");
      setStep("review");
    } catch (e: any) {
      setExtractError("Couldn't extract CV. You can fill in the details manually.");
      setStep("review");
    }
  };

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error("First name, last name and email are required"); return; }
    setSaving(true);
    const { data, error } = await (supabase as any).from("candidates").insert({
      first_name: form.first_name, last_name: form.last_name,
      email: form.email || null, phone: form.phone || null,
      town: form.town || null, postcode: form.postcode || null,
      current_position: form.current_position || null,
      current_employer: form.current_employer || null,
      qualification_level: form.qualification_level === "__none__" ? null : form.qualification_level,
      qualifications_text: form.qualifications_text || null,
      ...(form.expected_salary ? { expected_salary: Number(form.expected_salary) } : {}),
      candidate_type: "perm", status_perm: "not_contacted",
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`${form.first_name} ${form.last_name} added`);
    onCreated(data.id);
  };

  const QUAL_OPTS = [
    { value: "unqualified", label: "Unqualified" }, { value: "level_2", label: "Level 2" },
    { value: "level_3", label: "Level 3" }, { value: "room_leader", label: "Room Leader" },
    { value: "deputy_manager", label: "Deputy Manager" }, { value: "manager", label: "Manager" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h2 className="font-semibold text-base">Add Permanent Candidate</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === "choose" ? "Upload a CV — we'll extract the details." : step === "extracting" ? "Extracting CV details…" : "Review and confirm the extracted details."}
          </p>
        </div>

        <div className="p-6">
          {step === "choose" && (
            <div className="space-y-4">
              <label className="block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-colors">
                <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to choose a CV (.pdf)</p>
                <p className="text-xs text-muted-foreground mt-1">We'll extract the details automatically</p>
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button onClick={() => setStep("review")} className="w-full h-10 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
                Build manually
              </button>
              <div className="flex justify-end">
                <button onClick={onClose} className="h-9 px-4 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              </div>
            </div>
          )}

          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-9 w-9 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Extracting CV with AI…</p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {extractError && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">{extractError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[["First name *","first_name","text"],["Last name *","last_name","text"],["Email *","email","email"],["Phone","phone","tel"],["Town","town","text"],["Postcode","postcode","text"],["Current position","current_position","text"],["Current employer","current_employer","text"]].map(([label, key, type]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 bg-background" />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Qualification</label>
                  <select value={form.qualification_level} onChange={e => set("qualification_level", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 bg-background">
                    <option value="__none__">— Select —</option>
                    {QUAL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Qualifications &amp; certifications</label>
                <textarea value={form.qualifications_text} onChange={e => set("qualifications_text", e.target.value)}
                  rows={3} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 bg-background resize-none" />
              </div>
              <div className="flex justify-between gap-3 pt-2 border-t">
                <button onClick={() => setStep("choose")} className="h-10 px-4 rounded-full border text-sm font-medium hover:bg-muted">← Back</button>
                <div className="flex gap-2">
                  <button onClick={onClose} className="h-10 px-4 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Expected salary (£)</label>
                  <input type="number" value={(form as any).expected_salary} onChange={e => set("expected_salary", e.target.value)}
                    placeholder="e.g. 28000"
                    className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal/40" />
                </div>
                  <button onClick={save} disabled={saving} className="h-10 px-5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "Creating…" : "Create candidate"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

