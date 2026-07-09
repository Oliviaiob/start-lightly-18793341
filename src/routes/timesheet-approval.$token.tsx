import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/timesheet-approval/$token")({
  component: ManagerApprovalPage,
});

type Shift = { id: string; shift_date: string; submitted_start: string; submitted_end: string; break_minutes: number; shift_status: string };
type Submission = {
  id: string; week_ending: string; role: string; booking_reference: string;
  candidate_signature: string | null; total_submitted_hours: number | null;
  candidates: { first_name: string; last_name: string } | null;
  clients: { name: string; contact_name: string | null } | null;
};

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : "—"; }
function calcHours(start: string, end: string, brk: number) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - brk) / 60).toFixed(2);
}

export default function ManagerApprovalPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"loading" | "ready" | "expired" | "actioned" | "submitting" | "done" | "error">("loading");
  const [sub, setSub] = useState<Submission | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [managerName, setManagerName] = useState("");
  const [managerPosition, setManagerPosition] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    supabase.functions.invoke("get-timesheet-by-token", { body: { token } }).then(({ data, error }) => {
      if (error || !data) { setState("expired"); return; }
      if (data.error === "link_expired") { setState("expired"); return; }
      if (data.error === "already_actioned") { setState("actioned"); return; }
      if (data.error) { setState("error"); setErrorMsg(data.error); return; }
      setSub(data.submission); setShifts(data.shifts ?? []);
      setState("ready");
    });
  }, [token]);

  // Signature pad
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!; const p = getPos(e, c);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    e.preventDefault();
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!; const p = getPos(e, c);
    ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#0a1628"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    e.preventDefault();
  };
  const endDraw = () => { drawing.current = false; };
  const clearSig = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL("image/png");
    // Check if canvas is empty
    const blank = document.createElement("canvas"); blank.width = canvas.width; blank.height = canvas.height;
    if (sigData === blank.toDataURL("image/png")) { setErrorMsg("Please sign before submitting."); return; }
    if (!managerName.trim()) { setErrorMsg("Please enter your name."); return; }
    if (!agreed) { setErrorMsg("Please confirm the declaration."); return; }

    setState("submitting");
    const { data, error } = await supabase.functions.invoke("submit-manager-approval", {
      body: { token, manager_name: managerName.trim(), manager_position: managerPosition.trim(), manager_signature: sigData },
    });
    if (error || data?.error) { setState("error"); setErrorMsg(data?.error ?? String(error)); return; }
    setState("done");
  };

  const weekLabel = sub ? new Date(sub.week_ending).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const candidateName = sub?.candidates ? `${sub.candidates.first_name} ${sub.candidates.last_name}` : "";
  const totalHours = shifts.reduce((acc, s) => {
    if (!s.submitted_start || !s.submitted_end) return acc;
    return acc + parseFloat(calcHours(s.submitted_start, s.submitted_end, s.break_minutes));
  }, 0);

  if (state === "loading") return <Screen><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></Screen>;
  if (state === "expired") return <Screen><AlertCircle className="h-8 w-8 text-red-400 mb-3" /><h2 className="font-semibold text-lg">Link expired</h2><p className="text-slate-500 text-sm mt-1">This approval link has expired or is invalid. Please contact SOAR Recruitment.</p></Screen>;
  if (state === "actioned") return <Screen><CheckCircle2 className="h-8 w-8 text-teal-500 mb-3" /><h2 className="font-semibold text-lg">Already approved</h2><p className="text-slate-500 text-sm mt-1">This timesheet has already been approved. Thank you.</p></Screen>;
  if (state === "done") return <Screen><CheckCircle2 className="h-8 w-8 text-teal-500 mb-3" /><h2 className="font-semibold text-lg">Timesheet approved</h2><p className="text-slate-500 text-sm mt-1 text-center">Thank you, {managerName}. SOAR Recruitment has been notified and will process the timesheet.</p></Screen>;
  if (state === "error") return <Screen><AlertCircle className="h-8 w-8 text-red-400 mb-3" /><h2 className="font-semibold text-lg">Something went wrong</h2><p className="text-slate-500 text-sm mt-1">{errorMsg}</p></Screen>;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="bg-[#0a1628] text-white px-4 py-5">
        <div className="max-w-xl mx-auto">
          <img src="https://ltpsljknjenpomsxixlx.supabase.co/storage/v1/object/public/brand/Logo-white.png" alt="Soar Recruitment" className="h-8 object-contain" />
          <div className="text-slate-400 text-xs mt-0.5">Timesheet approval</div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h1 className="font-semibold text-lg mb-1">Review timesheet</h1>
          <p className="text-sm text-slate-500 mb-4">Please review the hours below and approve if correct.</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400">Candidate</p><p className="font-medium">{candidateName}</p></div>
            <div><p className="text-xs text-slate-400">Setting</p><p className="font-medium">{sub?.clients?.name}</p></div>
            <div><p className="text-xs text-slate-400">Role</p><p className="font-medium">{sub?.role ?? "—"}</p></div>
            <div><p className="text-xs text-slate-400">Week ending</p><p className="font-medium">{weekLabel}</p></div>
            {sub?.booking_reference && <div><p className="text-xs text-slate-400">Booking ref</p><p className="font-mono text-xs font-medium">{sub.booking_reference}</p></div>}
            <div><p className="text-xs text-slate-400">Total hours</p><p className="font-bold text-teal-600 text-lg">{totalHours.toFixed(2)}h</p></div>
          </div>
        </div>

        {/* Shifts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b text-xs text-slate-500"><th className="text-left py-2.5 px-4">Date</th><th className="text-left py-2.5 px-3">Hours</th><th className="text-left py-2.5 px-3">Break</th><th className="text-right py-2.5 px-4">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(s => (
                <tr key={s.id}><td className="py-3 px-4">{fmtDate(s.shift_date)}</td><td className="py-3 px-3 text-slate-600">{fmtTime(s.submitted_start)}–{fmtTime(s.submitted_end)}</td><td className="py-3 px-3 text-slate-500">{s.break_minutes}m</td><td className="py-3 px-4 text-right font-medium">{calcHours(s.submitted_start, s.submitted_end, s.break_minutes)}h</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Candidate signature */}
        {sub?.candidate_signature && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs text-slate-400 mb-2">Candidate declaration &amp; signature</p>
            <img src={sub.candidate_signature} alt="Candidate signature" className="max-h-16 border rounded-lg p-2" />
          </div>
        )}

        {/* Manager approval form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold">Your approval</h2>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Your name *</label>
            <input className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" required value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Your position</label>
            <input className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" value={managerPosition} onChange={e => setManagerPosition(e.target.value)} placeholder="e.g. Nursery Manager" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Your signature *</label>
            <div className="border rounded-xl overflow-hidden relative">
              <canvas ref={canvasRef} width={480} height={120} className="w-full touch-none bg-white cursor-crosshair"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              <button type="button" onClick={clearSig} className="absolute top-2 right-2 text-xs text-slate-400 hover:text-slate-600">Clear</button>
            </div>
          </div>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span className="text-slate-600">I confirm that the hours listed above are correct and that I approve this timesheet for payment.</span>
          </label>
          {errorMsg && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{errorMsg}</p>}
          <button type="submit" disabled={state === "submitting"}
            className="w-full py-3 rounded-xl bg-[#0a1628] text-white font-semibold text-sm hover:bg-teal-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {state === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : "Approve timesheet"}
          </button>
          <p className="text-[10px] text-slate-400 text-center">This link is secure and unique to you. Please do not share it.</p>
        </form>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center px-4 text-center gap-2">
      <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center mb-1">{children}</div>
    </div>
  );
}
