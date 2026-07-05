import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Search, Plus, X, Users } from "lucide-react";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/")({
  component: Page,
});

type Job = {
  id: string;
  title: string;
  client_id: string | null;
  client_name?: string;
  status: string | null;
  qualification_required: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  pipeline_count?: number;
};

const ALL = "__all__";

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function statusLabel(s: string | null) {
  const map: Record<string, string> = {
    live: "Live",
    interviewing: "Interviewing",
    filled: "Filled",
    lost: "Lost",
  };
  return map[s ?? ""] ?? s ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  const colours: Record<string, string> = {
    live: "bg-success/20 text-[oklch(0.4_0.12_155)]",
    interviewing: "bg-teal/20 text-teal-foreground",
    filled: "bg-navy/10 text-navy",
    lost: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${colours[status ?? ""] ?? "bg-muted text-muted-foreground"}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function qualLabel(q: string | null) {
  const map: Record<string, string> = {
    unqualified: "Unqualified",
    level_2: "Level 2",
    level_3: "Level 3",
    room_leader: "Room Leader",
    deputy_manager: "Deputy Manager",
    manager: "Manager",
  };
  return map[q ?? ""] ?? q ?? "—";
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
  const navigate = useNavigate({ from: "/jobs" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [qualFilter, setQualFilter] = useState<string>(ALL);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      // Fetch jobs with client name via join
      let query = supabase
        .from("jobs")
        .select(
          "id,title,client_id,status,qualification_required,salary_min,salary_max,posted_at,clients(company_name)",
        )
        .order("posted_at", { ascending: false })
        .limit(500);
      if (scope === "mine") query = query.eq("created_by", userId);
      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load jobs");
        setLoading(false);
        return;
      }

      // Fetch pipeline counts per job
      const { data: pipelineData } = await supabase
        .from("job_pipeline")
        .select("job_id")
        .not("stage", "eq", "rejected")
        .not("stage", "eq", "withdrawn");

      const countMap: Record<string, number> = {};
      (pipelineData ?? []).forEach((p: { job_id: string }) => {
        countMap[p.job_id] = (countMap[p.job_id] ?? 0) + 1;
      });

      const jobs = (data ?? []).map((j: any) => ({
        id: j.id,
        title: j.title,
        client_id: j.client_id,
        client_name: j.clients?.company_name ?? null,
        status: j.status,
        qualification_required: j.qualification_required,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        posted_at: j.posted_at,
        pipeline_count: countMap[j.id] ?? 0,
      }));

      setRows(jobs);
      setLoading(false);
    })();
  }, [userId, scope]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (qualFilter !== ALL && r.qualification_required !== qualFilter)
        return false;
      if (needle) {
        const hay =
          `${r.title ?? ""} ${r.client_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, qualFilter]);

  const hasFilters = !!q || statusFilter !== ALL || qualFilter !== ALL;
  const clearFilters = () => {
    setQ("");
    setStatusFilter(ALL);
    setQualFilter(ALL);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Jobs"
        description={
          loading
            ? "Loading jobs…"
            : `${rows.length} total — ${filtered.length} shown`
        }
        icon={Briefcase}
        actions={
          <button
            onClick={() => toast.info("Add job form — coming soon")}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Job
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
              placeholder="Search title or client…"
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            options={[
              { value: "live", label: "Live" },
              { value: "interviewing", label: "Interviewing" },
              { value: "filled", label: "Filled" },
              { value: "lost", label: "Lost" },
            ]}
          />

          <FilterSelect
            value={qualFilter}
            onChange={setQualFilter}
            placeholder="Qualification"
            options={[
              { value: "unqualified", label: "Unqualified" },
              { value: "level_2", label: "Level 2" },
              { value: "level_3", label: "Level 3" },
              { value: "room_leader", label: "Room Leader" },
              { value: "deputy_manager", label: "Deputy Manager" },
              { value: "manager", label: "Manager" },
            ]}
          />

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
                <th className="text-left font-semibold py-3 px-4">Job Title</th>
                <th className="text-left font-semibold py-3 px-3">Client</th>
                <th className="text-left font-semibold py-3 px-3">Status</th>
                <th className="text-left font-semibold py-3 px-3">Qualification</th>
                <th className="text-left font-semibold py-3 px-3">Salary</th>
                <th className="text-center font-semibold py-3 px-3">Pipeline</th>
                <th className="text-right font-semibold py-3 px-4">Posted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-muted-foreground"
                  >
                    Loading jobs…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-muted-foreground"
                  >
                    {rows.length === 0
                      ? "No jobs yet."
                      : "No jobs match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      navigate({ to: "/jobs/$id", params: { id: r.id } })
                    }
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-navy" />
                        </div>
                        <div className="font-medium">{r.title}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {r.client_name ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {qualLabel(r.qualification_required)}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {r.salary_min || r.salary_max
                        ? `£${r.salary_min?.toLocaleString() ?? "?"} – £${r.salary_max?.toLocaleString() ?? "?"}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.pipeline_count ?? 0}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {relTime(r.posted_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
