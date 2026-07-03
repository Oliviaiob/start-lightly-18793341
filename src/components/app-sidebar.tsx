import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  Trophy,
  ShieldCheck,
  Map as MapIcon,
  Settings,
  LogOut,
  ChevronsUpDown,
  Activity,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const overview: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
];

const recruitment: NavItem[] = [
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Clients", url: "/clients", icon: Building2 },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Interviews", url: "/interviews", icon: CalendarCheck },
];

const operations: NavItem[] = [
  { title: "Booking Board", url: "/bookings", icon: CalendarRange },
  { title: "Placements", url: "/placements", icon: Trophy },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  { title: "Map", url: "/map", icon: MapIcon },
];

const workspace: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; email: string | null; first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email, first_name, last_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile({
        display_name: data?.display_name || [data?.first_name, data?.last_name].filter(Boolean).join(" ") || null,
        email: data?.email || userData.user.email || null,
        first_name: data?.first_name || null,
        last_name: data?.last_name || null,
      });
    })();
  }, []);

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-semibold uppercase tracking-[0.14em] px-3 mt-2">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url, item.exact);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                  className="relative h-9 rounded-lg mx-1 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold hover:bg-sidebar-accent/60 hover:text-sidebar-foreground text-sidebar-foreground/70"
                >
                  <Link to={item.url}>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
                    )}
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const displayName = profile?.display_name || "User";
  const initials = `${profile?.first_name?.[0] || displayName[0] || "?"}${profile?.last_name?.[0] || ""}`.toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="pt-4 pb-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal to-sidebar-primary text-teal-foreground grid place-items-center shrink-0 shadow-sm">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sidebar-foreground font-semibold text-sm tracking-tight truncate">SOAR</div>
              <div className="text-sidebar-foreground/50 text-[11px] truncate">Recruitment CRM</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {renderGroup("Overview", overview)}
        {renderGroup("Recruitment", recruitment)}
        {renderGroup("Operations", operations)}
        {renderGroup("Workspace", workspace)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={displayName}
              className="rounded-lg mx-1 h-12 hover:bg-sidebar-accent/60 text-sidebar-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="grid flex-1 text-left leading-tight min-w-0">
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    <span className="text-[11px] text-sidebar-foreground/50 truncate">{profile?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 text-sidebar-foreground/40" />
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="rounded-lg mx-1 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
