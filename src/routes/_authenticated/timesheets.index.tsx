import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, ChevronRight, Search, ChevronDown, Download, Calendar, CheckSquare } from "lucide-react";
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
  candidates: { first_name: string | null; last_name: string | null } | null;
  clients: { company_name: string } | null;
  shift_count: number;
};

const STATUS_CONFIG: Record<string, { label: string; colour: string; dot: string }> = {
  in_progress:       { label: "Not Complete",      colour: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  awaiting_manager:  { label: "Awaiting Manager",  colour: "bg-amber-50 text-amber-700",     dot: "bg-amber-400" },
  submitted_to_soar: { label: "Submitted to SOAR", colour: "bg-purple-50 text-purple-700",   dot: "bg-purple-500" },
  approved:          { label: "Approved",           colour: "bg-teal-50 text-teal-700",       dot: "bg-teal-500" },
  paid:              { label: "Paid",               colour: "bg-green-50 text-green-700",     dot: "bg-green-500" },
};

const ALL = "__all__";

const TWO_WEEKS_AGO = new Date();
TWO_WEEKS_AGO.setDate(TWO_WEEKS_AGO.getDate() - 14);
const TWO_WEEKS_AGO_STR = TWO_WEEKS_AGO.toISOString().slice(0, 10);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, colour: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.colour}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function openPrintTab(id: string) {
  window.open(`/timesheets/${id}`, "_blank");
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

  useEffect(() => {
    supabase
      .from("timesheet_submissions")
      .select(`
        id, week_ending, status, role, booking_reference,
        hours_discrepancy, total_submitted_hours, submitted_at, approved_at,
        candidates(first_name, last_name),
        clients(company_name),
        timesheet_submission_shifts(id)
      `)
      .order("week_ending", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) { toast.error("Failed to load timesheets"); setLoading(false); return; }
        setRows((data ?? []).map((r: any) => ({
          ...r,
          shift_count: r.timesheet_submission_shifts?.length ?? 0,
        })));
        setLoading(false);
      });
  }, []);

  // Available week options for filter
  const weekOptions = useMemo(() => {
    const weeks = Array.from(new Set(rows.map(r => r.week_ending))).sort((a, b) => b.localeCompare(a));
    return weeks;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
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
  }, [rows, statusFilter, weekFilter, discrepancyOnly, q]);

  const recent = useMemo(() => filtered.filter(r => r.week_ending >= TWO_WEEKS_AGO_STR), [filtered]);
  const past   = useMemo(() => filtered.filter(r => r.week_ending < TWO_WEEKS_AGO_STR), [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const totalHours = useMemo(() =>
    rows.reduce((sum, r) => sum + (r.total_submitted_hours ? Number(r.total_submitted_hours) : 0), 0),
  [rows]);

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

  const bulkDownload = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    toast.info(`Opening ${ids.length} timesheet${ids.length > 1 ? "s" : ""} — use Print → Save as PDF in each tab`);
    ids.forEach((id, i) => setTimeout(() => window.open(`/timesheets/${id}`, "_blank"), i * 300));
  };

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
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Week ending</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shifts</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
          <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flag</th>
          <th className="py-3 px-4"></th>
        </tr>
      </thead>
    );
  };

  const TableRows = ({ items }: { items: Submission[] }) => (
    <>
      {items.map(r => {
        const isSelected = selected.has(r.id);
        return (
          <tr
            key={r.id}
            onClick={() => navigate({ to: "/timesheets/$id", params: { id: r.id } })}
            className={`border-b border-border/60 cursor-pointer transition-colors group ${isSelected ? "bg-teal/5" : "hover:bg-muted/30"}`}
          >
            <td className="py-3 pl-4 pr-2" onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}>
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
            <td className="py-3 px-3 text-sm font-medium">{r.total_submitted_hours ? `${r.total_submitted_hours}h` : "—"}</td>
            <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
            <td className="py-3 px-3">
              {r.hours_discrepancy && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review
                </span>
              )}
            </td>
            <td className="py-3 px-4" onClick={e => { e.stopPropagation(); openPrintTab(r.id); }}>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                <Download className="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );

  const EmptyRow = ({ text }: { text: string }) => (
    <tr><td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">{text}</td></tr>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pt-2">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length} total · {totalHours}h logged · {counts["submitted_to_soar"] ?? 0} awaiting approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDownload}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 transition-opacity">
              <Download className="h-4 w-4" /> Download ({selected.size})
            </button>
          )}
          {(counts["submitted_to_soar"] ?? 0) > 0 && (
            <button onClick={() => setStatusFilter("submitted_to_soar")}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors">
              <Clock className="h-4 w-4" /> {counts["submitted_to_soar"]} to approve
            </button>
          )}
        </div>
      </div>

      {/* ── Status pills ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter(ALL)}
          className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors ${statusFilter === ALL ? "bg-navy text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
          All ({rows.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => counts[key] ? (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? ALL : key)}
            className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${statusFilter === key ? "bg-navy text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${statusFilter === key ? "bg-white/70" : ""}`} />
            {cfg.label} ({counts[key]})
          </button>
        ) : null)}
      </div>

      {/* ── Filters row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 h-9 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 transition"
            placeholder="Search candidate, client, reference…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* Week filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={weekFilter}
            onChange={e => setWeekFilter(e.target.value)}
            className={`h-9 pl-9 pr-8 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 transition appearance-none cursor-pointer ${weekFilter !== ALL ? "border-teal/50 ring-1 ring-teal/20 text-foreground" : "text-muted-foreground"}`}>
            <option value={ALL}>All weeks</option>
            {weekOptions.map(w => (
              <option key={w} value={w}>{fmtWeek(w)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Discrepancy toggle */}
        <button onClick={() => setDiscrepancyOnly(d => !d)}
          className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-medium transition-colors ${discrepancyOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-card hover:bg-muted text-muted-foreground"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Discrepancies only
        </button>

        {/* Bulk selection hint */}
        {selected.size > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <CheckSquare className="h-3.5 w-3.5 text-teal" />
            {selected.size} selected
            <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground underline ml-1">Clear</button>
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-16 text-center text-muted-foreground text-sm">
          Loading timesheets…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recent */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <table className="w-full text-sm">
              <TableHead ids={recent.map(r => r.id)} />
              <tbody>
                {recent.length === 0
                  ? <EmptyRow text={q || statusFilter !== ALL || weekFilter !== ALL || discrepancyOnly ? "No timesheets match your filters" : "No recent timesheets"} />
                  : <TableRows items={recent} />}
              </tbody>
            </table>
          </div>

          {/* Past (≥ 2 weeks ago) */}
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
