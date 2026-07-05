import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  Briefcase,
  ArrowLeft,
  Check,
  Clock,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/$id")({
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
  tob_signed_date: string | null;
  tob_document_url: string | null;
  perm_fee_percentage: number | null;
  temp_rate_per_hour: number | null;
  notes: string | null;
  last_activity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Job = {
  id: string;
  title: string;
  status: string | null;
  qualification_required: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  pipeline_count?: number;
};

function typeLabel(t: string | null) {
  const map: Record<string, string> = {
    nursery: "Nursery",
    school: "School",
    private_family: "Private Family",
    other: "Other",
  };
  return map[t ?? ""] ?? t ?? "—";
}

function statusLabel(s: string | null) {
  const map: Record<string, string> = {
    live: "Live",
    interviewing: "Interviewing",
    filled: "Filled",
    lost: "Lost",
  };
  return map[s ?? ""] ?? s ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
        Active
      </span>
    );
  if (status === "prospect")
    return (
      <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">
        Prospect
      </span>
    );
  return (
    <span className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
      Inactive
    </span>
  );
}

function JobStatusBadge({ status }: { status: string | null }) {
  const colours: Record<string, string> = {
    live: "bg-success/20 text-[oklch(0.4_0.12_155)]",
    interviewing: "bg-teal/20 text-teal-foreground",
    filled: "bg-navy/10 text-navy",
    lost: "bg-destructive/20 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold ${colours[status ?? ""] ?? "bg-muted text-muted-foreground"}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    (async () => {
      const [clientRes, jobsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("jobs")
          .select("id,title,status,qualification_required,salary_min,salary_max,posted_at")
          .eq("client_id", id)
          .order("posted_at", { ascending: false }),
      ]);

      if (clientRes.error) {
        toast.error("Could not load client");
      } else {
        setClient(clientRes.data as Client);
        setNotes(clientRes.data?.notes ?? "");
      }
      setJobs((jobsRes.data as Job[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("clients")
      .update({ notes })
      .eq("id", id);
    setSavingNotes(false);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-[1400px] mx-auto pt-2">
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Client not found.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title={client.company_name}
        description={[typeLabel(client.client_type), client.postcode]
          .filter(Boolean)
          .join(" · ")}
        icon={Building2}
        actions={
          <>
            <button
              onClick={() => navigate({ to: "/clients" })}
              className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/20 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              onClick={() => toast.info("Edit client — coming soon")}
              className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </>
        }
      />

      <div className="flex gap-2 items-center">
        <StatusBadge status={client.status} />
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

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/40 rounded-full h-10 p-1">
          <TabsTrigger value="overview" className="rounded-full text-xs px-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="jobs" className="rounded-full text-xs px-4">
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-full text-xs px-4">
            Notes
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact */}
            <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Primary Contact
              </h3>
              <div className="space-y-3">
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Name" value={client.contact_name} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.contact_email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={client.contact_phone} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={[client.address, client.postcode].filter(Boolean).join(", ")} />
              </div>
            </Card>

            {/* Terms & Rates */}
            <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Terms & Rates
              </h3>
              <div className="space-y-3">
                <InfoRow
                  icon={<FileCheck className="h-4 w-4" />}
                  label="Terms of Business"
                  value={
                    client.tob_signed
                      ? `Signed ${formatDate(client.tob_signed_date)}`
                      : "Not yet signed"
                  }
                />
                {client.tob_document_url && (
                  <a
                    href={client.tob_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal hover:underline"
                  >
                    View document →
                  </a>
                )}
                <InfoRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Perm Fee %"
                  value={
                    client.perm_fee_percentage
                      ? `${client.perm_fee_percentage}%`
                      : null
                  }
                />
                <InfoRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Temp Rate / hr"
                  value={
                    client.temp_rate_per_hour
                      ? `£${client.temp_rate_per_hour.toFixed(2)}`
                      : null
                  }
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Jobs ── */}
        <TabsContent value="jobs" className="mt-4">
          <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
            {jobs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No jobs linked to this client yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                      <th className="text-left font-semibold py-3 px-4">Job Title</th>
                      <th className="text-left font-semibold py-3 px-3">Status</th>
                      <th className="text-left font-semibold py-3 px-3">Qualification</th>
                      <th className="text-left font-semibold py-3 px-3">Salary</th>
                      <th className="text-right font-semibold py-3 px-4">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr
                        key={j.id}
                        onClick={() =>
                          navigate({ to: "/jobs/$id", params: { id: j.id } })
                        }
                        className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium">{j.title}</td>
                        <td className="py-3 px-3">
                          <JobStatusBadge status={j.status} />
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {j.qualification_required ?? "—"}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          {j.salary_min || j.salary_max
                            ? `£${j.salary_min?.toLocaleString() ?? "?"} – £${j.salary_max?.toLocaleString() ?? "?"}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                          {formatDate(j.posted_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes" className="mt-4">
          <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-3">
            <h3 className="text-sm font-semibold">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this client…"
              rows={8}
              className="w-full text-sm bg-muted/40 rounded-xl p-3 border-transparent focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="h-9 px-4 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingNotes ? "Saving…" : "Save Notes"}
              </button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}
