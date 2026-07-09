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
  Activity as ActivityIcon,
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

type InterviewRow = {
  id: string;
  interview_date: string | null;
  interview_time: string | null;
  interview_type: string | null;
  pipeline?: {
    candidate?: { id: string; first_name: string | null; last_name: string | null } | null;
    job?: { id: string; title: string | null; client?: { company_name: string | null } | null } | null;
  } | null;
};

type ShiftRow = {
  id: string;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  shift_status: string | null;
  booking?: { client?: { company_name: string | null } | null } | null;
};

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  qualification_level: string | null;
  candidate_type: string | null;
};

type ActivityRow = {
  id: string;
  activity_type: string | null;
  description: string | null;
  entity_type: string | null;
  created_at: string | null;
};

function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [starred, setStarred] = useState<Candidate[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const scope = useEffectiveScope({ dashboard: true });
  const { userId } = useScope();

  useEffect(() => {
    if (!userId) return;
    const mine = scope === "mine";
    const withScope = <Q extends { eq: (c: string, v: string) => Q }>(q: Q): Q =>
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
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      const today = now.toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const startMonthDate = startOfMonth.toISOString().slice(0, 10);
      const endMonthDate = endOfMonth.toISOString().slice(0, 10);
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
        withScope(supabase.from("candidates").select("id", { count: "exact", head: true })),
        withScope(supabase.from("jobs").select("id", { count: "exact", head: true }).in("status", ["Live", "Interviewing"])),
        withScope(
          supabase
            .from("interview_details")
            .select("id", { count: "exact", head: true })
            .gte("interview_date", startMonthDate)
            .lt("interview_date", endMonthDate),
        ),
        withScope(
          supabase
            .from("temp_shifts")
            .select("id", { count: "exact", head: true })
            .gte("shift_date", weekStartDate)
            .lt("shift_date", weekEndDate),
        ),
        withScope(
          supabase
            .from("placements")
            .select("id", { count: "exact", head: true })
            .gte("start_date", startMonthDate)
            .lt("start_date", endMonthDate),
        ),
        withScope(
          supabase
            .from("compliance_checklists")
            .select("id", { count: "exact", head: true })
            .neq("overall_status", "completed"),
        ),
        withScope(
          supabase
            .from("interview_details")
            .select(
              "id, interview_date, interview_time, interview_type, pipeline:job_pipeline!pipeline_id(candidate:candidates(id, first_name, last_name), job:jobs(id, title, client:clients(company_name)))",
            )
            .gte("interview_date", sevenDaysAgo)
            .order("interview_date", { ascending: false })
            .order("interview_time", { ascending: false })
            .limit(5),
        ),
        withScope(
          supabase
            .from("temp_shifts")
            .select("id, shift_date, start_time, end_time, status, shift_status, booking:bookings!booking_id(client:clients(company_name))")
            .gte("shift_date", today)
            .neq("shift_status", "cancelled")
            .order("shift_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(5),
        ),
        withScope(
          supabase
            .from("candidates")
            .select("id, first_name, last_name, qualification_level, candidate_type")
            .eq("is_starred", true)
            .limit(5),
        ),
        supabase
          .from("activity_log")
          .select("id, activity_type, description, entity_type, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setStats({
        activeCandidates: candidatesRes.count || 0,
        openJobs: jobsRes.count || 0,
        interviewsThisMonth: interviewsMonthRes.count || 0,
        tempBookedThisWeek: shiftsWeekRes.count || 0,
        placementsThisMonth: placementsMonthRes.count || 0,
        pendingCompliance: pendingComplianceRes.count || 0,
      });
      setInterviews((upcomingInterviewsRes.data as unknown as InterviewRow[]) || []);
      setShifts((upcomingShiftsRes.data as unknown as ShiftRow[]) || []);
      setStarred((starredRes.data as Candidate[]) || []);
      setActivity((activityRes.data as unknown as ActivityRow[]) || []);
      setLoading(false);
    })();
  }, [userId, scope]);

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
            <h2 className="font-semibold">Recent & Upcoming Interviews</h2>
            <Link to="/interviews" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
          {interviews.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No interviews in the last 7 days</div>
          ) : (
            <ul className="divide-y">
              {interviews.map((i) => {
                const cand = i.pipeline?.candidate;
                const job = i.pipeline?.job;
                const when = i.interview_date
                  ? `${new Date(i.interview_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${i.interview_time ? ` · ${i.interview_time.slice(0, 5)}` : ""}`
                  : "—";
                return (
                  <li key={i.id} className="py-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy grid place-items-center shrink-0">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {cand ? `${cand.first_name ?? ""} ${cand.last_name ?? ""}`.trim() || "Candidate" : "Candidate"}
                        <span className="text-muted-foreground font-normal"> · {job?.client?.company_name || "—"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {job?.title || "—"}{i.interview_type ? ` · ${i.interview_type}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{when}</div>
                  </li>
                );
              })}
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
                    <div className="font-medium text-sm truncate">{s.booking?.client?.company_name || "Booking"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.start_time?.slice(0, 5)}{s.end_time ? `–${s.end_time.slice(0, 5)}` : ""}
                    </div>
                  </div>
                  <div className="text-xs shrink-0 flex flex-col items-end gap-1">
                    <span className="text-muted-foreground">
                      {s.shift_date ? new Date(s.shift_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                    </span>
                    {(s.shift_status || s.status) && (
                      <Badge variant="secondary" className="text-[10px]">{s.shift_status || s.status}</Badge>
                    )}
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
                <Link
                  key={c.id}
                  to="/candidates/$id"
                  params={{ id: c.id }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-navy text-navy-foreground text-xs">
                      {initials(c.first_name, c.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.first_name} {c.last_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.qualification_level || c.candidate_type || "—"}</div>
                  </div>
                </Link>
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
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted text-foreground grid place-items-center shrink-0">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {a.description || `${a.activity_type || "Updated"} ${a.entity_type || ""}`.trim()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{relativeTime(a.created_at)}</div>
                  </div>
                </li>
              ))}
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
