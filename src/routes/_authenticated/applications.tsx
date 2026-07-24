import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Check,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications")({
  component: ApplicationsCentre,
});

type Application = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_applied_for: string | null;
  job_reference: string | null;
  preferred_location: string | null;
  qualifications: string | null;
  open_to_temp: boolean | null;
  preferred_hours: string | null;
  right_to_work_uk: boolean | null;
  additional_info: string | null;
  cv_url: string | null;
  source: string | null;
  submitted_at: string | null;
  status: string;
  opened_at: string | null;
  candidate_id: string | null;
  reviewed_at: string | null;
};

type Tab = "all" | "new" | "approved" | "rejected";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function PageHeader() {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-11 w-11 rounded-xl bg-teal/20 grid place-items-center shrink-0">
        <Inbox className="h-5 w-5 text-teal" strokeWidth={2.25} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Recruitment
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Applications Centre</h1>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  );
}

export default function ApplicationsCentre() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [jobClientMap, setJobClientMap] = useState<Record<string, string>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("job_site_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    const apps = (data as Application[]) || [];
    setApps(apps);

    // Fetch client names for all unique job references
    const refs = [...new Set(apps.map((a) => a.job_reference).filter(Boolean))] as string[];
    if (refs.length > 0) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("job_reference, clients(company_name)")
        .in("job_reference", refs);
      const map: Record<string, string> = {};
      for (const job of (jobs ?? []) as any[]) {
        if (job.job_reference && job.clients?.company_name) {
          map[job.job_reference] = job.clients.company_name;
        }
      }
      setJobClientMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markOpened = async (id: string) => {
    await supabase
      .from("job_site_applications")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", id)
      .is("opened_at", null);
    setApps((prev) =>
      prev.map((a) =>
        a.id === id && !a.opened_at ? { ...a, opened_at: new Date().toISOString() } : a
      )
    );
  };

  const handleApprove = async (app: Application) => {
    setActing(app.id);
    try {
      const { data: cand, error: cErr } = await supabase
        .from("candidates")
        .insert({
          first_name: app.first_name,
          last_name: app.last_name,
          email: app.email,
          phone: app.phone,
          candidate_type: app.open_to_temp ? "temporary" : "permanent",
          qualifications: app.qualifications,
          source: "jobs_site",
        } as any)
        .select("id")
        .single();

      if (cErr || !cand) throw new Error(cErr?.message || "Failed to create candidate");

      if (app.job_reference) {
        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .eq("job_reference", app.job_reference)
          .maybeSingle();

        if (job) {
          const { data: existing } = await supabase
            .from("job_pipeline")
            .select("id")
            .eq("job_id", job.id)
            .eq("candidate_id", cand.id)
            .maybeSingle();

          if (!existing) {
            await supabase.from("job_pipeline").insert({
              job_id: job.id,
              candidate_id: cand.id,
              stage: "shortlisted",
              stage_changed_at: new Date().toISOString(),
            });
          } else {
            await supabase
              .from("job_pipeline")
              .update({ stage: "shortlisted", stage_changed_at: new Date().toISOString() })
              .eq("id", existing.id);
          }
        }
      }

      await supabase
        .from("job_site_applications")
        .update({
          status: "approved",
          candidate_id: cand.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: "approved", candidate_id: cand.id } : a
        )
      );
      showToast(`${app.first_name} approved — candidate created${app.job_reference ? " & shortlisted" : ""}`);
    } catch (e: unknown) {
      showToast((e as Error).message || "Error approving application", false);
    }
    setActing(null);
  };

  const handleReject = async (app: Application) => {
    setActing(app.id);
    try {
      const { data: cand, error: cErr } = await supabase
        .from("candidates")
        .insert({
          first_name: app.first_name,
          last_name: app.last_name,
          email: app.email,
          phone: app.phone,
          candidate_type: app.open_to_temp ? "temporary" : "permanent",
          qualifications: app.qualifications,
          source: "jobs_site",
          status: "rejected",
        } as any)
        .select("id")
        .single();

      if (cErr || !cand) throw new Error(cErr?.message || "Failed to create candidate");

      await supabase
        .from("job_site_applications")
        .update({
          status: "rejected",
          candidate_id: cand.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: "rejected", candidate_id: cand.id } : a
        )
      );
      showToast(`${app.first_name} rejected — profile saved in CRM`);
    } catch (e: unknown) {
      showToast((e as Error).message || "Error rejecting application", false);
    }
    setActing(null);
  };

  const handleRemove = async (app: Application) => {
    if (!confirm(`Permanently delete ${app.first_name} ${app.last_name}'s application? This cannot be undone.`)) return;
    setActing(app.id);
    const { error } = await supabase.from("job_site_applications").delete().eq("id", app.id);
    if (error) {
      showToast("Error deleting application", false);
    } else {
      setApps((prev) => prev.filter((a) => a.id !== app.id));
      showToast("Application removed");
    }
    setActing(null);
  };

  const filtered = apps.filter((a) => {
    if (tab === "new") return !a.opened_at || a.status === "new";
    if (tab === "approved") return a.status === "approved";
    if (tab === "rejected") return a.status === "rejected";
    return true;
  });

  const counts = {
    all: apps.length,
    new: apps.filter((a) => !a.opened_at || a.status === "new").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pt-2">
      <PageHeader />

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              tab === t.key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] ${
                  t.key === "new" && counts.new > 0
                    ? "bg-teal text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading applications…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <Inbox className="h-8 w-8 opacity-30" />
          <p className="text-sm">No applications here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const isNew = !app.opened_at && app.status !== "approved" && app.status !== "rejected";
            const isExpanded = expanded === app.id;
            const isActing = acting === app.id;
            const isPending = app.status === "new" || app.status === "pending" || !app.status;

            return (
              <Card
                key={app.id}
                className={`border-transparent shadow-[var(--shadow-card)] rounded-2xl overflow-hidden transition-all ${
                  isNew ? "ring-1 ring-teal/30" : ""
                }`}
              >
                <button
                  className="w-full text-left p-5 flex items-start gap-4"
                  onClick={() => {
                    setExpanded(isExpanded ? null : app.id);
                    if (isNew) markOpened(app.id);
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-navy/10 grid place-items-center shrink-0 font-bold text-navy text-sm">
                    {app.first_name?.[0]}{app.last_name?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {app.first_name} {app.last_name}
                      </span>
                      {isNew && (
                        <Badge className="bg-teal text-white text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider">
                          NEW
                        </Badge>
                      )}
                      {app.status === "approved" && (
                        <Badge className="bg-success/20 text-[oklch(0.4_0.12_155)] text-[10px] px-1.5 py-0 font-bold">
                          Approved
                        </Badge>
                      )}
                      {app.status === "rejected" && (
                        <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 font-bold">
                          Rejected
                        </Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {app.email}
                      {app.phone ? ` · ${app.phone}` : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {app.role_applied_for && (
                        <span className="text-[11px] text-foreground/70 font-medium">
                          {app.role_applied_for}
                        </span>
                      )}
                      {app.job_reference && (
                        <span className="text-[11px] bg-navy/8 text-navy px-1.5 py-0.5 rounded-full font-medium">
                          {app.job_reference}
                        </span>
                      )}
                      {app.job_reference && jobClientMap[app.job_reference] && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {jobClientMap[app.job_reference]}
                        </span>
                      )}
                      {app.preferred_location && (
                        <span className="text-[11px] text-muted-foreground">{app.preferred_location}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-[11px] text-muted-foreground hidden sm:block">
                      {timeAgo(app.submitted_at)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border/40 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <Detail label="Qualifications" value={app.qualifications} />
                      <Detail label="Preferred hours" value={app.preferred_hours} />
                      <Detail
                        label="Open to temp"
                        value={app.open_to_temp === true ? "Yes" : app.open_to_temp === false ? "No" : null}
                      />
                      <Detail
                        label="Right to work UK"
                        value={app.right_to_work_uk === true ? "Yes" : app.right_to_work_uk === false ? "No" : null}
                      />
                      <Detail label="Applied" value={app.submitted_at ? new Date(app.submitted_at).toLocaleString("en-GB") : null} />
                      <Detail label="Source" value={app.source} />
                    </div>

                    {app.additional_info && (
                      <div className="mb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                          Additional info
                        </p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{app.additional_info}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mt-4">
                      {app.cv_url && (
                        <a
                          href={app.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View CV
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {app.candidate_id && (
                        <Link
                          to="/candidates/$id"
                          params={{ id: app.candidate_id }}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-navy hover:underline"
                        >
                          View candidate profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}

                      <div className="flex-1" />

                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={!!isActing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)] hover:bg-success/30 transition-colors disabled:opacity-50"
                          >
                            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            disabled={!!isActing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-warning/15 text-[oklch(0.45_0.12_75)] hover:bg-warning/25 transition-colors disabled:opacity-50"
                          >
                            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleRemove(app)}
                        disabled={!!isActing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                      >
                        {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.ok
              ? "bg-[oklch(0.3_0.1_155)] text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
