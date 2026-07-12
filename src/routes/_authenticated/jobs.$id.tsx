import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Briefcase, ArrowLeft, Building2, Users, GraduationCap,
  Banknote, MapPin, Clock, MessageSquare, PhoneCall,
  Plus, ChevronDown, Star, X, Sparkles, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/contexts/scope-context";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  component: Page,
});

// ── Types ──────────────────────────────────────────────────────────────────────

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
  notes: string | null;
  hours: string | null;
  room: string | null;
  advertising_notes: string | null;
  source_boards: string[] | null;
  branch_id: string | null;
  posted_at: string | null;
  boolean_searches: { broad: string; standard: string; perfect: string } | null;
  description_soar: string | null;
  location_text: string | null;
  sector: string | null;
  employment_type: string | null;
  contract_type: string | null;
};

type PipelineEntry = {
  id: string;
  stage: string;
  stage_changed_at: string | null;
  candidate: { id: string; first_name: string | null; last_name: string | null; qualification_level: string | null; postcode: string | null; phone: string | null } | null;
};

type BranchOption = { id: string; branch_name: string };
type CandidateOption = { id: string; first_name: string | null; last_name: string | null };
type Activity = { id: string; activity_type: string; description: string | null; created_by: string | null; created_at: string };

type MatchResult = {
  id: string;
  name: string;
  qual: string | null;
  score: number;
  breakdown: string[];
  postcode: string | null;
  city: string | null;
  candidate_type: string | null;
  has_dbs: boolean | null;
  available_days: string[] | null;
  current_position: string | null;
  commute_radius: string | null;
  expected_salary: number | null;
  owner: string | null;
  ai_score: number | null;
  ai_reason: string | null;
  ai_highlights: string[];
};

type CandidateFull = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  qualification_level: string | null;
  candidate_type: string | null;
  status_perm: string | null;
  status_temp: string | null;
  postcode: string | null;
  city: string | null;
  source: string | null;
  has_dbs: boolean | null;
  available_days: string[] | null;
  breakdown: string[];
};

const STAGES = [
  { key: "matched", label: "Matched", group: "early" },
  { key: "shortlisted", label: "Shortlisted", group: "early" },
  { key: "cv_submitted", label: "CV Submitted", group: "early" },
  { key: "interview_arranged", label: "Interview Arranged", group: "early" },
  { key: "interviewed", label: "Interviewed", group: "later" },
  { key: "offer_made", label: "Offer Made", group: "later" },
  { key: "placed", label: "Placed", group: "later" },
  { key: "rejected", label: "Rejected", group: "rejected" },
];

const SOURCE_BOARDS = [
  { key: "cv_library", label: "CV-Library" },
  { key: "reed", label: "Reed" },
  { key: "soar_website", label: "SOAR Website" },
];

const QUAL_OPTIONS = [
  { value: "unqualified", label: "Unqualified" },
  { value: "level_2", label: "Level 2" },
  { value: "level_3", label: "Level 3" },
  { value: "room_leader", label: "Room Leader" },
  { value: "deputy_manager", label: "Deputy Manager" },
  { value: "manager", label: "Manager" },
];

const QUAL_ORDER = ["unqualified", "level_2", "level_3", "room_leader", "deputy_manager", "manager"];

const STAGE_COLORS: Record<string, string> = {
  matched:             "#A8E6CF",
  shortlisted:         "#5DCAA5",
  cv_submitted:        "#2DD4BF",
  interview_arranged:  "#1D9E75",
  interviewed:         "#FAD07A",
  offer_made:          "#F59E0B",
  placed:              "#22C55E",
  rejected:            "#EF4444",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtQual(q: string | null) {
  return QUAL_OPTIONS.find((o) => o.value === q)?.label ?? q ?? "—";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function relTime(iso?: string | null) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

function activityIcon(type: string) {
  if (type === "call_logged") return <PhoneCall className="h-3.5 w-3.5 text-teal-foreground" />;
  if (type === "stage_change") return <Users className="h-3.5 w-3.5 text-navy" />;
  if (type === "status_change") return <Briefcase className="h-3.5 w-3.5 text-amber-500" />;
  if (type === "pipeline_add") return <Plus className="h-3.5 w-3.5 text-teal-foreground" />;
  return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
}

function scoreQual(jobQual: string | null, candQual: string | null): number {
  if (!jobQual || !candQual) return 0;
  if (jobQual === candQual) return 40;
  const ji = QUAL_ORDER.indexOf(jobQual);
  const ci = QUAL_ORDER.indexOf(candQual);
  if (ji < 0 || ci < 0) return 0;
  const diff = Math.abs(ji - ci);
  if (diff === 1) return 25;
  if (diff === 2) return 10;
  return 0;
}

function postcodeArea(pc: string | null): string {
  return (pc ?? "").trim().toUpperCase().replace(/\s.*/, "").replace(/\d+$/, "");
}

function extractKeywords(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const stopwords = new Set(["the","a","an","and","or","to","in","of","for","with","is","are","will","on","at","be","this","that","we","you","our","your","their","have","has","as","by","from","it","its","all","any","can","not","but","they","who","what","how"]);
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w))
  );
}

const CHILDCARE_SYNONYMS: Record<string, string[]> = {
  nursery: ["nursery","early years","childcare","eyfs","preschool","pre-school","playgroup"],
  "room leader": ["room leader","senior practitioner","lead practitioner","team leader"],
  "deputy manager": ["deputy manager","deputy","assistant manager"],
  manager: ["manager","nursery manager","centre manager","head of"],
  "level 3": ["level 3","nneb","btec","cache","nvq level 3","foundation degree","ba early childhood"],
  "level 2": ["level 2","nvq level 2","cache level 2","btec level 2"],
  baby: ["baby","babies","0-2","under 2","infant"],
  toddler: ["toddler","1-3","wobbler","walking"],
  "pre-school": ["pre-school","preschool","3-5","foundation stage"],
};

function experienceScore(job: Pick<Job,"title"|"description"|"qualification_required">, c: {
  qualifications_text?: string | null;
  current_position?: string | null;
  current_employer?: string | null;
  notes?: string | null;
  availability_notes?: string | null;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const candText = [c.qualifications_text, c.current_position, c.current_employer, c.notes, c.availability_notes]
    .filter(Boolean).join(" ").toLowerCase();

  // Check job title keywords in candidate text
  const jobWords = extractKeywords((job.title ?? "") + " " + (job.description ?? ""));
  const candWords = extractKeywords(candText);

  // Direct keyword overlap
  const overlap = [...jobWords].filter(w => candWords.has(w));
  const pct = jobWords.size > 0 ? overlap.length / jobWords.size : 0;

  if (pct >= 0.25) { score += 10; reasons.push("Strong keyword match"); }
  else if (pct >= 0.12) { score += 5; reasons.push("Partial keyword match"); }

  // Synonym/sector matching
  let sectorHits = 0;
  for (const [concept, syns] of Object.entries(CHILDCARE_SYNONYMS)) {
    const inJob = syns.some(s => ((job.title ?? "") + " " + (job.description ?? "") + " " + (job.qualification_required ?? "")).toLowerCase().includes(s));
    const inCand = syns.some(s => candText.includes(s));
    if (inJob && inCand) sectorHits++;
  }
  if (sectorHits >= 2) { score += 10; reasons.push(`${sectorHits} sector matches`); }
  else if (sectorHits === 1) { score += 5; reasons.push("Sector experience"); }

  // Current position relevance
  if (c.current_position) {
    const cp = c.current_position.toLowerCase();
    const titleLower = (job.title ?? "").toLowerCase();
    if (titleLower.split(" ").some(w => w.length > 4 && cp.includes(w))) {
      score += 5; reasons.push("Current role matches");
    }
  }

  return { score: Math.min(score, 20), reasons };
}

function commuteScore(jobPostcode: string | null | undefined, candPostcode: string | null, commuteRadius: string | null): { score: number; reason: string | null } {
  // Parse commute radius (e.g. "5 miles", "10 miles", "30 minutes")
  if (!commuteRadius) return { score: 0, reason: null };
  const miles = parseInt(commuteRadius.replace(/[^0-9]/g, "") || "0");
  if (miles >= 20 || commuteRadius.toLowerCase().includes("any") || commuteRadius.toLowerCase().includes("remote")) {
    return { score: 10, reason: "Flexible commute" };
  }
  const jobArea = postcodeArea(jobPostcode ?? null);
  const candArea = postcodeArea(candPostcode);
  if (jobArea && candArea && jobArea === candArea && miles >= 5) {
    return { score: 10, reason: `Within commute radius (${commuteRadius})` };
  }
  if (jobArea && candArea && jobArea.slice(0,2) === candArea.slice(0,2) && miles >= 10) {
    return { score: 5, reason: `Nearby, commute radius ${commuteRadius}` };
  }
  return { score: 0, reason: null };
}

function scoreCandidate(job: Pick<Job, "qualification_required" | "location_postcode" | "title" | "description">, c: {
  qualification_level?: string | null;
  postcode?: string | null;
  candidate_type?: string | null;
  has_dbs?: boolean | null;
  qualifications_text?: string | null;
  current_position?: string | null;
  current_employer?: string | null;
  notes?: string | null;
  availability_notes?: string | null;
  commute_radius?: string | null;
}): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = 0;

  // Qualification — 40pts
  const q = scoreQual(job.qualification_required, c.qualification_level ?? null);
  total += q; breakdown.push(`Qual: ${q}/40`);

  // Location — 20pts
  const jobArea = postcodeArea(job.location_postcode ?? null);
  const candArea = postcodeArea(c.postcode ?? null);
  if (jobArea && candArea && jobArea === candArea) {
    total += 20; breakdown.push("Location: 20/20");
  } else if (jobArea && candArea && jobArea.slice(0,2) === candArea.slice(0,2)) {
    total += 10; breakdown.push("Location: 10/20 (nearby area)");
  } else {
    breakdown.push("Location: 0/20");
  }

  // DBS — 10pts
  if (c.has_dbs) { total += 10; breakdown.push("DBS: 10/10"); }
  else breakdown.push("DBS: 0/10");

  // Candidate type alignment — 10pts
  const ct = (c.candidate_type ?? "").toLowerCase();
  if (ct.includes("both")) { total += 10; breakdown.push("Type: 10/10 (both)"); }
  else if (ct.includes("perm")) { total += 10; breakdown.push("Type: 10/10 (perm)"); }
  else { breakdown.push("Type: 0/10 (temp only)"); }

  // Experience & skills — 20pts
  const { score: expScore, reasons: expReasons } = experienceScore(job, c);
  total += expScore;
  breakdown.push(expReasons.length ? `Experience: ${expScore}/20 (${expReasons.join(", ")})` : `Experience: 0/20`);

  // Commute — 10pts
  const { score: comScore, reason: comReason } = commuteScore(job.location_postcode, c.postcode ?? null, c.commute_radius ?? null);
  total += comScore;
  breakdown.push(comReason ? `Commute: ${comScore}/10 (${comReason})` : "Commute: 0/10");

  return { total, breakdown };
}


// ── Status Dropdown ────────────────────────────────────────────────────────────

function StatusDropdown({ jobId, current, onUpdate }: { jobId: string; current: string | null; onUpdate: (v: string) => void }) {
  const colours: Record<string, string> = {
    live: "bg-success/20 text-[oklch(0.4_0.12_155)]",
    interviewing: "bg-teal/20 text-teal-foreground",
    filled: "bg-navy/10 text-navy",
    lost: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = { live: "Live", interviewing: "Interviewing", filled: "Filled", lost: "Lost" };
  const [open, setOpen] = useState(false);
  const save = async (v: string) => {
    setOpen(false);
    const { error } = await supabase.from("jobs").update({ status: v }).eq("id", jobId);
    if (error) { toast.error("Failed to update"); return; }
    onUpdate(v);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className={`h-9 px-3 rounded-lg border inline-flex items-center gap-1.5 text-sm font-medium ${colours[current ?? ""] ?? "bg-muted text-muted-foreground"}`}>
        {labels[current ?? ""] ?? "—"} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-40 bg-card rounded-xl shadow-lg border py-1">
          {Object.entries(labels).map(([v, l]) => (
            <button key={v} onClick={() => save(v)} className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60">{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add to Pipeline Modal ──────────────────────────────────────────────────────

function AddPipelineModal({ open, jobId, onClose, onAdded, prefilledCandidateId, prefilledCandidateName }: {
  open: boolean; jobId: string; onClose: () => void; onAdded: () => void;
  prefilledCandidateId?: string; prefilledCandidateName?: string;
}) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stage, setStage] = useState("matched");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setCandidateId(""); setCandidateName(""); setSearch(""); setDropdownOpen(false); setStage("matched"); return; }
    if (prefilledCandidateId && prefilledCandidateName) {
      setCandidateId(prefilledCandidateId);
      setCandidateName(prefilledCandidateName);
    }
    supabase.from("candidates").select("id,first_name,last_name").order("first_name").then(({ data }) => setCandidates((data as CandidateOption[]) ?? []));
  }, [open]);

  const filtered = candidates.filter((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selectCandidate = (c: CandidateOption) => {
    setCandidateId(c.id);
    setCandidateName(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim());
    setSearch("");
    setDropdownOpen(false);
  };

  const save = async () => {
    if (!candidateId) { toast.error("Select a candidate"); return; }
    setSaving(true);
    // check for existing entry
    const { data: existing } = await supabase.from("job_pipeline").select("id").eq("job_id", jobId).eq("candidate_id", candidateId).maybeSingle();
    if (existing) {
      // update stage
      const { error } = await supabase.from("job_pipeline").update({ stage, stage_changed_at: new Date().toISOString() }).eq("id", existing.id);
      setSaving(false);
      if (error) { toast.error("Failed"); return; }
    } else {
      const { error } = await supabase.from("job_pipeline").insert({ job_id: jobId, candidate_id: candidateId, stage, stage_changed_at: new Date().toISOString() });
      setSaving(false);
      if (error) { toast.error("Failed: " + error.message); return; }
    }
    // log activity
    await supabase.from("activity_log").insert({ entity_type: "job", entity_id: jobId, activity_type: "pipeline_add", description: `${candidateName} added to pipeline (${STAGES.find(s => s.key === stage)?.label ?? stage})`, created_by: null });
    toast.success("Added to pipeline");
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Pipeline</DialogTitle>
          <DialogDescription>Add a candidate to this job's recruitment pipeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Candidate *</label>
            <div className="relative">
              {candidateId && !dropdownOpen ? (
                <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => { setDropdownOpen(true); setSearch(""); }}>
                  <span className="font-medium">{candidateName}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              ) : (
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search candidates…"
                  className="h-10"
                  autoComplete="off"
                />
              )}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No candidates found</div>
                  ) : filtered.map((c) => (
                    <button key={c.id} onMouseDown={() => selectCandidate(c)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2">
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Stage</label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.filter((s) => s.key !== "rejected").map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving}
            className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Adding…" : "Add to pipeline"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Candidate Drawer ──────────────────────────────────────────────────────────

function CandidateDrawer({ candidateId, onClose }: { candidateId: string | null; onClose: () => void }) {
  const [candidate, setCandidate] = useState<CandidateFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) { setCandidate(null); return; }
    setLoading(true);
    supabase.from("candidates")
      .select("id,first_name,last_name,email,phone,qualification_level,candidate_type,status_perm,status_temp,postcode,city,source,has_dbs,available_days")
      .eq("id", candidateId)
      .maybeSingle()
      .then(({ data }) => { setCandidate(data as CandidateFull ?? null); setLoading(false); });
  }, [candidateId]);

  if (!candidateId) return null;

  const name = candidate ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() : "";
  const initials = candidate ? `${candidate.first_name?.[0] ?? ""}${candidate.last_name?.[0] ?? ""}`.toUpperCase() : "…";

  const typeLabel = (t: string | null) => {
    if (t === "perm") return "Permanent";
    if (t === "temp") return "Temp";
    if (t === "both") return "Perm & Temp";
    return t ?? "—";
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] bg-card shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-navy">
          <span className="text-white font-semibold text-sm">Candidate Profile</span>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}

        {!loading && candidate && (
          <div className="flex-1 p-6 space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
              <div>
                <div className="text-lg font-bold">{name}</div>
                <div className="text-sm text-muted-foreground">{fmtQual(candidate.qualification_level)}</div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Contact</div>
              <Row label="Email" value={candidate.email ?? "—"} />
              <Row label="Phone" value={candidate.phone ?? "—"} />
            </div>

            {/* Location */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Location</div>
              <Row label="City" value={candidate.city ?? "—"} />
              <Row label="Postcode" value={candidate.postcode ?? "—"} />
            </div>

            {/* Status */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Status</div>
              <Row label="Type" value={typeLabel(candidate.candidate_type)} />
              {(candidate.candidate_type === "perm" || candidate.candidate_type === "both") && (
                <Row label="Perm status" value={candidate.status_perm ?? "—"} />
              )}
              {(candidate.candidate_type === "temp" || candidate.candidate_type === "both") && (
                <Row label="Temp status" value={candidate.status_temp ?? "—"} />
              )}
              <Row label="DBS" value={candidate.has_dbs ? "✓ Valid DBS" : "No DBS"} />
            </div>

            {/* Availability */}
            {candidate.available_days && candidate.available_days.length > 0 && (
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Availability</div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.available_days.map((d) => (
                    <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium capitalize">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            {candidate.source && (
              <div className="rounded-xl bg-muted/30 p-4 space-y-2">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Source</div>
                <Row label="Referred via" value={candidate.source} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// ── Stage Column ───────────────────────────────────────────────────────────────

function StageColumn({ stage, label, color, entries, onCandidateClick, onMoveStage }: {
  stage: string; label: string; color: string; entries: PipelineEntry[];
  onCandidateClick: (id: string) => void;
  onMoveStage: (entryId: string, newStage: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const entryId = e.dataTransfer.getData("entryId");
    const fromStage = e.dataTransfer.getData("fromStage");
    if (entryId && fromStage !== stage) onMoveStage(entryId, stage);
  };

  return (
    <div
      className={`rounded-xl p-3 min-w-[180px] flex-1 border transition-colors ${isDragOver ? "border-teal/60 bg-teal/5" : "bg-card border-border"}`}
      style={{ borderTop: `3px solid ${color}` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="text-[10px] font-bold bg-muted rounded-full h-5 w-5 flex items-center justify-center">{entries.length}</span>
      </div>
      <div className="space-y-2">
        {entries.map((e) => {
          const c = e.candidate;
          const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : "Unknown";
          const initials = c ? `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase() : "?";
          return (
            <div
              key={e.id}
              draggable
              onDragStart={(ev) => { ev.dataTransfer.setData("entryId", e.id); ev.dataTransfer.setData("fromStage", stage); ev.dataTransfer.effectAllowed = "move"; }}
              className="bg-card rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing active:opacity-60 transition-opacity"
            >
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => c && onCandidateClick(c.id)}>
                <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">{initials}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate hover:text-teal transition-colors">{name}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtQual(c?.qualification_level ?? null)}</div>
                  {(c?.postcode || c?.phone) && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {[c?.postcode, c?.phone].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-center py-4 text-[11px] text-muted-foreground/60">Drop here</div>
        )}
      </div>
    </div>
  );
}

// ── Rejected Drop Zone ────────────────────────────────────────────────────────

function RejectedZone({ pipeline, onMoveStage, onCandidateClick }: {
  pipeline: PipelineEntry[];
  onMoveStage: (entryId: string, newStage: string) => void;
  onCandidateClick: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const rejected = pipeline.filter((e) => e.stage === "rejected");

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const entryId = e.dataTransfer.getData("entryId");
    const fromStage = e.dataTransfer.getData("fromStage");
    if (entryId && fromStage !== "rejected") onMoveStage(entryId, "rejected");
  };

  return (
    <div
      className={`rounded-xl p-3 border transition-colors ${isDragOver ? "border-red-300 bg-red-50/10" : "bg-muted/20 border-transparent"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Rejected</span>
        <span className="text-[10px] font-bold bg-muted rounded-full h-5 w-5 flex items-center justify-center">{rejected.length}</span>
      </div>
      {rejected.length === 0 ? (
        <div className="text-center py-3 text-xs text-muted-foreground/60">Drag candidates here to mark as rejected.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rejected.map((e) => {
            const c = e.candidate;
            return (
              <div
                key={e.id}
                draggable
                onDragStart={(ev) => { ev.dataTransfer.setData("entryId", e.id); ev.dataTransfer.setData("fromStage", "rejected"); ev.dataTransfer.effectAllowed = "move"; }}
                className="text-xs bg-card rounded-lg px-3 py-1.5 cursor-grab active:cursor-grabbing hover:bg-muted/50"
                onClick={() => c && onCandidateClick(c.id)}
              >
                {c?.first_name} {c?.last_name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "details" | "pipeline" | "smart_match" | "advertised" | "activity_log";

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { userId } = useScope();

  const [job, setJob] = useState<Job | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("details");

  // details edit
  const [draft, setDraft] = useState<Partial<Job>>({});
  const [saving, setSaving] = useState(false);

  // activity
  const [noteText, setNoteText] = useState("");
  const [loggingNote, setLoggingNote] = useState(false);

  // pipeline
  const [showAddPipeline, setShowAddPipeline] = useState(false);

  // smart match
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [addPipelineCandidate, setAddPipelineCandidate] = useState<{ id: string; name: string } | null>(null);

  // boolean searches
  const [boolSearches, setBoolSearches] = useState<{ broad: string; standard: string; perfect: string } | null>(null);
  const [boolLoading, setBoolLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // soar job description
  const [soarDesc, setSoarDesc] = useState<string>("");
  const [soarDescLoading, setSoarDescLoading] = useState(false);
  const [soarDescCopied, setSoarDescCopied] = useState(false);
  const [soarDescEditing, setSoarDescEditing] = useState(false);
  const [regenPromptOpen, setRegenPromptOpen] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState("");

  const loadAll = async () => {
    const [jRes, pRes, aRes] = await Promise.all([
      supabase.from("jobs").select("id,title,client_id,status,qualification_required,salary_min,salary_max,location_postcode,location_text,sector,employment_type,contract_type,description,notes,hours,room,advertising_notes,source_boards,branch_id,posted_at,boolean_searches,description_soar,clients(company_name)").eq("id", id).maybeSingle(),
      supabase.from("job_pipeline").select("id,stage,stage_changed_at,candidates(id,first_name,last_name,qualification_level,postcode,phone)").eq("job_id", id).order("stage_changed_at", { ascending: false }),
      supabase.from("activity_log").select("id,activity_type,description,created_by,created_at").eq("entity_id", id).eq("entity_type", "job").order("created_at", { ascending: false }).limit(30),
    ]);
    if (jRes.error) { toast.error("Could not load job"); setLoading(false); return; }
    const j = jRes.data as any;
    const jobData: Job = { ...j, client_name: j?.clients?.company_name ?? null };
    setJob(jobData);
    setDraft(jobData);
    // Load branches for this client
    if (j?.client_id) {
      const { data: bData } = await supabase.from("client_branches").select("id,branch_name").eq("client_id", j.client_id).order("branch_name");
      setBranches((bData as BranchOption[]) ?? []);
    }
    setPipeline(((pRes.data ?? []) as any[]).map((p) => ({ id: p.id, stage: p.stage ?? "matched", stage_changed_at: p.stage_changed_at, candidate: p.candidates ?? null })));
    setActivities((aRes.data as Activity[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const setD = (k: keyof Job, v: any) => setDraft((p) => ({ ...p, [k]: v }));

  const saveDetails = async () => {
    setSaving(true);
    const { error } = await supabase.from("jobs").update({
      title: draft.title,
      qualification_required: draft.qualification_required || null,
      salary_min: draft.salary_min ?? null,
      salary_max: draft.salary_max ?? null,
      location_postcode: draft.location_postcode || null,
      location_text: draft.location_text || null,
      sector: draft.sector || null,
      employment_type: draft.employment_type || null,
      contract_type: draft.contract_type || null,
      branch_id: draft.branch_id || null,
      room: draft.room || null,
      hours: draft.hours || null,
      description: draft.description || null,
      notes: draft.notes || null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Changes saved");
    setJob((prev) => prev ? { ...prev, ...draft } : prev);
  };

  const generateSoarDesc = async (instruction?: string) => {
    if (!job) return;
    setRegenPromptOpen(false);
    setRegenInstruction("");
    setSoarDescLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          title: job.title,
          qualification_required: job.qualification_required,
          location: job.location_postcode,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          hours: job.hours,
          room: job.room,
          description: job.description,
          client_name: (job as any).clients?.company_name ?? null,
          ...(instruction && soarDesc ? { existing_description: soarDesc, instruction } : {}),
        },
      });
      if (error) throw new Error(error.message);
      const desc = data?.description ?? "";
      if (desc) {
        setSoarDesc(desc);
        await (supabase as any).from("jobs").update({ description_soar: desc }).eq("id", job.id);
        toast.success("SOAR job description generated");
      }
    } catch (e: any) {
      toast.error("Couldn't generate description: " + e.message);
    }
    setSoarDescLoading(false);
  };

  const saveSoarDesc = async () => {
    if (!job) return;
    await (supabase as any).from("jobs").update({ description_soar: soarDesc }).eq("id", job.id);
    toast.success("Description saved");
  };

  const generateBooleanSearches = async () => {
    if (!job) return;
    setBoolLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-boolean-searches", {
        body: {
          title: job.title,
          qualification_required: job.qualification_required,
          location_postcode: job.location_postcode,
          description: job.description,
          room: job.room,
          hours: job.hours,
        },
      });
      if (error) throw new Error(error.message);
      const searches = data?.searches ?? null;
      if (searches) {
        setBoolSearches(searches);
        await (supabase as any).from("jobs").update({ boolean_searches: searches }).eq("id", job.id);
      }
    } catch (e: any) {
      toast.error("Couldn't generate searches: " + e.message);
    }
    setBoolLoading(false);
  };

  const copySearch = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const saveAdvertised = async () => {
    setSaving(true);
    const { error } = await supabase.from("jobs").update({
      source_boards: draft.source_boards ?? [],
      advertising_notes: draft.advertising_notes || null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed"); return; }
    toast.success("Advertising updated");
    setJob((prev) => prev ? { ...prev, ...draft } : prev);
  };

  const toggleSourceBoard = (key: string) => {
    const current = draft.source_boards ?? [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setD("source_boards", updated);
  };

  const logNote = async () => {
    if (!noteText.trim()) return;
    await supabase.from("activity_log").insert({ entity_type: "job", entity_id: id, activity_type: "note", description: noteText.trim(), created_by: userId ?? "system" });
    setNoteText(""); setLoggingNote(false);
    loadAll();
    toast.success("Note saved");
  };

  const moveStage = async (entryId: string, newStage: string) => {
    const { error } = await supabase.from("job_pipeline").update({ stage: newStage, stage_changed_at: new Date().toISOString() }).eq("id", entryId);
    if (error) { toast.error("Failed to move"); return; }
    const entry = pipeline.find(e => e.id === entryId);
    const candName = entry?.candidate ? `${entry.candidate.first_name ?? ""} ${entry.candidate.last_name ?? ""}`.trim() : "Candidate";
    const stageLabel = STAGES.find(s => s.key === newStage)?.label ?? newStage;
    await supabase.from("activity_log").insert({ entity_type: "job", entity_id: id, activity_type: "stage_change", description: `${candName} moved to ${stageLabel}`, created_by: userId ?? "system" });
    setPipeline((prev) => prev.map((e) => e.id === entryId ? { ...e, stage: newStage } : e));
    setActivities(prev => [{ id: crypto.randomUUID(), activity_type: "stage_change", description: `${candName} moved to ${stageLabel}`, created_by: userId ?? null, created_at: new Date().toISOString() }, ...prev]);
    toast.success("Stage updated");
  };

  const findMatches = async () => {
    if (!job) return;
    setMatching(true);
    const { data } = await supabase.from("candidates").select(
"id,first_name,last_name,qualification_level,postcode,town,candidate_type,has_dbs,available_days,qualifications_text,current_position,current_employer,notes,availability_notes,commute_radius,expected_salary,created_by,owner:profiles!candidates_created_by_fkey(display_name,first_name,last_name)"
    );

    // For perm jobs, exclude temp-only candidates
    const isPerm = !job.title?.toLowerCase().includes("temp");
    const filtered = ((data ?? []) as any[]).filter(c => {
      if (!isPerm) return true; // temp jobs include everyone
      const ct = (c.candidate_type ?? "").toLowerCase();
      return !ct || ct.includes("perm") || ct.includes("both");
    });

    const results = filtered.map((c) => {
      const { total, breakdown } = scoreCandidate(job, c);
      return {
        id: c.id,
        name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
        qual: c.qualification_level,
        score: total,
        breakdown,
        postcode: c.postcode ?? null,
        city: c.town ?? null,
        candidate_type: c.candidate_type ?? null,
        has_dbs: c.has_dbs ?? null,
        available_days: c.available_days ?? null,
        ai_score: null,
        ai_reason: null,
        ai_highlights: [],
        current_position: c.current_position ?? null,
        commute_radius: c.commute_radius ?? null,
        expected_salary: c.expected_salary ?? null,
        owner: c.owner ? (c.owner.display_name || [c.owner.first_name, c.owner.last_name].filter(Boolean).join(" ") || null) : null,
      };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

    setMatchResults(results);
    setMatching(false);
  };

  const runAiDeepMatch = async () => {
    if (!job || matchResults.length === 0) return;
    setAiMatching(true);
    try {
      const top = matchResults.slice(0, 20); // cap at 20 to keep token count reasonable
      const { data: fullData } = await supabase.from("candidates").select(
        "id,qualifications_text,current_position,current_employer,notes,availability_notes,commute_radius"
      ).in("id", top.map(r => r.id));

      const candPayload = top.map(r => {
        const full = ((fullData ?? []) as any[]).find((f: any) => f.id === r.id) ?? {};
        return {
          id: r.id,
          name: r.name,
          current_position: full.current_position ?? r.current_position,
          current_employer: full.current_employer ?? null,
          qualifications_text: full.qualifications_text ?? null,
          notes: full.notes ?? null,
          availability_notes: full.availability_notes ?? null,
          commute_radius: full.commute_radius ?? r.commute_radius,
        };
      });

      const { data, error } = await supabase.functions.invoke("ai-smart-match", {
        body: {
          job: { title: job.title, qualification_required: job.qualification_required, location: job.location_postcode, hours: job.hours, room: job.room, description: job.description },
          candidates: candPayload,
        },
      });
      if (error) throw new Error(error.message);
      const scores: { id: string; ai_score: number; reason: string; highlights: string[] }[] = data?.scores ?? [];
      setMatchResults(prev => prev.map(r => {
        const s = scores.find(x => x.id === r.id);
        return s ? { ...r, ai_score: s.ai_score, ai_reason: s.reason, ai_highlights: s.highlights ?? [] } : r;
      }).sort((a, b) => {
        // re-sort by combined score when AI scores available
        const aTotal = (a.score / 110) * 50 + ((a.ai_score ?? 50) / 100) * 50;
        const bTotal = (b.score / 110) * 50 + ((b.ai_score ?? 50) / 100) * 50;
        return bTotal - aTotal;
      }));
      toast.success("AI deep match complete");
    } catch (e: any) {
      toast.error("AI match failed: " + e.message);
    }
    setAiMatching(false);
  };

  if (loading) return <div className="max-w-[1400px] mx-auto pt-16 text-center text-muted-foreground">Loading…</div>;
  if (!job) return <div className="max-w-[1400px] mx-auto pt-16 text-center text-muted-foreground">Job not found.</div>;

  const grouped = {
    early: STAGES.filter((s) => s.group === "early"),
    later: STAGES.filter((s) => s.group === "later"),
    rejected: STAGES.filter((s) => s.group === "rejected"),
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "pipeline", label: "Pipeline" },
    { key: "smart_match", label: "Smart Match" },
    { key: "advertised", label: "Advertised" },
    { key: "activity_log", label: "Activity Log" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pt-2">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate({ to: "/jobs" })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
          </button>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
            {job.client_name && <span className="font-medium text-foreground">{job.client_name}</span>}
            {(() => {
              const branchName = branches.find((b) => b.id === job.branch_id)?.branch_name;
              return branchName ? <><span>·</span><span>{branchName}</span></> : null;
            })()}
            {(job.location_text || job.location_postcode) && <><span>·</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location_text || job.location_postcode}</span></>}
            {job.sector && <><span>·</span><span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">{job.sector}</span></>}
            {job.employment_type && <><span>·</span><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{{ full_time: "Full time", part_time: "Part time", either: "Full or part time" }[job.employment_type] ?? job.employment_type}</span></>}
            {job.contract_type && <><span>·</span><span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{{ permanent: "Permanent", flexible: "Flexible", temporary: "Temporary" }[job.contract_type] ?? job.contract_type}</span></>}
            <span>·</span>
            <span>Posted {relTime(job.posted_at)}</span>
            <span>·</span>
            <span>Created by {userId ? "you" : "system"}</span>
          </div>
        </div>
        <StatusDropdown jobId={id} current={job.status} onUpdate={(v) => setJob((prev) => prev ? { ...prev, status: v } : prev)} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`h-10 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-navy text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details Tab ── */}
      {tab === "details" && (
        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={draft.title ?? ""} onChange={(e) => setD("title", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Qualification</label>
              <Select value={draft.qualification_required ?? "__none__"} onValueChange={(v) => setD("qualification_required", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Salary min (£)</label>
              <Input type="number" value={draft.salary_min ?? ""} onChange={(e) => setD("salary_min", e.target.value ? parseFloat(e.target.value) : null)} placeholder="24000" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Salary max (£)</label>
              <Input type="number" value={draft.salary_max ?? ""} onChange={(e) => setD("salary_max", e.target.value ? parseFloat(e.target.value) : null)} placeholder="28000" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Postcode</label>
              <Input value={draft.location_postcode ?? ""} onChange={(e) => setD("location_postcode", e.target.value)} placeholder="SW1A 1AA" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Location (display name)</label>
              <Input value={draft.location_text ?? ""} onChange={(e) => setD("location_text", e.target.value)} placeholder="e.g. Croydon, London" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Industry / Sector</label>
              <Select value={draft.sector ?? "__none__"} onValueChange={(v) => setD("sector", v === "__none__" ? null : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="— Select —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="Private nursery">Private nursery</SelectItem>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Private family">Private family</SelectItem>
                  <SelectItem value="SEND">SEND</SelectItem>
                  <SelectItem value="After school / holiday club">After school / holiday club</SelectItem>
                  <SelectItem value="Hospital / healthcare">Hospital / healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Employment type</label>
              <Select value={draft.employment_type ?? "__none__"} onValueChange={(v) => setD("employment_type", v === "__none__" ? null : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="— Select —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Contract type</label>
              <Select value={draft.contract_type ?? "__none__"} onValueChange={(v) => setD("contract_type", v === "__none__" ? null : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="— Select —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Branch</label>
              <Select value={draft.branch_id ?? "__none__"} onValueChange={(v) => setD("branch_id", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Room</label>
              <Input value={draft.room ?? ""} onChange={(e) => setD("room", e.target.value)} placeholder="e.g. Baby Room" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hours</label>
              <Input value={draft.hours ?? ""} onChange={(e) => setD("hours", e.target.value)} placeholder="e.g. 30 hours per week, term time only" className="h-10" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={draft.description ?? ""} onChange={(e) => setD("description", e.target.value)} rows={5}
                className="w-full text-sm bg-card rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={draft.notes ?? ""} onChange={(e) => setD("notes", e.target.value)} rows={3}
                className="w-full text-sm bg-card rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveDetails} disabled={saving}
              className="h-10 px-6 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── Pipeline Tab ── */}
      {tab === "pipeline" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={() => setShowAddPipeline(true)}
              className="h-9 px-4 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add to Pipeline
            </button>
          </div>

          {/* Early Stages */}
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Early Stages</div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {grouped.early.map((s) => (
                <StageColumn key={s.key} stage={s.key} label={s.label}
                  color={STAGE_COLORS[s.key] ?? "#2DD4BF"}
                  entries={pipeline.filter((e) => e.stage === s.key)}
                  onCandidateClick={(cId) => setDrawerCandidateId(cId)}
                  onMoveStage={moveStage} />
              ))}
            </div>
          </div>

          {/* Later Stages */}
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Later Stages</div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {grouped.later.map((s) => (
                <StageColumn key={s.key} stage={s.key} label={s.label}
                  color={STAGE_COLORS[s.key] ?? "#2DD4BF"}
                  entries={pipeline.filter((e) => e.stage === s.key)}
                  onCandidateClick={(cId) => setDrawerCandidateId(cId)}
                  onMoveStage={moveStage} />
              ))}
            </div>
          </div>

          {/* Rejected */}
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Rejected</div>
            <RejectedZone pipeline={pipeline} onMoveStage={moveStage} onCandidateClick={(cId) => setDrawerCandidateId(cId)} />
          </div>
        </div>
      )}

      {/* ── Smart Match Tab ── */}
      {tab === "smart_match" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            {matchResults.length > 0 && (
              <button onClick={runAiDeepMatch} disabled={aiMatching || matching}
                className="h-9 px-4 rounded-full border border-teal text-teal text-sm font-medium hover:bg-teal/10 disabled:opacity-50 inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {aiMatching ? "Running AI Match…" : "AI Deep Match"}
              </button>
            )}
            <button onClick={findMatches} disabled={matching}
              className="h-9 px-4 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" /> {matching ? "Matching…" : "Find Matching Candidates"}
            </button>
          </div>
          {matchResults.length === 0 && !matching && (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 py-16 text-center text-sm text-muted-foreground">
              Click <strong>Find Matching Candidates</strong> to score candidates against this job.
            </div>
          )}
          {matchResults.length > 0 && (
            <div className="rounded-2xl border border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b">
                    <th className="text-left font-semibold py-3 px-4">Candidate</th>
                    <th className="text-left font-semibold py-3 px-3">Qualification</th>
                    <th className="text-left font-semibold py-3 px-3">Location</th>
                    <th className="text-left font-semibold py-3 px-3">Type</th>
                    <th className="text-left font-semibold py-3 px-3">DBS</th>
                    <th className="text-left font-semibold py-3 px-3">Exp. Salary</th>
                    <th className="text-left font-semibold py-3 px-3">Owner</th>
                    <th className="text-center font-semibold py-3 px-3">Score</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {matchResults.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDrawerCandidateId(r.id)}
                          className="font-medium text-left hover:text-teal transition-colors underline-offset-2 hover:underline">
                          {r.name}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{fmtQual(r.qual)}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {[r.city, r.postcode].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {r.candidate_type === "perm" ? <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium">Perm</span>
                          : r.candidate_type === "temp" ? <span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal-foreground font-medium">Temp</span>
                          : r.candidate_type === "both" ? <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Both</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {r.has_dbs
                          ? <span className="px-2 py-0.5 rounded-full bg-success/20 text-[oklch(0.4_0.12_155)] font-medium">✓ DBS</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {r.expected_salary ? `£${Number(r.expected_salary).toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{r.owner ?? "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center h-6 px-3 rounded-full text-xs font-bold ${r.score >= 80 ? "bg-success/20 text-[oklch(0.4_0.12_155)]" : r.score >= 45 ? "bg-teal/20 text-teal-foreground" : "bg-muted text-muted-foreground"}`} title={r.breakdown.join(" · ")}>
                          {r.score} / 110
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setAddPipelineCandidate({ id: r.id, name: r.name })}
                          className="h-7 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 whitespace-nowrap inline-flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Pipeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Advertised Tab ── */}
      {tab === "advertised" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT — SOAR Job Description */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)] p-5 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">SOAR Job Description</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Branded copy ready to post on job boards</p>
                </div>
                <div className="flex items-center gap-2">
                  {soarDesc && !soarDescEditing && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(soarDesc); setSoarDescCopied(true); setTimeout(() => setSoarDescCopied(false), 2000); }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {soarDescCopied ? <><Check className="h-3.5 w-3.5 text-teal" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                    </button>
                  )}
                  {soarDesc && !soarDescEditing && (
                    <button
                      onClick={() => setSoarDescEditing(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {soarDescEditing ? (
                    <>
                      <button
                        onClick={() => setSoarDescEditing(false)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { saveSoarDesc(); setSoarDescEditing(false); }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => soarDesc ? setRegenPromptOpen(true) : generateSoarDesc()}
                      disabled={soarDescLoading}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {soarDescLoading ? "Generating…" : soarDesc ? "Regenerate" : "Generate"}
                    </button>
                  )}
                </div>
              </div>

              {/* Regenerate popup */}
              {regenPromptOpen && (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <p className="text-xs font-medium">What would you like to change?</p>
                  <textarea
                    value={regenInstruction}
                    onChange={e => setRegenInstruction(e.target.value)}
                    placeholder="e.g. Add more detail about the nursery setting, include flexible hours as a benefit…"
                    rows={3}
                    className="w-full text-sm bg-background rounded-xl p-3 border border-border focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setRegenPromptOpen(false); setRegenInstruction(""); }}
                      className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => generateSoarDesc(regenInstruction || undefined)}
                      disabled={soarDescLoading}
                      className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      OK
                    </button>
                  </div>
                </div>
              )}

              {/* Content area */}
              {soarDescLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  Writing your job description…
                </div>
              ) : soarDescEditing ? (
                <textarea
                  value={soarDesc}
                  onChange={e => setSoarDesc(e.target.value)}
                  rows={22}
                  className="w-full text-sm bg-muted/30 rounded-xl p-4 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none leading-relaxed"
                  autoFocus
                />
              ) : soarDesc ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-xl p-4 min-h-[200px]">
                  {soarDesc}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <Sparkles className="h-6 w-6 text-teal/50" />
                  <p>Click <span className="font-medium text-teal">Generate</span> to create a SOAR-branded job description</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Source Boards + Boolean Searches */}
          <div className="lg:col-span-2 space-y-4">
            {/* Source boards */}
            <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)] p-5 space-y-4">
              <h3 className="text-sm font-semibold">Source Boards</h3>
              <div className="flex flex-col gap-2">
                {SOURCE_BOARDS.map((sb) => (
                  <label key={sb.key} className="flex items-center gap-3 cursor-pointer select-none p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <input type="checkbox"
                      checked={(draft.source_boards ?? []).includes(sb.key)}
                      onChange={() => toggleSourceBoard(sb.key)}
                      className="h-4 w-4 rounded accent-[#1B2B4B]" />
                    <span className="text-sm font-medium">{sb.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-1 pt-1 border-t">
                <label className="text-xs font-medium text-muted-foreground">Advertising notes</label>
                <textarea value={draft.advertising_notes ?? ""} onChange={(e) => setD("advertising_notes", e.target.value)}
                  placeholder="Ad copy, posting dates, tracking references…" rows={3}
                  className="w-full text-sm bg-muted/40 rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
              </div>
              <div className="flex justify-end">
                <button onClick={saveAdvertised} disabled={saving}
                  className="h-9 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* Boolean Searches */}
            <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Boolean Searches</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">For LinkedIn, CV-Library &amp; Reed</p>
                </div>
                <button
                  onClick={generateBooleanSearches}
                  disabled={boolLoading}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {boolLoading ? "…" : boolSearches ? "Refresh" : "Generate"}
                </button>
              </div>

              {boolLoading && (
                <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
                  <div className="h-3.5 w-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  Generating…
                </div>
              )}

              {!boolLoading && boolSearches && (
                <div className="space-y-2">
                  {([
                    { key: "broad", label: "Broad", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { key: "standard", label: "Standard", color: "bg-blue-50 border-blue-200 text-blue-800" },
                    { key: "perfect", label: "Perfect Match", color: "bg-purple-50 border-purple-200 text-purple-800" },
                  ] as const).map(({ key, label, color }) => (
                    <div key={key} className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                        <button onClick={() => copySearch(key, boolSearches[key])}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          {copiedKey === key ? <><Check className="h-3 w-3 text-teal" /><span className="text-teal">Copied</span></> : <><Copy className="h-3 w-3" />Copy</>}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono leading-relaxed break-all select-all text-muted-foreground">{boolSearches[key]}</p>
                    </div>
                  ))}
                </div>
              )}

              {!boolLoading && !boolSearches && (
                <p className="text-xs text-muted-foreground text-center py-3">Click Generate to create search strings</p>
              )}
            </div>
          </div>
        </div>
      )}

            {/* ── Activity Log Tab ── */}
      {tab === "activity_log" && (
        <div className="space-y-4 max-w-2xl">
          {loggingNote ? (
            <div className="space-y-2">
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={3}
                className="w-full text-sm bg-card rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
              <div className="flex gap-2">
                <button onClick={logNote} className="h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90">Save note</button>
                <button onClick={() => { setLoggingNote(false); setNoteText(""); }} className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setLoggingNote(true)}
              className="w-full h-10 rounded-xl bg-muted/40 text-muted-foreground text-sm font-medium hover:bg-muted/70 flex items-center gap-2 px-4">
              <MessageSquare className="h-4 w-4" /> Add a note…
            </button>
          )}

          {activities.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="rounded-2xl border border-transparent shadow-[var(--shadow-card)] bg-card divide-y overflow-hidden">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {activityIcon(a.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground leading-snug">{a.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.created_by && a.created_by !== "system" ? `${a.created_by} · ` : ""}{fmtDate(a.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pipeline tab modal */}
      <AddPipelineModal open={showAddPipeline} jobId={id}
        onClose={() => setShowAddPipeline(false)}
        onAdded={() => { setShowAddPipeline(false); loadAll(); }} />

      {/* Smart Match "Add to Pipeline" modal — prefilled candidate */}
      <AddPipelineModal
        open={!!addPipelineCandidate}
        jobId={id}
        prefilledCandidateId={addPipelineCandidate?.id}
        prefilledCandidateName={addPipelineCandidate?.name}
        onClose={() => setAddPipelineCandidate(null)}
        onAdded={() => { setAddPipelineCandidate(null); loadAll(); }} />

      {/* Candidate drawer */}
      <CandidateDrawer candidateId={drawerCandidateId} onClose={() => setDrawerCandidateId(null)} />
    </div>
  );
}
