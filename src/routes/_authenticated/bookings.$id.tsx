import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, CheckCircle, XCircle, Clock, Smartphone,
  UserPlus, Banknote, X, Search, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  component: Page,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Booking = {
  id: string; client_id: string | null; client_name: string | null;
  branch_id: string | null; branch_name: string | null;
  qualification_required: string | null; notes: string | null; status: string;
  created_by_name: string | null;
};

type Shift = {
  id: string; shift_date: string; shift_type: string | null;
  start_time: string | null; end_time: string | null;
  qualification_required: string | null; shift_status: string | null;
  status: string | null; candidate_id: string | null;
  confirmed_name: string | null; rate_per_hour: number | null;
  charge_rate: number | null; total_hours: number | null; notes: string | null;
};

type ShortlistEntry = {
  id: string; shift_id: string; candidate_id: string;
  status: string; source: string;
};

type PoolCandidate = {
  candidate_id: string; name: string; initials: string;
  qual: string | null; phone: string | null; has_dbs: boolean | null;
  source: "app" | "manual";
  entries: { shift_id: string; status: string }[];
};

type CandidateFull = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  qualification_level: string | null; candidate_type: string | null;
  status_perm: string | null; status_temp: string | null;
  postcode: string | null; city: string | null;
  source: string | null; has_dbs: boolean | null; available_days: string[] | null;
};

type CandidateOption = {
  id: string; first_name: string | null; last_name: string | null;
  qualification_level: string | null; phone: string | null; has_dbs: boolean | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const QUAL_OPTIONS = [
  { value: "unqualified", label: "Unqualified" },
  { value: "level_2", label: "Level 2" },
  { value: "level_3", label: "Level 3" },
  { value: "room_leader", label: "Room Leader" },
  { value: "deputy_manager", label: "Deputy Manager" },
  { value: "manager", label: "Manager" },
];

const SHIFT_TYPES = [
  { value: "full_day", label: "Full Day" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "overnight", label: "Overnight" },
  { value: "lunch_cover", label: "Lunch Cover" },
  { value: "school_hours", label: "School Hours" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtQual(q: string | null) {
  return QUAL_OPTIONS.find((o) => o.value === q)?.label ?? q ?? "—";
}

function shiftTypeLabel(t: string | null) {
  return SHIFT_TYPES.find((s) => s.value === t)?.label ?? t ?? "—";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : "";
}

function calcHours(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? Math.round(diff / 60 * 10) / 10 : null;
}

function dayChip(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[220px] truncate">{value}</span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function ShiftStatusBadge({ s }: { s: Shift }) {
  const status = s.shift_status ?? s.status ?? "unfilled";
  if (status === "confirmed")
    return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700"><CheckCircle className="h-3 w-3" />Confirmed</span>;
  if (status === "cancelled")
    return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground"><XCircle className="h-3 w-3" />Cancelled</span>;
  return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />Unfilled</span>;
}

// ── Candidate Drawer ──────────────────────────────────────────────────────────

type PastShift = {
  id: string; shift_date: string; shift_type: string | null;
  start_time: string | null; end_time: string | null; total_hours: number | null;
  client_name: string | null;
};

// Drawer availability types
type DrawerWeeklyAvail = { day_of_week: number; is_available: boolean; all_day: boolean; start_time: string | null; end_time: string | null; };
type DrawerTimeOff = { id: string; title: string; category: string | null; start_date: string; end_date: string; };
const DRAWER_DAYS = [
  { label: "Mon", iso: 1 }, { label: "Tue", iso: 2 }, { label: "Wed", iso: 3 },
  { label: "Thu", iso: 4 }, { label: "Fri", iso: 5 }, { label: "Sat", iso: 6 }, { label: "Sun", iso: 7 },
];

function CandidateDrawer({ candidateId, onClose }: { candidateId: string | null; onClose: () => void }) {
  const [candidate, setCandidate] = useState<CandidateFull | null>(null);
  const [pastShifts, setPastShifts] = useState<PastShift[]>([]);
  const [weeklyAvail, setWeeklyAvail] = useState<DrawerWeeklyAvail[]>([]);
  const [submission, setSubmission] = useState<{ submitted_at: string; has_changes: boolean } | null>(null);
  const [timeOff, setTimeOff] = useState<DrawerTimeOff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) { setCandidate(null); setPastShifts([]); setWeeklyAvail([]); setSubmission(null); setTimeOff([]); return; }
    setLoading(true);
    const today = new Date();
    const dow = today.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    Promise.all([
      supabase.from("candidates")
        .select("id,first_name,last_name,email,phone,qualification_level,candidate_type,status_perm,status_temp,postcode,city,source,has_dbs,available_days")
        .eq("id", candidateId).maybeSingle(),
      supabase.from("temp_shifts")
        .select("id,shift_date,shift_type,start_time,end_time,total_hours,booking:bookings!booking_id(client:clients(company_name))")
        .eq("candidate_id", candidateId)
        .eq("shift_status", "confirmed")
        .lt("shift_date", todayStr)
        .order("shift_date", { ascending: false })
        .limit(20),
      (supabase as any).from("candidate_weekly_availability")
        .select("day_of_week,is_available,all_day,start_time,end_time")
        .eq("candidate_id", candidateId),
      (supabase as any).from("candidate_availability_submissions")
        .select("submitted_at,has_changes")
        .eq("candidate_id", candidateId)
        .eq("week_starting", weekStart)
        .maybeSingle(),
      (supabase as any).from("candidate_time_off")
        .select("id,title,category,start_date,end_date")
        .eq("candidate_id", candidateId)
        .gte("end_date", todayStr)
        .order("start_date"),
    ]).then(([candRes, shiftsRes, waRes, subRes, toRes]) => {
      setCandidate(candRes.data as CandidateFull ?? null);
      setPastShifts(((shiftsRes.data ?? []) as any[]).map((s) => ({
        id: s.id, shift_date: s.shift_date, shift_type: s.shift_type,
        start_time: s.start_time, end_time: s.end_time, total_hours: s.total_hours,
        client_name: s.booking?.client?.company_name ?? null,
      })));
      setWeeklyAvail((waRes.data ?? []) as unknown as DrawerWeeklyAvail[]);
      setSubmission(subRes.data as { submitted_at: string; has_changes: boolean } | null);
      setTimeOff((toRes.data ?? []) as unknown as DrawerTimeOff[]);
      setLoading(false);
    });
  }, [candidateId]);

  if (!candidateId) return null;
  const name = candidate ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() : "";
  const initials = candidate ? `${candidate.first_name?.[0] ?? ""}${candidate.last_name?.[0] ?? ""}`.toUpperCase() : "…";
  const isTemp = candidate?.candidate_type === "temp" || candidate?.candidate_type === "both";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] bg-card shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-navy">
          <span className="text-white font-semibold text-sm">Candidate Profile</span>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}
        {!loading && candidate && (
          <div className="flex-1 p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
              <div>
                <div className="text-lg font-bold">{name}</div>
                <div className="text-sm text-muted-foreground">{fmtQual(candidate.qualification_level)}</div>
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Contact</div>
              <Row label="Email" value={candidate.email ?? "—"} />
              <Row label="Phone" value={candidate.phone ?? "—"} />
            </div>
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Location</div>
              <Row label="City" value={candidate.city ?? "—"} />
              <Row label="Postcode" value={candidate.postcode ?? "—"} />
            </div>
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Status</div>
              <Row label="Type" value={candidate.candidate_type === "temp" ? "Temp" : candidate.candidate_type === "perm" ? "Permanent" : candidate.candidate_type ?? "—"} />
              {isTemp && <Row label="Temp status" value={candidate.status_temp ?? "—"} />}
              <Row label="DBS" value={candidate.has_dbs ? "✓ Valid DBS" : "No DBS"} />
            </div>
            {isTemp && (
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Weekly Availability</div>
                  {submission ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✓ Submitted</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Not submitted</span>
                  )}
                </div>
                {weeklyAvail.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No recurring availability set.</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {DRAWER_DAYS.map((d) => {
                      const row = weeklyAvail.find((r) => r.day_of_week === d.iso);
                      const unavail = row && !row.is_available;
                      const allDay  = row?.all_day;
                      return (
                        <div key={d.iso} className={`rounded-lg p-1.5 text-center text-[10px] font-medium ${
                          !row ? "bg-muted/40 text-muted-foreground/50"
                          : unavail ? "bg-red-100 text-red-600"
                          : allDay ? "bg-emerald-100 text-emerald-700"
                          : "bg-navy/10 text-navy"
                        }`}>
                          <div>{d.label}</div>
                          {row && !unavail && !allDay && (
                            <div className="text-[9px] mt-0.5 opacity-80 tabular-nums">
                              {row.start_time?.slice(0,5)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {isTemp && timeOff.length > 0 && (
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Upcoming Time Off</div>
                <div className="space-y-2">
                  {timeOff.map((t) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isActive = t.start_date <= today && t.end_date >= today;
                    return (
                      <div key={t.id} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${isActive ? "bg-red-100/70 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                        <span className="font-medium truncate">{t.title}</span>
                        <span className="text-[10px] whitespace-nowrap ml-2 opacity-80">
                          {new Date(t.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {t.start_date !== t.end_date && ` – ${new Date(t.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {isTemp && (
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
                  Previous shifts
                  {pastShifts.length > 0 && (
                    <span className="ml-1.5 normal-case tracking-normal font-normal text-muted-foreground/70">({pastShifts.length})</span>
                  )}
                </div>
                {pastShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No shifts completed yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pastShifts.map((s) => {
                      const hrs = s.total_hours ?? calcHours(s.start_time, s.end_time);
                      return (
                        <div key={s.id} className="flex items-start justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-medium">{fmtDate(s.shift_date)}</div>
                            <div className="text-muted-foreground truncate">
                              {s.client_name ?? "—"}
                              {s.shift_type ? ` · ${shiftTypeLabel(s.shift_type)}` : ""}
                            </div>
                          </div>
                          {hrs != null && (
                            <span className="flex-shrink-0 text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-medium">
                              {hrs}h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── App Candidate Card ────────────────────────────────────────────────────────

function AvailDot({ candidateId, availSubmitted, candTimeOff, shiftDate }: {
  candidateId: string;
  availSubmitted: Set<string>;
  candTimeOff: Map<string, { title: string; start_date: string; end_date: string }[]>;
  shiftDate?: string; // if provided, check time-off clash for that specific date
}) {
  const today = new Date().toISOString().slice(0, 10);
  const checkDate = shiftDate ?? today;
  const timeOffs = candTimeOff.get(candidateId) ?? [];
  const clash = timeOffs.find((t) => t.start_date <= checkDate && t.end_date >= checkDate);
  if (clash) {
    return (
      <span title={`Time off: ${clash.title}`} className="cursor-default">
        <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
      </span>
    );
  }
  if (availSubmitted.has(candidateId)) {
    return <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" title="Availability submitted this week" />;
  }
  return <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" title="No availability submitted this week" />;
}

function AppCandidateCard({ candidate, shifts, onCandidateClick, availSubmitted, candTimeOff, acceptedDates, onReject }: {
  candidate: PoolCandidate; shifts: Shift[]; onCandidateClick: (id: string) => void;
  availSubmitted: Set<string>; candTimeOff: Map<string, { title: string; start_date: string; end_date: string }[]>;
  acceptedDates: Set<string>; onReject: (candidateId: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const acceptedCount = acceptedDates.size;
  const totalShifts = shifts.length;

  const handleReject = async () => {
    setRejecting(true);
    await onReject(candidate.candidate_id);
    setRejecting(false);
  };

  // Only show chips for dates the candidate actually accepted
  const acceptedShifts = shifts.filter((s) => acceptedDates.has(s.shift_date));

  return (
    <div className="bg-card rounded-xl border border-border/50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{candidate.initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <button onClick={() => onCandidateClick(candidate.candidate_id)}
            className="text-sm font-semibold hover:text-teal transition-colors truncate block text-left">
            {candidate.name}
          </button>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {fmtQual(candidate.qual)}
            {candidate.has_dbs && <span className="text-green-600 font-medium">· ✓ DBS</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <AvailDot candidateId={candidate.candidate_id} availSubmitted={availSubmitted} candTimeOff={candTimeOff} />
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/10 text-teal-foreground">
              <Smartphone className="h-2.5 w-2.5" /> App
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {acceptedCount}/{totalShifts} shifts selected
          </span>
        </div>
      </div>
      {/* Day chips — only dates the candidate accepted in the app */}
      {acceptedShifts.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
          {acceptedShifts.map((s) => {
            const entry = candidate.entries.find((e) => e.shift_id === s.id);
            const confirmed = entry?.status === "confirmed";
            return (
              <span key={s.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                confirmed
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-teal/10 text-teal-foreground border-teal/20"
              }`}>
                {dayChip(s.shift_date)}
              </span>
            );
          })}
        </div>
      )}
      {/* Reject button */}
      <div className="flex justify-end pt-0.5">
        <button onClick={handleReject} disabled={rejecting}
          className="h-6 px-3 rounded-full text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
          {rejecting ? "Removing…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

// ── Manual Candidate Card ─────────────────────────────────────────────────────

function ManualCandidateCard({ candidate, shifts, onCandidateClick, availSubmitted, candTimeOff }: {
  candidate: PoolCandidate; shifts: Shift[]; onCandidateClick: (id: string) => void;
  availSubmitted: Set<string>; candTimeOff: Map<string, { title: string; start_date: string; end_date: string }[]>;
}) {
  const shortlistedFor = candidate.entries.filter((e) => e.status !== "declined").length;

  return (
    <div className="bg-card rounded-xl border border-border/50 px-4 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-white">{candidate.initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={() => onCandidateClick(candidate.candidate_id)}
          className="text-sm font-semibold hover:text-teal transition-colors truncate block text-left">
          {candidate.name}
        </button>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {fmtQual(candidate.qual)}
          {candidate.phone && <span>· {candidate.phone}</span>}
          {candidate.has_dbs && <span className="text-green-600 font-medium">· ✓ DBS</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <AvailDot candidateId={candidate.candidate_id} availSubmitted={availSubmitted} candTimeOff={candTimeOff} />
          <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">
            Manual
          </span>
        </div>
        {shortlistedFor > 0 && (
          <span className="text-[10px] text-muted-foreground">{shortlistedFor}/{shifts.length} shifts</span>
        )}
      </div>
    </div>
  );
}

// ── Inline Assign Dropdown ────────────────────────────────────────────────────

function InlineAssign({ shift, pool, onAssign, candTimeOff }: {
  shift: Shift;
  pool: PoolCandidate[];
  onAssign: (shiftId: string, candidateId: string) => void;
  candTimeOff: Map<string, { title: string; start_date: string; end_date: string }[]>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Eligible: not declined for this specific shift, not already confirmed on another
  const eligible = pool.filter((c) => {
    const entry = c.entries.find((e) => e.shift_id === shift.id);
    if (entry?.status === "declined") return false;
    return true;
  });

  const filtered = eligible.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} onClick={() => setOpen((o) => !o)}
        className="h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-muted/40 transition-colors text-muted-foreground min-w-[160px] justify-between">
        <span>Assign candidate…</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[100] w-72 bg-card border rounded-xl shadow-xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
                placeholder="Search candidates…"
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-muted/40 border-transparent outline-none focus:ring-1 focus:ring-teal/40" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0
              ? <div className="px-4 py-3 text-xs text-muted-foreground">No candidates found</div>
              : filtered.map((c) => {
                  const appliedHere = c.entries.some((e) => e.shift_id === shift.id && e.status !== "declined");
                  const appliedCount = c.entries.filter((e) => e.status !== "declined").length;
                  return (
                    <button key={c.candidate_id}
                      onMouseDown={() => { onAssign(shift.id, c.candidate_id); setOpen(false); setQ(""); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 flex items-center gap-2.5 transition-colors">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${c.source === "app" ? "bg-teal" : "bg-navy"}`}>
                        <span className="text-[9px] font-bold text-white">{c.initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtQual(c.qual)}{c.has_dbs ? " · ✓ DBS" : ""}</div>
                        {(() => {
                          const clash = (candTimeOff.get(c.candidate_id) ?? []).find(
                            (t) => t.start_date <= shift.shift_date && t.end_date >= shift.shift_date
                          );
                          return clash ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] text-red-500 font-medium">⚠ Time off: {clash.title}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {c.source === "app"
                          ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal-foreground font-medium">App</span>
                          : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy/10 text-navy font-medium">Manual</span>}
                        {appliedHere && (
                          <span className="text-[9px] text-green-600 font-medium">✓ applied</span>
                        )}
                        <span className="text-[9px] text-muted-foreground">{appliedCount}/{c.entries.length > 0 ? appliedCount : "—"} shifts</span>
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Add Shift Date Modal ──────────────────────────────────────────────────────

const DOW = [
  { key: 1, label: "Mon" }, { key: 2, label: "Tue" }, { key: 3, label: "Wed" },
  { key: 4, label: "Thu" }, { key: 5, label: "Fri" }, { key: 6, label: "Sat" },
  { key: 0, label: "Sun" },
];

function genDatesInRange(start: string, end: string, days: number[]): string[] {
  const results: string[] = [];
  if (!start || !end || days.length === 0) return results;
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    if (days.includes(cur.getDay())) {
      results.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return results;
}

function AddDateModal({ bookingId, defaultQual, open, onClose, onCreated }: {
  bookingId: string; defaultQual: string | null;
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [mode, setMode] = useState<"single" | "range">("single");
  const [form, setForm] = useState({ shift_date: "", start_time: "", end_time: "",
    shift_type: "full_day", qualification_required: defaultQual ?? "__none__",
    notes: "", rate_per_hour: "", charge_rate: "" });
  const [range, setRange] = useState({ start: "", end: "" });
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  const previewDates = useMemo(() =>
    mode === "range" ? genDatesInRange(range.start, range.end, selectedDays) : [],
    [mode, range.start, range.end, selectedDays]);

  useEffect(() => {
    if (open) {
      setMode("single");
      setForm({ shift_date: "", start_time: "", end_time: "", shift_type: "full_day",
        qualification_required: defaultQual ?? "__none__", notes: "", rate_per_hour: "", charge_rate: "" });
      setRange({ start: "", end: "" });
      setSelectedDays([1, 2, 3, 4, 5]);
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const toggleDay = (d: number) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const sharedPayload = () => ({
    booking_id: bookingId,
    start_time: form.start_time || null, end_time: form.end_time || null,
    shift_type: form.shift_type,
    qualification_required: form.qualification_required === "__none__" ? null : form.qualification_required,
    notes: form.notes || null,
    rate_per_hour: form.rate_per_hour ? parseFloat(form.rate_per_hour) : null,
    charge_rate: form.charge_rate ? parseFloat(form.charge_rate) : null,
    total_hours: calcHours(form.start_time || null, form.end_time || null),
    status: "unfilled", shift_status: "unfilled",
  });

  const saveSingle = async () => {
    if (!form.shift_date) { toast.error("Select a date"); return; }
    setSaving(true);
    const { error } = await supabase.from("temp_shifts").insert({ ...sharedPayload(), shift_date: form.shift_date });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Shift date added"); onCreated();
  };

  const saveRange = async () => {
    if (previewDates.length === 0) { toast.error("No dates match — check your range and day selection"); return; }
    setSaving(true);
    const rows = previewDates.map(d => ({ ...sharedPayload(), shift_date: d }));
    const { error } = await supabase.from("temp_shifts").insert(rows);
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`${rows.length} shift${rows.length > 1 ? "s" : ""} added`); onCreated();
  };

  const sharedFields = (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Start time</label>
        <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="h-10" /></div>
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">End time</label>
        <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="h-10" /></div>
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Shift type</label>
        <Select value={form.shift_type} onValueChange={(v) => set("shift_type", v)}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>{SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select></div>
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Qualification</label>
        <Select value={form.qualification_required} onValueChange={(v) => set("qualification_required", v)}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Any —</SelectItem>
            {QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select></div>
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Rate of pay (£/hr)</label>
        <Input type="number" step="0.01" value={form.rate_per_hour} onChange={(e) => set("rate_per_hour", e.target.value)} placeholder="e.g. 13.50" className="h-10" /></div>
      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Charge rate (£/hr)</label>
        <Input type="number" step="0.01" value={form.charge_rate} onChange={(e) => set("charge_rate", e.target.value)} placeholder="e.g. 18.00" className="h-10" /></div>
      <div className="space-y-1 col-span-2"><label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
          className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" /></div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Shift Date{mode === "range" ? "s" : ""}</DialogTitle>
          <DialogDescription>Add one date or a range of dates to this booking.</DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mt-1">
          {(["single", "range"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`h-7 px-4 rounded-md text-xs font-medium transition-colors ${mode === m ? "bg-white shadow-sm text-navy" : "text-muted-foreground hover:text-foreground"}`}>
              {m === "single" ? "Single date" : "Date range"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "single" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <Input type="date" value={form.shift_date} onChange={(e) => set("shift_date", e.target.value)} className="h-10" />
              </div>
              {sharedFields}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Start date *</label>
                  <Input type="date" value={range.start} onChange={(e) => setRange(p => ({ ...p, start: e.target.value }))} className="h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">End date *</label>
                  <Input type="date" value={range.end} onChange={(e) => setRange(p => ({ ...p, end: e.target.value }))} className="h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Days of week</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DOW.map(d => (
                    <button key={d.key} onClick={() => toggleDay(d.key)}
                      className={`h-7 w-10 rounded-md text-xs font-medium border transition-colors ${selectedDays.includes(d.key) ? "bg-teal text-white border-teal" : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {previewDates.length > 0 && (
                <p className="text-xs text-teal font-medium">
                  {previewDates.length} shift{previewDates.length > 1 ? "s" : ""} will be created
                  {previewDates.length <= 5 && `: ${previewDates.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })).join(", ")}`}
                </p>
              )}
              {sharedFields}
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={mode === "single" ? saveSingle : saveRange} disabled={saving}
              className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding…" : mode === "single" ? "Add date" : `Add ${previewDates.length > 0 ? previewDates.length + " " : ""}date${previewDates.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Candidate Modal ───────────────────────────────────────────────────────

function AddCandidateModal({ bookingId, existingIds, open, onClose, onAdded }: {
  bookingId: string; existingIds: string[];
  open: boolean; onClose: () => void; onAdded: (cand: CandidateOption) => void;
}) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [selected, setSelected] = useState<CandidateOption | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setSelected(null); setSearch(""); setDropOpen(false); return; }
    supabase.from("candidates")
      .select("id,first_name,last_name,qualification_level,phone,has_dbs")
      .in("status_temp", ["active", "compliance_review"]).order("first_name")
      .then(({ data }) => setCandidates((data as CandidateOption[]) ?? []));
  }, [open]);

  const filtered = candidates
    .filter((c) => !existingIds.includes(c.id))
    .filter((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!selected) { toast.error("Select a candidate"); return; }
    setSaving(true);
    const { error } = await supabase.from("shift_shortlist").insert({
      booking_id: bookingId, candidate_id: selected.id, source: "manual",
      status: "shortlisted",
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Candidate added to booking pool");
    onAdded(selected);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Candidate to Pool</DialogTitle>
          <DialogDescription>They'll appear in the assign dropdown for all shifts.</DialogDescription></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="relative">
            {selected && !dropOpen
              ? <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => { setDropOpen(true); setSearch(""); }}>
                  <span className="font-medium">{selected.first_name} {selected.last_name}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              : <Input value={search} onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)} placeholder="Search temp candidates…" className="h-10" autoComplete="off" />}
            {dropOpen && (
              <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filtered.length === 0
                  ? <div className="px-4 py-3 text-sm text-muted-foreground">No candidates found</div>
                  : filtered.map((c) => (
                    <button key={c.id} onMouseDown={() => { setSelected(c); setSearch(""); setDropOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-white">{(c.first_name?.[0] ?? "").toUpperCase()}{(c.last_name?.[0] ?? "").toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{c.first_name} {c.last_name}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtQual(c.qualification_level)}{c.has_dbs ? " · ✓ DBS" : ""}</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving || !selected}
              className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding…" : "Add to pool"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [candMeta, setCandMeta] = useState<Record<string, { name: string; initials: string; qual: string | null; phone: string | null; has_dbs: boolean | null }>>({});
  const [loading, setLoading] = useState(true);
  const [showAddDate, setShowAddDate] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  // Availability: submittedThisWeek set + time-off map (candidate_id -> array of time-off periods)
  const [availSubmitted, setAvailSubmitted] = useState<Set<string>>(new Set());
  const [candTimeOff, setCandTimeOff] = useState<Map<string, { title: string; start_date: string; end_date: string }[]>>(new Map());
  // app candidate accepted shift dates: candidateId -> Set<shift_date>
  const [appAcceptedDates, setAppAcceptedDates] = useState<Map<string, Set<string>>>(new Map());

  const loadAll = async () => {
    const [bRes, sRes, slRes, soRes] = await Promise.all([
      supabase.from("bookings").select(`id,client_id,branch_id,qualification_required,notes,status,clients(company_name),client_branches(branch_name),profiles!created_by(first_name,last_name)`).eq("id", id).maybeSingle(),
      supabase.from("temp_shifts").select(`id,shift_date,shift_type,start_time,end_time,qualification_required,status,shift_status,candidate_id,rate_per_hour,charge_rate,total_hours,notes,candidates(first_name,last_name,phone)`).eq("booking_id", id).order("shift_date"),
      supabase.from("shift_shortlist").select(`id,shift_id,candidate_id,status,source,booking_id,candidates(first_name,last_name,phone,qualification_level,has_dbs)`).eq("booking_id", id),
      supabase.from("shift_offers").select("candidate_id,shift_date,status").eq("booking_group_id", id).eq("status", "accepted"),
    ]);

    if (bRes.error) { toast.error("Failed to load booking"); setLoading(false); return; }
    const b = bRes.data as any;
    setBooking({
      id: b.id, client_id: b.client_id, client_name: b.clients?.company_name ?? null,
      branch_id: b.branch_id, branch_name: b.client_branches?.branch_name ?? null,
      qualification_required: b.qualification_required, notes: b.notes,
      status: b.status ?? "active",
      created_by_name: b.profiles ? `${b.profiles.first_name ?? ""} ${b.profiles.last_name ?? ""}`.trim() : null,
    });
    setEditNotes(b.notes ?? "");

    setShifts(((sRes.data ?? []) as any[]).map((s) => ({
      id: s.id, shift_date: s.shift_date, shift_type: s.shift_type,
      start_time: s.start_time, end_time: s.end_time,
      qualification_required: s.qualification_required, status: s.status,
      shift_status: s.shift_status, candidate_id: s.candidate_id,
      confirmed_name: s.candidates ? `${s.candidates.first_name ?? ""} ${s.candidates.last_name ?? ""}`.trim() : null,
      rate_per_hour: s.rate_per_hour, charge_rate: s.charge_rate,
      total_hours: s.total_hours, notes: s.notes,
    })));

    // Build candidate metadata from shortlist
    const meta: typeof candMeta = {};
    ((slRes.data ?? []) as any[]).forEach((e) => {
      if (!meta[e.candidate_id] && e.candidates) {
        const fn = e.candidates.first_name ?? "";
        const ln = e.candidates.last_name ?? "";
        meta[e.candidate_id] = {
          name: `${fn} ${ln}`.trim(),
          initials: `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase(),
          qual: e.candidates.qualification_level ?? null,
          phone: e.candidates.phone ?? null,
          has_dbs: e.candidates.has_dbs ?? null,
        };
      }
    });
    setCandMeta(meta);

    setShortlist(((slRes.data ?? []) as any[]).map((e) => ({
      id: e.id, shift_id: e.shift_id ?? "", candidate_id: e.candidate_id,
      status: e.status, source: (e as any).source ?? "manual",
    })));

    // Build map of accepted shift dates per app candidate
    const acceptedMap = new Map<string, Set<string>>();
    ((soRes.data ?? []) as any[]).forEach((o) => {
      if (!acceptedMap.has(o.candidate_id)) acceptedMap.set(o.candidate_id, new Set());
      acceptedMap.get(o.candidate_id)!.add(o.shift_date);
    });
    setAppAcceptedDates(acceptedMap);

    setLoading(false);
  };

  const rejectAppCandidate = async (candidateId: string) => {
    await (supabase as any).from("shift_shortlist")
      .update({ status: "declined" })
      .eq("booking_id", id)
      .eq("candidate_id", candidateId)
      .eq("source", "app");
    loadAll();
  };

  // Fetch availability data for pool candidates whenever pool changes
  const poolIdsRef = { current: "" as string };
  useEffect(() => {
    const poolCandidateIds = (() => {
      // Re-derive from shortlist+candMeta since pool isn't ready yet
      const ids = Array.from(new Set(shortlist.map((e) => e.candidate_id)));
      return ids;
    })();
    if (poolCandidateIds.length === 0) return;
    const key = poolCandidateIds.sort().join(",");
    if (key === poolIdsRef.current) return;
    poolIdsRef.current = key;

    const today = new Date();
    const dow = today.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().slice(0, 10);

    Promise.all([
      (supabase as any).from("candidate_availability_submissions")
        .select("candidate_id")
        .in("candidate_id", poolCandidateIds)
        .eq("week_starting", weekStart),
      (supabase as any).from("candidate_time_off")
        .select("candidate_id,title,start_date,end_date")
        .in("candidate_id", poolCandidateIds),
    ]).then(([subRes, toRes]) => {
      setAvailSubmitted(new Set((subRes.data ?? []).map((r: any) => r.candidate_id)));
      const m = new Map<string, { title: string; start_date: string; end_date: string }[]>();
      (toRes.data ?? []).forEach((r: any) => {
        const arr = m.get(r.candidate_id) ?? [];
        arr.push({ title: r.title, start_date: r.start_date, end_date: r.end_date });
        m.set(r.candidate_id, arr);
      });
      setCandTimeOff(m);
    });
  }, [shortlist]);

  useEffect(() => { loadAll(); }, [id]);

  // Build pool: group shortlist entries by candidate + source
  const pool = useMemo((): PoolCandidate[] => {
    const map = new Map<string, PoolCandidate>();
    shortlist.forEach((e) => {
      const meta = candMeta[e.candidate_id];
      if (!meta) return;
      if (!map.has(e.candidate_id)) {
        map.set(e.candidate_id, {
          candidate_id: e.candidate_id, ...meta,
          source: e.source as "app" | "manual", entries: [],
        });
      }
      const p = map.get(e.candidate_id)!;
      // If any entry is app, mark as app
      if (e.source === "app") p.source = "app";
      if (e.shift_id) p.entries.push({ shift_id: e.shift_id, status: e.status });
    });
    return Array.from(map.values());
  }, [shortlist, candMeta]);

  const appPool = pool.filter((c) => c.source === "app");
  const manualPool = pool.filter((c) => c.source !== "app");
  const existingCandidateIds = pool.map((c) => c.candidate_id);

  // Confirm: find/create shortlist entry then update
  const assignCandidate = async (shiftId: string, candidateId: string) => {
    // Upsert shortlist entry as confirmed
    const { error: e1 } = await supabase.from("shift_shortlist").upsert(
      { booking_id: id, shift_id: shiftId, candidate_id: candidateId, status: "confirmed", source: pool.find((c) => c.candidate_id === candidateId)?.source ?? "manual" },
      { onConflict: "shift_id,candidate_id" }
    );
    if (e1) { toast.error("Failed: " + e1.message); return; }
    // Decline all others for this shift
    await supabase.from("shift_shortlist").update({ status: "declined" })
      .eq("shift_id", shiftId).neq("candidate_id", candidateId);
    // Update shift record
    await supabase.from("temp_shifts").update({ candidate_id: candidateId, status: "confirmed", shift_status: "confirmed" }).eq("id", shiftId);
    toast.success("Candidate confirmed");
    loadAll();
  };

  const unassignCandidate = async (shiftId: string, candidateId: string) => {
    await supabase.from("temp_shifts").update({ shift_status: "unfilled", status: "unfilled", candidate_id: null }).eq("id", shiftId);
    await supabase.from("shift_shortlist").update({ status: "shortlisted" }).eq("shift_id", shiftId).eq("candidate_id", candidateId);
    toast.success("Assignment removed — shift is back to unfilled");
    loadAll();
  };

  const cancelShift = async (shiftId: string) => {
    await supabase.from("temp_shifts").update({ status: "cancelled", shift_status: "cancelled" }).eq("id", shiftId);
    toast.success("Shift date cancelled");
    loadAll();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await supabase.from("bookings").update({ notes: editNotes || null }).eq("id", id);
    setSavingNotes(false);
    setBooking((prev) => prev ? { ...prev, notes: editNotes } : prev);
    toast.success("Notes saved");
  };

  const cancelBooking = async () => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    setBooking((prev) => prev ? { ...prev, status: "cancelled" } : prev);
    toast.success("Booking cancelled");
  };

  // Financials
  const financials = useMemo(() => {
    const confirmed = shifts.filter((s) => (s.shift_status ?? s.status) === "confirmed");
    let totalPay = 0, totalCharge = 0;
    confirmed.forEach((s) => {
      const hrs = s.total_hours ?? calcHours(s.start_time, s.end_time) ?? 0;
      totalPay += (s.rate_per_hour ?? 0) * hrs;
      totalCharge += (s.charge_rate ?? 0) * hrs;
    });
    const gp = totalCharge - totalPay;
    const margin = totalCharge > 0 ? Math.round((gp / totalCharge) * 100) : 0;
    return { confirmed: confirmed.length, totalPay, totalCharge, gp, margin };
  }, [shifts]);

  if (loading) return <div className="max-w-[1200px] mx-auto pt-16 text-center text-muted-foreground">Loading…</div>;
  if (!booking) return <div className="max-w-[1200px] mx-auto pt-16 text-center text-muted-foreground">Booking not found.</div>;

  const isActive = booking.status === "active";

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pt-2">

      {/* Back + header */}
      <div>
        <button onClick={() => navigate({ to: "/bookings" })}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Booking Board
        </button>
        <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{booking.client_name ?? "Unknown client"}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                {booking.branch_name && <span>{booking.branch_name}</span>}
                {booking.qualification_required && <><span>·</span><span>{fmtQual(booking.qualification_required)}</span></>}
                {booking.created_by_name && <><span>·</span><span>Created by {booking.created_by_name}</span></>}
              </div>
            </div>
            <span className={`inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {isActive ? "Active" : "Cancelled"}
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <div className="flex gap-2">
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Booking notes…"
                className="flex-1 text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
              <button onClick={saveNotes} disabled={savingNotes}
                className="h-8 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 self-end">
                {savingNotes ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Candidate Pool ── */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-sm">
            Candidate Pool
            <span className="text-muted-foreground font-normal ml-1">({pool.length})</span>
          </h2>
          {isActive && (
            <button onClick={() => setShowAddCandidate(true)}
              className="h-8 px-3.5 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <UserPlus className="h-3 w-3" /> Add candidate
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* App applicants */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                App applicants ({appPool.length})
              </span>
            </div>
            {appPool.length === 0 ? (
              <div className="text-xs text-muted-foreground border border-dashed rounded-xl px-4 py-4 text-center">
                Candidates who apply via the app will appear here automatically.
              </div>
            ) : (
              appPool.map((c) => (
                <AppCandidateCard key={c.candidate_id} candidate={c} shifts={shifts} onCandidateClick={setDrawerCandidateId} availSubmitted={availSubmitted} candTimeOff={candTimeOff} acceptedDates={appAcceptedDates.get(c.candidate_id) ?? new Set()} onReject={rejectAppCandidate} />
              ))
            )}
          </div>

          {/* Manually added */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Manually added ({manualPool.length})
              </span>
            </div>
            {manualPool.length === 0 ? (
              <div className="text-xs text-muted-foreground border border-dashed rounded-xl px-4 py-4 text-center">
                No candidates added yet.
              </div>
            ) : (
              manualPool.map((c) => (
                <ManualCandidateCard key={c.candidate_id} candidate={c} shifts={shifts} onCandidateClick={setDrawerCandidateId} availSubmitted={availSubmitted} candTimeOff={candTimeOff} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Shifts Table ── */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-sm">Shifts <span className="text-muted-foreground font-normal">({shifts.length})</span></h2>
          {isActive && (
            <button onClick={() => setShowAddDate(true)}
              className="h-8 px-3.5 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Add Date
            </button>
          )}
        </div>

        {shifts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No shifts added yet.{" "}
            {isActive && <button onClick={() => setShowAddDate(true)} className="text-teal underline">Add a date</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b">
                  <th className="text-left font-semibold py-3 px-4">Date</th>
                  <th className="text-left font-semibold py-3 px-3">Time</th>
                  <th className="text-left font-semibold py-3 px-3">Type</th>
                  <th className="text-left font-semibold py-3 px-3">Assign candidate</th>
                  <th className="text-left font-semibold py-3 px-3">Rate / Charge</th>
                  <th className="text-left font-semibold py-3 px-3">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => {
                  const hours = s.total_hours ?? calcHours(s.start_time, s.end_time);
                  const isConfirmed = (s.shift_status ?? s.status) === "confirmed";
                  const isCancelled = (s.shift_status ?? s.status) === "cancelled";
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium whitespace-nowrap">{fmtDate(s.shift_date)}</td>
                      <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">
                        {s.start_time && s.end_time
                          ? `${fmtTime(s.start_time)}–${fmtTime(s.end_time)}${hours ? ` (${hours}h)` : ""}`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{shiftTypeLabel(s.shift_type)}</td>
                      <td className="py-3 px-3">
                        {isCancelled ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : isConfirmed ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setDrawerCandidateId(s.candidate_id)}
                              className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors">
                              {s.confirmed_name}
                            </button>
                            <button onClick={() => unassignCandidate(s.id, s.candidate_id!)}
                              className="h-5 px-2 rounded-full border border-muted text-[10px] text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors">
                              Unassign
                            </button>
                          </div>
                        ) : (
                          <InlineAssign shift={s} pool={pool} onAssign={assignCandidate} candTimeOff={candTimeOff} />
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {s.rate_per_hour ? `£${s.rate_per_hour}/hr` : "—"}
                        {s.charge_rate ? <span className="opacity-60"> / £{s.charge_rate}</span> : ""}
                      </td>
                      <td className="py-3 px-3"><ShiftStatusBadge s={s} /></td>
                      <td className="py-3 px-4 text-right">
                        {!isCancelled && (
                          <button onClick={() => cancelShift(s.id)}
                            className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors">
                            Cancel date
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financials */}
      <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] px-6 py-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" /> Financials
          <span className="text-muted-foreground font-normal">({financials.confirmed} confirmed shift{financials.confirmed !== 1 ? "s" : ""})</span>
        </h2>
        {financials.confirmed === 0 ? (
          <p className="text-sm text-muted-foreground">Financials will appear once candidates are confirmed.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total pay", value: `£${financials.totalPay.toFixed(2)}`, sub: "candidate cost" },
              { label: "Total charge", value: `£${financials.totalCharge.toFixed(2)}`, sub: "client invoice" },
              { label: "Gross profit", value: `£${financials.gp.toFixed(2)}`, sub: "charge − pay" },
              { label: "Margin", value: `${financials.margin}%`, sub: "GP / charge" },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted/30 rounded-xl px-4 py-3">
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-xl font-bold mt-0.5">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground/70">{stat.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {isActive && (
        <div className="flex justify-between pb-6">
          <button onClick={cancelBooking}
            className="h-10 px-5 rounded-full border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5">
            Cancel entire booking
          </button>
        </div>
      )}

      {/* Modals */}
      <AddDateModal bookingId={id} defaultQual={booking.qualification_required}
        open={showAddDate} onClose={() => setShowAddDate(false)}
        onCreated={() => { setShowAddDate(false); loadAll(); }} />

      <AddCandidateModal bookingId={id} existingIds={existingCandidateIds}
        open={showAddCandidate} onClose={() => setShowAddCandidate(false)}
        onAdded={() => { setShowAddCandidate(false); loadAll(); }} />

      <CandidateDrawer candidateId={drawerCandidateId} onClose={() => setDrawerCandidateId(null)} />
    </div>
  );
}
