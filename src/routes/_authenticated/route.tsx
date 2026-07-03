import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsMenu } from "@/components/notifications-menu";
import { QuickAddMenu } from "@/components/quick-add-menu";
import { ScopeProvider } from "@/contexts/scope-context";
import { ScopeToggle } from "@/components/scope-toggle";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <ScopeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 flex items-center gap-3 px-6 sticky top-0 z-20 bg-background/70 backdrop-blur-xl">
              <GlobalSearch />
              <div className="flex-1" />
              <ScopeToggle />
              <button
                className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <NotificationsMenu />
              <QuickAddMenu />
            </header>
            <main className="flex-1 px-6 md:px-8 pb-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ScopeProvider>
  );
}
