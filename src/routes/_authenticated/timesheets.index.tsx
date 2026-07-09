import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, Clock, ChevronDown, Search,
  Download, Calendar, CheckSquare,
  ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, Building2, FileDown, User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timesheets/")({
  component: TimesheetsPage,
});

type Submission = {
  id: string;
  week_ending: string;
  status: string;
  role: string | null;
  booking_reference: string | null;
  hours_discrepancy: boolean;
  total_submitted_hours: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  candidate_confirmed: boolean;
  manager_signed_at: string | null;
  candidates: { first_name: string | null; last_name: string | null } | null;
  clients: { company_name: string } | null;
  shift_count: number;
};

const STATUS_CONFIG: Record<string, { label: string; colour: string; dot: string; border: string }> = {
  in_progress:       { label: "Not Complete",      colour: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",   border: "border-l-slate-300" },
  awaiting_manager:  { label: "Awaiting Manager",  colour: "bg-amber-50 text-amber-700",    dot: "bg-amber-400",   border: "border-l-amber-400" },
  submitted_to_soar: { label: "Submitted to SOAR", colour: "bg-purple-50 text-purple-700",  dot: "bg-purple-500",  border: "border-l-purple-500" },
  approved:          { label: "Approved",           colour: "bg-teal-50 text-teal-700",      dot: "bg-teal-500",    border: "border-l-teal-500" },
  paid:              { label: "Paid",               colour: "bg-green-50 text-green-700",    dot: "bg-green-500",   border: "border-l-green-500" },
};

const ALL = "__all__";
const TWO_WEEKS_AGO = new Date();
TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14);
const TWO_WEEKS_AGO_STR = TWO_WEEKS_AGO.toISOString().slice(0, 10);

type SortCol = "week_ending" | "total_submitted_hours" | null;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, colour: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.colour}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SigIndicator({ candidateOk, managerOk }: { candidateOk: boolean; managerOk: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span title="Candidate signed"
        className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded
          ${candidateOk ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-400"}`}>
        <User className="h-2.5 w-2.5" />{candidateOk ? "✓" : "–"}
      </span>
      <span title="Manager signed"
        className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded
          ${managerOk ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-400"}`}>
        <Building2 className="h-2.5 w-2.5" />{managerOk ? "✓" : "–"}
      </span>
    </div>
  );
}

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 ml-1 inline" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-navy ml-1 inline" />
    : <ArrowDown className="h-3 w-3 text-navy ml-1 inline" />;
}

export default function TimesheetsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [weekFilter, setWeekFilter] = useState(ALL);
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pastExpanded, setPastExpanded] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("week_ending");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("timesheet_submissions")
      .select(`
        id, week_ending, status, role, booking_reference,
        hours_discrepancy, total_submitted_hours, submitted_at, approved_at,
        candidate_confirmed, manager_signed_at,
        candidates(first_name, last_name),
        clients(company_name),
        timesheet_submission_shifts(id)
      `)
      .order("week_ending", { ascending: false })
      .limit(500);
    if (error) { toast.error("Failed to load timesheets"); setLoading(false); return; }
    setRows((data ?? []).map((r: any) => ({ ...r, shift_count: r.timesheet_submission_shifts?.length ?? 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const weekOptions = useMemo(() =>
    Array.from(new Set(rows.map(r => r.week_ending))).sort((a, b) => b.localeCompare(a)),
  [rows]);

  const filtered = useMemo(() => {
    let list = rows.filter(r => {
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (weekFilter !== ALL && r.week_ending !== weekFilter) return false;
      if (discrepancyOnly && !r.hours_discrepancy) return false;
      if (q) {
        const name = `${r.candidates?.first_name ?? ""} ${r.candidates?.last_name ?? ""}`.toLowerCase();
        const client = (r.clients?.company_name ?? "").toLowerCase();
        const ref = (r.booking_reference ?? "").toLowerCase();
        if (![name, client, ref].some(s => s.includes(q.toLowerCase()))) return false;
      }
      return true;
    });
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va: any = sortCol === "total_submitted_hours" ? (Number(a[sortCol]) || 0) : (a[sortCol] ?? "");
        const vb: any = sortCol === "total_submitted_hours" ? (Number(b[sortCol]) || 0) : (b[sortCol] ?? "");
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, statusFilter, weekFilter, discrepancyOnly, q, sortCol, sortDir]);

  const recent = useMemo(() => filtered.filter(r => r.week_ending >= TWO_WEEKS_AGO_STR), [filtered]);
  const past   = useMemo(() => filtered.filter(r => r.week_ending < TWO_WEEKS_AGO_STR), [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const totalHours = useMemo(() =>
    rows.reduce((sum, r) => sum + (Number(r.total_submitted_hours) || 0), 0), [rows]);

  const hoursByClient = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      if (!r.total_submitted_hours) return;
      const client = r.clients?.company_name ?? "Unknown";
      map[client] = (map[client] ?? 0) + Number(r.total_submitted_hours);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelected(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const quickApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("timesheet_submissions").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error("Failed to approve"); return; }
    await supabase.from("timesheet_status_log").insert({
      submission_id: id,
      previous_status: "submitted_to_soar",
      new_status: "approved",
      changed_by: "crm_staff",
    });
    toast.success("Timesheet approved");
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
  };

  const bulkDownload = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    toast.info(`Opening ${ids.length} timesheet${ids.length > 1 ? "s" : ""} — use Print → Save as PDF`);
    ids.forEach((id, i) => setTimeout(() => window.open(`/timesheets/${id}`, "_blank"), i * 350));
  };

  const exportCSV = () => {
    const src = filtered.length > 0 ? filtered : rows;
    const header = ["Candidate","Client","Week Ending","Role","Shifts","Hours","Status","Reference","Candidate Signed","Manager Signed"];
    const body = src.map(r => [
      `${r.candidates?.first_name ?? ""} ${r.candidates?.last_name ?? ""}`.trim(),
      r.clients?.company_name ?? "",
      r.week_ending,
      r.role ?? "",
      r.shift_count,
      r.total_submitted_hours ?? "",
      STATUS_CONFIG[r.status]?.label ?? r.status,
      r.booking_reference ?? "",
      r.candidate_confirmed ? "Yes" : "No",
      r.manager_signed_at ? "Yes" : "No",
    ].map(v => `"${v}"`).join(","));
    const csv = [header.join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `timesheets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const ThSort = ({ col, label }: { col: SortCol; label: string }) => (
    <th
      className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(col)}
    >
      {label}<SortIcon active={sortCol === col} dir={sortDir} />
    </th>
  );

  const TableHead = ({ ids }: { ids: string[] }) => {
    const allChecked = ids.length > 0 && ids.every(id => selected.has(id));
    return (
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="py-3 pl-4 pr-2 w-8">
            <input type="checkbox" checked={allChecked} onChange={() => toggleSelectAll(ids)}
              className="rounded border-border accent-teal cursor-pointer" />
          </th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
          <ThSort col="week_ending" label="Week ending" />
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Shifts</th>
          <ThSort col="total_submitted_hours" label="Hours" />
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sigs</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flag</th>
          <th className="py-3 px-4 w-36"></th>
        </tr>
      </thead>
    );
  };

  const TableRows = ({ items }: { items: Submission[] }) => (
    <>
      {items.map(r => {
        const isSelected = selected.has(r.id);
        const borderCol = STATUS_CONFIG[r.status]?.border ?? "border-l-slate-200";
        return (
          <tr
            key={r.id}
            onClick={() => navigate({ to: "/timesheets/$id", params: { id: r.id } })}
            className={`border-b border-border/60 border-l-4 ${borderCol} cursor-pointer transition-colors group
              ${isSelected ? "bg-teal/5" : "hover:bg-muted/25"}`}
          >
            <td className="py-3 pl-3 pr-2" onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)}
                className="rounded border-border accent-teal cursor-pointer" />
            </td>
            <td className="py-3 px-3 font-medium text-sm">
              {r.candidates ? `${r.candidates.first_name ?? ""} ${r.candidates.last_name ?? ""}`.trim() : "—"}
            </td>
            <td className="py-3 px-3 text-sm text-muted-foreground">{r.clients?.company_name ?? "—"}</td>
            <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">{fmtWeek(r.week_ending)}</td>
            <td className="py-3 px-3 text-xs text-muted-foreground">{r.role ?? "—"}</td>
            <td className="py-3 px-3 text-sm text-center">{r.shift_count}</td>
            <td className="py-3 px-3 text-sm font-semibold">{r.total_submitted_hours ? `${r.total_submitted_hours}h` : "—"}</td>
            <td className="py-3 px-3">
              <SigIndicator candidateOk={r.candidate_confirmed} managerOk={!!r.manager_signed_at} />
            </td>
            <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
            <td className="py-3 px-3">
              {r.hours_discrepancy && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review
                </span>
              )}
            </td>
            <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                {r.status === "submitted_to_soar" && (
                  <button onClick={e => quickApprove(r.id, e)} title="Quick approve"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-teal/10 text-teal-700 hover:bg-teal/20 text-xs font-medium transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                <button onClick={() => window.open(`/timesheets/${r.id}`, "_blank")} title="Open PDF"
                  className="h-7 w-7 rounded-full hover:bg-muted transition-colors grid place-items-center text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pt-2">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length} total · {totalHours}h logged · {counts["submitted_to_soar"] ?? 0} awaiting approval
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={bulkDownload}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 transition-opacity">
              <Download className="h-4 w-4" /> Download ({selected.size})
            </button>
          )}
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border bg-card text-sm font-medium hover:bg-muted transition-colors text-muted-foreground">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          {(counts["submitted_to_soar"] ?? 0) > 0 && (
            <button onClick={() => setStatusFilter("submitted_to_soar")}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-teal text-white text-sm font-medium hover:bg-teal/90 transition-colors">
              <Clock className="h-4 w-4" /> {counts["submitted_to_soar"]} to approve
            </button>
          )}
        </div>
      </div>

      {/* Hours by client */}
      {hoursByClient.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Hours by client:</span>
          {hoursByClient.map(([client, hours]) => (
            <span key={client} className="inline-flex items-center gap-1.5 text-xs bg-card border border-border rounded-full px-3 py-1 font-medium">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              {client} <span className="text-teal-600 font-semibold">{hours}h</span>
            </span>
          ))}
        </div>
      )}

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter(ALL)}
          className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors
            ${statusFilter === ALL ? "bg-navy text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
          All ({rows.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => counts[key] ? (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? ALL : key)}
            className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5
              ${statusFilter === key ? "bg-navy text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusFilter === key ? "bg-white/70" : cfg.dot}`} />
            {cfg.label} ({counts[key]})
          </button>
        ) : null)}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 h-9 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 transition"
            placeholder="Search candidate, client, reference…"
            value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={weekFilter} onChange={e => setWeekFilter(e.target.value)}
            className={`h-9 pl-9 pr-8 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 transition appearance-none cursor-pointer
              ${weekFilter !== ALL ? "border-teal/50 ring-1 ring-teal/20 text-foreground" : "text-muted-foreground"}`}
          >
            <option value={ALL}>All weeks</option>
            {weekOptions.map(w => <option key={w} value={w}>{fmtWeek(w)}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <button onClick={() => setDiscrepancyOnly(d => !d)}
          className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-medium transition-colors
            ${discrepancyOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-card hover:bg-muted text-muted-foreground"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Discrepancies only
        </button>
        {selected.size > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <CheckSquare className="h-3.5 w-3.5 text-teal" /> {selected.size} selected
            <button onClick={() => setSelected(new Set())} className="underline hover:text-foreground ml-1">Clear</button>
          </span>
        )}
      </div>

      {/* Tables */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-16 text-center text-muted-foreground text-sm">
          Loading timesheets…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <table className="w-full text-sm">
              <TableHead ids={recent.map(r => r.id)} />
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                      {q || statusFilter !== ALL || weekFilter !== ALL || discrepancyOnly
                        ? "No timesheets match your filters" : "No recent timesheets"}
                    </td>
                  </tr>
                ) : <TableRows items={recent} />}
              </tbody>
            </table>
          </div>

          {past.length > 0 && (
            <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <button
                onClick={() => setPastExpanded(e => !e)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-muted-foreground">Past timesheets</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{past.length}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${pastExpanded ? "rotate-180" : ""}`} />
              </button>
              {pastExpanded && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <TableHead ids={past.map(r => r.id)} />
                    <tbody><TableRows items={past} /></tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
