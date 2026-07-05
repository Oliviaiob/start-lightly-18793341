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
import { Building2, Search, Plus, X, MapPin, Phone, Check } from "lucide-react";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: Page,
});

type Client = {
  id: string;
  company_name: string;
  client_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postcode: string | null;
  status: string | null;
  tob_signed: boolean | null;
  last_activity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const ALL = "__all__";

const EMPTY_FORM = {
  company_name: "",
  client_type: "nursery",
  contact_name: "",
  status: "prospect",
  contact_email: "",
  contact_phone: "",
  address: "",
  postcode: "",
  perm_fee_percentage: "",
  website_url: "",
  tob_signed: false,
  tob_signed_date: "",
  notes: "",
};

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function typeLabel(t: string | null) {
  const map: Record<string, string> = {
    nursery: "Nursery",
    school: "School",
    private_family: "Private Family",
    other: "Other",
  };
  return map[t ?? ""] ?? t ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
        Active
      </span>
    );
  if (status === "prospect")
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">
        Prospect
      </span>
    );
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
      Inactive
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Add Client Modal ─────────────────────────────────────────────────────────

function AddClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      company_name: form.company_name.trim(),
      client_type: form.client_type,
      contact_name: form.contact_name.trim() || null,
      status: form.status,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      address: form.address.trim() || null,
      postcode: form.postcode.trim() || null,
      perm_fee_percentage: form.perm_fee_percentage
        ? parseFloat(form.perm_fee_percentage)
        : null,
      tob_signed: form.tob_signed,
      tob_signed_date: form.tob_signed && form.tob_signed_date
        ? form.tob_signed_date
        : null,
      notes: form.notes.trim() || null,
      last_activity_date: new Date().toISOString().split("T")[0],
    };
    const { data, error } = await supabase
      .from("clients")
      .insert(payload as any)
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Failed to save client: " + error.message);
      return;
    }
    toast.success("Client added");
    setForm({ ...EMPTY_FORM });
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
          <DialogDescription>
            Add a new nursery, school, family or other client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Company name *</label>
            <Input
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Little Stars Nursery"
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Client type</label>
            <Select value={form.client_type} onValueChange={(v) => set("client_type", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nursery">Nursery</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="private_family">Private Family</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Contact name</label>
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Smith" className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Contact email</label>
            <Input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="jane@nursery.co.uk" className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Contact phone</label>
            <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="020 7946 0000" className="h-10" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="12 High Street" className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Postcode</label>
            <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} placeholder="SW1A 1AA" className="h-10" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Perm fee %</label>
            <Input value={form.perm_fee_percentage} onChange={(e) => set("perm_fee_percentage", e.target.value)} placeholder="15" type="number" className="h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Website URL</label>
            <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://example.co.uk" className="h-10" />
          </div>
        </div>

        {/* ToB */}
        <div className="mt-4 p-4 rounded-xl bg-muted/40 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.tob_signed}
              onChange={(e) => set("tob_signed", e.target.checked)}
              className="h-4 w-4 rounded accent-[#1B2B4B]"
            />
            <span className="text-sm font-medium">Terms of Business signed</span>
          </label>
          {form.tob_signed && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ToB signed date</label>
              <Input
                type="date"
                value={form.tob_signed_date}
                onChange={(e) => set("tob_signed_date", e.target.value)}
                className="h-10 max-w-[200px]"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any notes about this client…"
            rows={3}
            className="w-full text-sm bg-muted/40 rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save client"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Branch Modal ──────────────────────────────────────────────────────────

function AddBranchModal({
  open,
  clientId,
  onClose,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
}) {
  const [branchName, setBranchName] = useState("");
  const [location, setLocation] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!branchName.trim()) { toast.error("Branch name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("client_branches").insert({
      client_id: clientId,
      branch_name: branchName.trim(),
      location: location.trim() || null,
      postcode: postcode.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to save branch"); return; }
    toast.success("Branch added");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a branch?</DialogTitle>
          <DialogDescription>Would you like to add a branch for this client now?</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Branch name *</label>
            <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Main Branch" className="h-10" />
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
        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="h-10 px-5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add branch"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const navigate = useNavigate({ from: "/clients" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [tobFilter, setTobFilter] = useState<string>(ALL);
  const [showAddClient, setShowAddClient] = useState(false);
  const [branchPromptClientId, setBranchPromptClientId] = useState<string | null>(null);

  const loadClients = async () => {
    if (!userId) return;
    setLoading(true);
    let query = supabase
      .from("clients")
      .select(
        "id,company_name,client_type,contact_name,contact_email,contact_phone,address,postcode,status,tob_signed,last_activity_date,created_at,updated_at",
      )
      .order("company_name", { ascending: true })
      .limit(500);
    if (scope === "mine") query = query.eq("created_by", userId);
    const { data, error } = await query;
    if (error) toast.error("Failed to load clients");
    setRows((data as Client[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, [userId, scope]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== ALL && r.client_type !== typeFilter) return false;
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (tobFilter === "signed" && !r.tob_signed) return false;
      if (tobFilter === "unsigned" && r.tob_signed) return false;
      if (needle) {
        const hay = `${r.company_name ?? ""} ${r.contact_name ?? ""} ${r.postcode ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, typeFilter, statusFilter, tobFilter]);

  const hasFilters = !!q || typeFilter !== ALL || statusFilter !== ALL || tobFilter !== ALL;
  const clearFilters = () => { setQ(""); setTypeFilter(ALL); setStatusFilter(ALL); setTobFilter(ALL); };

  const handleClientCreated = (newId: string) => {
    setShowAddClient(false);
    setBranchPromptClientId(newId);
    loadClients();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Clients"
        description={loading ? "Loading clients…" : `${rows.length} total — ${filtered.length} shown`}
        icon={Building2}
        actions={
          <button
            onClick={() => setShowAddClient(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Client
          </button>
        }
      />

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, contact, postcode…"
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>
          <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Type" options={[
            { value: "nursery", label: "Nursery" },
            { value: "school", label: "School" },
            { value: "private_family", label: "Private Family" },
            { value: "other", label: "Other" },
          ]} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={[
            { value: "active", label: "Active" },
            { value: "prospect", label: "Prospect" },
            { value: "inactive", label: "Inactive" },
          ]} />
          <FilterSelect value={tobFilter} onChange={setTobFilter} placeholder="ToB" options={[
            { value: "signed", label: "ToB Signed" },
            { value: "unsigned", label: "ToB Unsigned" },
          ]} />
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 h-9 px-2">
              Clear filters <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                <th className="text-left font-semibold py-3 px-4">Client</th>
                <th className="text-left font-semibold py-3 px-3">Type</th>
                <th className="text-left font-semibold py-3 px-3">Status</th>
                <th className="text-left font-semibold py-3 px-3">Location</th>
                <th className="text-left font-semibold py-3 px-3">Primary Contact</th>
                <th className="text-left font-semibold py-3 px-3">Phone</th>
                <th className="text-center font-semibold py-3 px-3">ToB</th>
                <th className="text-right font-semibold py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">Loading clients…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">
                  {rows.length === 0 ? "No clients yet. Click 'Add Client' to get started." : "No clients match your filters."}
                </td></tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate({ to: "/clients/$id", params: { id: r.id } })}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-navy-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.company_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.contact_email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs">{typeLabel(r.client_type)}</td>
                    <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span>{r.postcode || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs font-medium">{r.contact_name || "—"}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span>{r.contact_phone || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.tob_signed ? (
                        <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
                          <Check className="h-3 w-3" /> Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {relTime(r.last_activity_date || r.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddClientModal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onCreated={handleClientCreated}
      />

      {branchPromptClientId && (
        <AddBranchModal
          open={true}
          clientId={branchPromptClientId}
          onClose={() => setBranchPromptClientId(null)}
        />
      )}
    </div>
  );
}
