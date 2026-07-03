import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/placements")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Operations"
        title="Placements"
        description="Permanent hires and long-term placements across your clients."
        icon={Trophy}
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Placements list coming soon.</p>
      </Card>
    </div>
  );
}
