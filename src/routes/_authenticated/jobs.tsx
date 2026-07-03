import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight capitalize mb-1">jobs</h1>
      <p className="text-sm text-muted-foreground mb-6">This page will be built next.</p>
      <Card className="p-12 text-center border-transparent shadow-sm">
        <p className="text-muted-foreground">Coming soon — the jobs module.</p>
      </Card>
    </div>
  );
}
