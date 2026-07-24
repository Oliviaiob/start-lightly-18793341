import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Briefcase, Search, Plus, X, Users, Link, Upload, Pencil, ChevronDown, Check, Sparkles } from "lucide-react";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";
import * as mammoth from "mammoth";

export const Route = createFileRoute("/_authenticated/jobs/")({
  validateSearch: (s: Record<string,unknown>) => ({ open: (s.open as string | undefined) }),
  component: Page,
});

type Job = {
  id: string;
  title: string;
  client_id: string | null;
  client_name?: string;
  status: string | null;
  qualification_required: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  pipeline_count?: number;
};

type ClientOption = { id: string; company_name: string; postcode: string | null };
type BranchOption = { id: string; branch_name: string; postcode: string | null };

const ALL = "__all__";

const EMPTY_JOB = {
  title: "",
  client_id: "",
  status: "live",
  qualification_required: "level_3",
  salary_min: "",
  salary_max: "",
  location_postcode: "",
  description: "",
  notes: "",
  branch_id: "",
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

function statusLabel(s: string | null) {
  const map: Record<string, string> = { live: "Live", interviewing: "Interviewing", filled: "Filled", lost: "Lost" };
  return map[s ?? ""] ?? s ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  const colours: Record<string, string> = {
    live: "bg-success/20 text-[oklch(0.4_0.12_155)]",
    interviewing: "bg-teal/50 text-teal-foreground",
    filled: "bg-navy/10 text-navy",
    lost: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${colours[status ?? ""] ?? "bg-muted text-muted-foreground"}`}>
      {statusLabel(status)}
    </span>
  );
}

function qualLabel(q: string | null) {
  const map: Record<string, string> = {
    unqualified: "Unqualified", level_2: "Level 2", level_3: "Level 3",
    room_leader: "Room Leader", deputy_manager: "Deputy Manager", manager: "Manager",
  };
  return map[q ?? ""] ?? q ?? "—";
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string;
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
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Add Job Modal ─────────────────────────────────────────────────────────────

function AddJobModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string) => void; }) {
  const [step, setStep] = useState<"pick" | "uploading" | "manual">("pick");
  const [form, setForm] = useState({ ...EMPTY_JOB });
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);

  // client search state
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  // branch state
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // upload state
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadClients = () =>
    supabase.from("clients").select("id,company_name,postcode").order("company_name").then(({ data }) => {
      setClients((data as ClientOption[]) ?? []);
    });

  useEffect(() => {
    if (!open) {
      setStep("pick"); setForm({ ...EMPTY_JOB }); setClientSearch("");
      setClientDropOpen(false); setAddingClient(false); setNewClientName("");
      setUploadError(null);
      setBranches([]);
      return;
    }
    loadClients();
  }, [open]);

  // close client dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const selectedClient = clients.find(c => c.id === form.client_id);
  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    setSavingClient(true);
    const { data, error } = await supabase.from("clients").insert({ company_name: newClientName.trim() }).select("id,company_name").single();
    setSavingClient(false);
    if (error) { toast.error("Failed to add client"); return; }
    await loadClients();
    set("client_id", (data as ClientOption).id);
    setClientSearch((data as ClientOption).company_name);
    setAddingClient(false); setNewClientName(""); setClientDropOpen(false);
    toast.success("Client added");
  };

  const handleFileUpload = async (file: File) => {
    const isPdf = file.name.match(/\.pdf$/i);
    const isDoc = file.name.match(/\.docx?$/i);
    if (!isPdf && !isDoc) { setUploadError("Please upload a PDF or Word document."); return; }
    setStep("uploading"); setUploadError(null);
    try {
      let body: Record<string, string>;
      if (isPdf) {
        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        body = { pdf_base64: btoa(binary) };
      } else {
        const arrayBuf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
        body = { text_content: result.value };
      }
      const { data, error } = await supabase.functions.invoke("extract-job-spec", { body });
      if (error) throw new Error(error.message);
      const d = data?.data ?? {};
      setForm(prev => ({
        ...prev,
        title: d.title ?? prev.title,
        location_postcode: d.location_postcode ?? prev.location_postcode,
        qualification_required: d.qualification_required ?? prev.qualification_required,
        salary_min: d.salary_min != null ? String(d.salary_min) : prev.salary_min,
        salary_max: d.salary_max != null ? String(d.salary_max) : prev.salary_max,
        description: d.description ?? prev.description,
      }));
      // if client_name extracted, try to match
      if (d.client_name) {
        const match = clients.find(c => c.company_name.toLowerCase().includes(d.client_name.toLowerCase()));
        if (match) { set("client_id", match.id); setClientSearch(match.company_name); }
      }
      toast.success("Job spec extracted — review the details");
      setStep("manual");
    } catch (e: any) {
      setUploadError("Extraction failed — please fill in the details manually.");
      setStep("manual");
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Job title is required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("jobs").insert({
      title: form.title.trim(),
      client_id: form.client_id || null,
      status: form.status,
      qualification_required: form.qualification_required || null,
      salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
      salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
      location_postcode: form.location_postcode.trim() || null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      branch_id: form.branch_id || null,
      posted_at: new Date().toISOString(),
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error("Failed to save job: " + error.message); return; }
    toast.success("Job added");
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Job</DialogTitle>
          <DialogDescription>
            {step === "pick" ? "Choose how you want to add this job."
              : step === "uploading" ? "Extracting job details…"
              : "Enter the job details."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step: pick ── */}
        {step === "pick" && (
          <div className="space-y-3 mt-2">
            <button
              onClick={() => toast.info("Import from URL — coming soon")}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-transparent hover:border-navy/20 hover:bg-muted/40 transition-all text-left"
            >
              <Link className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">Import from URL</div>
                <div className="text-xs text-muted-foreground mt-0.5">Paste a job posting link and we'll extract the details.</div>
              </div>
            </button>
            <label className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-transparent hover:border-navy/20 hover:bg-muted/40 transition-all text-left cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
              <Upload className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">Upload Job Spec</div>
                <div className="text-xs text-muted-foreground mt-0.5">Upload a PDF or Word document — we'll extract the details with AI.</div>
              </div>
            </label>
            <button
              onClick={() => setStep("manual")}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-navy/20 bg-navy/5 hover:bg-navy/10 transition-all text-left"
            >
              <Pencil className="h-5 w-5 mt-0.5 text-navy flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">Enter Manually</div>
                <div className="text-xs text-muted-foreground mt-0.5">Start with a blank form.</div>
              </div>
            </button>
          </div>
        )}

        {/* ── Step: uploading ── */}
        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="h-9 w-9 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Extracting job spec with AI…</p>
          </div>
        )}

        {/* ── Step: manual ── */}
        {step === "manual" && (
          <div className="space-y-4 mt-2">
            {uploadError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">{uploadError}</div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Job title *</label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Room Leader — Level 3" className="h-10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Searchable client dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Client</label>
                <div ref={clientRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setClientDropOpen(v => !v); setAddingClient(false); }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <span className={selectedClient ? "text-foreground" : "text-muted-foreground"}>
                      {selectedClient ? selectedClient.company_name : "Select client…"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                  {clientDropOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-xl shadow-lg overflow-hidden">
                      <div className="p-2 border-b">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search clients…"
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          className="w-full text-sm px-2 py-1.5 rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/40"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto py-1">
                        <button
                          onClick={() => { set("client_id", ""); set("branch_id", ""); set("location_postcode", ""); setClientSearch(""); setClientDropOpen(false); setBranches([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 text-muted-foreground"
                        >No client</button>
                        {filteredClients.map(c => (
                          <button key={c.id} onClick={async () => {
                              set("client_id", c.id);
                              setClientSearch(c.company_name);
                              setClientDropOpen(false);
                              // auto-fill postcode
                              if (c.postcode && !form.location_postcode) set("location_postcode", c.postcode);
                              // load branches
                              set("branch_id", "");
                              const { data: bData } = await supabase.from("client_branches").select("id,branch_name,postcode").eq("client_id", c.id).order("branch_name");
                              setBranches((bData as BranchOption[]) ?? []);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between">
                            {c.company_name}
                            {form.client_id === c.id && <Check className="h-3.5 w-3.5 text-teal" />}
                          </button>
                        ))}
                        {filteredClients.length === 0 && clientSearch && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                        )}
                      </div>
                      <div className="border-t p-2">
                        {!addingClient ? (
                          <button onClick={() => setAddingClient(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-teal font-medium hover:bg-teal/5 rounded-lg transition-colors">
                            <Plus className="h-4 w-4" /> Add new client
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              type="text"
                              placeholder="Client name…"
                              value={newClientName}
                              onChange={e => setNewClientName(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleAddClient()}
                              className="flex-1 text-sm px-2 py-1.5 rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/40"
                            />
                            <button onClick={handleAddClient} disabled={savingClient}
                              className="px-3 py-1.5 rounded-lg bg-teal text-teal-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                              {savingClient ? "…" : "Add"}
                            </button>
                            <button onClick={() => { setAddingClient(false); setNewClientName(""); }}
                              className="px-2 py-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="interviewing">Interviewing</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {branches.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Branch</label>
                <Select value={form.branch_id} onValueChange={(v) => {
                  set("branch_id", v === "__none__" ? "" : v);
                  // auto-fill postcode from branch if not already set
                  const b = branches.find(br => br.id === v);
                  if (b?.postcode) set("location_postcode", b.postcode);
                }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select branch…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific branch</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.branch_name}{b.postcode ? ` — ${b.postcode}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Qualification required</label>
                <Select value={form.qualification_required} onValueChange={(v) => set("qualification_required", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="level_2">Level 2</SelectItem>
                    <SelectItem value="level_3">Level 3</SelectItem>
                    <SelectItem value="room_leader">Room Leader</SelectItem>
                    <SelectItem value="deputy_manager">Deputy Manager</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Location postcode</label>
                <Input value={form.location_postcode} onChange={(e) => set("location_postcode", e.target.value)} placeholder="SW1A 1AA" className="h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Salary min (£)</label>
                <Input value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="24000" type="number" className="h-10" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Salary max (£)</label>
                <Input value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="28000" type="number" className="h-10" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                placeholder="Role overview, responsibilities, ideal candidate…" rows={4}
                className="w-full text-sm bg-muted/40 rounded-xl p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none" />
            </div>

            <div className="flex justify-between mt-2">
              <button onClick={() => setStep("pick")} className="h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground">← Back</button>
              <div className="flex gap-3">
                <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save job"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const navigate = useNavigate({ from: "/jobs" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [qualFilter, setQualFilter] = useState<string>(ALL);
  const [showAddJob, setShowAddJob] = useState(false);
  const { open: openParam } = useSearch({ from: "/_authenticated/jobs/" });
  useEffect(() => { if (openParam === "new") setShowAddJob(true); }, [openParam]);

  const loadJobs = async () => {
    if (!userId) return;
    setLoading(true);
    let query = supabase
      .from("jobs")
      .select("id,title,job_reference,client_id,status,qualification_required,salary_min,salary_max,posted_at,clients(company_name)")
      .order("posted_at", { ascending: false })
      .limit(500);
    if (scope === "mine") query = query.eq("created_by", userId);
    const { data, error } = await query;
    if (error) { toast.error("Failed to load jobs"); setLoading(false); return; }

    const { data: pipelineData } = await supabase
      .from("job_pipeline")
      .select("job_id")
      .not("stage", "eq", "rejected")
      .not("stage", "eq", "withdrawn");

    const countMap: Record<string, number> = {};
    (pipelineData ?? []).forEach((p: { job_id: string | null }) => {
      if (p.job_id) countMap[p.job_id] = (countMap[p.job_id] ?? 0) + 1;
    });

    setRows(
      (data ?? []).map((j: any) => ({
        id: j.id, title: j.title, client_id: j.client_id,
        client_name: j.clients?.company_name ?? null,
        status: j.status, qualification_required: j.qualification_required,
        salary_min: j.salary_min, salary_max: j.salary_max,
        posted_at: j.posted_at, job_reference: j.job_reference ?? null, pipeline_count: countMap[j.id] ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { loadJobs(); }, [userId, scope]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (qualFilter !== ALL && r.qualification_required !== qualFilter) return false;
      if (needle) {
        if (!`${r.title ?? ""} ${r.client_name ?? ""}`.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, qualFilter]);

  const hasFilters = !!q || statusFilter !== ALL || qualFilter !== ALL;
  const clearFilters = () => { setQ(""); setStatusFilter(ALL); setQualFilter(ALL); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Jobs"
        description={loading ? "Loading jobs…" : `${rows.length} total — ${filtered.length} shown`}
        icon={Briefcase}
        actions={
          <button
            onClick={() => setShowAddJob(true)}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Job
          </button>
        }
      />

      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or client…"
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background" />
          </div>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={[
            { value: "live", label: "Live" }, { value: "interviewing", label: "Interviewing" },
            { value: "filled", label: "Filled" }, { value: "lost", label: "Lost" },
          ]} />
          <FilterSelect value={qualFilter} onChange={setQualFilter} placeholder="Qualification" options={[
            { value: "unqualified", label: "Unqualified" }, { value: "level_2", label: "Level 2" },
            { value: "level_3", label: "Level 3" }, { value: "room_leader", label: "Room Leader" },
            { value: "deputy_manager", label: "Deputy Manager" }, { value: "manager", label: "Manager" },
          ]} />
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 h-9 px-2">
              Clear filters <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                <th className="text-left font-semibold py-3 px-4">Job Title</th>
                <th className="text-left font-semibold py-3 px-3">Client</th>
                <th className="text-left font-semibold py-3 px-3">Status</th>
                <th className="text-left font-semibold py-3 px-3">Qualification</th>
                <th className="text-left font-semibold py-3 px-3">Salary</th>
                <th className="text-center font-semibold py-3 px-3">Pipeline</th>
                <th className="text-right font-semibold py-3 px-4">Posted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">Loading jobs…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                  {rows.length === 0 ? "No jobs yet. Click 'Add Job' to get started." : "No jobs match your filters."}
                </td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} onClick={() => navigate({ to: "/jobs/$id", params: { id: r.id } })}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-navy" />
                        </div>
                        <div className="font-medium">{r.title}</div>
                        {(r as any).job_reference && <div className="text-[10px] font-mono text-muted-foreground">{(r as any).job_reference}</div>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-foreground">{r.client_name ?? "—"}</td>
                    <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-3 text-xs">{qualLabel(r.qualification_required)}</td>
                    <td className="py-3 px-3 text-xs">
                      {r.salary_min || r.salary_max ? `£${r.salary_min?.toLocaleString() ?? "?"} – £${r.salary_max?.toLocaleString() ?? "?"}` : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />{r.pipeline_count ?? 0}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">{relTime(r.posted_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddJobModal
        open={showAddJob}
        onClose={() => setShowAddJob(false)}
        onCreated={(id) => { setShowAddJob(false); navigate({ to: "/jobs/$id", params: { id } }); loadJobs(); }}
      />
    </div>
  );
}
