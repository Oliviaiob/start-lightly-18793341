import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { UserRound, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: Page,
});

type Candidate = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  postcode: string | null;
  candidate_type: string | null;
  status_perm: string | null;
  status_temp: string | null;
  qualification_level: string | null;
  current_position: string | null;
  current_employer: string | null;
};

function Page() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("candidates")
        .select(
          "first_name,last_name,email,phone,town,postcode,candidate_type,status_perm,status_temp,qualification_level,current_position,current_employer",
        )
        .eq("id", id)
        .maybeSingle();
      setC(data as Candidate | null);
      setLoading(false);
    })();
  }, [id]);

  const name = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidate" : "Candidate";

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Candidate"
        title={loading ? "Loading…" : name}
        description={c?.current_position ? `${c.current_position}${c.current_employer ? ` · ${c.current_employer}` : ""}` : undefined}
        icon={UserRound}
        actions={
          <Link
            to="/candidates"
            className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/10 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        }
      />
      <Card className="p-8 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        {loading ? (
          <p className="text-muted-foreground">Loading candidate…</p>
        ) : !c ? (
          <p className="text-muted-foreground">Candidate not found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <Field label="Email" value={c.email} />
            <Field label="Phone" value={c.phone} />
            <Field label="Location" value={[c.town, c.postcode].filter(Boolean).join(" · ")} />
            <Field label="Type" value={c.candidate_type} />
            <Field label="Perm Status" value={c.status_perm} />
            <Field label="Temp Status" value={c.status_temp} />
            <Field label="Qualification" value={c.qualification_level} />
            <Field label="Current Role" value={c.current_position} />
            <Field label="Employer" value={c.current_employer} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</div>
      <div className="mt-1 font-medium">{value || "—"}</div>
    </div>
  );
}
