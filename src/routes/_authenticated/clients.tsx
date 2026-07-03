import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/clients")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Clients"
        description="Nurseries, families and partners you place candidates with."
        icon={Building2}
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Client directory coming soon.</p>
      </Card>
    </div>
  );
}
