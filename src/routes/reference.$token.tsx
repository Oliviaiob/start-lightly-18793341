import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reference/$token")({
  component: ReferencePage,
});

type ReferenceData = {
  id: string;
  referee_name: string | null;
  company_name: string | null;
  ref_type: string | null;
  ref_number: number | null;
  received_at: string | null;
  candidates: { first_name: string | null; last_name: string | null } | null;
};

type FormState = {
  response_relationship: string;
  response_known_duration: string;
  response_honesty_rating: string;
  response_conduct_rating: string;
  response_teamwork_rating: string;
  response_suitable_for_children: boolean | null;
  response_disciplinary_awareness: boolean | null;
  response_disciplinary_notes: string;
  response_suitability_notes: string;
  response_additional_comments: string;
  response_signature_name: string;
  response_declaration_agreed: boolean;
};

const RATINGS = ["Excellent", "Good", "Satisfactory", "Poor"] as const;

function RatingSelect({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              value === r
                ? "bg-[#1B2B4B] text-white border-[#1B2B4B]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoSelect({
  label, sublabel, value, onChange,
}: { label: string; sublabel?: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors ${
              value === v
                ? v ? "bg-green-600 text-white border-green-600" : "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Page({ reference, token }: { reference: ReferenceData; token: string }) {
  const cand = reference.candidates;
  const candidateName = `${cand?.first_name ?? ""} ${cand?.last_name ?? ""}`.trim() || "the applicant";
  const refTypeLabel = reference.ref_type === "character" ? "Character Reference" : "Work Reference";

  const [form, setForm] = useState<FormState>({
    response_relationship: "",
    response_known_duration: "",
    response_honesty_rating: "",
    response_conduct_rating: "",
    response_teamwork_rating: "",
    response_suitable_for_children: null,
    response_disciplinary_awareness: null,
    response_disciplinary_notes: "",
    response_suitability_notes: "",
    response_additional_comments: "",
    response_signature_name: "",
    response_declaration_agreed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.response_declaration_agreed) {
      toast.error("Please tick the declaration checkbox to submit.");
      return;
    }
    if (!form.response_signature_name.trim()) {
      toast.error("Please enter your full name to sign the form.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("references")
      .update({
        ...form,
        received_at: new Date().toISOString(),
        response_submitted_at: new Date().toISOString(),
        status: "received",
      })
      .eq("unique_token", token);

    if (error) {
      toast.error("Submission failed — please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reference submitted</h1>
          <p className="text-gray-500">
            Thank you, {reference.referee_name ?? ""}. Your reference for {candidateName} has been received.
            We appreciate you taking the time.
          </p>
          <p className="text-sm text-gray-400">You may now close this window.</p>
        </div>
      </div>
    );
  }

  if (reference.received_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Already submitted</h1>
          <p className="text-gray-500">
            This reference for {candidateName} has already been completed. Thank you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#1B2B4B] rounded-xl px-6 py-5 text-white">
          <p className="text-[#2DD4BF] text-xs font-semibold uppercase tracking-wider mb-1">SOAR Recruitment</p>
          <h1 className="text-xl font-bold">{refTypeLabel}</h1>
          <p className="text-sm text-white/70 mt-1">
            For applicant: <span className="text-white font-medium">{candidateName}</span>
          </p>
        </div>

        <p className="text-sm text-gray-500 px-1">
          Thank you for agreeing to provide a reference. Please complete all sections as fully as possible.
          Your response will be kept confidential.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1 — About you */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">About your relationship</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                How do you know {candidateName}?
              </label>
              <input
                type="text"
                value={form.response_relationship}
                onChange={(e) => set("response_relationship", e.target.value)}
                placeholder="e.g. Direct line manager, colleague, tutor…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">How long have you known them?</label>
              <input
                type="text"
                value={form.response_known_duration}
                onChange={(e) => set("response_known_duration", e.target.value)}
                placeholder="e.g. 3 years, 6 months…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50"
              />
            </div>
          </div>

          {/* Section 2 — Ratings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Performance ratings</h2>

            <RatingSelect
              label="Honesty &amp; integrity"
              value={form.response_honesty_rating}
              onChange={(v) => set("response_honesty_rating", v)}
            />
            <RatingSelect
              label="Professional conduct"
              value={form.response_conduct_rating}
              onChange={(v) => set("response_conduct_rating", v)}
            />
            <RatingSelect
              label="Teamwork &amp; communication"
              value={form.response_teamwork_rating}
              onChange={(v) => set("response_teamwork_rating", v)}
            />
          </div>

          {/* Section 3 — Children / Disciplinary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Safeguarding</h2>

            <YesNoSelect
              label={`Would you consider ${candidateName} suitable to work with children?`}
              value={form.response_suitable_for_children}
              onChange={(v) => set("response_suitable_for_children", v)}
            />

            <YesNoSelect
              label="Are you aware of any disciplinary proceedings?"
              sublabel="Including any formal warnings, dismissals, or ongoing investigations"
              value={form.response_disciplinary_awareness}
              onChange={(v) => set("response_disciplinary_awareness", v)}
            />

            {form.response_disciplinary_awareness === true && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Please provide details</label>
                <textarea
                  value={form.response_disciplinary_notes}
                  onChange={(e) => set("response_disciplinary_notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50 resize-none"
                  placeholder="Please describe the proceedings…"
                />
              </div>
            )}
          </div>

          {/* Section 4 — Comments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Overall comments</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Suitability for this role
              </label>
              <textarea
                value={form.response_suitability_notes}
                onChange={(e) => set("response_suitability_notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50 resize-none"
                placeholder={`Please comment on ${candidateName}'s suitability for working with children in an educational or childcare setting…`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Any additional comments</label>
              <textarea
                value={form.response_additional_comments}
                onChange={(e) => set("response_additional_comments", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50 resize-none"
                placeholder="Anything else you'd like to add…"
              />
            </div>
          </div>

          {/* Section 5 — Declaration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Declaration &amp; signature</h2>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Your full name</label>
              <input
                type="text"
                value={form.response_signature_name}
                onChange={(e) => set("response_signature_name", e.target.value)}
                placeholder="Sign with your full name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/50"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.response_declaration_agreed}
                onChange={(e) => set("response_declaration_agreed", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#2DD4BF]"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                I confirm that the information I have provided in this reference is accurate and truthful to the best of
                my knowledge, and I understand it will be used as part of the candidate's employment vetting process.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1B2B4B] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Reference"}
          </button>

          <p className="text-center text-xs text-gray-400 pb-6">
            SOAR Recruitment · This form is confidential and will only be seen by compliance staff.
          </p>
        </form>
      </div>
    </div>
  );
}

function ReferencePage() {
  const { token } = Route.useParams();
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("references")
      .select("id, referee_name, company_name, ref_type, ref_number, received_at, candidates!candidate_id(first_name, last_name)")
      .eq("unique_token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setReference(data as unknown as ReferenceData);
        }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (notFound || !reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">Link not found</h1>
          <p className="text-gray-500">
            This reference link is invalid or has expired. Please contact SOAR Recruitment if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <Page reference={reference} token={token} />;
}
