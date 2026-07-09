import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, GraduationCap, Building2, Search } from "lucide-react";

export const Route = createFileRoute("/apply/")({
  component: JobsPage,
});

type Job = {
  id: string;
  job_reference: string;
  title: string;
  description: string | null;
  description_soar: string | null;
  salary_min: number | null;
  salary_max: number | null;
  hours: string | null;
  room: string | null;
  location_postcode: string | null;
  qualification_required: string | null;
  posted_at: string | null;
  clients: { name: string; town: string | null } | null;
};

function fmtSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, job_reference, title, description, description_soar, salary_min, salary_max, hours, room, location_postcode, qualification_required, posted_at, clients(name, town)")
      .eq("status", "live")
      .order("posted_at", { ascending: false })
      .then(({ data }) => {
        setJobs((data as Job[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = jobs.filter(j =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    (j.clients?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (j.clients?.town ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-[#0a1628] text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-teal-400 flex items-center justify-center text-[#0a1628] font-bold text-sm">S</div>
            <span className="font-semibold tracking-wide text-sm uppercase text-teal-300">SOAR Recruitment</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Early Years Jobs</h1>
          <p className="text-slate-300 mb-6">Nursery and early years roles across the UK. Find your next position with SOAR.</p>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
              placeholder="Search by job title, nursery, or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Jobs list */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading roles…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {search ? "No roles match your search." : "No roles currently available. Check back soon."}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">{filtered.length} role{filtered.length !== 1 ? "s" : ""} available</p>
            {filtered.map(job => (
              <Link
                key={job.id}
                to="/apply/$ref"
                params={{ ref: job.job_reference }}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-slate-400">{job.job_reference}</span>
                      {job.room && (
                        <span className="text-[10px] bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 font-medium">{job.room}</span>
                      )}
                    </div>
                    <h2 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors text-lg leading-snug">{job.title}</h2>
                    {job.clients && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{job.clients.name}{job.clients.town ? ` · ${job.clients.town}` : ""}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                      {fmtSalary(job.salary_min, job.salary_max) && (
                        <span className="flex items-center gap-1">
                          <span className="text-teal-500 font-semibold">{fmtSalary(job.salary_min, job.salary_max)}</span>
                        </span>
                      )}
                      {job.hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.hours}</span>}
                      {job.location_postcode && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location_postcode}</span>}
                      {job.qualification_required && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{job.qualification_required}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400">{timeAgo(job.posted_at)}</span>
                    <div className="mt-3 text-xs font-medium text-teal-600 group-hover:underline">Apply →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-10 text-xs text-slate-400">
        © {new Date().getFullYear()} SOAR Recruitment · <a href="mailto:hello@soarrecruitment.co.uk" className="hover:text-teal-600">hello@soarrecruitment.co.uk</a>
      </footer>
    </div>
  );
}
