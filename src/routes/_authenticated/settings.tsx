import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Page,
});

function Page() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Workspace"
        title="Company Settings"
        description="Team members, rates, branding and workspace preferences."
        icon={SettingsIcon}
      />
      <Card className="p-12 text-center rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <p className="text-muted-foreground">Settings modules coming soon.</p>
      </Card>
    </div>
  );
}
