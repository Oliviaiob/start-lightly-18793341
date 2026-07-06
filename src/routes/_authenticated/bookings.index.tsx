import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fmtQual } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarRange, Plus, Search, ChevronRight, CheckCircle,
  LayoutList, Calendar, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const QUAL_OPTIONS = [
  { value: "level_2", label: "Level 2" },
  { value: "level_3", label: "Level 3" },
  { value: "room_leader", label: "Room Leader" },
  { value: "deputy_manager", label: "Deputy Manager" },
  { value: "manager", label: "Manager" },
  { value: "unqualified", label: "Unqualified" },
];

export const Route = createFileRoute("/_authenticated/bookings/")({
  component: Page,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type ShiftEvent = {
  id: string; shift_date: string; shift_status: string;
  booking_id: string; client_name: string | null;
};

type Booking = {
  id: string; client_id: string | null; client_name: string | null;
  branch_id: string | null; branch_name: string | null;
  qualification_required: string | null; notes: string | null; status: string;
  created_at: string; shift_count: number; confirmed_count: number;
  date_from: string | null; date_to: string | null;
  shifts: ShiftEvent[];
};

type ClientOption = { id: string; name: string };
type BranchOption = { id: string; branch_name: string };

const ALL = "__all__";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function bookingStyle(confirmed: number, total: number, bookingStatus: string) {
  if (bookingStatus === "cancelled") return { dot: "bg-muted-foreground", border: "border-l-muted-foreground/30", label: "Cancelled" };
  if (total === 0) return { dot: "bg-muted-foreground/40", border: "border-l-muted-foreground/20", label: "No shifts" };
  if (confirmed === total) return { dot: "bg-green-500", border: "border-l-green-400", label: "Fully confirmed" };
  if (confirmed > 0) return { dot: "bg-amber-400", border: "border-l-amber-400", label: `${confirmed}/${total} confirmed` };
  return { dot: "bg-muted-foreground/40", border: "border-l-muted-foreground/20", label: "Unfilled" };
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({ bookings, onNavigate }: {
  bookings: Booking[];
  onNavigate: (bookingId: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Collect all shift events from active bookings
  const events = useMemo(() => {
    const map = new Map<string, ShiftEvent[]>();
    bookings.forEach((b) => {
      if (b.status === "cancelled") return;
      b.shifts.forEach((s) => {
        const list = map.get(s.shift_date) ?? [];
        list.push(s);
        map.set(s.shift_date, list);
      });
    });
    return map;
  }, [bookings]);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  // Build grid: Mon-Sun
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  // Day of week: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return new Date(year, monthIdx, dayNum);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const prev = () => setMonth(new Date(year, monthIdx - 1, 1));
  const next = () => setMonth(new Date(year, monthIdx + 1, 1));

  function eventChip(s: ShiftEvent) {
    const confirmed = s.shift_status === "confirmed";
    const cancelled = s.shift_status === "cancelled";
    return (
      <button key={s.id}
        onClick={(e) => { e.stopPropagation(); onNavigate(s.booking_id); }}
        className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-colors ${
          cancelled
            ? "bg-muted/60 text-muted-foreground line-through"
            : confirmed
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
        }`}>
        {s.client_name ?? "Booking"}
      </button>
    );
  }

  return (
    <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <button onClick={prev}
          className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button onClick={next}
          className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="border-b border-r min-h-[100px] bg-muted/10" />;
          const isoDate = date.toISOString().slice(0, 10);
          const isToday = isoDate === todayStr;
          const dayEvents = events.get(isoDate) ?? [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isPast = isoDate < todayStr;

          return (
            <div key={i}
              className={`border-b border-r min-h-[100px] p-1.5 flex flex-col gap-0.5 ${
                isWeekend ? "bg-muted/10" : ""
              } ${isPast && !isToday ? "opacity-60" : ""}`}>
              <div className={`text-xs font-semibold mb-1 h-5 w-5 rounded-full flex items-center justify-center self-start ${
                isToday ? "bg-navy text-white" : "text-muted-foreground"
              }`}>
                {date.getDate()}
              </div>
              {visible.map((s) => eventChip(s))}
              {overflow > 0 && (
                <span className="text-[9px] text-muted-foreground px-1">+{overflow} more</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-200 inline-block" />Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200 inline-block" />Unfilled</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted inline-block" />Cancelled</span>
      </div>
    </Card>
  );
}

// ── New Booking Modal ─────────────────────────────────────────────────────────

function NewBookingModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (id: string) => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [form, setForm] = useState({ client_id: "", branch_id: "", qualification_required: "__none__", notes: "" });
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [clientLabel, setClientLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setForm({ client_id: "", branch_id: "", qualification_required: "__none__", notes: "" }); setClientLabel(""); setClientSearch(""); setClientOpen(false); setBranches([]); return; }
    supabase.from("clients").select("id,company_name").eq("status", "active").order("company_name")
      .then(({ data }) => setClients((data ?? []).map((c: any) => ({ id: c.id, name: c.company_name }))));
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const selectClient = async (id: string, name: string) => {
    set("client_id", id); set("branch_id", "");
    setClientLabel(name); setClientSearch(""); setClientOpen(false);
    const { data } = await supabase.from("client_branches").select("id,branch_name").eq("client_id", id).order("branch_name");
    setBranches((data as BranchOption[]) ?? []);
  };

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  const save = async () => {
    if (!form.client_id) { toast.error("Select a client"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("bookings").insert({
      client_id: form.client_id,
      branch_id: form.branch_id || null,
      qualification_required: form.qualification_required === "__none__" ? null : form.qualification_required,
      notes: form.notes || null,
      status: "active",
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Booking created");
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>Create a temp booking for a client. Add shift dates on the next screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Client *</label>
            <div className="relative">
              {form.client_id && !clientOpen ? (
                <div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40"
                  onClick={() => { setClientOpen(true); setClientSearch(""); }}>
                  <span className="font-medium">{clientLabel}</span>
                  <span className="text-xs text-muted-foreground">change</span>
                </div>
              ) : (
                <Input value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setClientOpen(true); }}
                  onFocus={() => setClientOpen(true)} placeholder="Search clients…" className="h-10" autoComplete="off" />
              )}
              {clientOpen && (
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredClients.length === 0
                    ? <div className="px-4 py-3 text-sm text-muted-foreground">No clients found</div>
                    : filteredClients.map((c) => (
                      <button key={c.id} onMouseDown={() => selectClient(c.id, c.name)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60">{c.name}</button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {branches.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Branch</label>
              <Select value={form.branch_id || "__none__"} onValueChange={(v) => set("branch_id", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="— All branches —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— All branches —</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Qualification required</label>
            <Select value={form.qualification_required} onValueChange={(v) => set("qualification_required", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Any —</SelectItem>
                {QUAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
              placeholder="Any details about this booking…"
              className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={saving}
              className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Creating…" : "Create & add shifts →"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Page() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [completedOpen, setCompletedOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`id,client_id,branch_id,qualification_required,notes,status,created_at,clients(company_name),client_branches(branch_name),temp_shifts(id,shift_date,shift_status)`)
      .order("created_at", { ascending: false })
      .order("shift_date", { referencedTable: "temp_shifts", ascending: true });

    if (error) { toast.error("Failed to load"); setLoading(false); return; }

    const mapped: Booking[] = ((data ?? []) as any[]).map((b) => {
      const rawShifts = (b.temp_shifts ?? [] as any[]).sort((x: any, y: any) => (x.shift_date || "").localeCompare(y.shift_date || ""));
      const confirmed = rawShifts.filter((s: any) => s.shift_status === "confirmed").length;
      const dates = rawShifts.map((s: any) => s.shift_date).filter(Boolean).sort();
      const shifts: ShiftEvent[] = rawShifts.map((s: any) => ({
        id: s.id, shift_date: s.shift_date, shift_status: s.shift_status ?? "unfilled",
        booking_id: b.id, client_name: b.clients?.company_name ?? null,
      }));
      return {
        id: b.id, client_id: b.client_id, client_name: b.clients?.company_name ?? null,
        branch_id: b.branch_id, branch_name: b.client_branches?.branch_name ?? null,
        qualification_required: b.qualification_required, notes: b.notes, status: b.status ?? "active",
        created_at: b.created_at, shift_count: rawShifts.length, confirmed_count: confirmed,
        date_from: dates[0] ?? null, date_to: dates[dates.length - 1] ?? null,
        shifts,
      };
    });
    setBookings(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== ALL && b.status !== statusFilter) return false;
      if (needle) {
        const hay = `${b.client_name ?? ""} ${b.branch_name ?? ""} ${b.qualification_required ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [bookings, q, statusFilter]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader eyebrow="Temporary" title="Booking Board"
        description={loading ? "Loading…" : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`}
        icon={CalendarRange}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-full border bg-muted/40 p-0.5 h-9">
            <button onClick={() => setView("list")}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                view === "list" ? "bg-card shadow text-foreground" : "text-navy-foreground/70 hover:text-navy-foreground"
              }`}>
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
            <button onClick={() => setView("calendar")}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                view === "calendar" ? "bg-card shadow text-foreground" : "text-navy-foreground/70 hover:text-navy-foreground"
              }`}>
              <Calendar className="h-3.5 w-3.5" /> Calendar
            </button>
            </div>
            <button onClick={() => setShowNew(true)}
              className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Booking
            </button>
          </div>
        }
      />

      {view === "list" && (
        <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client or qualification…"
                className="pl-9 h-9 rounded-full bg-muted/50 border-transparent" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-16 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card text-center text-muted-foreground">Loading…</Card>
      ) : view === "calendar" ? (
        <CalendarView bookings={filtered} onNavigate={(id) => navigate({ to: "/bookings/$id", params: { id } })} />
      ) : filtered.length === 0 ? (
        <Card className="p-16 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card text-center text-muted-foreground">
          No bookings found.{" "}
          <button onClick={() => setShowNew(true)} className="text-teal underline">Create one</button>
        </Card>
      ) : (() => {
        const today = new Date().toISOString().slice(0, 10);

        // A booking is "completed" when its last shift date is in the past
        const isCompleted = (b: Booking) =>
          b.status !== "cancelled" && !!b.date_to && b.date_to < today;
        const isConfirmed = (b: Booking) =>
          !isCompleted(b) && b.status !== "cancelled" &&
          b.shift_count > 0 && b.confirmed_count === b.shift_count;
        const isUnfilled = (b: Booking) =>
          !isCompleted(b) && !isConfirmed(b) && b.status !== "cancelled";

        const unfilledGroup  = filtered.filter(isUnfilled);
        const confirmedGroup = filtered.filter(isConfirmed);
        const completedGroup = filtered.filter(isCompleted);
        const cancelledGroup = filtered.filter((b) => b.status === "cancelled");

        const BookingCard = ({ b }: { b: Booking }) => {
          const style = bookingStyle(b.confirmed_count, b.shift_count, b.status);
          return (
            <div
              onClick={() => navigate({ to: "/bookings/$id", params: { id: b.id } })}
              className={`bg-card rounded-2xl shadow-[var(--shadow-card)] border-l-4 ${style.border} px-5 py-4 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-4`}>
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{b.client_name ?? "Unknown client"}</span>
                  {b.branch_name && <span className="text-xs text-muted-foreground">— {b.branch_name}</span>}
                  {b.qualification_required && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium">{fmtQual(b.qualification_required)}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                  {b.shift_count > 0
                    ? <span>{fmtDate(b.date_from)}{b.date_to !== b.date_from ? ` → ${fmtDate(b.date_to)}` : ""}</span>
                    : <span>No shifts added yet</span>}
                  {b.notes && <span className="truncate max-w-[300px] italic">{b.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-semibold">{b.shift_count} shift{b.shift_count !== 1 ? "s" : ""}</div>
                  <div className={`text-xs ${b.confirmed_count === b.shift_count && b.shift_count > 0 ? "text-green-600" : "text-muted-foreground"}`}>{style.label}</div>
                </div>
                {b.confirmed_count === b.shift_count && b.shift_count > 0 && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Unfilled */}
            {unfilledGroup.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Unfilled <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">({unfilledGroup.length})</span>
                  </span>
                </div>
                {unfilledGroup.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            )}

            {/* Confirmed */}
            {confirmedGroup.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Confirmed <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">({confirmedGroup.length})</span>
                  </span>
                </div>
                {confirmedGroup.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            )}

            {/* Cancelled (only shown when status filter is active/all) */}
            {cancelledGroup.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Cancelled <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">({cancelledGroup.length})</span>
                  </span>
                </div>
                {cancelledGroup.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            )}

            {/* Completed — collapsible, closed by default */}
            {completedGroup.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setCompletedOpen((o) => !o)}
                  className="flex items-center gap-2 px-1 w-full group">
                  <span className="h-2 w-2 rounded-full bg-navy/30 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    Completed <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">({completedGroup.length})</span>
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform duration-200 ${completedOpen ? "rotate-90" : ""}`} />
                </button>
                {completedOpen && completedGroup.map((b) => <BookingCard key={b.id} b={b} />)}
              </div>
            )}

            {unfilledGroup.length === 0 && confirmedGroup.length === 0 && cancelledGroup.length === 0 && completedGroup.length === 0 && (
              <Card className="p-16 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card text-center text-muted-foreground">
                No bookings found.
              </Card>
            )}
          </div>
        );
      })()}

      <NewBookingModal open={showNew} onClose={() => setShowNew(false)}
        onCreated={(id) => { setShowNew(false); navigate({ to: "/bookings/$id", params: { id } }); }} />
    </div>
  );
}
