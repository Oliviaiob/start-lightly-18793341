import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Clock, Smartphone, UserPlus, Banknote, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  component: Page,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  qualification_required: string | null;
  notes: string | null;
  status: string;
  created_by_name: string | null;
};

type Shift = {
  id: string;
  shift_date: string;
  shift_type: string | null;
  start_time: string | null;
  end_time: string | null;
  qualification_required: string | null;
  status: string | null;
  shift_status: string | null;
  candidate_id: string | null;
  confirmed_name: string | null;
  confirmed_phone: string | null;
  rate_per_hour: number | null;
  charge_rate: number | null;
  total_hours: number | null;
  notes: string | null;
};

type ShortlistEntry = {
  id: string;
  shift_id: string;
  candidate_id: string;
  status: string;
  source: string; // 'manual' | 'app'
  name: string;
  phone: string | null;
  qual: string | null;
  has_dbs: boolean | null;
};

type CandidateOption = { id: string; first_name: string | null; last_name: string | null; qualification_level: string | null; phone: string | null; has_dbs: boolean | null };

type CandidateFull = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null;
  qualification_level: string | null; candidate_type: string | null;
  status_perm: string | null; status_temp: string | null;
  postcode: string | null; city: string | null;
  source: string | null; has_dbs: boolean | null;
  available_days: string[] | null;
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

function qualLabel(q: string | null) {
  return QUAL_OPTIONS.find((o) => o.value === q)?.label ?? q ?? "—";
}

function shiftTypeLabel(t: string | null) {
  return SHIFT_TYPES.find((s) => s.value === t)?.label ?? t ?? "—";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function calcHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? Math.round(diff / 60 * 10) / 10 : null;
}

function shiftStatusBadge(s: Shift) {
  const status = s.shift_status ?? s.status ?? "unfilled";
  if (status === "confirmed") return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-green-100 text-green-700"><CheckCircle className="h-3 w-3" />Confirmed</span>;
  if (status === "cancelled") return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground"><XCircle className="h-3 w-3" />Cancelled</span>;
  return <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />Unfilled</span>;
}


// ── Row helper ────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[220px] truncate">{value}</span>
    </div>
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
      .eq("id", candidateId).maybeSingle()
      .then(({ data }) => { setCandidate(data as CandidateFull ?? null); setLoading(false); });
  }, [candidateId]);

  if (!candidateId) return null;

  const name = candidate ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() : "";
  const initials = candidate
    ? `${candidate.first_name?.[0] ?? ""}${candidate.last_name?.[0] ?? ""}`.toUpperCase()
    : "…";

  const typeLabel = (t: string | null) => {
    if (t === "perm") return "Permanent";
    if (t === "temp") return "Temp";
    if (t === "both") return "Perm & Temp";
    return t ?? "—";
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] bg-card shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-navy">
          <span className="text-white font-semibold text-sm">Candidate Profile</span>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
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
                <div className="text-sm text-muted-foreground">{qualLabel(candidate.qualification_level)}</div>
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
              <Row label="Type" value={typeLabel(candidate.candidate_type)} />
              {(candidate.candidate_type === "temp" || candidate.candidate_type === "both") && (
                <Row label="Temp status" value={candidate.status_temp ?? "—"} />
              )}
              <Row label="DBS" value={candidate.has_dbs ? "✓ Valid DBS" : "No DBS"} />
            </div>
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

// ── Add Shift Date Modal ──────────────────────────────────────────────────────

function AddDateModal({ bookingId, defaultQual, open, onClose, onCreated }: {
  bookingId: string; defaultQual: string | null;
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    shift_date: "", start_time: "", end_time: "",
    shift_type: "full_day", qualification_required: defaultQual ?? "__none__", notes: "",
    rate_per_hour: "", charge_rate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ shift_date: "", start_time: "", end_time: "", shift_type: "full_day", qualification_required: defaultQual ?? "__none__", notes: "", rate_per_hour: "", charge_rate: "" });
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.shift_date) { toast.error("Select a date"); return; }
    setSaving(true);
    const hours = calcHours(form.start_time || null, form.end_time || null);
    const rate = form.rate_per_hour ? parseFloat(form.rate_per_hour) : null;
    const charge = form.charge_rate ? parseFloat(form.charge_rate) : null;
    const { error } = await supabase.from("temp_shifts").insert({
      booking_id: bookingId,
      shift_date: form.shift_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      shift_type: form.shift_type,
      qualification_required: form.qualification_required === "__none__" ? null : form.qualification_required,
      notes: form.notes || null,
      rate_per_hour: rate,
      charge_rate: charge,
      total_hours: hours,
      status: "unfilled",
      shift_status: "unfilled",
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Shift date added");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Shift Date</DialogTitle>
          <DialogDescription>Add a date to this booking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={form.shift_date} onChange={(e) => set("shift_date", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start time</label>
              <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">End time</label>
              <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Shift type</label>
              <Select value={form.shift_type} onValueChange={(v) => set("shift_type", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Qualification</label>
              <Select value={form.qualification_required} onValueChange={(v) => set("qualification_required", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Any —</SelectItem>
                  {QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rate of pay (£/hr)</label>
              <Input type="number" step="0.01" value={form.rate_per_hour} onChange={(e) => set("rate_per_hour", e.target.value)} placeholder="e.g. 13.50" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Charge rate (£/hr)</label>
              <Input type="number" step="0.01" value={form.charge_rate} onChange={(e) => set("charge_rate", e.target.value)} placeholder="e.g. 18.00" className="h-10" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving}
              className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding…" : "Add date"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Candidate Modal ───────────────────────────────────────────────────────

function AddCandidateModal({ shiftId, bookingId, open, onClose, onAdded }: {
  shiftId: string; bookingId: string;
  open: boolean; onClose: () => void; onAdded: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [selected, setSelected] = useState<CandidateOption | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setSelected(null); setSearch(""); setDropOpen(false); return; }
    supabase.from("candidates").select("id,first_name,last_name,qualification_level,phone,has_dbs")
      .in("status_temp", ["active", "compliance_review"]).order("first_name")
      .then(({ data }) => setCandidates((data as CandidateOption[]) ?? []));
  }, [open]);

  const filtered = candidates.filter((c) =>
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!selected) { toast.error("Select a candidate"); return; }
    setSaving(true);
    const { error } = await supabase.from("shift_shortlist").upsert({
      shift_id: shiftId,
      booking_id: bookingId,
      candidate_id: selected.id,
      status: "shortlisted",
    }, { onConflict: "shift_id,candidate_id", ignoreDuplicates: false });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Candidate added to shortlist");
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Candidate Manually</DialogTitle>
          <DialogDescription>Search for a temp candidate to add to this shift's shortlist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="relative">
            {selected && !dropOpen ? (
              <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                onClick={() => { setDropOpen(true); setSearch(""); }}>
                <span className="font-medium">{selected.first_name} {selected.last_name}</span>
                <span className="text-xs text-muted-foreground">change</span>
              </div>
            ) : (
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)} placeholder="Search temp candidates…" className="h-10" autoComplete="off" />
            )}
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
                        <div className="text-[11px] text-muted-foreground">{qualLabel(c.qualification_level)} {c.has_dbs ? "· ✓ DBS" : ""}</div>
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
              {saving ? "Adding…" : "Add to shortlist"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Shift Row (expandable) ────────────────────────────────────────────────────

function ShiftRow({ shift, shortlist, onConfirm, onDecline, onAddCandidate, onCancelShift, onCandidateClick, onUnassign }: {
  shift: Shift;
  shortlist: ShortlistEntry[];
  onConfirm: (shiftId: string, shortlistId: string, candidateId: string) => void;
  onDecline: (shortlistId: string) => void;
  onAddCandidate: (shiftId: string) => void;
  onCancelShift: (shiftId: string) => void;
  onCandidateClick: (candidateId: string) => void;
  onUnassign: (shiftId: string, shortlistId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hours = shift.total_hours ?? calcHours(shift.start_time, shift.end_time);
  const pending = shortlist.filter((e) => e.status === "shortlisted");
  const isConfirmed = (shift.shift_status ?? shift.status) === "confirmed";

  return (
    <>
      <tr className={`border-b transition-colors ${expanded ? "bg-muted/10" : "hover:bg-muted/20"}`}>
        {/* Date */}
        <td className="py-3 px-4 text-sm font-medium whitespace-nowrap">{fmtDate(shift.shift_date)}</td>
        {/* Time */}
        <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">
          {shift.start_time && shift.end_time
            ? `${fmtTime(shift.start_time)}–${fmtTime(shift.end_time)}${hours ? ` (${hours}h)` : ""}`
            : "—"}
        </td>
        {/* Type */}
        <td className="py-3 px-3 text-xs text-muted-foreground">{shiftTypeLabel(shift.shift_type)}</td>
        {/* Applicants */}
        <td className="py-3 px-3">
          {pending.length > 0 ? (
            <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">
              {pending.length} pending
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        {/* Assigned candidate */}
        <td className="py-3 px-3 text-sm">
          {isConfirmed && shift.confirmed_name
            ? <span className="font-medium text-green-700">{shift.confirmed_name}</span>
            : <span className="text-muted-foreground text-xs">Unassigned</span>}
        </td>
        {/* Rate / Charge */}
        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
          {shift.rate_per_hour ? `£${shift.rate_per_hour}/hr` : "—"}
          {shift.charge_rate ? <span className="text-muted-foreground/60"> / £{shift.charge_rate}</span> : ""}
        </td>
        {/* Status */}
        <td className="py-3 px-3">{shiftStatusBadge(shift)}</td>
        {/* Actions */}
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => onCancelShift(shift.id)}
              className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors">
              Cancel date
            </button>
            <button onClick={() => setExpanded((e) => !e)}
              className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>
      {/* Expanded panel */}
      {expanded && (
        <tr className="bg-muted/5">
          <td colSpan={8} className="px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Shortlisted candidates ({shortlist.length})
                </span>
                <button onClick={() => onAddCandidate(shift.id)}
                  className="h-7 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Add manually
                </button>
              </div>

              {shortlist.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-xl">
                  No candidates yet. Add manually or wait for app responses.
                </div>
              ) : (
                <div className="space-y-2">
                  {shortlist.map((e) => (
                    <div key={e.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-white">
                            {e.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <button onClick={() => onCandidateClick(e.candidate_id)} className="text-sm font-medium hover:text-teal transition-colors text-left">{e.name}</button>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {qualLabel(e.qual)}
                            {e.phone && <span>· {e.phone}</span>}
                            {e.has_dbs && <span className="text-green-600 font-medium">· ✓ DBS</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Source badge */}
                        {e.source === "app" ? (
                          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/10 text-teal-foreground">
                            <Smartphone className="h-2.5 w-2.5" /> App
                          </span>
                        ) : (
                          <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">
                            Manual
                          </span>
                        )}

                        {e.status === "confirmed" && (
                          <>
                            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" /> Confirmed
                            </span>
                            <button onClick={() => onUnassign(shift.id, e.id)}
                              className="h-6 px-2 rounded-full border border-destructive/40 text-destructive text-[10px] font-medium hover:bg-destructive/5 transition-colors">
                              Unassign
                            </button>
                          </>
                        )}
                        {e.status === "declined" && (
                          <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                            <XCircle className="h-3 w-3" /> Declined
                          </span>
                        )}
                        {e.status === "shortlisted" && (
                          <>
                            <button onClick={() => onConfirm(shift.id, e.id, e.candidate_id)}
                              className="h-7 px-3 rounded-full bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                              Confirm
                            </button>
                            <button onClick={() => onDecline(e.id)}
                              className="h-7 px-3 rounded-full border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors">
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* App placeholder if no app entries */}
              {shortlist.filter((e) => e.source === "app").length === 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border border-dashed rounded-xl px-4 py-2.5">
                  <Smartphone className="h-3.5 w-3.5 flex-shrink-0" />
                  Candidates who apply via the app will appear here automatically.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDate, setShowAddDate] = useState(false);
  const [addCandidateShiftId, setAddCandidateShiftId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);

  const loadAll = async () => {
    const [bRes, sRes, slRes] = await Promise.all([
      supabase.from("bookings").select(`id,client_id,branch_id,qualification_required,notes,status,clients(company_name),client_branches(branch_name),profiles!created_by(first_name,last_name)`).eq("id", id).maybeSingle(),
      supabase.from("temp_shifts").select(`id,shift_date,shift_type,start_time,end_time,qualification_required,status,shift_status,candidate_id,rate_per_hour,charge_rate,total_hours,notes,candidates(first_name,last_name,phone)`).eq("booking_id", id).order("shift_date"),
      supabase.from("shift_shortlist").select(`id,shift_id,candidate_id,status,source,booking_id,candidates(first_name,last_name,phone,qualification_level,has_dbs)`).eq("booking_id", id),
    ]);

    if (bRes.error) { toast.error("Failed to load booking"); setLoading(false); return; }

    const b = bRes.data as any;
    setBooking({
      id: b.id, client_id: b.client_id,
      client_name: b.clients?.company_name ?? null,
      branch_id: b.branch_id,
      branch_name: b.client_branches?.branch_name ?? null,
      qualification_required: b.qualification_required,
      notes: b.notes, status: b.status ?? "active",
      created_by_name: b.profiles ? `${b.profiles.first_name ?? ""} ${b.profiles.last_name ?? ""}`.trim() : null,
    });
    setEditNotes(b.notes ?? "");

    setShifts(((sRes.data ?? []) as any[]).map((s) => ({
      id: s.id, shift_date: s.shift_date, shift_type: s.shift_type,
      start_time: s.start_time, end_time: s.end_time,
      qualification_required: s.qualification_required,
      status: s.status, shift_status: s.shift_status, candidate_id: s.candidate_id,
      confirmed_name: s.candidates ? `${s.candidates.first_name ?? ""} ${s.candidates.last_name ?? ""}`.trim() : null,
      confirmed_phone: s.candidates?.phone ?? null,
      rate_per_hour: s.rate_per_hour, charge_rate: s.charge_rate,
      total_hours: s.total_hours, notes: s.notes,
    })));

    setShortlist(((slRes.data ?? []) as any[]).map((e) => ({
      id: e.id, shift_id: e.shift_id, candidate_id: e.candidate_id, status: e.status,
      source: (e as any).source ?? "manual",
      name: e.candidates ? `${e.candidates.first_name ?? ""} ${e.candidates.last_name ?? ""}`.trim() : "Unknown",
      phone: e.candidates?.phone ?? null,
      qual: e.candidates?.qualification_level ?? null,
      has_dbs: e.candidates?.has_dbs ?? null,
    })));

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const confirmCandidate = async (shiftId: string, shortlistId: string, candidateId: string) => {
    const { error: e1 } = await supabase.from("shift_shortlist").update({ status: "confirmed" }).eq("id", shortlistId);
    if (e1) { toast.error("Failed to confirm"); return; }
    // Decline all others for this shift
    await supabase.from("shift_shortlist").update({ status: "declined" }).eq("shift_id", shiftId).neq("id", shortlistId);
    // Update the shift record
    await supabase.from("temp_shifts").update({ candidate_id: candidateId, status: "confirmed", shift_status: "confirmed" }).eq("id", shiftId);
    toast.success("Candidate confirmed for shift");
    loadAll();
  };

  const declineCandidate = async (shortlistId: string) => {
    await supabase.from("shift_shortlist").update({ status: "declined" }).eq("id", shortlistId);
    toast.success("Candidate declined");
    loadAll();
  };

  const cancelShift = async (shiftId: string) => {
    await supabase.from("temp_shifts").update({ status: "cancelled", shift_status: "cancelled" }).eq("id", shiftId);
    toast.success("Shift date cancelled");
    loadAll();
  };

  // Reset confirmed → unfilled (also triggered when candidate cancels via app)
  const unassignCandidate = async (shiftId: string, shortlistId: string) => {
    // Reset shift to unfilled
    await supabase.from("temp_shifts")
      .update({ shift_status: "unfilled", status: "unfilled", candidate_id: null })
      .eq("id", shiftId);
    // Return candidate to shortlisted so they can be re-confirmed
    await supabase.from("shift_shortlist")
      .update({ status: "shortlisted" })
      .eq("id", shortlistId);
    toast.success("Assignment removed — shift is back to unfilled");
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
                {booking.qualification_required && <><span>·</span><span>{qualLabel(booking.qualification_required)}</span></>}
                {booking.created_by_name && <><span>·</span><span>Created by {booking.created_by_name}</span></>}
              </div>
            </div>
            <span className={`inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {isActive ? "Active" : "Cancelled"}
            </span>
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <div className="flex gap-2">
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                placeholder="Booking notes…"
                className="flex-1 text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
              <button onClick={saveNotes} disabled={savingNotes}
                className="h-8 px-3 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 self-end">
                {savingNotes ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shifts table */}
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
                  <th className="text-left font-semibold py-3 px-3">Applicants</th>
                  <th className="text-left font-semibold py-3 px-3">Assigned</th>
                  <th className="text-left font-semibold py-3 px-3">Rate / Charge</th>
                  <th className="text-left font-semibold py-3 px-3">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <ShiftRow
                    key={s.id}
                    shift={s}
                    shortlist={shortlist.filter((e) => e.shift_id === s.id)}
                    onConfirm={confirmCandidate}
                    onDecline={declineCandidate}
                    onAddCandidate={(shiftId) => setAddCandidateShiftId(shiftId)}
                    onCancelShift={cancelShift}
                    onCandidateClick={(cId) => setDrawerCandidateId(cId)}
                    onUnassign={unassignCandidate}
                  />
                ))}
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

      {/* Footer actions */}
      {isActive && (
        <div className="flex justify-between">
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

      {addCandidateShiftId && (
        <AddCandidateModal
          shiftId={addCandidateShiftId} bookingId={id}
          open={!!addCandidateShiftId}
          onClose={() => setAddCandidateShiftId(null)}
          onAdded={() => { setAddCandidateShiftId(null); loadAll(); }} />
      )}

      <CandidateDrawer candidateId={drawerCandidateId} onClose={() => setDrawerCandidateId(null)} />
    </div>
  );
}
