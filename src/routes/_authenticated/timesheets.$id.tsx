import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle, CheckCircle2, Download, Clock, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timesheets/$id")({
  component: TimesheetDetailPage,
});

type Shift = {
  id: string; shift_date: string; scheduled_start: string; scheduled_end: string;
  submitted_start: string; submitted_end: string; break_minutes: number;
  check_in: string | null; check_out: string | null; shift_status: string;
  hours_discrepancy_flagged: boolean; notes: string | null;
};
type StatusLog = { id: string; previous_status: string | null; new_status: string; changed_by: string | null; note: string | null; created_at: string };
type Submission = {
  id: string; week_ending: string; status: string; role: string | null;
  booking_reference: string | null; approval_method: string | null;
  total_submitted_hours: number | null; total_break_minutes: number | null;
  hours_discrepancy: boolean; pdf_url: string | null;
  candidate_confirmed: boolean; candidate_signed_at: string | null; candidate_signature: string | null;
  manager_name: string | null; manager_position: string | null; manager_signed_at: string | null;
  manager_signature: string | null; manager_email: string | null;
  submitted_at: string | null; approved_at: string | null; paid_at: string | null;
  notes: string | null;
  candidates: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
  clients: { company_name: string; contact_email: string | null } | null;
};

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  in_progress:       { label: "Not Complete",      colour: "bg-slate-100 text-slate-600" },
  awaiting_manager:  { label: "Awaiting Manager",  colour: "bg-amber-50 text-amber-700" },
  submitted_to_soar: { label: "Submitted to SOAR", colour: "bg-purple-50 text-purple-700" },
  approved:          { label: "Approved",           colour: "bg-teal-50 text-teal-700" },
  paid:              { label: "Paid",               colour: "bg-green-50 text-green-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, colour: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.colour}`}>{cfg.label}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : "—"; }
function calcHours(start: string, end: string, breakMin: number) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
  return Math.max(0, mins / 60).toFixed(2);
}

export default function TimesheetDetailPage() {
  const { id } = Route.useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [log, setLog] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [noteText, setNoteText] = useState("");

  const load = async () => {
    const [{ data: s }, { data: sh }, { data: l }] = await Promise.all([
      supabase.from("timesheet_submissions").select(`
        *, candidates(first_name, last_name, email, phone), clients(company_name, contact_email)
      `).eq("id", id).single(),
      supabase.from("timesheet_submission_shifts").select("*").eq("submission_id", id).order("shift_date"),
      supabase.from("timesheet_status_log").select("*").eq("submission_id", id).order("created_at"),
    ]);
    setSub(s as Submission);
    setShifts((sh ?? []) as Shift[]);
    setLog((l ?? []) as StatusLog[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (newStatus: string, note?: string) => {
    setApproving(true);
    const prev = sub?.status;
    const patch: Record<string, unknown> = {
      status: newStatus,
      status_history: [...((sub as any).status_history ?? []), { status: newStatus, changed_at: new Date().toISOString(), changed_by: "crm_staff" }],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "approved") patch.approved_at = new Date().toISOString();
    if (newStatus === "paid") patch.paid_at = new Date().toISOString();

    const { error } = await supabase.from("timesheet_submissions").update(patch).eq("id", id);
    if (error) { toast.error("Update failed"); setApproving(false); return; }

    await supabase.from("timesheet_status_log").insert({
      submission_id: id, previous_status: prev, new_status: newStatus,
      changed_by: "crm_staff", note: note ?? null,
    });
    toast.success(`Marked as ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
    load();
    setApproving(false);
  };

  const sendApprovalEmail = async () => {
    const { error } = await supabase.functions.invoke("send-manager-approval-email", { body: { submission_id: id } });
    if (error) { toast.error("Failed to send approval email"); return; }
    toast.success("Approval email sent to manager");
    load();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Loading…</div>;
  if (!sub) return <div className="text-center py-20 text-muted-foreground">Timesheet not found</div>;

  const candidateName = sub.candidates ? `${sub.candidates.first_name ?? ""} ${sub.candidates.last_name ?? ""}`.trim() : "Unknown";
  const weekLabel = new Date(sub.week_ending).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2">
      {/* Back */}
      <Link to="/timesheets/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Timesheets
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border shadow-[var(--shadow-card)] bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={sub.status} />
              {sub.hours_discrepancy && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" /> Hours discrepancy
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold">{candidateName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sub.clients?.company_name} · {sub.role} · Week ending {weekLabel}
            </p>
            {sub.booking_reference && <p className="text-xs font-mono text-muted-foreground mt-1">{sub.booking_reference}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            {sub.total_submitted_hours && (
              <div className="text-right">
                <p className="text-2xl font-bold">{sub.total_submitted_hours}h</p>
                <p className="text-xs text-muted-foreground">Total hours</p>
              </div>
            )}
            {sub.pdf_url && (
              <a href={sub.pdf_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t flex flex-wrap gap-2">
          {sub.status === "submitted_to_soar" && (
            <button onClick={() => updateStatus("approved")} disabled={approving}
              className="h-9 px-4 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
          )}
          {sub.status === "approved" && (
            <button onClick={() => updateStatus("paid")} disabled={approving}
              className="h-9 px-4 rounded-full bg-green-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5">
              Mark as Paid
            </button>
          )}
          {sub.status === "awaiting_manager" && !sub.manager_signed_at && (
            <button onClick={sendApprovalEmail}
              className="h-9 px-4 rounded-full border text-sm font-medium hover:bg-muted inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Send manager approval email
            </button>
          )}
        </div>
      </div>

      {/* Shifts */}
      <div className="rounded-2xl border border-border shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-sm">Shift Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Scheduled</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Submitted</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Check in/out</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Break</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Hours</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map(s => (
              <tr key={s.id} className={s.hours_discrepancy_flagged ? "bg-amber-50/50" : ""}>
                <td className="py-3 px-4 font-medium">{fmtDate(s.shift_date)}</td>
                <td className="py-3 px-3 text-muted-foreground">{fmtTime(s.scheduled_start)}–{fmtTime(s.scheduled_end)}</td>
                <td className="py-3 px-3">
                  <span className={s.hours_discrepancy_flagged ? "text-amber-700 font-medium" : ""}>
                    {fmtTime(s.submitted_start)}–{fmtTime(s.submitted_end)}
                  </span>
                  {s.hours_discrepancy_flagged && <AlertTriangle className="inline h-3 w-3 text-amber-500 ml-1" />}
                </td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{fmtTime(s.check_in)} / {fmtTime(s.check_out)}</td>
                <td className="py-3 px-3 text-muted-foreground">{s.break_minutes}m</td>
                <td className="py-3 px-3 font-medium">{calcHours(s.submitted_start, s.submitted_end, s.break_minutes)}h</td>
                <td className="py-3 px-3">
                  <span className="text-xs capitalize text-muted-foreground">{s.shift_status?.replace(/_/g, " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      {(sub.candidate_signature || sub.manager_signature) && (
        <div className="grid grid-cols-2 gap-4">
          {sub.candidate_signature && (
            <div className="rounded-2xl border border-border shadow-[var(--shadow-card)] bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Candidate Signature</p>
              <img src={sub.candidate_signature} alt="Candidate signature" className="max-h-20 border rounded-lg p-2 bg-white" />
              {sub.candidate_signed_at && <p className="text-xs text-muted-foreground mt-2">{new Date(sub.candidate_signed_at).toLocaleString("en-GB")}</p>}
            </div>
          )}
          {sub.manager_signature && (
            <div className="rounded-2xl border border-border shadow-[var(--shadow-card)] bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Manager Signature</p>
              <img src={sub.manager_signature} alt="Manager signature" className="max-h-20 border rounded-lg p-2 bg-white" />
              <p className="text-xs font-medium mt-2">{sub.manager_name}{sub.manager_position ? ` · ${sub.manager_position}` : ""}</p>
              {sub.manager_signed_at && <p className="text-xs text-muted-foreground">{new Date(sub.manager_signed_at).toLocaleString("en-GB")}</p>}
            </div>
          )}
        </div>
      )}

      {/* Status timeline */}
      <div className="rounded-2xl border border-border shadow-[var(--shadow-card)] bg-card p-6">
        <h2 className="font-semibold text-sm mb-4">Status History</h2>
        <div className="space-y-3">
          {log.map(l => (
            <div key={l.id} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-teal mt-1.5 shrink-0" />
              <div>
                <span className="font-medium capitalize">{l.new_status.replace(/_/g, " ")}</span>
                {l.changed_by && <span className="text-muted-foreground"> · {l.changed_by.replace(/_/g, " ")}</span>}
                {l.note && <p className="text-xs text-muted-foreground">{l.note}</p>}
                <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("en-GB")}</p>
              </div>
            </div>
          ))}
          {log.length === 0 && <p className="text-sm text-muted-foreground">No history yet</p>}
        </div>

        {/* Add note */}
        <div className="mt-5 pt-4 border-t flex gap-2">
          <input className="flex-1 h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
            placeholder="Add a note…" value={noteText} onChange={e => setNoteText(e.target.value)} />
          <button
            onClick={async () => {
              if (!noteText.trim()) return;
              await supabase.from("timesheet_status_log").insert({
                submission_id: id, new_status: sub.status, changed_by: "crm_staff", note: noteText.trim(),
              });
              setNoteText("");
              load();
            }}
            className="h-9 px-4 rounded-lg border text-xs font-medium hover:bg-muted">
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}
