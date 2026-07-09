import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, GraduationCap, Building2, ChevronLeft, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/apply/$ref")({
  component: JobApplyPage,
});

type Job = {
  id: string;
  job_reference: string;
  title: string;
  description: string | null;
  description_soar: string | null;
  advertising_notes: string | null;
  salary_min: number | null;
  salary_max: number | null;
  hours: string | null;
  room: string | null;
  location_postcode: string | null;
  qualification_required: string | null;
  posted_at: string | null;
  clients: { name: string; town: string | null; address_line1: string | null } | null;
};

const QUALS = [
  "Level 2 Early Years Practitioner",
  "Level 3 Early Years Educator",
  "Level 4",
  "Level 5",
  "Level 6 / Degree",
  "PGCE / QTS",
  "Unqualified / No formal qualification",
];

function fmtSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => `£${n.toLocaleString("en-GB")}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} per year`;
  if (min) return `From ${fmt(min)} per year`;
  return `Up to ${fmt(max!)} per year`;
}

type FormState = {
  first_name: string; last_name: string; email: string; phone: string;
  postcode: string; qualification: string; cover_note: string;
  cv: File | null;
};

export default function JobApplyPage() {
  const { ref } = Route.useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<FormState>({
    first_name: "", last_name: "", email: "", phone: "",
    postcode: "", qualification: "", cover_note: "", cv: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, job_reference, title, description, description_soar, advertising_notes, salary_min, salary_max, hours, room, location_postcode, qualification_required, posted_at, clients(name, town, address_line1)")
      .eq("job_reference", ref)
      .eq("status", "live")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); } else { setJob(data as Job); }
        setLoading(false);
      });
  }, [ref]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.cv) { setError("Please attach your CV before submitting."); return; }
    if (!form.qualification) { setError("Please select your qualification level."); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("job_id", job!.id);
      fd.append("job_reference", job!.job_reference);
      fd.append("first_name", form.first_name);
      fd.append("last_name", form.last_name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("postcode", form.postcode);
      fd.append("qualification_level", form.qualification);
      fd.append("cover_note", form.cover_note);
      fd.append("cv", form.cv);
      fd.append("source", "jobs_site");

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-application`,
        {
          method: "POST",
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: fd,
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-2xl font-bold text-slate-900">Role not found</h1>
      <p className="text-slate-500">This role may have been filled or the link has expired.</p>
      <Link to="/apply/" className="text-teal-600 hover:underline text-sm">Browse all roles →</Link>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center gap-5 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-teal-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Application received</h1>
        <p className="text-slate-500 max-w-sm">Thanks {form.first_name}! We'll review your application for <strong>{job?.title}</strong> and be in touch shortly.</p>
      </div>
      <Link to="/apply/" className="text-sm text-teal-600 hover:underline">Browse more roles →</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-[#0a1628] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link to="/apply/" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-5 transition-colors">
            <ChevronLeft className="h-4 w-4" /> All roles
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-slate-400">{job!.job_reference}</span>
            {job!.room && <span className="text-xs bg-teal-400/20 text-teal-300 rounded-full px-2.5 py-0.5">{job!.room}</span>}
          </div>
          <h1 className="text-2xl font-bold mb-1">{job!.title}</h1>
          {job!.clients && (
            <div className="flex items-center gap-1.5 text-slate-300 text-sm">
              <Building2 className="h-3.5 w-3.5" />
              {job!.clients.name}{job!.clients.town ? ` · ${job!.clients.town}` : ""}
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-300">
            {fmtSalary(job!.salary_min, job!.salary_max) && (
              <span className="text-teal-300 font-semibold">{fmtSalary(job!.salary_min, job!.salary_max)}</span>
            )}
            {job!.hours && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job!.hours}</span>}
            {job!.location_postcode && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job!.location_postcode}</span>}
            {job!.qualification_required && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Min. {job!.qualification_required}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_340px] gap-6">
        {/* Job description */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-3">About the role</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {job!.description_soar ?? job!.description ?? job!.advertising_notes ?? "Full role details will be provided on application."}
            </div>
          </div>
        </div>

        {/* Application form */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-4">
            <h2 className="font-semibold text-slate-900 mb-4">Apply for this role</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="First name" required>
                  <input className={input} value={form.first_name} onChange={set("first_name")} required placeholder="Jane" />
                </Field>
                <Field label="Last name" required>
                  <input className={input} value={form.last_name} onChange={set("last_name")} required placeholder="Smith" />
                </Field>
              </div>
              <Field label="Email" required>
                <input type="email" className={input} value={form.email} onChange={set("email")} required placeholder="jane@example.com" />
              </Field>
              <Field label="Phone" required>
                <input type="tel" className={input} value={form.phone} onChange={set("phone")} required placeholder="07700 000000" />
              </Field>
              <Field label="Postcode" required>
                <input className={input} value={form.postcode} onChange={set("postcode")} required placeholder="SW1A 1AA" />
              </Field>
              <Field label="Highest qualification" required>
                <select className={input} value={form.qualification} onChange={set("qualification")} required>
                  <option value="">Select…</option>
                  {QUALS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Cover note (optional)">
                <textarea className={`${input} resize-none h-20`} value={form.cover_note} onChange={set("cover_note")} placeholder="Anything you'd like us to know…" />
              </Field>

              {/* CV upload */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CV <span className="text-red-400">*</span></label>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setForm(f => ({ ...f, cv: e.target.files?.[0] ?? null }))} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-center hover:border-teal-300 hover:bg-teal-50/50 transition-colors cursor-pointer">
                  {form.cv ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-teal-600">
                      <CheckCircle2 className="h-4 w-4" /> {form.cv.name}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                      <Upload className="h-4 w-4" /> Upload CV (PDF or Word)
                    </div>
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#0a1628] text-white text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}
              </button>
              <p className="text-[10px] text-slate-400 text-center">By applying you agree to SOAR Recruitment processing your data for recruitment purposes.</p>
            </form>
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-slate-400">
        © {new Date().getFullYear()} SOAR Recruitment
      </footer>
    </div>
  );
}

const input = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white";
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
