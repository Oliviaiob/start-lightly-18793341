import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/interviews")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Interviews"
        description="Schedule, prepare and follow up on candidate interviews."
        icon={CalendarCheck}
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Interview calendar coming soon.</p>
      </Card>
    </div>
  );
}
