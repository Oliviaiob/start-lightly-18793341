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
  CalendarDays, Search, Plus, X, Phone, Video, Users,
  MapPin, CheckCircle, XCircle, Clock, ChevronDown,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/interviews")({
  component: Page,
});

// ── Types ─────────────────────────────────────────────────────────────────────

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
  candidate_id: string | null;
  candidate_first: string | null;
  candidate_last: string | null;
  job_id: string | null;
  job_title: string | null;
  client_name: string | null;
  booked_by: string | null;
};

type CandidateOption = { id: string; first_name: string | null; last_name: string | null };
type JobOption = { id: string; title: string; client_name?: string };

const ALL = "__all__";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  in_person: <Users className="h-3.5 w-3.5" />,
};

function typeLabel(t: string | null) {
  const map: Record<string, string> = { phone: "Phone", video: "Video", in_person: "In Person" };
  return map[t ?? ""] ?? t ?? "—";
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

// ── Outcome Badge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "successful")
    return <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]"><CheckCircle className="h-3 w-3" /> Successful</span>;
  if (outcome === "unsuccessful")
    return <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-destructive/20 text-destructive"><XCircle className="h-3 w-3" /> Unsuccessful</span>;
  return <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]"><Clock className="h-3 w-3" /> Pending</span>;
}

// ── Inline Outcome Dropdown ───────────────────────────────────────────────────

function OutcomeDropdown({ id, onUpdate }: { id: string; onUpdate: (outcome: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = async (value: string) => {
    setOpen(false); setSaving(true);
    const { error } = await supabase.from("interview_details").update({ outcome: value }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to update outcome"); return; }
    onUpdate(value);
    toast.success("Outcome updated");
  };

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} disabled={saving}
        className="h-7 px-3 rounded-full bg-muted/60 hover:bg-muted text-xs font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50">
        {saving ? "Saving…" : "Mark outcome"} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-9 z-50 w-48 bg-card rounded-xl shadow-lg border py-1">
          {[{ value: "successful", label: "Successful" }, { value: "unsuccessful", label: "Unsuccessful" }].map((o) => (
            <button key={o.value} onClick={(e) => { e.stopPropagation(); pick(o.value); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60 transition-colors">{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes & Feedback Modal ────────────────────────────────────────────────────

function NotesModal({ interview, open, onClose, onSaved }: {
  interview: Interview; open: boolean; onClose: () => void; onSaved: (id: string, notes: string, outcomeNotes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setNotes(interview.notes ?? ""); setOutcomeNotes(interview.outcome_notes ?? ""); }
  }, [open]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("interview_details").update({ notes, outcome_notes: outcomeNotes }).eq("id", interview.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Notes saved");
    onSaved(interview.id, notes, outcomeNotes);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Notes & Feedback</DialogTitle>
          <DialogDescription>{interview.candidate_first} {interview.candidate_last} — {interview.job_title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Prep notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Preparation notes for the candidate…"
              className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Feedback / outcome notes</label>
            <textarea value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} rows={4} placeholder="Feedback from the interview…"
              className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save notes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add New Interview Date Modal ──────────────────────────────────────────────

function AddNewDateModal({ interview, open, onClose, onCreated }: {
  interview: Interview | null; open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    interview_date: "", interview_time: "", interview_type: "in_person",
    interviewer_name: "", location: "", reason: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && interview) {
      setForm({ interview_date: "", interview_time: "", interview_type: interview.interview_type ?? "in_person",
        interviewer_name: interview.interviewer_name ?? "", location: interview.location ?? "", reason: "", notes: "" });
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.interview_date) { toast.error("Select a date"); return; }
    if (!interview) return;
    setSaving(true);
    const notesText = [form.reason ? `Reason: ${form.reason}` : null, form.notes].filter(Boolean).join("\n\n");
    const { error } = await supabase.from("interview_details").insert({
      pipeline_id: interview.pipeline_id,
      interview_date: form.interview_date,
      interview_time: form.interview_time || null,
      interview_type: form.interview_type,
      interviewer_name: form.interviewer_name || null,
      location: form.location || null,
      notes: notesText || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("New interview date added");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Interview Date</DialogTitle>
          <DialogDescription>Linked to the same candidate and job as the selected interview.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.interview_date} onChange={(e) => set("interview_date", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input type="time" value={form.interview_time} onChange={(e) => set("interview_time", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
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
              <Input value={form.interviewer_name} onChange={(e) => set("interviewer_name", e.target.value)} placeholder="Name" className="h-10" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Office address or video link" className="h-10" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <Select value={form.reason || "__none__"} onValueChange={(v) => set("reason", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select a reason…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="Candidate Rescheduled">Candidate Rescheduled</SelectItem>
                  <SelectItem value="Client Rescheduled">Client Rescheduled</SelectItem>
                  <SelectItem value="Next Stage Interview">Next Stage Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Any additional notes…"
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save Interview"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Interview Modal ───────────────────────────────────────────────────────

function AddInterviewModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [form, setForm] = useState({
    candidate_id: "", job_id: "", interview_date: "", interview_time: "",
    interview_type: "in_person", interviewer_name: "", location: "", notes: "",
  });
  // Searchable comboboxes
  const [candSearch, setCandSearch] = useState("");
  const [candOpen, setCandOpen] = useState(false);
  const [candName, setCandName] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobOpen, setJobOpen] = useState(false);
  const [jobLabel, setJobLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ candidate_id: "", job_id: "", interview_date: "", interview_time: "", interview_type: "in_person", interviewer_name: "", location: "", notes: "" });
      setCandName(""); setJobLabel(""); setCandSearch(""); setJobSearch(""); setCandOpen(false); setJobOpen(false);
      return;
    }
    Promise.all([
      supabase.from("candidates").select("id,first_name,last_name").order("first_name"),
      supabase.from("jobs").select("id,title,clients(company_name)").not("status", "eq", "closed").order("title"),
    ]).then(([c, j]) => {
      setCandidates((c.data as CandidateOption[]) ?? []);
      setJobs(((j.data ?? []) as any[]).map((jj) => ({ id: jj.id, title: jj.title, client_name: jj.clients?.company_name })));
    });
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filteredCands = candidates.filter((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(candSearch.toLowerCase()));
  const filteredJobs = jobs.filter((j) => `${j.title} ${j.client_name ?? ""}`.toLowerCase().includes(jobSearch.toLowerCase()));

  const handleSave = async () => {
    if (!form.candidate_id) { toast.error("Select a candidate"); return; }
    if (!form.job_id) { toast.error("Select a job"); return; }
    if (!form.interview_date) { toast.error("Select a date"); return; }
    setSaving(true);

    let { data: existing } = await supabase.from("job_pipeline").select("id").eq("job_id", form.job_id).eq("candidate_id", form.candidate_id).maybeSingle();
    let pipelineId = existing?.id;
    if (!pipelineId) {
      const { data: created, error: pErr } = await supabase.from("job_pipeline").insert({ job_id: form.job_id, candidate_id: form.candidate_id, stage: "interview_arranged" }).select("id").single();
      if (pErr) { toast.error("Failed to create pipeline entry"); setSaving(false); return; }
      pipelineId = created.id;
    } else {
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
    if (error) { toast.error("Failed: " + error.message); return; }
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
        <div className="space-y-3 mt-2">
          {/* Candidate searchable */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Candidate *</label>
            <div className="relative">
              {form.candidate_id && !candOpen ? (
                <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => { setCandOpen(true); setCandSearch(""); }}>
                  <span className="font-medium">{candName}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              ) : (
                <Input value={candSearch} onChange={(e) => { setCandSearch(e.target.value); setCandOpen(true); }}
                  onFocus={() => setCandOpen(true)} placeholder="Search candidates…" className="h-10" autoComplete="off" />
              )}
              {candOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredCands.length === 0 ? <div className="px-4 py-3 text-sm text-muted-foreground">No candidates found</div>
                    : filteredCands.map((c) => (
                      <button key={c.id} onMouseDown={() => { set("candidate_id", c.id); setCandName(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()); setCandSearch(""); setCandOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white">{(c.first_name?.[0] ?? "").toUpperCase()}{(c.last_name?.[0] ?? "").toUpperCase()}</span>
                        </div>
                        {c.first_name} {c.last_name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Job searchable */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Job *</label>
            <div className="relative">
              {form.job_id && !jobOpen ? (
                <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => { setJobOpen(true); setJobSearch(""); }}>
                  <span className="font-medium">{jobLabel}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              ) : (
                <Input value={jobSearch} onChange={(e) => { setJobSearch(e.target.value); setJobOpen(true); }}
                  onFocus={() => setJobOpen(true)} placeholder="Search jobs…" className="h-10" autoComplete="off" />
              )}
              {jobOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredJobs.length === 0 ? <div className="px-4 py-3 text-sm text-muted-foreground">No jobs found</div>
                    : filteredJobs.map((j) => (
                      <button key={j.id} onMouseDown={() => { set("job_id", j.id); setJobLabel(`${j.title}${j.client_name ? ` — ${j.client_name}` : ""}`); setJobSearch(""); setJobOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60">
                        <span className="font-medium">{j.title}</span>
                        {j.client_name && <span className="text-muted-foreground"> — {j.client_name}</span>}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any prep notes…" rows={3}
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save interview"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Interview Card ────────────────────────────────────────────────────────────

function InterviewCard({ interview, onOutcomeUpdate, onOpenNotes, onOpenNewDate, onNavigate }: {
  interview: Interview;
  onOutcomeUpdate: (id: string, outcome: string) => void;
  onOpenNotes: (i: Interview) => void;
  onOpenNewDate: (i: Interview) => void;
  onNavigate: (section: string, id: string) => void;
}) {
  const initials = `${interview.candidate_first?.[0] ?? ""}${interview.candidate_last?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* Left: avatar + two lines */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-semibold text-white">{initials}</span>
        </div>
        <div className="min-w-0 space-y-1">
          {/* Line 1: name · client · job */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <button onClick={() => interview.candidate_id && onNavigate("candidates", interview.candidate_id)}
              className="font-semibold hover:text-teal transition-colors">
              {interview.candidate_first} {interview.candidate_last}
            </button>
            {interview.client_name && <><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{interview.client_name}</span></>}
            {interview.job_title && <>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => interview.job_id && onNavigate("jobs", interview.job_id)}
                className="text-muted-foreground hover:text-foreground transition-colors">{interview.job_title}</button>
            </>}
          </div>
          {/* Line 2: date, type, location, booked by */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              {formatDateTime(interview.interview_date, interview.interview_time)}
            </span>
            {interview.interview_type && (
              <span className="flex items-center gap-1.5">
                {TYPE_ICONS[interview.interview_type]}
                {typeLabel(interview.interview_type)}
              </span>
            )}
            {interview.location && (
              <span className="flex items-center gap-1 max-w-[180px] truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {interview.location}
              </span>
            )}
            {interview.interviewer_name && (
              <span>Interviewer: <span className="text-foreground">{interview.interviewer_name}</span></span>
            )}
            {interview.booked_by && (
              <span>Set by <span className="text-foreground">{interview.booked_by}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Right: outcome + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <OutcomeBadge outcome={interview.outcome} />
        <button onClick={() => onOpenNotes(interview)}
          className="h-7 px-3 rounded-full bg-muted/60 hover:bg-muted text-xs font-medium inline-flex items-center gap-1 transition-colors">
          <MessageSquare className="h-3 w-3" /> Notes
        </button>
        {interview.outcome === null && (
          <OutcomeDropdown id={interview.id} onUpdate={(o) => onOutcomeUpdate(interview.id, o)} />
        )}
        <button onClick={() => onOpenNewDate(interview)}
          className="h-7 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-colors">
          <Plus className="h-3 w-3" /> New date
        </button>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, interviews, onOutcomeUpdate, onOpenNotes, onOpenNewDate, onNavigate }: {
  title: string; interviews: Interview[];
  onOutcomeUpdate: (id: string, outcome: string) => void;
  onOpenNotes: (i: Interview) => void;
  onOpenNewDate: (i: Interview) => void;
  onNavigate: (section: string, id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground px-1">
        {title} <span className="text-muted-foreground font-normal">({interviews.length})</span>
      </h2>
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        {interviews.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No {title.toLowerCase()} found.</div>
        ) : (
          interviews.map((i) => (
            <InterviewCard key={i.id} interview={i}
              onOutcomeUpdate={onOutcomeUpdate}
              onOpenNotes={onOpenNotes}
              onOpenNewDate={onOpenNewDate}
              onNavigate={onNavigate} />
          ))
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
  const [dateFilter, setDateFilter] = useState<string>(ALL);
  const [recruiterFilter, setRecruiterFilter] = useState<string>(ALL);
  const [outcomeFilter, setOutcomeFilter] = useState<string>(ALL);
  const [showAdd, setShowAdd] = useState(false);
  const [notesInterview, setNotesInterview] = useState<Interview | null>(null);
  const [newDateInterview, setNewDateInterview] = useState<Interview | null>(null);

  const loadInterviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("interview_details")
      .select(`
        id, pipeline_id, interview_date, interview_time, interview_type,
        interviewer_name, location, notes, outcome, outcome_notes, created_at,
        profiles!created_by(first_name, last_name),
        job_pipeline!pipeline_id(
          candidate_id, job_id,
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
      booked_by: r.profiles ? `${r.profiles.first_name ?? ""} ${r.profiles.last_name ?? ""}`.trim() : null,
    }));

    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => { loadInterviews(); }, []);

  // Unique recruiters for filter
  const recruiters = useMemo(() => {
    const names = rows.map((r) => r.booked_by).filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = new Date();
    return rows.filter((r) => {
      if (outcomeFilter === "pending" && r.outcome !== null) return false;
      if (outcomeFilter === "successful" && r.outcome !== "successful") return false;
      if (outcomeFilter === "unsuccessful" && r.outcome !== "unsuccessful") return false;
      if (recruiterFilter !== ALL && r.booked_by !== recruiterFilter) return false;
      if (dateFilter === "this_week") {
        const d = r.interview_date ? new Date(r.interview_date) : null;
        if (!d) return false;
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
        if (d < startOfWeek || d > endOfWeek) return false;
      }
      if (dateFilter === "this_month") {
        const d = r.interview_date ? new Date(r.interview_date) : null;
        if (!d) return false;
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      }
      if (needle) {
        const hay = `${r.candidate_first ?? ""} ${r.candidate_last ?? ""} ${r.client_name ?? ""} ${r.job_title ?? ""} ${r.booked_by ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, dateFilter, recruiterFilter, outcomeFilter]);

  const upcoming = filtered.filter((r) => isUpcoming(r.interview_date) && r.outcome === null)
    .sort((a, b) => (a.interview_date ?? "").localeCompare(b.interview_date ?? ""));
  const past = filtered.filter((r) => !isUpcoming(r.interview_date) || r.outcome !== null)
    .sort((a, b) => (b.interview_date ?? "").localeCompare(a.interview_date ?? ""));

  const updateOutcome = (id: string, outcome: string) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, outcome } : r));

  const updateNotes = (id: string, notes: string, outcomeNotes: string) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, notes, outcome_notes: outcomeNotes } : r));

  const goTo = (section: string, id: string) => navigate({ to: `/${section}/${id}` as any });

  const hasFilters = !!q || dateFilter !== ALL || recruiterFilter !== ALL || outcomeFilter !== ALL;
  const clearFilters = () => { setQ(""); setDateFilter(ALL); setRecruiterFilter(ALL); setOutcomeFilter(ALL); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Interviews"
        description={loading ? "Loading…" : `${rows.length} total`}
        icon={CalendarDays}
        actions={
          <button onClick={() => setShowAdd(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
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

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Dates</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {recruiters.length > 0 && (
            <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
                <SelectValue placeholder="All Recruiters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Recruiters</SelectItem>
                {recruiters.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

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
              Clear <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="p-16 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card text-center text-muted-foreground">Loading…</Card>
      ) : (
        <div className="space-y-8">
          <Section title="Upcoming Interviews" interviews={upcoming}
            onOutcomeUpdate={updateOutcome} onOpenNotes={setNotesInterview}
            onOpenNewDate={setNewDateInterview} onNavigate={goTo} />
          <Section title="Past Interviews" interviews={past}
            onOutcomeUpdate={updateOutcome} onOpenNotes={setNotesInterview}
            onOpenNewDate={setNewDateInterview} onNavigate={goTo} />
        </div>
      )}

      <AddInterviewModal open={showAdd} onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); loadInterviews(); }} />

      {notesInterview && (
        <NotesModal interview={notesInterview} open={!!notesInterview}
          onClose={() => setNotesInterview(null)}
          onSaved={(id, notes, outcomeNotes) => { updateNotes(id, notes, outcomeNotes); setNotesInterview(null); }} />
      )}

      <AddNewDateModal interview={newDateInterview} open={!!newDateInterview}
        onClose={() => setNewDateInterview(null)}
        onCreated={() => { setNewDateInterview(null); loadInterviews(); }} />
    </div>
  );
}
