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
import { Users, Star, Search, Plus, X, Check, HelpCircle } from "lucide-react";
import { AddTempCandidateModal } from "@/components/add-temp-candidate-modal";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";
import { fmtQual } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/temps")({
  validateSearch: (s: Record<string, unknown>) => ({ open: (s.open as string | undefined) }),
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
  checklist: Record<string, string> | null;
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

const COMPLIANT_REQUIRED_KEYS = [
  "proof_of_id", "passport_photo", "proof_of_address_1", "right_to_work", "ni_number_check",
  "dbs_certificate", "childrens_barred_list", "safeguarding_training_cert", "work_reference_1", "work_reference_2",
] as const;

function isCompliant(c: Candidate) {
  if (c.checklist) {
    return COMPLIANT_REQUIRED_KEYS.every(
      (k) => c.checklist![k] === "approved" || c.checklist![k] === "not_required"
    );
  }
  return !!(c.dbs_verified && c.right_to_work_verified && c.contract_agreed);
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-teal/20 text-teal-foreground">
      {label}
    </span>
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

function Page() {
  const navigate = useNavigate({ from: "/_authenticated/temps" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [addTempOpen, setAddTempOpen] = useState(false);
  const { open: openParam } = useSearch({ from: "/_authenticated/temps" });
  useEffect(() => {
    if (openParam === "temp") setAddTempOpen(true);
  }, [openParam]);

  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [timeOffToday, setTimeOffToday] = useState<Map<string, string>>(new Map());
  const [q, setQ] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
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
          "id,first_name,last_name,email,town,postcode,candidate_type,status_temp,qualification_level,fields_of_work,drives,current_position,current_employer,is_starred,updated_at,created_at,dbs_verified,right_to_work_verified,contract_agreed,compliance_checklists(proof_of_id,passport_photo,proof_of_address_1,right_to_work,ni_number_check,dbs_certificate,childrens_barred_list,safeguarding_training_cert,work_reference_1,work_reference_2)",
        )
        .in("candidate_type", ["temp", "both"])
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (scope === "mine") query = query.eq("created_by", userId);
      const { data, error } = await query;
      if (error) toast.error("Failed to load temp candidates");
      const candidates: Candidate[] = ((data as any[]) || []).map((c) => ({
        ...c,
        checklist: c.compliance_checklists?.[0] ?? null,
      }));
      setRows(candidates);
      setLoading(false);

      // Availability for this week
      if (candidates.length > 0) {
        const ids = candidates.map((c) => c.id);
        const today = new Date();
        const dow = today.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        const weekStart = monday.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        const [subRes, toRes] = await Promise.all([
          (supabase as any)
            .from("candidate_availability_submissions")
            .select("candidate_id")
            .in("candidate_id", ids)
            .eq("week_starting", weekStart),
          (supabase as any)
            .from("candidate_time_off")
            .select("candidate_id,title")
            .in("candidate_id", ids)
            .lte("start_date", todayStr)
            .gte("end_date", todayStr),
        ]);
        setSubmittedIds(new Set((subRes.data ?? []).map((r: any) => r.candidate_id)));
        setTimeOffToday(new Map((toRes.data ?? []).map((r: any) => [r.candidate_id, r.title])));
      }
    })();
  }, [userId, scope]);

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
  }, [rows, q, starredOnly, tempStatus, qual, field, drives]);

  const hasFilters = !!q || starredOnly || tempStatus !== ALL || qual !== ALL || field !== ALL || drives !== ALL;

  const clearFilters = () => {
    setQ("");
    setStarredOnly(false);
    setTempStatus(ALL);
    setQual(ALL);
    setField(ALL);
    setDrives(ALL);
  };

  const toggleStar = async (id: string, current: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_starred: !current } : r)));
    const { error } = await supabase.from("candidates").update({ is_starred: !current }).eq("id", id);
    if (error) {
      toast.error("Couldn't update star");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_starred: current } : r)));
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Temporary"
        title="Temp Candidates"
        description={loading ? "Loading…" : `${rows.length} total — ${filtered.length} shown`}
        icon={Users}
        actions={
          <button
            onClick={() => setAddTempOpen(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Temporary Candidate
          </button>
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

          <FilterSelect value={tempStatus} onChange={setTempStatus} placeholder="Status"
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
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">Loading temp candidates…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    {rows.length === 0 ? "No temp candidates yet." : "No candidates match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const compliant = isCompliant(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate({ to: "/candidates/$id", params: { id: r.id } })}
                      className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(r.id, !!r.is_starred); }}
                            className="p-1 -ml-1 rounded hover:bg-muted"
                            aria-label={r.is_starred ? "Unstar" : "Star"}
                          >
                            <Star className={`h-4 w-4 ${r.is_starred ? "fill-warning text-warning" : "text-muted-foreground/50"}`} />
                          </button>
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-teal text-teal-foreground text-xs font-medium">
                              {initials(r.first_name, r.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.first_name} {r.last_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{r.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {r.status_temp
                          ? <StatusPill label={r.status_temp} />
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-xs">{fmtQual(r.qualification_level)}</td>
                      <td className="py-3 px-3">
                        <div className="text-xs">
                          <div className="font-medium">{r.town || "—"}</div>
                          <div className="text-muted-foreground">{r.postcode || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.drives === true
                          ? <Check className="h-4 w-4 text-success inline" />
                          : r.drives === false
                          ? <X className="h-4 w-4 text-destructive inline" />
                          : <HelpCircle className="h-4 w-4 text-muted-foreground/60 inline" />}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${
                          compliant ? "bg-success/20 text-[oklch(0.4_0.12_155)]" : "bg-warning/20 text-[oklch(0.45_0.12_75)]"
                        }`}>
                          {compliant ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs">
                          <div className="font-medium truncate max-w-[180px]">{r.current_position || "—"}</div>
                          <div className="text-muted-foreground truncate max-w-[180px]">{r.current_employer || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {relTime(r.updated_at || r.created_at)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const timeOff = timeOffToday.get(r.id);
                          if (timeOff) return (
                            <span title={`Time off: ${timeOff}`}>
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                            </span>
                          );
                          if (submittedIds.has(r.id))
                            return <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" title="Availability submitted this week" />;
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

      <AddTempCandidateModal
        open={addTempOpen}
        onClose={() => setAddTempOpen(false)}
        onCreated={() => { setAddTempOpen(false); setLoading(true); }}
      />
    </div>
  );
}
