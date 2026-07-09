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
  Activity,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  Building,
  Sparkles,
  MessageSquare,
  ClipboardList,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { title: string; url: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; exact?: boolean; iconColor?: string };

const overview: NavItem[] = [{ title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true }];
const recruitment: NavItem[] = [
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Clients", url: "/clients", icon: Building2 },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Interviews", url: "/interviews", icon: CalendarCheck },
];
const operations: NavItem[] = [
  { title: "Booking Board", url: "/bookings", icon: CalendarRange },
  { title: "Timesheets", url: "/timesheets", icon: ClipboardList },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  { title: "Map", url: "/map", icon: MapIcon },
];
const workspace: NavItem[] = [
  { title: "Placements", url: "/placements", icon: Trophy },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Sammie", url: "/sammie", icon: Sparkles, iconColor: "text-teal" },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    display_name: string | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null>(null);

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
                  className="relative h-9 rounded-lg mx-1 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold hover:bg-sidebar-accent/60 hover:text-sidebar-foreground text-sidebar-foreground/70"
                >
                  <Link to={item.url}>
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
                    )}
                    <item.icon className={`h-4 w-4 ${item.iconColor ?? ""}`} />
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
    <Sidebar collapsible="icon" className="border-r-0 z-30">
      <SidebarHeader className="pt-4 pb-3">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2 px-2`}>
          <div className={`flex items-center gap-3 ${collapsed ? "" : "px-1"}`}>
            <img
              src="https://ltpsljknjenpomsxixlx.supabase.co/storage/v1/object/public/brand/favicon-icon.png"
              alt="Soar"
              className="w-9 h-9 rounded-xl shrink-0 object-contain bg-navy shadow-sm"
            />
            {!collapsed && (
              <img
                src="https://ltpsljknjenpomsxixlx.supabase.co/storage/v1/object/public/brand/Logo-white.png"
                alt="Soar Recruitment"
                className="h-7 object-contain object-left max-w-[100px]"
              />
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {renderGroup("Overview", overview)}
        {renderGroup("PERMANENT", recruitment)}
        {renderGroup("TEMPORARY", operations)}
        {renderGroup("Workspace", workspace)}
      </SidebarContent>

      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-5 translate-x-1/2 z-20 hidden md:grid h-6 w-6 place-items-center rounded-full bg-sidebar border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent shadow-sm transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <SidebarFooter className="border-t border-sidebar-border/50 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName}
                  className="rounded-lg mx-1 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:justify-center h-12 hover:bg-sidebar-accent/60 text-sidebar-foreground data-[state=open]:bg-sidebar-accent/60"
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
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
                      <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/40 rotate-90" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-60 rounded-xl">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Switch context
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">
                    <UserCircle2 className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">My Account</div>
                      <div className="text-[11px] text-muted-foreground">Personal profile & preferences</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Building className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Company Settings</div>
                      <div className="text-[11px] text-muted-foreground">Rates, team & workspace</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
