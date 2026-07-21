import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, PoundSterling, FileText, Plus, Trash2, Upload,
  Download, Loader2, Save, ArrowLeft, GripVertical, X
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings/company")({
  component: CompanySettingsPage,
});

interface PayRate {
  id: string;
  role_name: string;
  candidate_pay: number;
  client_charge: number;
  sort_order: number;
  _dirty?: boolean;
  _new?: boolean;
}

interface CompanyDoc {
  id: string;
  label: string;
  file_name: string | null;
  storage_path: string | null;
  sort_order: number;
}

const INPUT =
  "flex h-9 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const BTN_PRIMARY =
  "px-4 py-2 text-sm font-medium rounded-xl bg-navy text-white hover:bg-navy/90 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer";
const BTN_GHOST =
  "px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40";
const SECTION_TITLE = "text-base font-semibold text-foreground";

function CompanySettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [rates, setRates] = useState<PayRate[]>([]);
  const [savingRateId, setSavingRateId] = useState<string | null>(null);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);

  const [docs, setDocs] = useState<CompanyDoc[]>([]);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      checkAdmin(data.user.id);
    });
  }, []);

  const checkAdmin = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    const admin = (data as any)?.role === "admin";
    setIsAdmin(admin);
    await Promise.all([loadRates(), loadDocs()]);
    setLoading(false);
  };

  const loadRates = async () => {
    const { data } = await supabase.from("pay_rates").select("*").order("sort_order");
    setRates((data as PayRate[]) || []);
  };

  const loadDocs = async () => {
    const { data } = await supabase.from("company_documents").select("*").order("sort_order");
    setDocs((data as CompanyDoc[]) || []);
  };

  const addRate = () => {
    const newRow: PayRate = {
      id: `new-${Date.now()}`,
      role_name: "",
      candidate_pay: 0,
      client_charge: 0,
      sort_order: rates.length + 1,
      _new: true,
      _dirty: true,
    };
    setRates((r) => [...r, newRow]);
  };

  const updateRateField = (id: string, field: keyof PayRate, value: string | number) => {
    setRates((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [field]: value, _dirty: true } : r))
    );
  };

  const saveRate = async (rate: PayRate) => {
    if (!rate.role_name.trim()) return toast.error("Role name is required");
    setSavingRateId(rate.id);
    if (rate._new) {
      const { error } = await supabase.from("pay_rates").insert({
        role_name: rate.role_name,
        candidate_pay: Number(rate.candidate_pay),
        client_charge: Number(rate.client_charge),
        sort_order: rate.sort_order,
      });
      if (error) { toast.error("Failed to save"); setSavingRateId(null); return; }
    } else {
      const { error } = await supabase
        .from("pay_rates")
        .update({
          role_name: rate.role_name,
          candidate_pay: Number(rate.candidate_pay),
          client_charge: Number(rate.client_charge),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rate.id);
      if (error) { toast.error("Failed to save"); setSavingRateId(null); return; }
    }
    toast.success("Rate saved");
    setSavingRateId(null);
    loadRates();
  };

  const deleteRate = async (rate: PayRate) => {
    if (rate._new) { setRates((rs) => rs.filter((r) => r.id !== rate.id)); return; }
    setDeletingRateId(rate.id);
    await supabase.from("pay_rates").delete().eq("id", rate.id);
    setDeletingRateId(null);
    toast.success("Rate deleted");
    loadRates();
  };

  const triggerUpload = (docId: string) => {
    activeDocIdRef.current = docId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docId = activeDocIdRef.current;
    if (!file || !docId) return;
    e.target.value = "";
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    setUploadingDocId(docId);
    const ext = file.name.split(".").pop();
    const path = `${docId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("company-docs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast.error("Upload failed"); setUploadingDocId(null); return; }
    const { error: dbErr } = await supabase
      .from("company_documents")
      .update({ file_name: file.name, storage_path: path, updated_at: new Date().toISOString() })
      .eq("id", docId);
    if (dbErr) toast.error("Metadata save failed");
    else toast.success(`${doc.label} uploaded`);
    setUploadingDocId(null);
    loadDocs();
  };

  const downloadDoc = async (doc: CompanyDoc) => {
    if (!doc.storage_path) return;
    setDownloadingDocId(doc.id);
    const { data, error } = await supabase.storage
      .from("company-docs")
      .createSignedUrl(doc.storage_path, 60);
    setDownloadingDocId(null);
    if (error || !data?.signedUrl) return toast.error("Download failed");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = doc.file_name ?? doc.label;
    a.click();
  };

  const removeDocFile = async (doc: CompanyDoc) => {
    if (!doc.storage_path) return;
    await supabase.storage.from("company-docs").remove([doc.storage_path]);
    await supabase.from("company_documents").update({ file_name: null, storage_path: null }).eq("id", doc.id);
    toast.success("File removed");
    loadDocs();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto pt-12 text-center text-muted-foreground text-sm">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-12">
      <Link
        to="/settings"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>

      <PageHeader
        eyebrow="Admin"
        title="Company Settings"
        description="Manage pay & charge rates and key company documents."
        icon={Building2}
      />

      {/* PAY & CHARGE RATES */}
      <Card className="p-6 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
            <h2 className={SECTION_TITLE}>Pay &amp; Charge Rates</h2>
          </div>
          <button className={BTN_GHOST} onClick={addRate}>
            <Plus className="h-4 w-4" /> Add rate
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 w-6"></th>
                <th className="pb-3 text-xs font-medium text-muted-foreground">Role / Staff Type</th>
                <th className="pb-3 text-xs font-medium text-muted-foreground text-right pr-4 w-40">Candidate Pay/hr</th>
                <th className="pb-3 text-xs font-medium text-muted-foreground text-right pr-4 w-40">Client Charge/hr</th>
                <th className="pb-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rates.map((rate) => (
                <tr key={rate.id} className="group">
                  <td className="py-2.5 pr-2 text-muted-foreground/30 align-middle">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="py-2.5 pr-3 align-middle">
                    <input
                      className={INPUT}
                      value={rate.role_name}
                      placeholder="e.g. Nanny"
                      onChange={(e) => updateRateField(rate.id, "role_name", e.target.value)}
                    />
                  </td>
                  <td className="py-2.5 pr-4 align-middle">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">£</span>
                      <input
                        className={INPUT + " pl-6 text-right"}
                        type="number"
                        step="0.50"
                        min="0"
                        value={rate.candidate_pay}
                        onChange={(e) => updateRateField(rate.id, "candidate_pay", e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 align-middle">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">£</span>
                      <input
                        className={INPUT + " pl-6 text-right"}
                        type="number"
                        step="0.50"
                        min="0"
                        value={rate.client_charge}
                        onChange={(e) => updateRateField(rate.id, "client_charge", e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 align-middle">
                    <div className="flex items-center gap-1.5 justify-end">
                      {rate._dirty && (
                        <button
                          className={BTN_PRIMARY + " py-1.5 px-3 text-xs"}
                          onClick={() => saveRate(rate)}
                          disabled={savingRateId === rate.id}
                        >
                          {savingRateId === rate.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Save className="h-3 w-3" />}
                          Save
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        onClick={() => deleteRate(rate)}
                        disabled={deletingRateId === rate.id}
                        title="Delete"
                      >
                        {deletingRateId === rate.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                    No rates yet — click &ldquo;Add rate&rdquo; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          A <strong>Save</strong> button appears on each row when you make changes.
        </p>
      </Card>

      {/* KEY DOCUMENTS */}
      <Card className="p-6 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className={SECTION_TITLE}>Key Documents</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Upload your standard company documents. All team members can download them.
        </p>

        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-background/50"
            >
              <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{doc.label}</div>
                {doc.file_name ? (
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{doc.file_name}</div>
                ) : (
                  <div className="text-xs text-muted-foreground/50 mt-0.5 italic">No file uploaded</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.storage_path && (
                  <>
                    <button
                      className={BTN_GHOST}
                      onClick={() => downloadDoc(doc)}
                      disabled={downloadingDocId === doc.id}
                    >
                      {downloadingDocId === doc.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                      Download
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      onClick={() => removeDocFile(doc)}
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  className={BTN_GHOST}
                  onClick={() => triggerUpload(doc.id)}
                  disabled={uploadingDocId === doc.id}
                >
                  {uploadingDocId === doc.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  {doc.storage_path ? "Replace" : "Upload"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={handleFileSelected}
      />
    </div>
  );
}
