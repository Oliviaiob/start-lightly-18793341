import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 px-6 sticky top-0 z-10 bg-background/70 backdrop-blur-xl">
            <SidebarTrigger className="shrink-0" />
            <div className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-full bg-card border border-border/60 text-sm text-muted-foreground w-[320px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <span>Search candidates, jobs, clients…</span>
              <kbd className="ml-auto text-[10px] font-medium border border-border/70 rounded px-1.5 py-0.5 bg-muted text-muted-foreground">⌘K</kbd>
            </div>
            <div className="flex-1" />
            <button className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="Help">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </button>
            <button className="relative h-9 w-9 grid place-items-center rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal ring-2 ring-background" />
            </button>
            <button className="h-9 px-3.5 grid place-items-center rounded-full bg-navy text-navy-foreground text-sm font-medium hover:opacity-90 transition-opacity flex-row flex gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span className="hidden sm:inline">Add new</span>
            </button>
          </header>
          <main className="flex-1 px-6 md:px-8 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
