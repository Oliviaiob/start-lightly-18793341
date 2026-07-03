import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  Trophy,
  ShieldAlert,
  ArrowUpRight,
  Star,
} from "lucide-react";
import { NotesCard } from "@/components/notes-card";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

type Stats = {
  activeCandidates: number;
  openJobs: number;
  interviewsThisMonth: number;
  tempBookedThisWeek: number;
  placementsThisMonth: number;
  pendingCompliance: number;
};

type Interview = {
  id: string;
  scheduled_at: string | null;
  interview_type: string | null;
  candidate?: { first_name: string | null; last_name: string | null } | null;
  job?: { title: string | null; client?: { name: string | null } | null } | null;
};

type Shift = {
  id: string;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  client?: { name: string | null } | null;
};

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  qualification_level: string | null;
  candidate_type: string | null;
};

type Activity = {
  id: string;
  action: string | null;
  entity_type: string | null;
  created_at: string | null;
  actor?: { display_name: string | null; first_name: string | null; last_name: string | null } | null;
};

function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

function StatCard({
  to,
  label,
  value,
  icon: Icon,
  accent = "navy",
  trend,
}: {
  to: string;
  label: string;
  value: number | string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: "navy" | "teal" | "warning" | "success";
  trend?: string;
}) {
  const accentClasses: Record<string, string> = {
    navy: "bg-navy/8 text-navy",
    teal: "bg-teal/25 text-teal-foreground",
    warning: "bg-warning/25 text-[oklch(0.45_0.12_75)]",
    success: "bg-success/20 text-[oklch(0.4_0.12_155)]",
  };
  return (
    <Link to={to} className="group">
      <Card className="p-5 border-transparent shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 rounded-2xl bg-card h-full">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-11 h-11 rounded-xl grid place-items-center ${accentClasses[accent]}`}>
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-navy group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
          {label}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <div className="text-[28px] font-bold tracking-tight leading-none">{value}</div>
          {trend && <span className="text-[11px] font-medium text-success">{trend}</span>}
        </div>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const [greeting, setGreeting] = useState("Welcome");
  const [displayName, setDisplayName] = useState<string>("");
  const [stats, setStats] = useState<Stats>({
    activeCandidates: 0,
    openJobs: 0,
    interviewsThisMonth: 0,
    tempBookedThisWeek: 0,
    placementsThisMonth: 0,
    pendingCompliance: 0,
  });
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [starred, setStarred] = useState<Candidate[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const scope = useEffectiveScope({ dashboard: true });
  const { userId } = useScope();

  useEffect(() => {
    if (!userId) return;
    const mine = scope === "mine";
    const scoped = <T extends { eq: (col: string, val: string) => T }>(q: T): T =>
      mine ? q.eq("created_by", userId) : q;
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("id", userData.user.id)
          .maybeSingle();
        setDisplayName(prof?.display_name || prof?.first_name || "");
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      const today = now.toISOString().slice(0, 10);
      const weekStartDate = startOfWeek.toISOString().slice(0, 10);
      const weekEndDate = endOfWeek.toISOString().slice(0, 10);

      const [
        candidatesRes,
        jobsRes,
        interviewsMonthRes,
        shiftsWeekRes,
        placementsMonthRes,
        pendingComplianceRes,
        upcomingInterviewsRes,
        upcomingShiftsRes,
        starredRes,
        activityRes,
      ] = await Promise.all([
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).in("status", ["Live", "Interviewing"]),
        supabase
          .from("interview_details")
          .select("id", { count: "exact", head: true })
          .gte("scheduled_at", startOfMonth)
          .lt("scheduled_at", endOfMonth),
        supabase
          .from("temp_shifts")
          .select("id", { count: "exact", head: true })
          .gte("shift_date", weekStartDate)
          .lt("shift_date", weekEndDate),
        supabase
          .from("placements")
          .select("id", { count: "exact", head: true })
          .gte("start_date", startOfMonth.slice(0, 10))
          .lt("start_date", endOfMonth.slice(0, 10)),
        supabase
          .from("compliance_checklists")
          .select("id", { count: "exact", head: true })
          .neq("overall_status", "completed"),
        supabase
          .from("interview_details")
          .select("id, scheduled_at, interview_type, candidate:candidates(first_name,last_name), job:jobs(title, client:clients(name))")
          .gte("scheduled_at", now.toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5),
        supabase
          .from("temp_shifts")
          .select("id, shift_date, start_time, end_time, status, client:clients(name)")
          .gte("shift_date", today)
          .order("shift_date", { ascending: true })
          .limit(5),
        supabase
          .from("candidates")
          .select("id, first_name, last_name, qualification_level, candidate_type")
          .eq("is_starred", true)
          .limit(8),
        supabase
          .from("activity_log")
          .select("id, action, entity_type, created_at, actor:profiles(display_name, first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setStats({
        activeCandidates: candidatesRes.count || 0,
        openJobs: jobsRes.count || 0,
        interviewsThisMonth: interviewsMonthRes.count || 0,
        tempBookedThisWeek: shiftsWeekRes.count || 0,
        placementsThisMonth: placementsMonthRes.count || 0,
        pendingCompliance: pendingComplianceRes.count || 0,
      });
      setInterviews((upcomingInterviewsRes.data as unknown as Interview[]) || []);
      setShifts((upcomingShiftsRes.data as unknown as Shift[]) || []);
      setStarred((starredRes.data as Candidate[]) || []);
      setActivity((activityRes.data as unknown as Activity[]) || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <Card className="relative overflow-hidden p-6 md:p-7 border-transparent rounded-2xl bg-gradient-to-br from-navy via-navy to-[oklch(0.3_0.08_260)] text-navy-foreground shadow-[var(--shadow-card)]">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-teal/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs text-navy-foreground/60 font-medium">{today}</div>
            <h1 className="mt-1 text-2xl md:text-[28px] font-bold tracking-tight">
              {greeting}{displayName ? `, ${displayName}` : ""} 👋
            </h1>
            <p className="text-sm text-navy-foreground/70 mt-1.5 max-w-xl">
              Here's what's happening across your recruitment pipeline today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/candidates" className="h-9 px-4 grid place-items-center rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              View candidates
            </Link>
            <Link to="/jobs" className="h-9 px-4 grid place-items-center rounded-full bg-white/10 text-navy-foreground text-sm font-medium hover:bg-white/20 transition-colors border border-white/10">
              Open jobs
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard to="/candidates" label="Active Candidates" value={loading ? "…" : stats.activeCandidates} icon={Users} accent="navy" />
        <StatCard to="/jobs" label="Open Jobs" value={loading ? "…" : stats.openJobs} icon={Briefcase} accent="navy" />
        <StatCard to="/interviews" label="Interviews / Month" value={loading ? "…" : stats.interviewsThisMonth} icon={CalendarCheck} accent="teal" />
        <StatCard to="/bookings" label="Temp / Week" value={loading ? "…" : stats.tempBookedThisWeek} icon={CalendarRange} accent="teal" />
        <StatCard to="/placements" label="Placements / Month" value={loading ? "…" : stats.placementsThisMonth} icon={Trophy} accent="success" />
        <StatCard to="/compliance" label="Pending Compliance" value={loading ? "…" : stats.pendingCompliance} icon={ShieldAlert} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming Interviews</h2>
            <Link to="/interviews" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
          {interviews.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No upcoming interviews</div>
          ) : (
            <ul className="divide-y">
              {interviews.map((i) => (
                <li key={i.id} className="py-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy grid place-items-center shrink-0">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {i.candidate?.first_name} {i.candidate?.last_name}
                      <span className="text-muted-foreground font-normal"> · {i.job?.client?.name || "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.job?.title || "—"} {i.interview_type ? `· ${i.interview_type}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming Shifts</h2>
            <Link to="/bookings" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
          {shifts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No upcoming shifts</div>
          ) : (
            <ul className="divide-y">
              {shifts.map((s) => (
                <li key={s.id} className="py-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal/20 text-teal-foreground grid place-items-center shrink-0">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{s.client?.name || "Booking"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.start_time?.slice(0, 5)}{s.end_time ? `–${s.end_time.slice(0, 5)}` : ""}
                    </div>
                  </div>
                  <div className="text-xs shrink-0 flex flex-col items-end gap-1">
                    <span className="text-muted-foreground">
                      {s.shift_date ? new Date(s.shift_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                    </span>
                    {s.status && <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-warning fill-warning" /> Starred Candidates</h2>
            <Link to="/candidates" className="text-xs text-muted-foreground hover:text-foreground">All</Link>
          </div>
          {starred.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No starred candidates yet</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {starred.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-navy text-navy-foreground text-xs">
                      {initials(c.first_name, c.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.first_name} {c.last_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.qualification_level || c.candidate_type || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No recent activity</div>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => {
                const name = a.actor?.display_name || [a.actor?.first_name, a.actor?.last_name].filter(Boolean).join(" ") || "Someone";
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-foreground text-[10px]">
                        {name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{name}</span>{" "}
                        <span className="text-muted-foreground">{a.action || "updated"} {a.entity_type || ""}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <NotesCard />
      </div>
    </div>
  );
}
