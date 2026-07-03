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
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Clients", url: "/clients", icon: Building2 },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Interviews", url: "/interviews", icon: CalendarCheck },
  { title: "Booking Board", url: "/bookings", icon: CalendarRange },
  { title: "Placements", url: "/placements", icon: Trophy },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  { title: "Map", url: "/map", icon: MapIcon },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; email: string | null } | null>(null);

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
      });
    })();
  }, []);

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="pt-4 pb-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-lg bg-teal text-teal-foreground grid place-items-center font-bold shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sidebar-foreground font-semibold text-sm truncate">SOAR</div>
              <div className="text-sidebar-foreground/60 text-xs truncate">Recruitment CRM</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, "exact" in item ? item.exact : false);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium hover:bg-sidebar-accent/70 hover:text-sidebar-foreground text-sidebar-foreground/80"
                    >
                      <Link to={item.url}>
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {!collapsed && profile && (
            <div className="px-2 py-2 text-xs">
              <div className="text-sidebar-foreground font-medium truncate">{profile.display_name || "User"}</div>
              <div className="text-sidebar-foreground/60 truncate">{profile.email}</div>
            </div>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
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
