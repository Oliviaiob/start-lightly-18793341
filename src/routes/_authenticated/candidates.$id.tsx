import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  X,
  Star,
  Pencil,
  Mail,
  Plus,
  FileText,
  Phone,
  MapPin,
  Building2,
  Save,
  Trash2,
  PhoneCall,
  Sparkles,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  FolderOpen,
  UserRound,
  Clock,
  CalendarRange,
  Users,
  Home,
  GraduationCap,
  Copy,
  Upload,
  MessageCircle,
  Smartphone,
  Send,
  CheckCheck,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { fmtQual } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: Page,
});

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  national_insurance_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  candidate_type: string | null;
  status_perm: string | null;
  status_temp: string | null;
  qualification_level: string | null;
  qualifications_text: string | null;
  current_position: string | null;
  current_employer: string | null;
  is_starred: boolean | null;
  drives: boolean | null;
  vehicle_status: string | null;
  commute_radius: string | null;
  hourly_rate: number | null;
  open_to_temp: boolean | null;
  perm_dbs_uptodate: string | null;
  perm_dbs_update_service: string | null;
  perm_paediatric_first_aid: string | null;
  perm_safeguarding: string | null;
  cv_original_url: string | null;
  cv_soar_url: string | null;
  profile_summary: string | null;
  expected_salary: number | null;
  created_by: string | null;
  created_at: string | null;
  assigned_recruiter_id: string | null;
  // App compliance fields
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  has_disability: boolean | null;
  disability_notes: string | null;
  requires_work_permit: boolean | null;
  work_permit_notes: string | null;
  ni_number: string | null;
  languages: string[] | null;
  experience_summary: string | null;
  fields_of_work: string[] | null;
  preferred_age_groups: string[] | null;
  available_days: string[] | null;
  availability_times: string[] | null;
  availability_notes: string | null;
  declaration_ever_cautioned: boolean | null;
  declaration_ever_cautioned_details: string | null;
  declaration_since_dbs: boolean | null;
  declaration_since_dbs_details: string | null;
  terms_agreed: boolean | null;
  gdpr_agreed: boolean | null;
  payroll_sharing_agreed: boolean | null;
  marketing_opt_in: boolean | null;
  signature_full_name: string | null;
  signature_url: string | null;
  bank_details_token: string | null;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  author?: { display_name: string | null; first_name: string | null; last_name: string | null } | null;
};

type Activity = {
  id: string;
  description: string | null;
  activity_type: string | null;
  created_at: string;
  actor?: { display_name: string | null; first_name: string | null; last_name: string | null } | null;
};

type Job = {
  id: string;
  title: string | null;
  qualification_required: string | null;
  location_postcode: string | null;
  status: string | null;
  client?: { name: string | null } | null;
};

type Client = {
  id: string;
  company_name: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Shift = {
  id: string;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  rate_per_hour: number | null;
  total_hours: number | null;
  total_amount: number | null;
  status: string | null;
  client?: { name: string | null } | null;
};

type Placement = {
  id: string;
  placement_type: string | null;
  placement_date: string | null;
  perm_salary: number | null;
  salary_expectation_min: number | null;
  salary_expectation_ideal: number | null;
  notice_period_weeks: number | null;
  max_commute_minutes: number | null;
  preferred_nursery_type: string | null;
  recruiter_personality_notes: string | null;
  career_aspiration_notes: string | null;
  temp_rate: number | null;
  client?: { name: string | null } | null;
  job?: { title: string | null } | null;
};

type PipelineRow = {
  id: string;
  stage: string | null;
  stage_changed_at: string | null;
  job?: { id: string; title: string | null; client?: { name: string | null } | null } | null;
};

type Doc = {
  id: string;
  document_type: string | null;
  file_name: string | null;
  file_url: string | null;
  uploaded_at: string | null;
  status: string | null;
};

type Reference = {
  id: string;
  referee_name: string | null;
  referee_email: string | null;
  referee_phone: string | null;
  referee_job_title: string | null;
  relationship_to_candidate: string | null;
  company_name: string | null;
  ref_type: string | null;
  ref_number: number | null;
  status: string | null;
  requested_at: string | null;
  received_at: string | null;
  reminder_stage: number | null;
  next_reminder_at: string | null;
  short_code: string | null;
};

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "active",        label: "Active"        },
  { value: "placed",        label: "Placed"        },
  { value: "inactive",      label: "Inactive"      },
];

function initials(f?: string | null, l?: string | null) {
  return `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "?";
}

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nameOf(p: { display_name?: string | null; first_name?: string | null; last_name?: string | null } | null | undefined) {
  if (!p) return "Someone";
  return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Someone";
}

function Page() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Candidate | null>(null);
  const [cvOpen, setCvOpen] = useState(false);
  const [wpOpen, setWpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [personalEditing, setPersonalEditing] = useState(false);
  const [personalDraft, setPersonalDraft] = useState<Partial<Candidate>>({});
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [callText, setCallText] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [recruiters, setRecruiters] = useState<{id: string; display_name: string | null; first_name: string | null; last_name: string | null}[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [refs, setRefs] = useState<Reference[]>([]);

  const [rateInput, setRateInput] = useState<string>("");

  const generateSummary = async (candidate: Candidate) => {
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-summary", {
        body: {
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          current_position: candidate.current_position,
          current_employer: candidate.current_employer,
          qualification_level: candidate.qualification_level,
          qualifications_text: candidate.qualifications_text,
          candidate_type: candidate.candidate_type,
        },
      });
      if (error) throw new Error(error.message);
      const summary = data?.summary ?? "";
      if (summary) {
        await (supabase as any).from("candidates").update({ profile_summary: summary }).eq("id", candidate.id);
        setC(prev => prev ? { ...prev, profile_summary: summary } : prev);
      }
    } catch (e: any) {
      toast.error("Couldn't generate summary: " + e.message);
    }
    setSummaryLoading(false);
  };

  const uploadCV = async (file: File) => {
    if (!c) return;
    setCvUploading(true);
    try {
      const filePath = `cv/${c.id}_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("candidate-documents")
        .upload(filePath, file, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("candidate-documents").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await supabase.from("candidates").update({ cv_original_url: publicUrl }).eq("id", c.id);
      await supabase.from("candidate_documents").insert({
        candidate_id: c.id,
        document_type: "cv",
        file_name: file.name,
        file_url: publicUrl,
        status: "active",
      });
      setC(prev => prev ? { ...prev, cv_original_url: publicUrl } : prev);
      toast.success("CV uploaded successfully");
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
    }
    setCvUploading(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      setMe(userData.user?.id ?? null);

      const { data: cand } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setC(cand as Candidate | null);
      setRateInput(cand?.hourly_rate != null ? String(cand.hourly_rate) : "");
      // Auto-generate profile summary if not yet set
      if (cand && !(cand as any).profile_summary) {
        // fire-and-forget; don't block the page load
        (async () => {
          try {
            const { data: sd } = await supabase.functions.invoke("generate-profile-summary", {
              body: {
                first_name: cand.first_name, last_name: cand.last_name,
                current_position: cand.current_position, current_employer: cand.current_employer,
                qualification_level: cand.qualification_level, qualifications_text: cand.qualifications_text,
                candidate_type: cand.candidate_type,
              },
            });
            const s = sd?.summary ?? "";
            if (s) {
              await (supabase as any).from("candidates").update({ profile_summary: s }).eq("id", cand.id);
              setC(prev => prev ? { ...prev, profile_summary: s } : prev);
            }
          } catch (_) { /* silent */ }
        })();
      }

      if (cand?.created_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name")
          .eq("id", cand.created_by)
          .maybeSingle();
        setCreatorName(nameOf(prof as never));
      }

      const [notesRes, actRes, pipeRes, placeRes, docsRes, refsRes, shiftsRes] = await Promise.all([
        supabase
          .from("candidate_notes")
          .select("id, content, created_at, created_by, author:profiles(display_name, first_name, last_name)")
          .eq("candidate_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("activity_log")
          .select("id, description, activity_type, created_at, actor:profiles(display_name, first_name, last_name)")
          .eq("entity_type", "candidate")
          .eq("entity_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("job_pipeline")
          .select("id, stage, stage_changed_at, job:jobs(id, title, client:clients(name))")
          .eq("candidate_id", id)
          .order("stage_changed_at", { ascending: false }),
        supabase
          .from("placements")
          .select("id, placement_type, placement_date, perm_salary, temp_rate, client:clients(name), job:jobs(title)")
          .eq("candidate_id", id)
          .order("placement_date", { ascending: false }),
        supabase
          .from("candidate_documents")
          .select("*")
          .eq("candidate_id", id)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("references")
          .select("id, referee_name, referee_email, referee_phone, referee_job_title, relationship_to_candidate, company_name, ref_type, ref_number, status, requested_at, received_at, reminder_stage, next_reminder_at, short_code")
          .eq("candidate_id", id)
          .order("ref_number", { ascending: true }),
        supabase
          .from("temp_shifts")
          .select("id, shift_date, start_time, end_time, rate_per_hour, total_hours, total_amount, status, client:clients(name)")
          .eq("candidate_id", id)
          .order("shift_date", { ascending: false }),
      ]);

      setNotes((notesRes.data as unknown as Note[]) || []);
      setActivity((actRes.data as unknown as Activity[]) || []);
      setPipeline((pipeRes.data as unknown as PipelineRow[]) || []);
      setPlacements((placeRes.data as unknown as Placement[]) || []);
      setDocs((docsRes.data as Doc[]) || []);
      setRefs((refsRes.data as Reference[]) || []);
      setShifts((shiftsRes.data as unknown as Shift[]) || []);

      const type = (cand?.candidate_type || "").toLowerCase();
      const isPerm = type.includes("perm") || type.includes("both");
      const isTemp = type.includes("temp") || type.includes("both");

      if (isPerm) {
        const { data: openJobs } = await supabase
          .from("jobs")
          .select("id, title, qualification_required, location_postcode, status, client:clients(name)")
          .in("status", ["Live", "Interviewing"])
          .limit(50);
        setJobs((openJobs as unknown as Job[]) || []);
      }
      if (isTemp) {
        const { data: cs } = await supabase
          .from("clients")
          .select("id, company_name, postcode, latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(500);
        setClients((cs as Client[]) || []);
      }

      // Load recruiter/admin/management profiles for the dropdown
      const { data: recProfs } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name")
        .in("role", ["admin", "management", "recruiter"])
        .eq("is_active", true)
        .order("first_name");
      setRecruiters((recProfs as any[]) || []);

      setLoading(false);
    })();
  }, [id]);

  const patch = async (fields: Partial<Candidate>) => {
    if (!c) return;
    const prev = c;
    setC({ ...c, ...fields });
    const { error } = await supabase.from("candidates").update(fields as never).eq("id", c.id);
    if (error) {
      toast.error("Save failed");
      setC(prev);
    }
  };

  const type = (c?.candidate_type || "").toLowerCase();
  const isPerm = type.includes("perm") || type.includes("both");
  const isTemp = type.includes("temp") || type.includes("both");
  const displayStatus = (isPerm ? c?.status_perm : c?.status_temp) || "not_contacted";

  const setStatus = (s: string) => {
    if (isPerm) patch({ status_perm: s });
    else patch({ status_temp: s });
  };

  const potentialMatches = useMemo(() => {
    if (!isPerm || !c) return [];
    return jobs
      .filter((j) => {
        if (c.qualification_level && j.qualification_required) {
          if (j.qualification_required.toLowerCase() !== c.qualification_level.toLowerCase()) return false;
        }
        if (c.postcode && j.location_postcode) {
          const a = c.postcode.trim().split(" ")[0].toUpperCase();
          const b = j.location_postcode.trim().split(" ")[0].toUpperCase();
          if (a.slice(0, 2) !== b.slice(0, 2)) return false;
        }
        return true;
      })
      .slice(0, 6);
  }, [jobs, c, isPerm]);

  const nearbyClients = useMemo(() => {
    if (!isTemp || !c?.latitude || !c?.longitude) return [];
    return clients
      .map((cl) => ({
        ...cl,
        miles:
          cl.latitude != null && cl.longitude != null
            ? distanceMiles({ lat: c.latitude!, lng: c.longitude! }, { lat: cl.latitude, lng: cl.longitude })
            : Infinity,
      }))
      .filter((cl) => cl.miles <= 10)
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 8);
  }, [clients, c, isTemp]);

  const addNote = async () => {
    if (!newNote.trim() || !c) return;
    const { data, error } = await supabase
      .from("candidate_notes")
      .insert({ candidate_id: c.id, content: newNote.trim(), created_by: me })
      .select("id, content, created_at, created_by, author:profiles(display_name, first_name, last_name)")
      .single();
    if (error) return toast.error("Couldn't save note");
    setNotes([data as unknown as Note, ...notes]);
    setNewNote("");
  };

  const deleteNote = async (nid: string) => {
    const prev = notes;
    setNotes(notes.filter((n) => n.id !== nid));
    const { error } = await supabase.from("candidate_notes").delete().eq("id", nid);
    if (error) {
      toast.error("Couldn't delete");
      setNotes(prev);
    }
  };

  const logCall = async () => {
    if (!callText.trim() || !c) return;
    const { data, error } = await supabase
      .from("activity_log")
      .insert({
        entity_type: "candidate",
        entity_id: c.id,
        activity_type: "call",
        description: callText.trim(),
        created_by: me,
      })
      .select("id, description, activity_type, created_at, actor:profiles(display_name, first_name, last_name)")
      .single();
    if (error) return toast.error("Couldn't log call");
    setActivity([data as unknown as Activity, ...activity]);
    setCallText("");
  };

  const saveRate = async () => {
    const n = rateInput === "" ? null : Number(rateInput);
    if (n !== null && Number.isNaN(n)) return toast.error("Invalid rate");
    await patch({ hourly_rate: n });
    toast.success("Rate saved");
  };

  const displayName = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidate" : "Candidate";

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <p className="text-muted-foreground">Loading candidate…</p>
        </Card>
      </div>
    );
  }
  if (!c) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <p className="text-muted-foreground">Candidate not found.</p>
          <Link to="/candidates" className="mt-4 inline-flex items-center gap-1.5 text-sm text-teal-foreground hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      {/* Header */}
      <Card className="relative overflow-hidden p-6 md:p-7 border-transparent rounded-2xl bg-gradient-to-br from-navy via-navy to-[oklch(0.3_0.08_260)] text-navy-foreground shadow-[var(--shadow-card)]">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" aria-hidden />
        <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-teal/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarFallback className="bg-teal text-teal-foreground text-lg font-semibold">
                  {initials(c.first_name, c.last_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => patch({ is_starred: !c.is_starred })}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-navy border-2 border-white/20 grid place-items-center hover:scale-110 transition-transform"
                aria-label={c.is_starred ? "Unstar" : "Star"}
              >
                <Star className={`h-3.5 w-3.5 ${c.is_starred ? "fill-warning text-warning" : "text-white/60"}`} />
              </button>
            </div>
            <div className="min-w-0">
              <Link to="/candidates" className="text-[11px] text-navy-foreground/60 hover:text-navy-foreground/90 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> All candidates
              </Link>
              <h1 className="mt-1 text-2xl md:text-[28px] font-bold tracking-tight truncate">{displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isPerm && (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold bg-white/15 text-navy-foreground border border-white/10">
                    Perm
                  </span>
                )}
                {isTemp && (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold bg-teal text-teal-foreground">
                    Temp
                  </span>
                )}
                <Select value={displayStatus} onValueChange={setStatus}>
                  <SelectTrigger className="h-7 w-auto rounded-full bg-white/10 border-white/15 text-navy-foreground text-[11px] font-medium px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {creatorName && (
                <div className="mt-2 text-[11px] text-navy-foreground/60">Created by {creatorName}</div>
              )}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] text-navy-foreground/60 shrink-0">Assigned to</span>
                <select
                  className="h-6 text-[11px] font-medium rounded-full bg-white/10 border border-white/15 text-navy-foreground px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer appearance-none"
                  value={(c as any).assigned_recruiter_id ?? ""}
                  onChange={async e => {
                    const val = e.target.value || null;
                    await patch({ assigned_recruiter_id: val } as any);
                  }}
                >
                  <option value="">Unassigned</option>
                  {recruiters.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.display_name ?? (`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unnamed")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <HeaderBtn icon={Pencil}>Edit</HeaderBtn>
            <HeaderBtn icon={Mail} onClick={() => c.email && (window.location.href = `mailto:${c.email}`)}>
              Send Email
            </HeaderBtn>
            <HeaderBtn icon={Plus}>Add to Shortlist</HeaderBtn>
            {isPerm ? (
              <>
                <button onClick={() => setCvOpen(true)} className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Generate SOAR CV
                </button>
                <button onClick={() => setChatOpen(true)} title="Message candidate" className="h-9 px-3.5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 shrink-0">
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setWpOpen(true)} className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Generate Worker Profile
                </button>
                <button onClick={() => setChatOpen(true)} title="Message candidate" className="h-9 px-3.5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 shrink-0">
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
              </>
            )}
            {cvOpen && c && isPerm && (
              <GenerateCVModal open={cvOpen} onClose={() => setCvOpen(false)} candidate={c} />
            )}
            {chatOpen && c && (
              <ChatDrawer candidateId={c.id} candidateName={`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()} candidatePhone={c.phone ?? null} isTemp={isTemp} onClose={() => setChatOpen(false)} />
            )}
            {wpOpen && c && isTemp && (
              <GenerateWorkerProfileModal open={wpOpen} onClose={() => setWpOpen(false)} candidate={c} />
            )}
          </div>
        </div>
      </Card>

      {/* Contact info bar */}
      <Card className="px-4 pt-4 pb-3 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="grid gap-4 text-sm" style={{gridTemplateColumns:"2fr 1.5fr 1fr 1fr 2fr 2fr"}}>
          <EmailContactChip value={c.email} />
          <ContactChip icon={Phone} label="Phone" value={c.phone} />
          <ContactChip icon={MapPin} label="Location" value={c.town} />
          <ContactChip icon={Home} label="Postcode" value={c.postcode} />
          <ContactChip icon={Building2} label="Current Employer" value={c.current_employer} />
          <ContactChip icon={GraduationCap} label="Qualification" value={fmtQual(c.qualification_level)} />
        </div>
        <div className="mt-3 pt-3 border-t border-border/60 flex items-start gap-2 min-h-[28px]">
          <Sparkles className="h-3.5 w-3.5 text-teal mt-0.5 flex-shrink-0" />
          {summaryLoading ? (
            <span className="text-xs text-muted-foreground italic animate-pulse">Generating summary…</span>
          ) : c.profile_summary ? (
            <div className="flex-1 flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{c.profile_summary}</p>
              <button
                onClick={() => generateSummary(c)}
                className="flex-shrink-0 text-[10px] text-teal/70 hover:text-teal font-medium transition-colors"
                title="Regenerate summary"
              >Refresh</button>
            </div>
          ) : (
            <button
              onClick={() => generateSummary(c)}
              className="text-xs text-teal/70 hover:text-teal font-medium transition-colors"
            >Generate AI summary</button>
          )}
        </div>
      </Card>

      {/* Type-specific sections */}
      {isPerm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card lg:col-span-1">
            <h3 className="font-semibold text-sm mb-3">Availability</h3>
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50">
              <div>
                <div className="text-sm font-medium">Consider for temporary roles</div>
                <div className="text-xs text-muted-foreground">Show this candidate in temp searches</div>
              </div>
              <Switch
                checked={!!c.open_to_temp}
                onCheckedChange={(v) => patch({ open_to_temp: v })}
              />
            </label>
          </Card>

          <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-navy" />
              <h3 className="font-semibold text-sm">Compliance quick-view</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <YesNoField label="Has up to date DBS" value={c.perm_dbs_uptodate} onChange={(v) => patch({ perm_dbs_uptodate: v })} />
              <YesNoField label="DBS on update service" value={c.perm_dbs_update_service} onChange={(v) => patch({ perm_dbs_update_service: v })} />
              <YesNoField label="Paediatric First Aid" value={c.perm_paediatric_first_aid} onChange={(v) => patch({ perm_paediatric_first_aid: v })} />
              <YesNoField label="Safeguarding" value={c.perm_safeguarding} onChange={(v) => patch({ perm_safeguarding: v })} />
            </div>
          </Card>

          <Card className="p-5 rounded-2xl border-2 border-teal/40 shadow-[var(--shadow-card)] bg-card lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-foreground" />
                <h3 className="font-semibold text-sm">Potential Role Matches</h3>
              </div>
              <span className="text-xs text-muted-foreground">{potentialMatches.length} matches</span>
            </div>
            {potentialMatches.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No matching open jobs right now.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {potentialMatches.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
                    <div className="text-sm font-medium truncate">{j.title || "Untitled role"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {j.client?.name || "—"} · {j.location_postcode || "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {j.qualification_required || "Any qualification"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {isTemp && (
        <div className="space-y-6">
          {/* Temp Info — full-width card */}
          <Card className="p-5 rounded-2xl border-2 border-teal/30 shadow-[var(--shadow-card)] bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-teal-foreground" />
              <h3 className="font-semibold text-sm">Temp Info</h3>
              <span className="ml-auto text-[10px] text-muted-foreground">Used for shift matching</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Qualification</p>
                <p className="text-sm font-medium">{fmtQual(c.qualification_level) || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fields of Work</p>
                <p className="text-sm font-medium">
                  {(c as any).fields_of_work?.length
                    ? (c as any).fields_of_work.map((f: string) =>
                        f.replace(/_/g, " ").replace(/\w/g, (ch: string) => ch.toUpperCase())
                      ).join(", ")
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Age Groups</p>
                <p className="text-sm font-medium">
                  {(c as any).preferred_age_groups?.length ? (c as any).preferred_age_groups.join(", ") : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available Days</p>
                <p className="text-sm font-medium">
                  {(c as any).available_days?.length ? (c as any).available_days.join(", ") : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time Slots</p>
                <p className="text-sm font-medium capitalize">
                  {(c as any).availability_times?.length ? (c as any).availability_times.join(", ") : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commute</p>
                <p className="text-sm font-medium">{c.commute_radius || "—"}</p>
              </div>
            </div>
            {(c as any).experience_summary && (
              <div className="mt-4 pt-4 border-t border-border/60 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Experience Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{(c as any).experience_summary}</p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
              <h3 className="font-semibold text-sm mb-3">Rate of Pay</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                  <Input
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="pl-6 h-9 rounded-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/hr</span>
                </div>
                <button
                  onClick={saveRate}
                  className="h-9 px-3 rounded-lg bg-navy text-navy-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-teal-foreground" />
                <h3 className="font-semibold text-sm">Nearby Clients</h3>
              </div>
              {nearbyClients.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3">No clients found within 10 miles</div>
              ) : (
                <ul className="space-y-2 max-h-[220px] overflow-auto">
                  {nearbyClients.map((cl) => (
                    <li key={cl.id} className="p-2 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{cl.company_name || "—"}</div>
                        <div className="text-muted-foreground">{cl.postcode || ""}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-teal-foreground">{cl.miles.toFixed(1)} mi</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
            <div className="flex items-center gap-2 mb-3">
              <CalendarRange className="h-4 w-4 text-teal-foreground" />
              <h3 className="font-semibold text-sm">Temporary Shifts</h3>
            </div>
            {shifts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-3">No shifts worked yet</div>
            ) : (
              <ul className="space-y-2 max-h-[220px] overflow-auto">
                {shifts.slice(0, 6).map((s) => (
                  <li key={s.id} className="p-2 rounded-lg bg-muted/40 text-xs">
                    <div className="font-medium truncate">{s.client?.name || "Booking"}</div>
                    <div className="text-muted-foreground">
                      {s.shift_date} · {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                      {s.rate_per_hour ? ` · £${s.rate_per_hour}/hr` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Notes + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <h3 className="font-semibold text-sm mb-3">Notes</h3>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Recruiter notes about this candidate..."
            className="min-h-[80px] rounded-xl bg-muted/40 border-transparent focus-visible:bg-background"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="h-8 px-3 rounded-lg bg-navy text-navy-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Save className="h-3 w-3" /> Save
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {notes.length === 0 ? (
              <li className="text-xs text-muted-foreground text-center py-4">No notes yet</li>
            ) : (
              notes.map((n) => (
                <li key={n.id} className="p-3 rounded-xl bg-muted/40">
                  <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{nameOf(n.author)} · {relTime(n.created_at)}</span>
                    <button onClick={() => deleteNote(n.id)} className="hover:text-destructive inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <h3 className="font-semibold text-sm mb-3">Activity Log</h3>
          <div className="flex items-center gap-2">
            <Input
              value={callText}
              onChange={(e) => setCallText(e.target.value)}
              placeholder="Log a call..."
              className="h-9 rounded-lg bg-muted/40 border-transparent focus-visible:bg-background"
            />
            <button
              onClick={logCall}
              disabled={!callText.trim()}
              className="h-9 px-3 rounded-lg bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0"
            >
              <PhoneCall className="h-3 w-3" /> Log call
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {activity.length === 0 ? (
              <li className="text-xs text-muted-foreground text-center py-4">No activity yet</li>
            ) : (
              (showAllActivity ? activity : activity.slice(0, 4)).map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal/15 text-teal-foreground grid place-items-center shrink-0">
                    <ActivityIcon type={a.activity_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{a.description || a.activity_type || "Activity"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {relTime(a.created_at)} · By {nameOf(a.actor)}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
          {activity.length > 4 && (
            <button
              onClick={() => setShowAllActivity((s) => !s)}
              className="mt-3 text-xs text-teal-foreground hover:underline"
            >
              {showAllActivity ? "Show less" : `Show more (${activity.length - 4})`}
            </button>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <Tabs defaultValue="personal">
          <TabsList className="bg-muted/50 rounded-full h-10 p-1 flex-wrap">
            <TabTrig value="personal" icon={UserRound}>Personal</TabTrig>
            {isPerm && <TabTrig value="permnotes" icon={ClipboardCheck}>Preferences</TabTrig>}
            <TabTrig value="quals" icon={ClipboardCheck}>Qualifications</TabTrig>
            <TabTrig value="cv" icon={FileText}>CV</TabTrig>
            <TabTrig value="pipeline" icon={Briefcase}>Jobs/Pipeline</TabTrig>
            <TabTrig value="placements" icon={Users}>Placements</TabTrig>
            <TabTrig value="compliance" icon={ShieldCheck}>Compliance</TabTrig>
            <TabTrig value="docs" icon={FolderOpen}>Documents</TabTrig>
            <TabTrig value="refs" icon={UserRound}>References</TabTrig>
            {isTemp && <TabTrig value="availability" icon={Clock}>Availability</TabTrig>}
            <TabTrig value="appinfo" icon={ClipboardList}>App Info</TabTrig>
          </TabsList>

          <TabsContent value="personal" className="mt-5">
            {/* Edit / Save header */}
            <div className="flex justify-end mb-4 gap-2">
              {personalEditing ? (
                <>
                  <button
                    onClick={() => setPersonalEditing(false)}
                    className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await (supabase as any).from("candidates").update(personalDraft).eq("id", c.id);
                      setC((prev: any) => prev ? { ...prev, ...personalDraft } : prev);
                      setPersonalEditing(false);
                    }}
                    className="h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setPersonalDraft({
                      email: c.email, phone: c.phone, date_of_birth: c.date_of_birth,
                      national_insurance_number: c.national_insurance_number,
                      current_position: c.current_position, current_employer: c.current_employer,
                      address_line1: c.address_line1, address_line2: c.address_line2,
                      town: c.town, county: c.county, postcode: c.postcode,
                      drives: c.drives, commute_radius: c.commute_radius,
                      expected_salary: (c as any).expected_salary ?? null,
                    });
                    setPersonalEditing(true);
                  }}
                  className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {personalEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                {([
                  ["Email", "email", "email"],
                  ["Phone", "phone", "tel"],
                  ["Date of Birth", "date_of_birth", "date"],
                  ["NI Number", "national_insurance_number", "text"],
                  ["Current Position", "current_position", "text"],
                  ["Current Employer", "current_employer", "text"],
                  ["Address Line 1", "address_line1", "text"],
                  ["Address Line 2", "address_line2", "text"],
                  ["Town", "town", "text"],
                  ["County", "county", "text"],
                  ["Postcode", "postcode", "text"],
                  ["Max Commute", "commute_radius", "text"],
                ] as [string, keyof Candidate, string][]).map(([label, key, type]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
                    <input
                      type={type}
                      value={(personalDraft[key] as string) ?? ""}
                      onChange={e => setPersonalDraft(d => ({ ...d, [key]: e.target.value || null }))}
                      className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Has Vehicle</label>
                  <select
                    value={personalDraft.drives === true ? "yes" : personalDraft.drives === false ? "no" : ""}
                    onChange={e => setPersonalDraft(d => ({ ...d, drives: e.target.value === "yes" ? true : e.target.value === "no" ? false : null }))}
                    className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {isPerm && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Salary (£)</label>
                    <input
                      type="number"
                      value={(personalDraft as any).expected_salary ?? ""}
                      onChange={e => setPersonalDraft(d => ({ ...d, expected_salary: e.target.value ? Number(e.target.value) : null } as any))}
                      placeholder="e.g. 28000"
                      className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <Field label="Email" value={c.email} />
                <Field label="Phone" value={c.phone} />
                <Field label="Date of Birth" value={c.date_of_birth} />
                <Field label="NI Number" value={c.national_insurance_number} />
                <Field label="Current Position" value={c.current_position} />
                <Field label="Current Employer" value={c.current_employer} />
                <Field
                  label="Address"
                  value={[c.address_line1, c.address_line2, c.town, c.county, c.postcode].filter(Boolean).join(", ")}
                />
                <Field
                  label="Has Vehicle"
                  value={c.drives === true ? "Yes" : c.drives === false ? "No" : c.vehicle_status}
                />
                <Field label="Max Commute" value={c.commute_radius} />
                {isPerm && <Field label="Expected Salary" value={(c as any).expected_salary ? `£${Number((c as any).expected_salary).toLocaleString()}` : null} />}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quals" className="mt-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Qualification Level" value={c.qualification_level} />
              <Field label="Details" value={c.qualifications_text} />
            </div>
          </TabsContent>

          <TabsContent value="cv" className="mt-5 text-sm">
            <div className="space-y-4">
              {/* Original CV */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original CV</span>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-opacity ${cvUploading ? "opacity-50 pointer-events-none" : "bg-navy/10 text-navy hover:bg-navy/20"}`}>
                    <Upload className="h-3.5 w-3.5" />
                    {cvUploading ? "Uploading…" : c.cv_original_url ? "Replace CV" : "Upload CV"}
                    <input type="file" accept=".pdf" className="hidden" disabled={cvUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadCV(f); e.target.value = ""; }} />
                  </label>
                </div>
                {c.cv_original_url ? (
                  <a href={c.cv_original_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
                    <FileText className="h-4 w-4 text-navy" /> View Original CV
                  </a>
                ) : (
                  <div className="text-muted-foreground text-sm py-1">No CV uploaded yet.</div>
                )}
              </div>

              {/* SOAR CV */}
              {c.cv_soar_url && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SOAR CV</div>
                  <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-teal/10 border border-teal/20">
                    <Sparkles className="h-4 w-4 text-teal" />
                    <div>
                      <div className="text-sm font-medium text-foreground">SOAR CV</div>
                      <div className="text-xs text-muted-foreground">
                        Last generated {c.cv_soar_url.startsWith("generated:") ? new Date(c.cv_soar_url.replace("generated:","")).toLocaleDateString("en-GB") : ""}
                      </div>
                    </div>
                    <button onClick={() => setCvOpen(true)} className="ml-2 text-xs text-teal font-medium hover:opacity-80">Regenerate →</button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="mt-5">
            {pipeline.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">Not linked to any jobs yet.</div>
            ) : (
              <ul className="divide-y">
                {pipeline.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.job?.title || "Untitled"}</div>
                      <div className="text-xs text-muted-foreground">{p.job?.client?.name || "—"}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-navy/10 text-navy">
                        {p.stage || "—"}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1">{relTime(p.stage_changed_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="placements" className="mt-5">
            {placements.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No placements yet.</div>
            ) : (
              <ul className="divide-y">
                {placements.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.job?.title || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.client?.name || "—"}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">
                        {p.perm_salary ? `£${p.perm_salary.toLocaleString()}` : p.temp_rate ? `£${p.temp_rate}/hr` : "—"}
                      </div>
                      <div className="text-muted-foreground">{p.placement_date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <YesNoField label="Has up to date DBS" value={c.perm_dbs_uptodate} onChange={(v) => patch({ perm_dbs_uptodate: v })} />
              <YesNoField label="DBS on update service" value={c.perm_dbs_update_service} onChange={(v) => patch({ perm_dbs_update_service: v })} />
              <YesNoField label="Paediatric First Aid" value={c.perm_paediatric_first_aid} onChange={(v) => patch({ perm_paediatric_first_aid: v })} />
              <YesNoField label="Safeguarding" value={c.perm_safeguarding} onChange={(v) => patch({ perm_safeguarding: v })} />
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-5">
            {docs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No documents uploaded.</div>
            ) : (
              <ul className="divide-y">
                {docs.map((d) => (
                  <li key={d.id} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-navy shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{d.file_name || d.document_type || "Document"}</div>
                        <div className="text-xs text-muted-foreground">{d.document_type || ""}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {d.status && (
                        <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-muted">
                          {d.status}
                        </span>
                      )}
                      <div className="text-muted-foreground mt-0.5">{relTime(d.uploaded_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="refs" className="mt-5">
            {(() => {
              const CHASE_LABELS_SHORT = ["Initial request sent","1st chase sent","2nd chase sent","3rd chase sent","4th chase sent","5th chase sent","Final chase sent"];
              const refSummary = refs.reduce(
                (acc, r) => {
                  if (r.status === "received" || r.received_at) acc.received++;
                  else if (r.requested_at) acc.chasing++;
                  else acc.pending++;
                  return acc;
                },
                { received: 0, chasing: 0, pending: 0 }
              );
              return (
                <>
                  {/* Summary bar */}
                  {refs.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      {refSummary.received > 0 && <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">{refSummary.received} received</span>}
                      {refSummary.chasing > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">{refSummary.chasing} chasing</span>}
                      {refSummary.pending > 0 && <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">{refSummary.pending} pending</span>}
                      <a
                        href={`/compliance/${c.id}`}
                        className="ml-auto text-xs text-[#2DD4BF] font-medium hover:underline flex items-center gap-1"
                      >
                        Manage in Compliance →
                      </a>
                    </div>
                  )}

                  {refs.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">
                      No references on file.{" "}
                      <a href={`/compliance/${c.id}`} className="text-[#2DD4BF] hover:underline">Add via Compliance →</a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {refs.map((r) => {
                        const isReceived = r.status === "received" || !!r.received_at;
                        const isPending = !r.requested_at;
                        const isChasing = !isReceived && !isPending;
                        const stage = r.reminder_stage ?? 0;
                        const stageLabel = CHASE_LABELS_SHORT[Math.min(stage, 6)];
                        const typeLabel = r.ref_type === "character" ? "Character" : "Work";
                        return (
                          <div key={r.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900">{r.referee_name || "—"}</span>
                                  {r.short_code && (
                                    <span
                                      title="Short code — click to copy"
                                      onClick={() => { navigator.clipboard.writeText(r.short_code!); }}
                                      className="font-mono text-[10px] tracking-widest bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer hover:bg-slate-200 transition-colors select-all"
                                    >{r.short_code}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {typeLabel} Reference {r.ref_number != null ? `#${r.ref_number}` : ""}
                                  {r.company_name ? ` · ${r.company_name}` : ""}
                                  {(r.referee_job_title || r.relationship_to_candidate) ? ` · ${r.referee_job_title || r.relationship_to_candidate}` : ""}
                                </p>
                                {r.referee_email && (
                                  <p className="text-xs text-gray-400 mt-0.5">{r.referee_email}{r.referee_phone ? ` · ${r.referee_phone}` : ""}</p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                {isReceived ? (
                                  <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Received</span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Pending Send</span>
                                ) : (
                                  <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Chasing</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-gray-400">
                              {isReceived && r.received_at && <span className="text-green-600">Received {relTime(r.received_at)}</span>}
                              {isChasing && <span className="text-amber-600">{stageLabel} · {stage >= 6 ? "Chase sequence complete" : `Next chase ${r.next_reminder_at ? new Date(r.next_reminder_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}`}</span>}
                              {isPending && <span className="text-blue-500">Not yet sent</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {isTemp && (
            <TabsContent value="availability" className="mt-5">
              <AvailabilityTab candidateId={c.id} />
            </TabsContent>
          )}

          {isPerm && (
            <TabsContent value="permnotes" className="mt-5">
              <PermNotesTab candidate={c} onSave={(patch) => setC((prev: any) => prev ? { ...prev, ...patch } : prev)} />
            </TabsContent>
          )}

          <TabsContent value="appinfo" className="mt-5">
            <AppInfoTab candidate={c} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// ── AvailabilityTab ───────────────────────────────────────────────────────────
const DAYS = [
  { label: "Monday",    iso: 1 },
  { label: "Tuesday",   iso: 2 },
  { label: "Wednesday", iso: 3 },
  { label: "Thursday",  iso: 4 },
  { label: "Friday",    iso: 5 },
  { label: "Saturday",  iso: 6 },
  { label: "Sunday",    iso: 7 },
];

function getMonday(d = new Date()): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.round(ms / 86_400_000) + 1;
}

const CATEGORY_ICON: Record<string, string> = {
  holiday: "🏖️",
  sick:    "🤒",
  personal:"👤",
  other:   "📅",
};

function AvailabilityTab({ candidateId }: { candidateId: string }) {
  const [weeklyAvail, setWeeklyAvail] = useState<WeeklyAvail[]>([]);
  const [submission,  setSubmission]  = useState<AvailSubmission | null>(null);
  const [timeOff,     setTimeOff]     = useState<TimeOffRow[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const monday    = getMonday();
    const weekStart = monday.toISOString().slice(0, 10);
    setLoading(true);
    Promise.all([
      (supabase as any).from("candidate_weekly_availability")
        .select("day_of_week,is_available,all_day,start_time,end_time")
        .eq("candidate_id", candidateId),
      (supabase as any).from("candidate_availability_submissions")
        .select("week_starting,submitted_at,has_changes")
        .eq("candidate_id", candidateId)
        .eq("week_starting", weekStart)
        .maybeSingle(),
      (supabase as any).from("candidate_time_off")
        .select("id,title,category,start_date,end_date,notes")
        .eq("candidate_id", candidateId)
        .order("start_date", { ascending: false }),
    ]).then(([wa, sub, to]) => {
      setWeeklyAvail((wa.data ?? []) as unknown as WeeklyAvail[]);
      setSubmission(sub.data as unknown as AvailSubmission | null);
      setTimeOff((to.data ?? []) as unknown as TimeOffRow[]);
      setLoading(false);
    });
  }, [candidateId]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading availability…</div>;

  const monday    = getMonday();
  const sunday    = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  const availMap = new Map(weeklyAvail.map((r) => [r.day_of_week, r]));

  return (
    <div className="space-y-6">
      {/* Weekly schedule */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold text-sm">Weekly Availability</h3>
          <span className="text-xs text-muted-foreground">{weekLabel}</span>
        </div>
        <div className="rounded-2xl border overflow-hidden">
          {DAYS.map((day, i) => {
            const row = availMap.get(day.iso);
            return (
              <div key={day.iso}
                className={`flex items-center justify-between px-4 py-3 text-sm ${i < DAYS.length - 1 ? "border-b" : ""} ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                <span className="font-medium w-28 text-foreground">{day.label}</span>
                {!row ? (
                  <span className="text-xs text-muted-foreground">Not set</span>
                ) : !row.is_available ? (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-destructive/15 text-destructive text-xs font-medium">Unavailable</span>
                ) : row.all_day ? (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">All day</span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.start_time?.slice(0, 5) ?? "–"} – {row.end_time?.slice(0, 5) ?? "–"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Submission status */}
        <div className="mt-3 flex items-center gap-2">
          {submission ? (
            <>
              <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
                ✓ Submitted {new Date(submission.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at {new Date(submission.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {submission.has_changes && (
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
                  Updated availability submitted
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
              ⚠ Not yet submitted this week
            </span>
          )}
        </div>
      </div>

      {/* Time off */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Time Off &amp; Unavailable Dates</h3>
        {timeOff.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No time off added.</div>
        ) : (
          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Dates</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Duration</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {timeOff.map((t, i) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isActive = t.start_date <= today && t.end_date >= today;
                  const isUpcoming = t.start_date > today;
                  return (
                    <tr key={t.id} className={`border-t ${isActive ? "bg-red-50/50" : isUpcoming ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="text-base">{CATEGORY_ICON[t.category ?? ""] ?? "📅"}</span>
                        <span className="ml-1.5 capitalize text-muted-foreground">{t.category ?? "other"}</span>
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">{t.title}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                        {fmtDateShort(t.start_date)} – {fmtDateShort(t.end_date)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{daysBetween(t.start_date, t.end_date)}d</td>
                      <td className="px-3 py-3 text-muted-foreground max-w-[180px] truncate">{t.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderBtn({
  icon: Icon,
  children,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/15 inline-flex items-center gap-1.5"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function EmailContactChip({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-navy/8 text-navy grid place-items-center shrink-0">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Email</div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{value || "—"}</span>
          {value && (
            <button onClick={copy} title="Copy email"
              className="shrink-0 h-5 w-5 rounded hover:bg-muted flex items-center justify-center transition-colors">
              {copied
                ? <span className="text-[10px] text-emerald-600 font-semibold">✓</span>
                : <Copy className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-navy/8 text-navy grid place-items-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</div>
        <div className="text-sm font-medium truncate">{value || "—"}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</div>
      <div className="mt-1 font-medium text-sm">{value || "—"}</div>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  const v = (value || "unknown").toLowerCase();
  const tone =
    v === "yes"
      ? "border-success/40 bg-success/10"
      : v === "no"
      ? "border-destructive/40 bg-destructive/10"
      : "border-transparent bg-muted/40";
  return (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${tone}`}>
      <span className="text-sm font-medium">{label}</span>
      <Select value={v} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TabTrig({
  value,
  icon: Icon,
  children,
}: {
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-full data-[state=active]:bg-navy data-[state=active]:text-navy-foreground data-[state=active]:shadow-none text-xs gap-1.5 px-3"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </TabsTrigger>
  );
}

function ActivityIcon({ type }: { type: string | null }) {
  const t = (type || "").toLowerCase();
  if (t === "call") return <PhoneCall className="h-3.5 w-3.5" />;
  if (t.includes("doc") || t.includes("upload")) return <FileText className="h-3.5 w-3.5" />;
  if (t.includes("compliance")) return <ShieldCheck className="h-3.5 w-3.5" />;
  return <Sparkles className="h-3.5 w-3.5" />;
}

// ── SOAR CV Generator Modal ──────────────────────────────────────────────────

// ── Availability types ────────────────────────────────────────────────────────
type WeeklyAvail = {
  day_of_week: number;
  is_available: boolean;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
};
type AvailSubmission = {
  week_starting: string;
  submitted_at: string;
  has_changes: boolean;
};
type TimeOffRow = {
  id: string;
  title: string;
  category: string | null;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type CvEmployment = { role: string; company: string; dateTo: string; description: string };

// ── GenerateWorkerProfileModal ───────────────────────────────────────────────
type ComplianceItem = {
  key: string;
  label: string;
  fields: { key: string; label: string; type: "text" | "date" }[];
};

const WP_COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    key: "dbs",
    label: "DBS",
    fields: [
      { key: "dbsNumber",    label: "DBS number",  type: "text" },
      { key: "dbsIssueDate", label: "Issue date",  type: "date" },
    ],
  },
  {
    key: "pfa",
    label: "Paediatric First Aid",
    fields: [
      { key: "pfaStatus", label: "Status",      type: "text" },
      { key: "pfaExpiry", label: "Expiry date", type: "date" },
    ],
  },
  {
    key: "safeguarding",
    label: "Safeguarding",
    fields: [
      { key: "sgLevel",  label: "Level",       type: "text" },
      { key: "sgExpiry", label: "Expiry date", type: "date" },
    ],
  },
  {
    key: "firstAid",
    label: "First Aid",
    fields: [
      { key: "faExpiry", label: "Expiry date", type: "date" },
    ],
  },
];

function GenerateWorkerProfileModal({
  open, onClose, candidate,
}: {
  open: boolean;
  onClose: () => void;
  candidate: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    town: string | null;
    qualification_level: string | null;
    qualifications_text: string | null;
    current_position: string | null;
    current_employer: string | null;
  };
}) {
  const name = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim();

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [fieldVals, setFieldVals] = useState<Record<string, string>>({});
  const [experience, setExperience] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled({});
    setFieldVals({});
    setExperience("");
    runGenerate();
  }, [open]);

  const runGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-summary", {
        body: {
          first_name:          candidate.first_name,
          last_name:           candidate.last_name,
          qualification_level: candidate.qualification_level,
          current_position:    candidate.current_position,
          current_employer:    candidate.current_employer,
          qualifications_text: candidate.qualifications_text,
        },
      });
      if (error) throw error;
      const d = typeof data === "string" ? JSON.parse(data) : data;
      setExperience(d.profile_summary ?? "");
    } catch {
      setExperience("Click Regenerate to generate an AI experience summary.");
    }
    setGenerating(false);
  };

  const setFV = (k: string, v: string) => setFieldVals((p) => ({ ...p, [k]: v }));

  const saveToDocuments = async () => {
    setSaving(true);
    try {
      await (supabase as any).from("candidate_documents").insert({
        candidate_id: candidate.id,
        document_type: "worker_profile",
        file_name: `Worker_Profile_${name.replace(/\s+/g, "_")}.pdf`,
        status: "pending",
      });
      toast.success("Worker profile saved to documents");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    }
    setSaving(false);
  };

  const downloadPDF = () => {
    const enabledItems = WP_COMPLIANCE_ITEMS.filter((item) => enabled[item.key]);
    let complianceHtml = "";
    if (enabledItems.length === 0) {
      complianceHtml = `<p style="color:#6b7280;font-style:italic;font-size:13px;margin:0">Compliance details available on request.</p>`;
    } else {
      complianceHtml = enabledItems.map((item) => {
        const fieldRows = item.fields.map((f) => {
          const val = fieldVals[f.key] || "—";
          return `<tr><td style="color:#6b7280;font-size:12px;padding:3px 16px 3px 0;white-space:nowrap">${f.label}</td><td style="font-size:12px;font-weight:600;color:#1B2B4B">${val}</td></tr>`;
        }).join("");
        return `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#1B2B4B;margin-bottom:4px">${item.label}</div><table style="border-collapse:collapse">${fieldRows}</table></div>`;
      }).join("");
    }

    const expHtml = (experience || "").split("\n").map((l) => `<p style="margin:0 0 8px 0">${l || "&nbsp;"}</p>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Worker Profile — ${name}</title>
<style>
  @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
  .hdr{background:#1B2B4B;padding:36px 50px 28px}
  .logo{display:flex;align-items:center;gap:6px;margin-bottom:18px}
  .logo-t{color:#fff;font-size:26px;font-weight:700}
  .logo-s{color:#2DD4BF;font-size:20px}
  .doc-title{color:#fff;font-size:17px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
  .body{padding:36px 50px}
  .info-row{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:24px;border-bottom:1px solid #e5e7eb}
  .cname{font-size:26px;font-weight:700;color:#1B2B4B;margin:0 0 4px 0}
  .cloc{color:#6b7280;font-size:13px;margin:0 0 14px 0}
  .dtbl{border-collapse:collapse}
  .dtbl td{padding:3px 0;font-size:13px}
  .dlbl{color:#6b7280;padding-right:20px;white-space:nowrap}
  .dval{font-weight:700;color:#1B2B4B}
  .photo{width:110px;height:130px;border:1.5px solid #d1d5db;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ptxt{color:#9ca3af;font-style:italic;font-size:12px;text-align:center}
  .sec{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #e5e7eb}
  .sec:last-of-type{border-bottom:none}
  .sec-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1B2B4B;border-bottom:2px solid #1B2B4B;padding-bottom:3px;display:inline-block;margin-bottom:12px}
  .exp-p{font-size:13px;color:#374151;line-height:1.65;margin:0}
  .ftr{position:fixed;bottom:28px;left:50px;right:50px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
</style></head><body>
<div class="hdr">
  <div class="logo"><span class="logo-t">Soar</span><span class="logo-s">✱</span></div>
  <div class="doc-title">Worker Profile — Temporary Staff</div>
</div>
<div class="body">
  <div class="info-row">
    <div>
      <p class="cname">${name}</p>
      <p class="cloc">${candidate.town ?? ""}</p>
      <table class="dtbl">
        ${candidate.phone ? `<tr><td class="dlbl">Contact number</td><td class="dval">${candidate.phone}</td></tr>` : ""}
        ${candidate.qualification_level ? `<tr><td class="dlbl">Qualification</td><td class="dval">${candidate.qualification_level.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</td></tr>` : ""}
      </table>
    </div>
    <div class="photo"><span class="ptxt">Photo<br>pending</span></div>
  </div>
  <div class="sec"><span class="sec-h">Compliance</span><br>${complianceHtml}</div>
  <div class="sec"><span class="sec-h">Experience</span><div class="exp-p">${expHtml}</div></div>
</div>
<div class="ftr">
  <div>For any issues please call the Temp Team on 020 3100 1770, option 2</div>
  <div>Presented by SOAR Staffing Group</div>
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
    saveToDocuments();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-base">Worker Profile Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={runGenerate} disabled={generating}
              className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {generating ? "Generating…" : "Regenerate"}
            </button>
            <button onClick={saveToDocuments} disabled={saving || generating}
              className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save to Documents"}
            </button>
            <button onClick={downloadPDF} disabled={generating}
              className="h-9 px-4 rounded-full bg-[#1B2B4B] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 shadow-sm">
              <FileText className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button onClick={onClose}
              className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 shadow-sm">
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Document preview strip */}
          <div className="rounded-xl overflow-hidden border">
            <div className="bg-[#1B2B4B] px-6 py-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-white font-bold text-xl">Soar</span>
                <span className="text-teal-400 text-lg">✱</span>
              </div>
              <div className="text-white font-bold text-sm tracking-wider uppercase">Worker Profile — Temporary Staff</div>
            </div>
            <div className="bg-white px-6 py-4 flex justify-between items-start border-b">
              <div>
                <div className="text-lg font-bold" style={{color:"#1B2B4B"}}>{name}</div>
                <div className="text-sm" style={{color:"#6b7280"}}>{candidate.town}</div>
                {candidate.phone && (
                  <div className="text-xs mt-1" style={{color:"#6b7280"}}>Contact: <span style={{fontWeight:600,color:"#1B2B4B"}}>{candidate.phone}</span></div>
                )}
                {candidate.qualification_level && (
                  <div className="text-xs" style={{color:"#6b7280"}}>Qualification: <span style={{fontWeight:600,color:"#1B2B4B"}}>{fmtQual(candidate.qualification_level)}</span></div>
                )}
              </div>
              <div className="h-[72px] w-[60px] border border-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-gray-400 italic text-center">Photo<br/>pending</span>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs uppercase tracking-widest border-b-2 border-[#1B2B4B] pb-0.5" style={{color:"#1B2B4B"}}>Compliance</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Only items toggled on will appear in the final PDF.</p>
            <div className="space-y-2">
              {WP_COMPLIANCE_ITEMS.map((item) => (
                <div key={item.key} className="rounded-xl border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <span className="text-sm font-medium" style={{color:"#1a1a1a"}}>{item.label}</span>
                    <Switch checked={!!enabled[item.key]} onCheckedChange={(v) => setEnabled((p) => ({ ...p, [item.key]: v }))} />
                  </div>
                  {enabled[item.key] && (
                    <div className="px-4 py-3 grid grid-cols-2 gap-3 border-t">
                      {item.fields.map((f) => (
                        <div key={f.key}>
                          <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                          <Input type={f.type} value={fieldVals[f.key] ?? ""} onChange={(e) => setFV(f.key, e.target.value)}
                            className="h-9 text-sm" style={{color:"#1a1a1a",background:"#fff"}} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <span className="font-bold text-xs uppercase tracking-widest border-b-2 border-[#1B2B4B] pb-0.5 inline-block mb-3" style={{color:"#1B2B4B"}}>Experience</span>
            {generating ? (
              <div className="h-28 rounded-xl bg-muted/40 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                Generating experience summary…
              </div>
            ) : (
              <Textarea value={experience} onChange={(e) => setExperience(e.target.value)}
                rows={5} className="text-sm resize-none" style={{color:"#1a1a1a",background:"#fff"}} />
            )}
          </div>

          {/* Footer preview */}
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div>For any issues please call the Temp Team on 020 3100 1770, option 2</div>
            <div>Presented by SOAR Staffing Group</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateCVModal({ open, onClose, candidate }: {
  open: boolean; onClose: () => void; candidate: {
    id: string; first_name: string | null; last_name: string | null;
    town: string | null; postcode: string | null; qualification_level: string | null;
    qualifications_text: string | null; current_position: string | null; current_employer: string | null;
  };
}) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const [availability, setAvailability] = useState("");
  const [employment, setEmployment] = useState<CvEmployment[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  const name = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim();
  const location = candidate.town || candidate.postcode || "";
  const qualification = candidate.qualification_level || "";
  const currentRole = candidate.current_position || "";

  const initState = () => {
    const emp: CvEmployment[] = [{
      role: candidate.current_position || "",
      company: candidate.current_employer || "",
      dateTo: "Present",
      description: "",
    }];
    setEmployment(emp);
    setQualifications(candidate.qualification_level ? [candidate.qualification_level] : [""]);
    setSkills(Array(8).fill(""));
    setSummary("");
    setAvailability("");
  };

  useEffect(() => {
    if (!open) return;
    initState();
    runAI();
  }, [open, candidate.id]);

  const runAI = async () => {
    setGenerating(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-summary", {
        body: {
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          qualification_level: candidate.qualification_level,
          current_position: candidate.current_position,
          current_employer: candidate.current_employer,
          qualifications_text: candidate.qualifications_text,
        },
      });
      if (error) throw new Error(error.message);
      const d = data ?? {};
      setSummary(d.profile_summary ?? "");
      setAvailability(d.availability_text ?? "");
      if (Array.isArray(d.skills) && d.skills.length) setSkills(d.skills);
      if (d.employment_description) {
        setEmployment((prev) => prev.map((e, i) =>
          i === 0 ? { ...e, description: d.employment_description } : e
        ));
      }
    } catch (err) {
      console.error("CV generation error:", err);
      setSummary("Click Regenerate to generate an AI profile summary.");
    }
    setGenerating(false);
  };

  const downloadPDF = () => {
    const empHtml = employment
      .filter((e) => e.role || e.company)
      .map((e) => `
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <strong style="font-size:14px">${e.role}</strong>
            <span style="color:#888;font-size:13px">${e.dateTo || "Present"}</span>
          </div>
          <div style="color:#0E9E8E;font-style:italic;font-size:13px;margin-bottom:8px">${e.company}</div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#444">${e.description}</p>
        </div>`).join("");

    const qualHtml = qualifications.filter(Boolean).map((q) => `<li style="font-size:13px;margin-left:20px;padding:3px 0">${q}</li>`).join("");

    const filteredSkills = skills.filter(Boolean);
    const skillsHtml = filteredSkills.map((s) => `<li style="font-size:13px;margin-left:20px;padding:3px 0;break-inside:avoid">${s}</li>`).join("");

    const logoSvg = `<svg width="100" height="32" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="28" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="30" font-weight="800" fill="white">Soar</text>
      <text x="96" y="12" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" fill="#2DD4BF">✳</text>
    </svg>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SOAR CV – ${name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#333; background:#fff; }
.header { background:#1B2B4B; padding:44px 60px 36px; color:white; }
.logo { margin-bottom:28px; }
.cname { font-size:46px; font-weight:800; letter-spacing:-1px; margin-bottom:6px; }
.meta { display:flex; justify-content:space-between; align-items:flex-end; margin-top:4px; }
.meta-left { font-size:15px; opacity:0.9; line-height:1.9; }
.pill { background:#2DD4BF; color:#1B2B4B; padding:9px 22px; border-radius:50px; font-weight:700; font-size:14px; }
.body { padding:44px 60px; }
.sec { margin-bottom:32px; }
.sec-title { font-size:12px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#1B2B4B; border-bottom:2.5px solid #2DD4BF; padding-bottom:5px; margin-bottom:14px; }
p { font-size:13px; line-height:1.7; color:#444; }
.avail { color:#0E9E8E; font-style:italic; font-size:13px; line-height:1.6; margin-top:14px; }
.skills-grid { columns:2; column-gap:40px; }
.footer { border-top:1px solid #e5e5e5; margin:0 60px; padding:16px 0; font-size:11px; color:#aaa; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="header">
  <div class="logo">${logoSvg}</div>
  <div class="cname">${name}</div>
  <div class="meta">
    <div class="meta-left"><div>${location}</div><div>${currentRole}</div></div>
    ${qualification ? `<div class="pill">${qualification}</div>` : ""}
  </div>
</div>
<div class="body">
  ${summary ? `<div class="sec"><div class="sec-title">Profile Summary</div><p>${summary.split("\n").join("<br>")}</p>${availability ? `<p class="avail">Availability &amp; Preferences: ${availability}</p>` : ""}</div>` : ""}
  ${empHtml ? `<div class="sec"><div class="sec-title">Employment History</div>${empHtml}</div>` : ""}
  ${qualHtml ? `<div class="sec"><div class="sec-title">Qualifications</div><ul>${qualHtml}</ul></div>` : ""}
  ${skillsHtml ? `<div class="sec"><div class="sec-title">Key Skills</div><ul class="skills-grid">${skillsHtml}</ul></div>` : ""}
</div>
<div class="footer">Presented by SOAR Staffing Group · soarrecruitment.co.uk</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
  };

  const saveCV = async () => {
    setSaving(true);
    const fileName = `SOAR_CV_${name.replace(/\s+/g, "_")}.pdf`;
    try {
      await supabase.from("candidate_documents").insert({
        candidate_id: candidate.id,
        document_type: "soar_cv",
        file_name: fileName,
        status: "pending",
      });
      await supabase.from("candidates").update({
        cv_soar_url: `generated:${new Date().toISOString()}`,
      }).eq("id", candidate.id);
      toast.success("CV saved to candidate profile");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    }
    setSaving(false);
  };

  const downloadAndSave = () => { downloadPDF(); saveCV(); };

    const addEmp = () => setEmployment((p) => [...p, { role: "", company: "", dateTo: "", description: "" }]);
  const setEmp = (i: number, k: keyof CvEmployment, v: string) =>
    setEmployment((p) => p.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const removeEmp = (i: number) => setEmployment((p) => p.filter((_, idx) => idx !== i));

  const addQual = () => setQualifications((p) => [...p, ""]);
  const setQual = (i: number, v: string) => setQualifications((p) => p.map((q, idx) => idx === i ? v : q));
  const removeQual = (i: number) => setQualifications((p) => p.filter((_, idx) => idx !== i));

  const addSkill = () => setSkills((p) => [...p, ""]);
  const setSkill = (i: number, v: string) => setSkills((p) => p.map((s, idx) => idx === i ? v : s));
  const removeSkill = (i: number) => setSkills((p) => p.filter((_, idx) => idx !== i));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-base">SOAR CV Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={runAI} disabled={generating}
              className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {generating ? "Generating…" : "Regenerate"}
            </button>
            <button onClick={saveCV} disabled={saving || generating}
              className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={downloadAndSave} disabled={generating}
              className="h-9 px-4 rounded-full bg-[#1B2B4B] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 shadow-sm">
              <FileText className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button onClick={onClose} className="h-9 px-4 rounded-full border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 shadow-sm">Close</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* CV Header preview */}
          <div className="bg-[#1B2B4B] text-white px-8 py-8">
            <div className="mb-6">
              <span className="text-2xl font-black tracking-tight">Soar</span>
              <span className="text-teal text-lg ml-0.5">✳</span>
            </div>
            <div className="text-3xl font-bold mb-2">{name}</div>
            <div className="flex items-end justify-between gap-4">
              <div className="text-sm opacity-90 space-y-0.5">
                <div>{location}</div>
                <div>{currentRole}</div>
              </div>
              {qualification && (
                <div className="bg-teal text-[#1B2B4B] text-xs font-bold px-4 py-2 rounded-full shrink-0">
                  {qualification}
                </div>
              )}
            </div>
          </div>

          {/* Generating overlay */}
          {generating && (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
              <div className="h-5 w-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              Generating CV content with AI…
            </div>
          )}

          {/* Editable sections */}
          {!generating && (
            <div className="px-8 py-6 space-y-7">
              {/* Profile Summary */}
              <CvSection title="Profile Summary">
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5}
                  placeholder="Profile summary will be generated automatically…"
                  className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none leading-relaxed" style={{color:"#1a1a1a",background:"#fff"}} />
                <div className="mt-2">
                  <label className="text-xs font-medium text-[#0E9E8E] block mb-1">Availability &amp; Preferences</label>
                  <input value={availability} onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g. Seeking a full-time nursery role in South London"
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40 italic text-[#0E9E8E] placeholder:not-italic placeholder:text-muted-foreground" />
                </div>
              </CvSection>

              {/* Employment History */}
              <CvSection title="Employment History">
                <div className="space-y-4">
                  {employment.map((e, i) => (
                    <div key={i} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                      <div className="grid grid-cols-3 gap-2">
                        <input value={e.role} onChange={(ev) => setEmp(i, "role", ev.target.value)} placeholder="Job title"
                          className="text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40" style={{color:"#1a1a1a",background:"#fff"}} />
                        <input value={e.company} onChange={(ev) => setEmp(i, "company", ev.target.value)} placeholder="Employer"
                          className="text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40" style={{color:"#1a1a1a",background:"#fff"}} />
                        <input value={e.dateTo} onChange={(ev) => setEmp(i, "dateTo", ev.target.value)} placeholder="End date / Present"
                          className="text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40" style={{color:"#1a1a1a",background:"#fff"}} />
                      </div>
                      <textarea value={e.description} onChange={(ev) => setEmp(i, "description", ev.target.value)} rows={3}
                        placeholder="Describe responsibilities and achievements…"
                        className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" style={{color:"#1a1a1a",background:"#fff"}} />
                      <button onClick={() => removeEmp(i)} className="text-xs text-rose-500 hover:text-rose-600">Remove</button>
                    </div>
                  ))}
                  <button onClick={addEmp} className="text-xs text-teal font-medium hover:opacity-80 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add role
                  </button>
                </div>
              </CvSection>

              {/* Qualifications */}
              <CvSection title="Qualifications">
                <div className="space-y-2">
                  {qualifications.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={q} onChange={(e) => setQual(i, e.target.value)} placeholder="e.g. Level 3 Early Years Educator"
                        className="flex-1 text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40" style={{color:"#1a1a1a",background:"#fff"}} />
                      <button onClick={() => removeQual(i)} className="text-xs text-rose-500 px-2 hover:text-rose-600">✕</button>
                    </div>
                  ))}
                  <button onClick={addQual} className="text-xs text-teal font-medium hover:opacity-80 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add qualification
                  </button>
                </div>
              </CvSection>

              {/* Key Skills */}
              <CvSection title="Key Skills">
                <div className="grid grid-cols-2 gap-2">
                  {skills.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={s} onChange={(e) => setSkill(i, e.target.value)} placeholder="e.g. EYFS Framework"
                        className="flex-1 text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40" style={{color:"#1a1a1a",background:"#fff"}} />
                      <button onClick={() => removeSkill(i)} className="text-xs text-rose-500 px-1 hover:text-rose-600">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={addSkill} className="mt-2 text-xs text-teal font-medium hover:opacity-80 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add skill
                </button>
              </CvSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#1B2B4B] border-b-2 border-teal pb-1.5 mb-4">{title}</h3>
      {children}
    </div>
  );
}


// ── MessagesTab ───────────────────────────────────────────────────────────────
type MsgChannel = "whatsapp" | "sms" | "app";

const CHANNEL_META: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  whatsapp: { label: "WhatsApp", bg: "#25D366", icon: <MessageCircle className="h-3 w-3 text-white" /> },
  sms:      { label: "SMS",      bg: "#3B82F6", icon: <Phone className="h-3 w-3 text-white" /> },
  app:      { label: "App",      bg: "#0AB5A3", icon: <Smartphone className="h-3 w-3 text-white" /> },
  email:    { label: "Email",    bg: "#F97316", icon: <Mail className="h-3 w-3 text-white" /> },
};

function ChannelIcon({ ch, size = 20 }: { ch: string; size?: number }) {
  const meta = CHANNEL_META[ch];
  if (!meta) return null;
  return (
    <span style={{ width: size, height: size, background: meta.bg }} className="rounded-full inline-flex items-center justify-center shrink-0">
      {meta.icon}
    </span>
  );
}

function ChannelBadge({ ch, dir }: { ch: string; dir: string }) {
  const meta = CHANNEL_META[ch];
  if (!meta) return null;
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: meta.bg + "20", color: meta.bg }}>
      {dir === "inbound" ? "via " : ""}{meta.label}
    </span>
  );
}

function MessagesTab({ candidateId, candidatePhone, isTemp }: { candidateId: string; candidatePhone: string | null; isTemp: boolean }) {
  const [messages, setMessages] = useState<{ id: string; content: string; direction: string; channel: string; status: string; created_at: string }[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState<MsgChannel>("whatsapp");
  const [channelLocked, setChannelLocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const load = async () => {
    const { data } = await (supabase as any).from("messages")
      .select("*").eq("candidate_id", candidateId).order("created_at", { ascending: true });
    const msgs = data ?? [];
    setMessages(msgs);
    if (!channelLocked && msgs.length > 0) {
      const lastInbound = [...msgs].reverse().find((m: any) => m.direction === "inbound");
      if (lastInbound && ["whatsapp", "sms", "app"].includes(lastInbound.channel)) {
        setChannel(lastInbound.channel as MsgChannel);
      }
      setChannelLocked(true);
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    await (supabase as any).from("messages").update({ status: "read" }).eq("candidate_id", candidateId).eq("direction", "inbound").neq("status", "read");
  };

  useEffect(() => { load(); }, [candidateId]);

  useEffect(() => {
    const ch = supabase.channel(`messages-candidate-${candidateId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `candidate_id=eq.${candidateId}` }, (payload) => {
        setMessages(prev => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [candidateId]);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    if (!input.trim() || !userId) return;
    setSending(true);
    try {
      await supabase.functions.invoke("send-message", {
        body: { candidate_id: candidateId, recruiter_id: userId, content: input.trim(), channel, candidate_phone: candidatePhone },
      });
      setInput("");
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const channels: MsgChannel[] = isTemp ? ["whatsapp", "sms", "app"] : ["whatsapp", "sms"];

  return (
    <div className="flex flex-col h-full">
      {/* Message thread — scrollable */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-5 py-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 gap-2">
            <MessageCircle className="h-8 w-8 text-gray-200" />
            No messages yet
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.direction === "outbound" ? "bg-navy text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm"}`}>
              <p className="leading-relaxed">{msg.content}</p>
              <div className={`flex items-center gap-1.5 mt-1.5 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${msg.direction === "outbound" ? "text-white/50" : "text-gray-400"}`}>{fmtTime(msg.created_at)}</span>
                <ChannelBadge ch={msg.channel} dir={msg.direction} />
                {msg.direction === "outbound" && msg.status === "read" && <CheckCheck className="h-3 w-3 text-teal-300" />}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Channel selector + Compose — pinned to bottom */}
      <div className="shrink-0 border-t border-gray-100 px-5 pt-3 pb-4 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-gray-500">Reply via:</span>
          {channels.map(ch => (
            <button key={ch} onClick={() => setChannel(ch)}
              className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${channel === ch ? "bg-navy border-navy text-white" : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"}`}>
              <ChannelIcon ch={ch} size={14} />
              {ch === "app" ? "App" : ch === "sms" ? "SMS" : "WhatsApp"}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/10 transition-all px-4 py-2.5">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={channel === "app" ? "Message via App…" : channel === "sms" ? "Message via SMS…" : "Message via WhatsApp…"}
            rows={1} disabled={sending}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none leading-relaxed max-h-28 overflow-y-auto"
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 112) + "px"; }} />
          <button onClick={send} disabled={!input.trim() || sending}
            className="h-8 w-8 rounded-full bg-teal grid place-items-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 text-white">
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ChatDrawer ────────────────────────────────────────────────────────────────
function ChatDrawer({ candidateId, candidateName, candidatePhone, isTemp, onClose }: {
  candidateId: string;
  candidateName: string;
  candidatePhone: string | null;
  isTemp: boolean;
  onClose: () => void;
}) {
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-navy shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 text-white grid place-items-center text-xs font-bold">
              {initials}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{candidateName}</div>
              {candidatePhone && <div className="text-[11px] text-white/60">{candidatePhone}</div>}
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        {/* Messages — fills remaining height, compose pinned inside */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <MessagesTab candidateId={candidateId} candidatePhone={candidatePhone} isTemp={isTemp} />
        </div>
      </div>
    </>
  );
}

// ── PermNotesTab ──────────────────────────────────────────────────────────────
const NURSERY_TYPES = [
  "Private Day Nursery",
  "Maintained Nursery School",
  "School Nursery / Reception",
  "Children's Centre",
  "SEN / Specialist Setting",
  "Hospital Nursery",
  "Forest School",
  "Childminder",
  "Any",
];

function PermNotesTab({ candidate, onSave }: { candidate: any; onSave: (patch: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});

  const startEdit = () => {
    setDraft({
      salary_expectation_min: candidate.salary_expectation_min ?? null,
      salary_expectation_ideal: candidate.salary_expectation_ideal ?? null,
      notice_period_weeks: candidate.notice_period_weeks ?? null,
      max_commute_minutes: candidate.max_commute_minutes ?? null,
      preferred_nursery_type: candidate.preferred_nursery_type ?? null,
      recruiter_personality_notes: candidate.recruiter_personality_notes ?? null,
      career_aspiration_notes: candidate.career_aspiration_notes ?? null,
    });
    setEditing(true);
  };

  const save = async () => {
    await (supabase as any).from("candidates").update(draft).eq("id", candidate.id);
    onSave(draft);
    setEditing(false);
  };

  const inp = "w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40";
  const txt = "w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Recruiter Notes &amp; Matching Preferences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Captured during qualification call — used by Sammie for permanent matching</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} className="h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90">Save</button>
          </div>
        ) : (
          <button onClick={startEdit} className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">Edit</button>
        )}
      </div>

      {/* Salary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Salary Expectations</p>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Minimum (£)</label>
                <input type="number" className={inp} placeholder="e.g. 25000"
                  value={draft.salary_expectation_min ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, salary_expectation_min: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Ideal (£)</label>
                <input type="number" className={inp} placeholder="e.g. 28000"
                  value={draft.salary_expectation_ideal ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, salary_expectation_ideal: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Minimum</p>
                <p className="text-sm font-medium">{candidate.salary_expectation_min ? `£${Number(candidate.salary_expectation_min).toLocaleString()}` : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ideal</p>
                <p className="text-sm font-medium">{candidate.salary_expectation_ideal ? `£${Number(candidate.salary_expectation_ideal).toLocaleString()}` : "—"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logistics */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Logistics</p>
        <div className="grid grid-cols-3 gap-4">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notice Period (weeks)</label>
                <input type="number" className={inp} placeholder="e.g. 4"
                  value={draft.notice_period_weeks ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, notice_period_weeks: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Commute (mins)</label>
                <input type="number" className={inp} placeholder="e.g. 30"
                  value={draft.max_commute_minutes ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, max_commute_minutes: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Preferred Nursery Type</label>
                <select className={inp} value={draft.preferred_nursery_type ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, preferred_nursery_type: e.target.value || null }))}>
                  <option value="">—</option>
                  {NURSERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Notice Period</p>
                <p className="text-sm font-medium">{candidate.notice_period_weeks ? `${candidate.notice_period_weeks} weeks` : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Commute</p>
                <p className="text-sm font-medium">{candidate.max_commute_minutes ? `${candidate.max_commute_minutes} mins` : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Preferred Setting</p>
                <p className="text-sm font-medium">{candidate.preferred_nursery_type ?? "—"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recruiter Notes</p>
        <div className="grid grid-cols-1 gap-4">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Personality &amp; Soft Skills</label>
                <textarea className={txt} rows={3} placeholder="Notes on personality, communication style, soft skills, cultural fit…"
                  value={draft.recruiter_personality_notes ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, recruiter_personality_notes: e.target.value || null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Career Aspirations &amp; Values</label>
                <textarea className={txt} rows={3} placeholder="What are they looking for long term? Values, ethos, career goals, reasons for moving…"
                  value={draft.career_aspiration_notes ?? ""}
                  onChange={e => setDraft((d: any) => ({ ...d, career_aspiration_notes: e.target.value || null }))} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Personality &amp; Soft Skills</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.recruiter_personality_notes ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Career Aspirations &amp; Values</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.career_aspiration_notes ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sammie hint */}
      {!editing && !candidate.salary_expectation_min && !candidate.recruiter_personality_notes && (
        <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-xs text-teal-700">
          <span className="font-semibold">Sammie tip:</span> Fill in salary expectations and recruiter notes to improve permanent match quality.
        </div>
      )}
    </div>
  );
}

// ── AppInfoTab ────────────────────────────────────────────────────────────────
function AppInfoTab({ candidate }: { candidate: any }) {
  const bool = (v: boolean | null, yes = "Yes", no = "No") =>
    v == null ? "—" : v ? yes : no;
  const arr = (v: string[] | null) =>
    v && v.length ? v.join(", ") : "—";
  const str = (v: string | null | undefined) =>
    v && v.trim() ? v : "—";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {children}
      </div>
      <hr className="border-border" />
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );

  const BoolField = ({ label, value, yes, no }: { label: string; value: boolean | null; yes?: string; no?: string }) => (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value == null
          ? "bg-muted text-muted-foreground"
          : value
          ? "bg-red-50 text-red-700"
          : "bg-green-50 text-green-700"
      }`}>
        {bool(value, yes ?? "Yes", no ?? "No")}
      </span>
    </div>
  );

  const ni = candidate.national_insurance_number || candidate.ni_number;

  return (
    <div className="space-y-6 text-sm">

      {/* Emergency Contact */}
      <Section title="Emergency Contact">
        <Field label="Name" value={str(candidate.emergency_contact_name)} />
        <Field label="Phone" value={str(candidate.emergency_contact_phone)} />
        <Field label="Relationship" value={str(candidate.emergency_contact_relationship)} />
      </Section>

      {/* Personal */}
      <Section title="Personal Details">
        <Field label="National Insurance Number" value={str(ni)} />
        <Field label="Languages" value={arr(candidate.languages)} />
      </Section>

      {/* Right to Work & Health */}
      <Section title="Right to Work &amp; Health">
        <BoolField label="Requires work permit / visa" value={candidate.requires_work_permit} yes="Yes — permit required" no="No — right to work in UK" />
        {candidate.work_permit_notes && (
          <div className="sm:col-span-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">Work permit notes</p>
            <p className="text-sm">{candidate.work_permit_notes}</p>
          </div>
        )}
        <BoolField label="Disability or health condition" value={candidate.has_disability} yes="Disclosed" no="None disclosed" />
        {candidate.disability_notes && (
          <div className="sm:col-span-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">Health notes</p>
            <p className="text-sm">{candidate.disability_notes}</p>
          </div>
        )}
      </Section>

      {/* Experience */}
      <Section title="Experience &amp; Skills">
        <div className="sm:col-span-2 space-y-0.5">
          <p className="text-xs text-muted-foreground">Experience summary</p>
          <p className="text-sm whitespace-pre-wrap">{str(candidate.experience_summary)}</p>
        </div>
        <Field label="Fields of work" value={arr(candidate.fields_of_work)} />
        <Field label="Preferred age groups" value={arr(candidate.preferred_age_groups)} />
      </Section>

      {/* Availability */}
      <Section title="Availability">
        <Field label="Available days" value={arr(candidate.available_days)} />
        <Field label="Time slots" value={arr(candidate.availability_times)} />
        <Field label="Commute radius" value={str(candidate.commute_radius)} />
        {candidate.availability_notes && (
          <div className="sm:col-span-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">Availability notes</p>
            <p className="text-sm">{candidate.availability_notes}</p>
          </div>
        )}
      </Section>

      {/* Declarations */}
      <Section title="Declarations">
        <BoolField
          label="Declaration A — Ever cautioned, reprimanded or convicted?"
          value={candidate.declaration_ever_cautioned}
          yes="Disclosed — see notes"
          no="Clear"
        />
        {candidate.declaration_ever_cautioned && candidate.declaration_ever_cautioned_details && (
          <div className="sm:col-span-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">Declaration A details</p>
            <p className="text-sm">{candidate.declaration_ever_cautioned_details}</p>
          </div>
        )}
        <BoolField
          label="Declaration B — Anything to declare since last DBS?"
          value={candidate.declaration_since_dbs}
          yes="Disclosed — see notes"
          no="Clear"
        />
        {candidate.declaration_since_dbs && candidate.declaration_since_dbs_details && (
          <div className="sm:col-span-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">Declaration B details</p>
            <p className="text-sm">{candidate.declaration_since_dbs_details}</p>
          </div>
        )}
      </Section>

      {/* Consents & Payment */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consents &amp; Payment</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Terms agreed", value: candidate.terms_agreed },
            { label: "GDPR agreed", value: candidate.gdpr_agreed },
            { label: "Payroll sharing", value: candidate.payroll_sharing_agreed },
            { label: "Marketing opt-in", value: candidate.marketing_opt_in },
          ].map(({ label, value }) => (
            <div key={label} className={`rounded-lg border px-3 py-2 text-center ${
              value ? "border-green-200 bg-green-50" : "border-muted bg-muted/30"
            }`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${value ? "text-green-700" : "text-muted-foreground"}`}>
                {value == null ? "—" : value ? "✓ Yes" : "No"}
              </p>
            </div>
          ))}
        </div>
        {candidate.signature_full_name && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground">Signed as</p>
            <p className="text-sm font-medium">{candidate.signature_full_name}</p>
          </div>
        )}
        {candidate.bank_details_token && (
          <div className="mt-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Bank details on file (stored securely via token)
          </div>
        )}
      </div>

    </div>
  );
}
