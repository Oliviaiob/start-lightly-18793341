import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Operations"
        title="Booking Board"
        description="Assign temp staff to shifts and manage day-to-day cover."
        icon={CalendarRange}
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Booking board coming soon.</p>
      </Card>
    </div>
  );
}
