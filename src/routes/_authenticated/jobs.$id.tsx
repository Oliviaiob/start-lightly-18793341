import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Briefcase,
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  Banknote,
  MapPin,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
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
  location_postcode: string | null;
  description: string | null;
  posted_at: string | null;
  notes: string | null;
};

type PipelineEntry = {
  id: string;
  stage: string | null;
  stage_changed_at: string | null;
  candidate: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    qualification_level: string | null;
  } | null;
};

const STAGES = [
  { key: "matched", label: "Matched" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "cv_submitted", label: "CV Submitted" },
  { key: "interview_arranged", label: "Interview" },
  { key: "interviewed", label: "Interviewed" },
  { key: "offer_made", label: "Offer Made" },
  { key: "placed", label: "Placed" },
];

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
      className={`inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold ${colours[status ?? ""] ?? "bg-muted text-muted-foreground"}`}
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relTime(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [jobRes, pipelineRes] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,title,client_id,status,qualification_required,salary_min,salary_max,location_postcode,description,posted_at,notes,clients(company_name)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("job_pipeline")
          .select(
            "id,stage,stage_changed_at,candidates(id,first_name,last_name,qualification_level)",
          )
          .eq("job_id", id)
          .not("stage", "eq", "rejected")
          .not("stage", "eq", "withdrawn")
          .order("stage_changed_at", { ascending: false }),
      ]);

      if (jobRes.error) {
        toast.error("Could not load job");
      } else {
        const j = jobRes.data as any;
        setJob({
          ...j,
          client_name: j?.clients?.company_name ?? null,
        });
      }

      const entries = (pipelineRes.data ?? []).map((p: any) => ({
        id: p.id,
        stage: p.stage,
        stage_changed_at: p.stage_changed_at,
        candidate: p.candidates ?? null,
      }));
      setPipeline(entries);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Job not found.
        </div>
      </div>
    );
  }

  const stageEntries =
    activeStage === null
      ? pipeline
      : pipeline.filter((p) => p.stage === activeStage);

  const countByStage = STAGES.reduce(
    (acc, s) => {
      acc[s.key] = pipeline.filter((p) => p.stage === s.key).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title={job.title}
        description={job.client_name ?? ""}
        icon={Briefcase}
        actions={
          <>
            <button
              onClick={() => navigate({ to: "/jobs" })}
              className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/20 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              onClick={() => toast.info("Edit job — coming soon")}
              className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </>
        }
      />

      <div className="flex gap-2 items-center">
        <StatusBadge status={job.status} />
        <span className="text-xs text-muted-foreground">
          Posted {formatDate(job.posted_at)}
        </span>
      </div>

      {/* Job details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-4">
          <h3 className="text-sm font-semibold">Job Details</h3>
          <div className="space-y-3">
            <InfoRow icon={<Building2 className="h-4 w-4" />} label="Client" value={job.client_name} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Qualification" value={qualLabel(job.qualification_required)} />
            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label="Salary"
              value={
                job.salary_min || job.salary_max
                  ? `£${job.salary_min?.toLocaleString() ?? "?"} – £${job.salary_max?.toLocaleString() ?? "?"}`
                  : null
              }
            />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={job.location_postcode} />
          </div>
          {job.description && (
            <div className="pt-2 border-t">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                Description
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}
        </Card>

        {/* Pipeline */}
        <Card className="md:col-span-2 p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Pipeline ({pipeline.length})
            </h3>
            {activeStage !== null && (
              <button
                onClick={() => setActiveStage(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show all
              </button>
            )}
          </div>

          {/* Stage filter pills */}
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() =>
                  setActiveStage(activeStage === s.key ? null : s.key)
                }
                className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  activeStage === s.key
                    ? "bg-navy text-navy-foreground"
                    : "bg-muted/60 text-foreground/70 hover:bg-muted"
                }`}
              >
                {s.label}
                {countByStage[s.key] > 0 && (
                  <span className="ml-1.5 opacity-60">
                    {countByStage[s.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {stageEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {pipeline.length === 0
                ? "No candidates in the pipeline yet."
                : "No candidates at this stage."}
            </div>
          ) : (
            <div className="space-y-2">
              {stageEntries.map((entry) => {
                const c = entry.candidate;
                const name = c
                  ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
                  : "Unknown";
                const initials = c
                  ? `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase()
                  : "?";
                return (
                  <div
                    key={entry.id}
                    onClick={() =>
                      c &&
                      navigate({
                        to: "/candidates/$id",
                        params: { id: c.id },
                      })
                    }
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-navy-foreground">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {qualLabel(c?.qualification_level ?? null)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                        {STAGES.find((s) => s.key === entry.stage)?.label ??
                          entry.stage}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {relTime(entry.stage_changed_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}
