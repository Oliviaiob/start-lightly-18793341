import { createFileRoute } from "@tanstack/react-router";
import { Users, Filter, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Candidates"
        description="Manage your talent pool, track pipeline stages and monitor availability."
        icon={Users}
        actions={
          <>
            <button className="h-9 px-3.5 rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/10 inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <button className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </>
        }
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Candidate list coming soon.</p>
      </Card>
    </div>
  );
}
