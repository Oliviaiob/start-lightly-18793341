import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";

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
  created_by: string | null;
  created_at: string | null;
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
  company_name: string | null;
  ref_type: string | null;
  status: string | null;
  requested_at: string | null;
  received_at: string | null;
};

const STATUS_OPTIONS = ["Not Contacted", "Active", "Placed", "Inactive"];

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
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [refs, setRefs] = useState<Reference[]>([]);

  const [rateInput, setRateInput] = useState<string>("");

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
          .select("id, referee_name, company_name, ref_type, status, requested_at, received_at")
          .eq("candidate_id", id)
          .order("requested_at", { ascending: false }),
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
  const displayStatus = (isPerm ? c?.status_perm : c?.status_temp) || "Not Contacted";

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
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {creatorName && (
                <div className="mt-2 text-[11px] text-navy-foreground/60">Created by {creatorName}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <HeaderBtn icon={Pencil}>Edit</HeaderBtn>
            <HeaderBtn icon={Mail} onClick={() => c.email && (window.location.href = `mailto:${c.email}`)}>
              Send Email
            </HeaderBtn>
            <HeaderBtn icon={Plus}>Add to Shortlist</HeaderBtn>
            <button className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isPerm ? "Generate SOAR CV" : "Generate Worker Profile"}
            </button>
          </div>
        </div>
      </Card>

      {/* Contact info bar */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <ContactChip icon={Mail} label="Email" value={c.email} />
          <ContactChip icon={Phone} label="Phone" value={c.phone} />
          <ContactChip icon={MapPin} label="Location" value={c.town} />
          <ContactChip icon={Home} label="Postcode" value={c.postcode} />
          <ContactChip icon={Building2} label="Current Employer" value={c.current_employer} />
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
            <TabTrig value="quals" icon={ClipboardCheck}>Qualifications</TabTrig>
            <TabTrig value="cv" icon={FileText}>CV</TabTrig>
            <TabTrig value="pipeline" icon={Briefcase}>Jobs/Pipeline</TabTrig>
            <TabTrig value="placements" icon={Users}>Placements</TabTrig>
            <TabTrig value="compliance" icon={ShieldCheck}>Compliance</TabTrig>
            <TabTrig value="docs" icon={FolderOpen}>Documents</TabTrig>
            <TabTrig value="refs" icon={UserRound}>References</TabTrig>
            {isTemp && <TabTrig value="availability" icon={Clock}>Availability</TabTrig>}
          </TabsList>

          <TabsContent value="personal" className="mt-5">
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
            </div>
          </TabsContent>

          <TabsContent value="quals" className="mt-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Qualification Level" value={c.qualification_level} />
              <Field label="Details" value={c.qualifications_text} />
            </div>
          </TabsContent>

          <TabsContent value="cv" className="mt-5 text-sm">
            <div className="space-y-3">
              {c.cv_original_url ? (
                <a href={c.cv_original_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
                  <FileText className="h-4 w-4 text-navy" /> View Original CV
                </a>
              ) : (
                <div className="text-muted-foreground">No CV uploaded yet.</div>
              )}
              {c.cv_soar_url && (
                <a href={c.cv_soar_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-2 p-3 rounded-xl bg-teal/15 hover:bg-teal/25 transition-colors">
                  <Sparkles className="h-4 w-4 text-teal-foreground" /> View SOAR CV
                </a>
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
            {refs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No references on file.</div>
            ) : (
              <ul className="divide-y">
                {refs.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{r.referee_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.company_name || "—"} · {r.ref_type || "—"}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-muted">
                        {r.status || "pending"}
                      </span>
                      <div className="text-muted-foreground mt-0.5">
                        {r.received_at ? `Received ${relTime(r.received_at)}` : r.requested_at ? `Requested ${relTime(r.requested_at)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {isTemp && (
            <TabsContent value="availability" className="mt-5 text-sm">
              <div className="text-muted-foreground">Availability grid coming soon.</div>
            </TabsContent>
          )}
        </Tabs>
      </Card>
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
