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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Search,
  Plus,
  X,
  Phone,
  Video,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/interviews")({
  component: Page,
});

type Interview = {
  id: string;
  pipeline_id: string;
  interview_date: string | null;
  interview_time: string | null;
  interview_type: string | null;
  interviewer_name: string | null;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  created_at: string;
  // joined
  candidate_id: string | null;
  candidate_first: string | null;
  candidate_last: string | null;
  job_id: string | null;
  job_title: string | null;
  client_name: string | null;
};

type CandidateOption = { id: string; first_name: string | null; last_name: string | null };
type JobOption = { id: string; title: string; client_name?: string };

const ALL = "__all__";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  in_person: <Users className="h-3.5 w-3.5" />,
};

function typeLabel(t: string | null) {
  const map: Record<string, string> = { phone: "Phone", video: "Video", in_person: "In Person" };
  return map[t ?? ""] ?? t ?? "—";
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "successful")
    return (
      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
        <CheckCircle className="h-3 w-3" /> Passed
      </span>
    );
  if (outcome === "unsuccessful")
    return (
      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-destructive/20 text-destructive">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function formatDateTime(date: string | null, time: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  const dayStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (!time) return dayStr;
  const [h, m] = time.split(":");
  const t = new Date();
  t.setHours(parseInt(h), parseInt(m));
  return `${dayStr} · ${t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function isUpcoming(date: string | null) {
  if (!date) return false;
  return new Date(date) >= new Date(new Date().toDateString());
}

// ── Inline Outcome Dropdown ───────────────────────────────────────────────────

function OutcomeDropdown({ id, current, onUpdate }: {
  id: string; current: string | null; onUpdate: (outcome: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = async (value: string) => {
    setOpen(false);
    setSaving(true);
    const { error } = await supabase
      .from("interview_details")
      .update({ outcome: value })
      .eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to update outcome"); return; }
    onUpdate(value);
    toast.success("Outcome updated");
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={saving}
        className="h-7 px-3 rounded-full bg-muted/60 hover:bg-muted text-xs font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Mark outcome"} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 bg-card rounded-xl shadow-lg border py-1">
          {[
            { value: "successful", label: "✓ Passed" },
            { value: "unsuccessful", label: "✗ Failed" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={(e) => { e.stopPropagation(); pick(o.value); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Interview Modal ───────────────────────────────────────────────────────

function AddInterviewModal({
  open, onClose, onCreated,
}: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [form, setForm] = useState({
    candidate_id: "", job_id: "", interview_date: "",
    interview_time: "", interview_type: "in_person",
    interviewer_name: "", location: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setForm({ candidate_id: "", job_id: "", interview_date: "", interview_time: "", interview_type: "in_person", interviewer_name: "", location: "", notes: "" }); return; }
    Promise.all([
      supabase.from("candidates").select("id,first_name,last_name").order("first_name"),
      supabase.from("jobs").select("id,title,clients(company_name)").eq("status", "live").order("title"),
    ]).then(([c, j]) => {
      setCandidates((c.data as CandidateOption[]) ?? []);
      setJobs(((j.data ?? []) as any[]).map((j) => ({ id: j.id, title: j.title, client_name: j.clients?.company_name })));
    });
  }, [open]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.candidate_id) { toast.error("Select a candidate"); return; }
    if (!form.job_id) { toast.error("Select a job"); return; }
    if (!form.interview_date) { toast.error("Select a date"); return; }
    setSaving(true);

    // Find or create job_pipeline entry
    let { data: existing } = await supabase
      .from("job_pipeline")
      .select("id")
      .eq("job_id", form.job_id)
      .eq("candidate_id", form.candidate_id)
      .maybeSingle();

    let pipelineId = existing?.id;
    if (!pipelineId) {
      const { data: created, error: pErr } = await supabase
        .from("job_pipeline")
        .insert({ job_id: form.job_id, candidate_id: form.candidate_id, stage: "interview_arranged" })
        .select("id")
        .single();
      if (pErr) { toast.error("Failed to create pipeline entry"); setSaving(false); return; }
      pipelineId = created.id;
    } else {
      // Update stage to interview_arranged if earlier
      await supabase.from("job_pipeline").update({ stage: "interview_arranged" }).eq("id", pipelineId).in("stage", ["matched", "shortlisted", "cv_submitted"]);
    }

    const { error } = await supabase.from("interview_details").insert({
      pipeline_id: pipelineId,
      interview_date: form.interview_date,
      interview_time: form.interview_time || null,
      interview_type: form.interview_type,
      interviewer_name: form.interviewer_name || null,
      location: form.location || null,
      notes: form.notes || null,
    });

    setSaving(false);
    if (error) { toast.error("Failed to save interview: " + error.message); return; }
    toast.success("Interview added");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Interview</DialogTitle>
          <DialogDescription>Schedule a new candidate interview.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Candidate *</label>
              <Select value={form.candidate_id} onValueChange={(v) => set("candidate_id", v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select candidate…" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Job *</label>
              <Select value={form.job_id} onValueChange={(v) => set("job_id", v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select job…" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}{j.client_name ? ` — ${j.client_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.interview_date} onChange={(e) => set("interview_date", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input type="time" value={form.interview_time} onChange={(e) => set("interview_time", e.target.value)} className="h-10" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Interview type</label>
              <Select value={form.interview_type} onValueChange={(v) => set("interview_type", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Interviewer</label>
              <Input value={form.interviewer_name} onChange={(e) => set("interviewer_name", e.target.value)} placeholder="Jane Smith" className="h-10" />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="14 Blossom Lane, NW3 2PQ" className="h-10" />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any prep notes or instructions for the candidate…"
                rows={3}
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save interview"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Interview Row ─────────────────────────────────────────────────────────────

function InterviewRow({ interview, onOutcomeUpdate, onNavigate }: {
  interview: Interview;
  onOutcomeUpdate: (id: string, outcome: string) => void;
  onNavigate: (path: string, id: string) => void;
}) {
  const initials = `${interview.candidate_first?.[0] ?? ""}${interview.candidate_last?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Candidate */}
      <td className="py-3 px-4">
        <button
          onClick={() => interview.candidate_id && onNavigate("candidates", interview.candidate_id)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <div className="h-8 w-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-navy-foreground">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">{interview.candidate_first} {interview.candidate_last}</div>
          </div>
        </button>
      </td>

      {/* Client */}
      <td className="py-3 px-3 text-xs text-muted-foreground">{interview.client_name ?? "—"}</td>

      {/* Job */}
      <td className="py-3 px-3">
        <button
          onClick={() => interview.job_id && onNavigate("jobs", interview.job_id)}
          className="text-xs font-medium hover:text-teal transition-colors text-left"
        >
          {interview.job_title ?? "—"}
        </button>
      </td>

      {/* Date & Time */}
      <td className="py-3 px-3 text-xs whitespace-nowrap">
        {formatDateTime(interview.interview_date, interview.interview_time)}
      </td>

      {/* Type */}
      <td className="py-3 px-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {TYPE_ICONS[interview.interview_type ?? ""] ?? null}
          {typeLabel(interview.interview_type)}
        </span>
      </td>

      {/* Set By */}
      <td className="py-3 px-3 text-xs text-muted-foreground">
        {interview.interviewer_name ?? "—"}
      </td>

      {/* Location */}
      <td className="py-3 px-3">
        {interview.location ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{interview.location}</span>
          </span>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>

      {/* Outcome */}
      <td className="py-3 px-3">
        <OutcomeBadge outcome={interview.outcome} />
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        {interview.outcome === null && (
          <OutcomeDropdown
            id={interview.id}
            current={interview.outcome}
            onUpdate={(outcome) => onOutcomeUpdate(interview.id, outcome)}
          />
        )}
      </td>
    </tr>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, interviews, onOutcomeUpdate, onNavigate }: {
  title: string;
  interviews: Interview[];
  onOutcomeUpdate: (id: string, outcome: string) => void;
  onNavigate: (path: string, id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground px-1">
        {title} <span className="text-muted-foreground font-normal">({interviews.length})</span>
      </h2>
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        {interviews.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No {title.toLowerCase()} interviews.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                  <th className="text-left font-semibold py-3 px-4">Candidate</th>
                  <th className="text-left font-semibold py-3 px-3">Client</th>
                  <th className="text-left font-semibold py-3 px-3">Job</th>
                  <th className="text-left font-semibold py-3 px-3">Date & Time</th>
                  <th className="text-left font-semibold py-3 px-3">Type</th>
                  <th className="text-left font-semibold py-3 px-3">Interviewer</th>
                  <th className="text-left font-semibold py-3 px-3">Location</th>
                  <th className="text-left font-semibold py-3 px-3">Outcome</th>
                  <th className="text-right font-semibold py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <InterviewRow
                    key={i.id}
                    interview={i}
                    onOutcomeUpdate={onOutcomeUpdate}
                    onNavigate={onNavigate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [outcomeFilter, setOutcomeFilter] = useState<string>(ALL);
  const [showAdd, setShowAdd] = useState(false);

  const loadInterviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("interview_details")
      .select(`
        id, pipeline_id, interview_date, interview_time, interview_type,
        interviewer_name, location, notes, outcome, outcome_notes, created_at,
        job_pipeline!pipeline_id(
          candidate_id,
          job_id,
          candidates(first_name, last_name),
          jobs(title, clients(company_name))
        )
      `)
      .order("interview_date", { ascending: false });

    if (error) { toast.error("Failed to load interviews"); setLoading(false); return; }

    const mapped: Interview[] = (data ?? []).map((r: any) => ({
      id: r.id,
      pipeline_id: r.pipeline_id,
      interview_date: r.interview_date,
      interview_time: r.interview_time,
      interview_type: r.interview_type,
      interviewer_name: r.interviewer_name,
      location: r.location,
      notes: r.notes,
      outcome: r.outcome,
      outcome_notes: r.outcome_notes,
      created_at: r.created_at,
      candidate_id: r.job_pipeline?.candidate_id ?? null,
      candidate_first: r.job_pipeline?.candidates?.first_name ?? null,
      candidate_last: r.job_pipeline?.candidates?.last_name ?? null,
      job_id: r.job_pipeline?.job_id ?? null,
      job_title: r.job_pipeline?.jobs?.title ?? null,
      client_name: r.job_pipeline?.jobs?.clients?.company_name ?? null,
    }));

    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => { loadInterviews(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== ALL && r.interview_type !== typeFilter) return false;
      if (outcomeFilter === "pending" && r.outcome !== null) return false;
      if (outcomeFilter === "successful" && r.outcome !== "successful") return false;
      if (outcomeFilter === "unsuccessful" && r.outcome !== "unsuccessful") return false;
      if (needle) {
        const hay = `${r.candidate_first ?? ""} ${r.candidate_last ?? ""} ${r.client_name ?? ""} ${r.job_title ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, typeFilter, outcomeFilter]);

  const upcoming = filtered.filter((r) => isUpcoming(r.interview_date) && r.outcome === null)
    .sort((a, b) => (a.interview_date ?? "").localeCompare(b.interview_date ?? ""));
  const past = filtered.filter((r) => !isUpcoming(r.interview_date) || r.outcome !== null)
    .sort((a, b) => (b.interview_date ?? "").localeCompare(a.interview_date ?? ""));

  const updateOutcome = (id: string, outcome: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, outcome } : r));
  };

  const goTo = (section: string, id: string) => {
    navigate({ to: `/${section}/${id}` as any });
  };

  const hasFilters = !!q || typeFilter !== ALL || outcomeFilter !== ALL;
  const clearFilters = () => { setQ(""); setTypeFilter(ALL); setOutcomeFilter(ALL); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Interviews"
        description={loading ? "Loading interviews…" : `${rows.length} total`}
        icon={CalendarDays}
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Interview
          </button>
        }
      />

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidate, client, or job…"
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background" />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="in_person">In Person</SelectItem>
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Outcomes</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="successful">Passed</SelectItem>
              <SelectItem value="unsuccessful">Failed</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 h-9 px-2">
              Clear filters <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="p-16 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card text-center text-muted-foreground">
          Loading interviews…
        </Card>
      ) : (
        <div className="space-y-8">
          <Section
            title="Upcoming Interviews"
            interviews={upcoming}
            onOutcomeUpdate={updateOutcome}
            onNavigate={goTo}
          />
          <Section
            title="Past Interviews"
            interviews={past}
            onOutcomeUpdate={updateOutcome}
            onNavigate={goTo}
          />
        </div>
      )}

      <AddInterviewModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); loadInterviews(); }}
      />
    </div>
  );
}
