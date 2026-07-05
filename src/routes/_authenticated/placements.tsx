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
  TrendingUp,
  Plus,
  Pencil,
  Check,
  X,
  PoundSterling,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/placements")({
  component: Page,
});

type Placement = {
  id: string;
  placement_type: "perm" | "temp" | null;
  candidate_id: string | null;
  client_id: string | null;
  job_id: string | null;
  placement_date: string | null;
  start_date: string | null;
  perm_salary: number | null;
  perm_fee_percentage: number | null;
  perm_fee_amount: number | null;
  temp_rate: number | null;
  temp_hours: number | null;
  temp_total: number | null;
  invoice_status: string | null;
  quba_reference: string | null;
  notes: string | null;
  created_at: string;
  // joined
  candidate_first: string | null;
  candidate_last: string | null;
  client_name: string | null;
  job_title: string | null;
};

type CandidateOption = { id: string; first_name: string | null; last_name: string | null };
type ClientOption = { id: string; company_name: string };
type JobOption = { id: string; title: string };

const EMPTY_PERM = {
  candidate_id: "", client_id: "", job_id: "",
  start_date: "", perm_salary: "", perm_fee_percentage: "15",
  notes: "",
};
const EMPTY_TEMP = {
  candidate_id: "", client_id: "",
  placement_date: "", temp_rate: "", temp_hours: "",
  notes: "",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function InvoiceBadge({ status }: { status: string | null }) {
  if (status === "paid")
    return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">Paid</span>;
  if (status === "submitted")
    return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/20 text-teal-foreground">Submitted</span>;
  return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">Pending</span>;
}

// ── Inline Invoice Status Dropdown ────────────────────────────────────────────

function InvoiceDropdown({ id, current, onUpdate }: {
  id: string; current: string | null; onUpdate: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const save = async (value: string) => {
    setOpen(false);
    const { error } = await supabase.from("placements").update({ invoice_status: value }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    onUpdate(value);
    toast.success("Invoice status updated");
  };
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 h-5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity">
        <InvoiceBadge status={current} />
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-36 bg-card rounded-xl shadow-lg border py-1">
          {["pending", "submitted", "paid"].map((v) => (
            <button key={v} onClick={() => save(v)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60 capitalize">{v}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline QUBA Ref Editor ────────────────────────────────────────────────────

function QubaCell({ id, value, onUpdate }: {
  id: string; value: string | null; onUpdate: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const save = async () => {
    setEditing(false);
    const { error } = await supabase.from("placements").update({ quba_reference: draft || null }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    onUpdate(draft);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="h-7 w-28 text-xs px-2 rounded-lg" autoFocus />
        <button onClick={save} className="p-1 rounded hover:bg-muted"><Check className="h-3.5 w-3.5 text-success" /></button>
        <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </div>
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(value ?? ""); }}
      className="inline-flex items-center gap-1.5 text-xs hover:text-foreground transition-colors group text-left">
      <span className={value ? "font-medium" : "text-muted-foreground"}>{value || "Add ref"}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

// ── Add Perm Placement Modal ──────────────────────────────────────────────────

function AddPermModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_PERM });
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) { setForm({ ...EMPTY_PERM }); return; }
    Promise.all([
      supabase.from("candidates").select("id,first_name,last_name").in("candidate_type", ["perm", "both"]).order("first_name"),
      supabase.from("clients").select("id,company_name").order("company_name"),
      supabase.from("jobs").select("id,title").order("title"),
    ]).then(([c, cl, j]) => {
      setCandidates((c.data as CandidateOption[]) ?? []);
      setClients((cl.data as ClientOption[]) ?? []);
      setJobs((j.data as JobOption[]) ?? []);
    });
  }, [open]);

  const handleSave = async () => {
    if (!form.candidate_id || !form.client_id) { toast.error("Candidate and client are required"); return; }
    setSaving(true);
    const feeAmt = form.perm_salary && form.perm_fee_percentage
      ? (parseFloat(form.perm_salary) * parseFloat(form.perm_fee_percentage)) / 100
      : null;
    const { error } = await supabase.from("placements").insert({
      placement_type: "perm",
      candidate_id: form.candidate_id,
      client_id: form.client_id,
      job_id: form.job_id || null,
      start_date: form.start_date || null,
      placement_date: form.start_date || new Date().toISOString().split("T")[0],
      perm_salary: form.perm_salary ? parseFloat(form.perm_salary) : null,
      perm_fee_percentage: form.perm_fee_percentage ? parseFloat(form.perm_fee_percentage) : null,
      perm_fee_amount: feeAmt,
      invoice_status: "pending",
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Placement added");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Permanent Placement</DialogTitle>
          <DialogDescription>Record a new permanent hire.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Candidate *</label>
            <Select value={form.candidate_id} onValueChange={(v) => set("candidate_id", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select candidate…" /></SelectTrigger>
              <SelectContent>{candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Client *</label>
            <Select value={form.client_id} onValueChange={(v) => set("client_id", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Job (optional)</label>
            <Select value={form.job_id} onValueChange={(v) => set("job_id", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select job…" /></SelectTrigger>
              <SelectContent><SelectItem value="">None</SelectItem>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Start date</label>
            <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Salary (£)</label>
            <Input value={form.perm_salary} onChange={(e) => set("perm_salary", e.target.value)} placeholder="26000" type="number" className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fee %</label>
            <Input value={form.perm_fee_percentage} onChange={(e) => set("perm_fee_percentage", e.target.value)} placeholder="15" type="number" className="h-10" />
          </div>
          {form.perm_salary && form.perm_fee_percentage && (
            <div className="col-span-2 p-3 rounded-xl bg-teal/10 text-sm font-medium text-teal-foreground">
              Fee: £{((parseFloat(form.perm_salary) * parseFloat(form.perm_fee_percentage)) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </div>
          )}
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full text-sm bg-muted/40 rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save placement"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const navigate = useNavigate();
  const scope = useEffectiveScope();
  const { userId } = useScope();
  const [rows, setRows] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPerm, setShowAddPerm] = useState(false);
  const [tab, setTab] = useState<"perm" | "temp">("perm");

  const loadPlacements = async () => {
    if (!userId) return;
    setLoading(true);
    let q = supabase.from("placements").select(`
      id, placement_type, candidate_id, client_id, job_id,
      placement_date, start_date,
      perm_salary, perm_fee_percentage, perm_fee_amount,
      temp_rate, temp_hours, temp_total,
      invoice_status, quba_reference, notes, created_at,
      candidates(first_name, last_name),
      clients(company_name),
      jobs(title)
    `).order("placement_date", { ascending: false });
    if (scope === "mine") q = q.eq("created_by", userId);
    const { data, error } = await q;
    if (error) { toast.error("Failed to load placements"); setLoading(false); return; }
    setRows(((data ?? []) as any[]).map((r) => ({
      ...r,
      candidate_first: r.candidates?.first_name ?? null,
      candidate_last: r.candidates?.last_name ?? null,
      client_name: r.clients?.company_name ?? null,
      job_title: r.jobs?.title ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { loadPlacements(); }, [userId, scope]);

  const perm = rows.filter((r) => r.placement_type === "perm");
  const temp = rows.filter((r) => r.placement_type === "temp");

  // Revenue stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  const permThisMonth = perm.filter((r) => (r.placement_date ?? "") >= startOfMonth)
    .reduce((sum, r) => sum + (r.perm_fee_amount ?? 0), 0);
  const permYTD = perm.filter((r) => (r.placement_date ?? "") >= startOfYear)
    .reduce((sum, r) => sum + (r.perm_fee_amount ?? 0), 0);
  const tempYTD = temp.filter((r) => (r.placement_date ?? "") >= startOfYear)
    .reduce((sum, r) => sum + (r.temp_total ?? 0), 0);
  const totalYTD = permYTD + tempYTD;

  const updateField = (id: string, field: string, value: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Operations"
        title="Placements & Revenue"
        description={loading ? "Loading…" : `${perm.length} perm · ${temp.length} temp`}
        icon={TrendingUp}
        actions={
          <button onClick={() => setShowAddPerm(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Placement
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Perm fees this month" value={fmt(permThisMonth)} />
        <StatCard label="Total revenue YTD" value={fmt(totalYTD)} sub={`Perm: ${fmt(permYTD)} · Temp: ${fmt(tempYTD)}`} />
        <StatCard label="Perm placements" value={String(perm.length)} sub={`${perm.filter(r => r.invoice_status === "paid").length} paid`} />
        <StatCard label="Temp placements" value={String(temp.length)} sub={`${temp.filter(r => r.invoice_status === "paid").length} paid`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-full p-1 w-fit">
        {(["perm", "temp"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-8 px-5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "perm" ? "Permanent" : "Temporary"} ({t === "perm" ? perm.length : temp.length})
          </button>
        ))}
      </div>

      {/* Perm Table */}
      {tab === "perm" && (
        <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                  <th className="text-left font-semibold py-3 px-4">Candidate</th>
                  <th className="text-left font-semibold py-3 px-3">Client</th>
                  <th className="text-left font-semibold py-3 px-3">Job</th>
                  <th className="text-left font-semibold py-3 px-3">Start Date</th>
                  <th className="text-right font-semibold py-3 px-3">Salary</th>
                  <th className="text-right font-semibold py-3 px-3">Fee</th>
                  <th className="text-left font-semibold py-3 px-3">Invoice</th>
                  <th className="text-left font-semibold py-3 px-3">QUBA Ref</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">Loading…</td></tr>
                ) : perm.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">No permanent placements yet.</td></tr>
                ) : perm.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <button onClick={() => r.candidate_id && navigate({ to: "/candidates/$id", params: { id: r.candidate_id } })}
                        className="font-medium text-sm hover:text-teal transition-colors">
                        {r.candidate_first} {r.candidate_last}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{r.client_name ?? "—"}</td>
                    <td className="py-3 px-3 text-xs">{r.job_title ?? "—"}</td>
                    <td className="py-3 px-3 text-xs">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" />{fmtDate(r.start_date ?? r.placement_date)}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-medium">{fmt(r.perm_salary)}</td>
                    <td className="py-3 px-3 text-right text-xs font-semibold text-teal-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <PoundSterling className="h-3 w-3" />
                        {r.perm_fee_amount != null ? r.perm_fee_amount.toLocaleString("en-GB", { minimumFractionDigits: 2 }) : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <InvoiceDropdown id={r.id} current={r.invoice_status}
                        onUpdate={(v) => updateField(r.id, "invoice_status", v)} />
                    </td>
                    <td className="py-3 px-3">
                      <QubaCell id={r.id} value={r.quba_reference}
                        onUpdate={(v) => updateField(r.id, "quba_reference", v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Temp Table */}
      {tab === "temp" && (
        <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                  <th className="text-left font-semibold py-3 px-4">Candidate</th>
                  <th className="text-left font-semibold py-3 px-3">Client</th>
                  <th className="text-left font-semibold py-3 px-3">Date</th>
                  <th className="text-right font-semibold py-3 px-3">Hours</th>
                  <th className="text-right font-semibold py-3 px-3">Rate/hr</th>
                  <th className="text-right font-semibold py-3 px-3">Revenue</th>
                  <th className="text-left font-semibold py-3 px-3">Invoice</th>
                  <th className="text-left font-semibold py-3 px-3">QUBA Ref</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">Loading…</td></tr>
                ) : temp.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">No temporary placements yet.</td></tr>
                ) : temp.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <button onClick={() => r.candidate_id && navigate({ to: "/candidates/$id", params: { id: r.candidate_id } })}
                        className="font-medium text-sm hover:text-teal transition-colors">
                        {r.candidate_first} {r.candidate_last}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{r.client_name ?? "—"}</td>
                    <td className="py-3 px-3 text-xs">{fmtDate(r.placement_date)}</td>
                    <td className="py-3 px-3 text-right text-xs">{r.temp_hours ?? "—"}</td>
                    <td className="py-3 px-3 text-right text-xs">{r.temp_rate != null ? `£${r.temp_rate}` : "—"}</td>
                    <td className="py-3 px-3 text-right text-xs font-semibold text-teal-foreground">
                      {r.temp_total != null ? `£${r.temp_total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : <span className="text-warning font-normal">Missing rate</span>}
                    </td>
                    <td className="py-3 px-3">
                      <InvoiceDropdown id={r.id} current={r.invoice_status}
                        onUpdate={(v) => updateField(r.id, "invoice_status", v)} />
                    </td>
                    <td className="py-3 px-3">
                      <QubaCell id={r.id} value={r.quba_reference}
                        onUpdate={(v) => updateField(r.id, "quba_reference", v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AddPermModal open={showAddPerm} onClose={() => setShowAddPerm(false)} onCreated={() => { setShowAddPerm(false); loadPlacements(); }} />
    </div>
  );
}
