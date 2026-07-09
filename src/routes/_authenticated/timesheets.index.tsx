import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, Filter, Search } from "lucide-react";
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
  clients: { name: string } | null;
  shift_count: number;
};

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  in_progress:      { label: "In Progress",       colour: "bg-slate-100 text-slate-600" },
  ready_to_review:  { label: "Ready to Review",   colour: "bg-blue-50 text-blue-700" },
  awaiting_manager: { label: "Awaiting Manager",  colour: "bg-amber-50 text-amber-700" },
  submitted_to_soar:{ label: "Submitted to SOAR", colour: "bg-purple-50 text-purple-700" },
  approved:         { label: "Approved",           colour: "bg-teal-50 text-teal-700" },
  paid:             { label: "Paid",               colour: "bg-green-50 text-green-700" },
};

const ALL = "__all__";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, colour: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.colour}`}>{cfg.label}</span>;
}

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TimesheetsPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);

  useEffect(() => {
    supabase
      .from("timesheet_submissions")
      .select(`
        id, week_ending, status, role, booking_reference,
        hours_discrepancy, total_submitted_hours, submitted_at, approved_at,
        candidates(first_name, last_name),
        clients(name),
        timesheet_submission_shifts(id)
      `)
      .order("week_ending", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) { toast.error("Failed to load timesheets"); return; }
        setRows((data ?? []).map((r: any) => ({
          ...r,
          shift_count: r.timesheet_submission_shifts?.length ?? 0,
        })));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (discrepancyOnly && !r.hours_discrepancy) return false;
      if (q) {
        const name = `${r.candidates?.first_name ?? ""} ${r.candidates?.last_name ?? ""}`.toLowerCase();
        const client = (r.clients?.name ?? "").toLowerCase();
        const ref = (r.booking_reference ?? "").toLowerCase();
        if (![name, client, ref].some(s => s.includes(q.toLowerCase()))) return false;
      }
      return true;
    });
  }, [rows, statusFilter, discrepancyOnly, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} total · {counts["submitted_to_soar"] ?? 0} awaiting approval</p>
        </div>
        {(counts["submitted_to_soar"] ?? 0) > 0 && (
          <button onClick={() => setStatusFilter("submitted_to_soar")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors">
            <Clock className="h-4 w-4" /> {counts["submitted_to_soar"]} to approve
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter(ALL)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === ALL ? "bg-navy text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
          All ({rows.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => counts[key] ? (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? ALL : key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === key ? "bg-navy text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}>
            {cfg.label} ({counts[key]})
          </button>
        ) : null)}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-3 h-9 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
            placeholder="Search candidate, client, reference…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button onClick={() => setDiscrepancyOnly(d => !d)}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${discrepancyOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "hover:bg-muted"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Discrepancies only
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Candidate</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Client</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Week ending</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Shifts</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Hours</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Flag</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">Loading timesheets…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">No timesheets found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium">
                  {r.candidates ? `${r.candidates.first_name ?? ""} ${r.candidates.last_name ?? ""}`.trim() : "—"}
                </td>
                <td className="py-3 px-3 text-muted-foreground">{r.clients?.name ?? "—"}</td>
                <td className="py-3 px-3 text-muted-foreground">{fmtWeek(r.week_ending)}</td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{r.role ?? "—"}</td>
                <td className="py-3 px-3 text-center">{r.shift_count}</td>
                <td className="py-3 px-3">{r.total_submitted_hours ? `${r.total_submitted_hours}h` : "—"}</td>
                <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                <td className="py-3 px-3">
                  {r.hours_discrepancy && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Review
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Link to="/timesheets/$id" params={{ id: r.id }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
