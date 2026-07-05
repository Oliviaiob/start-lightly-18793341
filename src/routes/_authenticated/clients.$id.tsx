import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Building2, MapPin, Phone, Mail, FileCheck, Briefcase,
  ArrowLeft, Check, Clock, Plus, Pencil, Trash2,
  MessageSquare, PhoneCall, Save, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/contexts/scope-context";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: Page,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  company_name: string;
  client_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postcode: string | null;
  website_url: string | null;
  status: string | null;
  tob_signed: boolean | null;
  tob_signed_date: string | null;
  perm_fee_percentage: number | null;
  temp_rate_per_hour: number | null;
  notes: string | null;
};

type Branch = {
  id: string;
  branch_name: string;
  location: string | null;
  postcode: string | null;
};

type Job = {
  id: string;
  title: string;
  status: string | null;
  posted_at: string | null;
};

type Activity = {
  id: string;
  activity_type: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

type Placement = {
  id: string;
  placement_type: string | null;
  start_date: string | null;
  perm_fee_amount: number | null;
  temp_total: number | null;
  invoice_status: string | null;
  candidates: { first_name: string | null; last_name: string | null } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function typeLabel(t: string | null) {
  const m: Record<string, string> = { nursery: "Nursery", school: "School", private_family: "Private Family", other: "Other" };
  return m[t ?? ""] ?? t ?? "Other";
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return fmt(iso);
}

function activityIcon(type: string) {
  if (type === "call_logged") return <PhoneCall className="h-3.5 w-3.5 text-teal-foreground" />;
  if (type === "note") return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ── Branch Modal ───────────────────────────────────────────────────────────────

function BranchModal({ open, clientId, branch, onClose, onSaved }: {
  open: boolean; clientId: string;
  branch: Branch | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(branch?.branch_name ?? "");
  const [location, setLocation] = useState(branch?.location ?? "");
  const [postcode, setPostcode] = useState(branch?.postcode ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(branch?.branch_name ?? ""); setLocation(branch?.location ?? ""); setPostcode(branch?.postcode ?? ""); }
  }, [open, branch]);

  const save = async () => {
    if (!name.trim()) { toast.error("Branch name required"); return; }
    setSaving(true);
    const payload = { branch_name: name.trim(), location: location.trim() || null, postcode: postcode.trim() || null };
    const { error } = branch
      ? await supabase.from("client_branches").update(payload).eq("id", branch.id)
      : await supabase.from("client_branches").insert({ ...payload, client_id: clientId });
    setSaving(false);
    if (error) { toast.error("Failed to save branch"); return; }
    toast.success(branch ? "Branch updated" : "Branch added");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "Add Branch"}</DialogTitle>
          <DialogDescription>Branch details for this client location.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Branch name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Branch" className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Location / Area</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hampstead" className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Postcode</label>
              <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="NW3 1AA" className="h-10" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving}
            className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save branch"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Section Shell ──────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { userId } = useScope();

  const [client, setClient] = useState<Client | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

  // edit state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);

  // activity
  const [noteText, setNoteText] = useState("");
  const [callText, setCallText] = useState("");
  const [logginNote, setLoggingNote] = useState(false);
  const [loggingCall, setLoggingCall] = useState(false);

  // branch modal
  const [branchModal, setBranchModal] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });

  const loadAll = async () => {
    const [cRes, bRes, jRes, aRes, pRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("client_branches").select("id,branch_name,location,postcode").eq("client_id", id).order("branch_name"),
      supabase.from("jobs").select("id,title,status,posted_at").eq("client_id", id).order("posted_at", { ascending: false }),
      supabase.from("activity_log").select("id,activity_type,description,created_by,created_at").eq("entity_id", id).eq("entity_type", "client").order("created_at", { ascending: false }).limit(30),
      supabase.from("placements").select("id,placement_type,start_date,perm_fee_amount,temp_total,invoice_status,candidates(first_name,last_name)").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    if (cRes.error) { toast.error("Could not load client"); setLoading(false); return; }
    setClient(cRes.data as Client);
    setDraft(cRes.data as Client);
    setBranches((bRes.data as Branch[]) ?? []);
    setJobs((jRes.data as Job[]) ?? []);
    setActivities((aRes.data as Activity[]) ?? []);
    setPlacements((pRes.data as any[]).map((p) => ({ ...p, candidates: p.candidates ?? null })) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  // ── Save edits ───────────────────────────────────────────────────────────────
  const saveEdits = async () => {
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      company_name: draft.company_name,
      client_type: draft.client_type,
      contact_name: draft.contact_name || null,
      contact_email: draft.contact_email || null,
      contact_phone: draft.contact_phone || null,
      address: draft.address || null,
      postcode: draft.postcode || null,
      website_url: draft.website_url || null,
      status: draft.status,
      tob_signed: draft.tob_signed,
      tob_signed_date: draft.tob_signed && draft.tob_signed_date ? draft.tob_signed_date : null,
      perm_fee_percentage: draft.perm_fee_percentage ?? null,
      temp_rate_per_hour: draft.temp_rate_per_hour ?? null,
      notes: draft.notes || null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    toast.success("Client updated");
    setEditing(false);
    loadAll();
  };

  // ── Log activity ─────────────────────────────────────────────────────────────
  const logActivity = async (type: "note" | "call_logged", text: string) => {
    if (!text.trim()) return;
    const { error } = await supabase.from("activity_log").insert({
      entity_type: "client", entity_id: id,
      activity_type: type,
      description: text.trim(),
      created_by: userId ?? "system",
    });
    if (error) { toast.error("Failed to log"); return; }
    if (type === "note") { setNoteText(""); setLoggingNote(false); }
    else { setCallText(""); setLoggingCall(false); }
    toast.success(type === "note" ? "Note saved" : "Call logged");
    loadAll();
  };

  // ── Delete branch ────────────────────────────────────────────────────────────
  const deleteBranch = async (branchId: string) => {
    const { error } = await supabase.from("client_branches").delete().eq("id", branchId);
    if (error) { toast.error("Failed to delete branch"); return; }
    toast.success("Branch removed");
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
  };

  if (loading) return <div className="max-w-[1400px] mx-auto pt-16 text-center text-muted-foreground">Loading…</div>;
  if (!client) return <div className="max-w-[1400px] mx-auto pt-16 text-center text-muted-foreground">Client not found.</div>;

  const setD = (k: keyof Client, v: any) => setDraft((p) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pt-2">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-navy text-white px-6 py-5 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-white/60 font-medium mb-0.5">Recruitment · Client</div>
            <h1 className="text-2xl font-bold">{client.company_name}</h1>
            <div className="text-sm text-white/70 mt-0.5">
              {typeLabel(client.client_type)}{client.postcode ? ` · ${client.postcode}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate({ to: "/clients" })}
            className="h-9 px-3.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 inline-flex items-center gap-1.5 border border-white/20">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setDraft(client); }}
                className="h-9 px-3.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 border border-white/20">
                Cancel
              </button>
              <button onClick={saveEdits} disabled={saving}
                className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        {client.status === "active" ? (
          <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">Active</span>
        ) : client.status === "prospect" ? (
          <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">Prospect</span>
        ) : (
          <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Inactive</span>
        )}
        {client.tob_signed ? (
          <span className="inline-flex items-center gap-1 h-6 px-3 rounded-full text-xs font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
            <Check className="h-3 w-3" /> ToB Signed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 h-6 px-3 rounded-full text-xs font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">
            <Clock className="h-3 w-3" /> ToB Pending
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Contact & Details */}
          <Section title="Contact & Details">
            <div className="p-5 grid grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Field label="Company name *">
                    <Input value={draft.company_name ?? ""} onChange={(e) => setD("company_name", e.target.value)} className="h-10" />
                  </Field>
                  <Field label="Client type">
                    <Select value={draft.client_type ?? "nursery"} onValueChange={(v) => setD("client_type", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nursery">Nursery</SelectItem>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="private_family">Private Family</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Contact name">
                    <Input value={draft.contact_name ?? ""} onChange={(e) => setD("contact_name", e.target.value)} placeholder="Jane Smith" className="h-10" />
                  </Field>
                  <Field label="Status">
                    <Select value={draft.status ?? "prospect"} onValueChange={(v) => setD("status", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Email">
                    <Input value={draft.contact_email ?? ""} onChange={(e) => setD("contact_email", e.target.value)} placeholder="jane@example.co.uk" className="h-10" />
                  </Field>
                  <Field label="Phone">
                    <Input value={draft.contact_phone ?? ""} onChange={(e) => setD("contact_phone", e.target.value)} placeholder="020 7946 0000" className="h-10" />
                  </Field>
                  <Field label="Address">
                    <Input value={draft.address ?? ""} onChange={(e) => setD("address", e.target.value)} placeholder="12 High Street" className="h-10" />
                  </Field>
                  <Field label="Postcode">
                    <Input value={draft.postcode ?? ""} onChange={(e) => setD("postcode", e.target.value)} placeholder="SW1A 1AA" className="h-10" />
                  </Field>
                  <Field label="Website URL" className="col-span-2">
                    <Input value={draft.website_url ?? ""} onChange={(e) => setD("website_url", e.target.value)} placeholder="https://example.co.uk" className="h-10" />
                  </Field>
                </>
              ) : (
                <>
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Contact name" value={client.contact_name} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.contact_email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={client.contact_phone} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={[client.address, client.postcode].filter(Boolean).join(", ")} />
                  {client.website_url && (
                    <div className="col-span-2">
                      <InfoRow icon={<Building2 className="h-4 w-4" />} label="Website"
                        value={<a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">{client.website_url}</a>} />
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          {/* Branches */}
          <Section title="Branches" action={
            <button onClick={() => setBranchModal({ open: true, branch: null })}
              className="h-7 px-3 rounded-full bg-teal/15 text-teal-foreground text-xs font-medium hover:bg-teal/25 inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add branch
            </button>
          }>
            {branches.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No branches yet.</div>
            ) : (
              <div className="divide-y">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{b.branch_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {b.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.location}</span>}
                        {b.postcode && <span>{b.postcode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setBranchModal({ open: true, branch: b })}
                        className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteBranch(b.id)}
                        className="h-7 w-7 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Jobs */}
          <Section title="Jobs" action={
            <button onClick={() => navigate({ to: "/jobs" })}
              className="h-7 px-3 rounded-full bg-teal/15 text-teal-foreground text-xs font-medium hover:bg-teal/25 inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add job
            </button>
          }>
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No jobs linked yet.</div>
            ) : (
              <div className="divide-y">
                {jobs.map((j) => (
                  <div key={j.id} onClick={() => navigate({ to: "/jobs/$id", params: { id: j.id } })}
                    className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <span className="font-medium text-sm">{j.title}</span>
                    <div className="flex items-center gap-3">
                      <JobStatusBadge status={j.status} />
                      <span className="text-xs text-muted-foreground">{fmt(j.posted_at)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Placements */}
          <Section title="Placements">
            {placements.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No placements yet.</div>
            ) : (
              <div className="divide-y">
                {placements.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="font-medium text-sm">{p.candidates?.first_name} {p.candidates?.last_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{p.placement_type} · {fmt(p.start_date)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {p.perm_fee_amount != null ? `£${p.perm_fee_amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` :
                         p.temp_total != null ? `£${p.temp_total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—"}
                      </span>
                      <InvoiceChip status={p.invoice_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Commercial */}
          <Section title="Commercial">
            <div className="p-5 grid grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Field label="Perm fee %">
                    <Input type="number" value={draft.perm_fee_percentage ?? ""} onChange={(e) => setD("perm_fee_percentage", e.target.value ? parseFloat(e.target.value) : null)} placeholder="15" className="h-10" />
                  </Field>
                  <Field label="Temp hourly rate (£)">
                    <Input type="number" value={draft.temp_rate_per_hour ?? ""} onChange={(e) => setD("temp_rate_per_hour", e.target.value ? parseFloat(e.target.value) : null)} placeholder="13.50" className="h-10" />
                  </Field>
                  <div className="col-span-2 p-3 rounded-xl bg-muted/40 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={draft.tob_signed ?? false} onChange={(e) => setD("tob_signed", e.target.checked)}
                        className="h-4 w-4 rounded accent-[#1B2B4B]" />
                      <span className="text-sm font-medium">Terms of Business signed</span>
                    </label>
                    {draft.tob_signed && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">ToB signed date</label>
                        <Input type="date" value={draft.tob_signed_date ?? ""} onChange={(e) => setD("tob_signed_date", e.target.value)} className="h-10 max-w-[200px]" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Perm fee %" value={client.perm_fee_percentage != null ? `${client.perm_fee_percentage}%` : null} />
                  <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Temp rate / hr" value={client.temp_rate_per_hour != null ? `£${client.temp_rate_per_hour.toFixed(2)}` : null} />
                  <InfoRow icon={<FileCheck className="h-4 w-4" />} label="Terms of Business"
                    value={client.tob_signed ? `Signed ${fmt(client.tob_signed_date)}` : "Not yet signed"} />
                </>
              )}
            </div>
          </Section>

        </div>

        {/* ── RIGHT COLUMN (1/3) ── */}
        <div className="space-y-5">

          {/* Activity Log */}
          <Section title="Activity Log">
            <div className="p-4 space-y-3">
              {/* Add note */}
              {logginNote ? (
                <div className="space-y-2">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={3}
                    className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => logActivity("note", noteText)}
                      className="h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90">Save note</button>
                    <button onClick={() => { setLoggingNote(false); setNoteText(""); }}
                      className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setLoggingNote(true)}
                  className="w-full h-9 rounded-xl bg-muted/40 text-muted-foreground text-xs font-medium hover:bg-muted/70 flex items-center gap-2 px-3">
                  <MessageSquare className="h-3.5 w-3.5" /> Add a note…
                </button>
              )}

              {/* Log call */}
              {loggingCall ? (
                <div className="space-y-2">
                  <textarea value={callText} onChange={(e) => setCallText(e.target.value)} placeholder="Call summary…" rows={2}
                    className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => logActivity("call_logged", callText)}
                      className="h-8 px-4 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90">Log call</button>
                    <button onClick={() => { setLoggingCall(false); setCallText(""); }}
                      className="h-8 px-4 rounded-full border text-xs font-medium hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setLoggingCall(true)}
                  className="w-full h-9 rounded-xl bg-muted/40 text-muted-foreground text-xs font-medium hover:bg-muted/70 flex items-center gap-2 px-3">
                  <PhoneCall className="h-3.5 w-3.5" /> Log a call…
                </button>
              )}
            </div>

            {activities.length > 0 && (
              <div className="border-t divide-y">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      {activityIcon(a.activity_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-foreground leading-snug">{a.description}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{relTime(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notes">
            <div className="p-4 space-y-3">
              <textarea value={draft.notes ?? ""} onChange={(e) => setD("notes", e.target.value)} placeholder="Recruiter notes about this client…" rows={5}
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
              <div className="flex justify-end">
                <button onClick={saveEdits} disabled={saving}
                  className="h-8 px-4 rounded-full bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save notes"}
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>

      <BranchModal open={branchModal.open} clientId={id} branch={branchModal.branch}
        onClose={() => setBranchModal({ open: false, branch: null })}
        onSaved={() => { setBranchModal({ open: false, branch: null }); loadAll(); }} />
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">{label}</div>
        <div className="text-sm font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string | null }) {
  const c: Record<string, string> = {
    live: "bg-success/20 text-[oklch(0.4_0.12_155)]",
    interviewing: "bg-teal/20 text-teal-foreground",
    filled: "bg-navy/10 text-navy",
    lost: "bg-muted text-muted-foreground",
  };
  const l: Record<string, string> = { live: "Live", interviewing: "Interviewing", filled: "Filled", lost: "Lost" };
  return <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${c[status ?? ""] ?? "bg-muted text-muted-foreground"}`}>{l[status ?? ""] ?? status ?? "—"}</span>;
}

function InvoiceChip({ status }: { status: string | null }) {
  if (status === "paid") return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">Paid</span>;
  if (status === "submitted") return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-teal/20 text-teal-foreground">Submitted</span>;
  return <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">Pending</span>;
}
