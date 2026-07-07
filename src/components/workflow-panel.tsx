import { useState } from "react";
import {
  Sparkles, Clock, ChevronDown, ChevronUp, Edit2, Check, X,
  User, Bot, Calendar, Activity,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionOwner =
  | "Candidate" | "Client" | "Referee" | "Manager"
  | "Sophie" | "Mia" | "Grace" | "Sammie" | "Lilly"
  | "System";

export type WorkflowStateData = {
  id?: string;
  entity_type: string;
  entity_id: string;
  item_key?: string;
  assigned_agent?: string | null;
  current_status?: string;
  next_action?: string | null;
  waiting_on?: ActionOwner | null;
  priority?: number | null;
  last_activity_at?: string | null;
  last_activity_desc?: string | null;
  next_followup_at?: string | null;
  ai_recommendation?: string | null;
  updated_at?: string;
};

export type WorkflowActivityData = {
  id: string;
  entity_type?: string;
  entity_id?: string;
  item_key?: string;
  description: string;
  source: string;
  agent?: string | null;
  created_at: string;
};

export type DerivedWorkflowState = {
  waitingOn: ActionOwner;
  nextAction: string;
  aiRecommendation: string;
  priority: number;
};

// ── Owner / priority config ───────────────────────────────────────────────────

const OWNER_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Candidate:  { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
  Client:     { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  Referee:    { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  Manager:    { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500"    },
  Sophie:     { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  Mia:        { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  Grace:      { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  Sammie:     { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  Lilly:      { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  System:     { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500"  },
};

const PRIORITY_CONFIG: Record<number, { label: string; dot: string; text: string }> = {
  1: { label: "Critical",  dot: "bg-red-500",    text: "text-red-700"    },
  2: { label: "Urgent",    dot: "bg-red-400",    text: "text-red-600"    },
  3: { label: "High",      dot: "bg-amber-500",  text: "text-amber-700"  },
  4: { label: "Medium",    dot: "bg-amber-400",  text: "text-amber-600"  },
  5: { label: "Normal",    dot: "bg-gray-400",   text: "text-gray-600"   },
  6: { label: "Low",       dot: "bg-blue-300",   text: "text-blue-600"   },
  9: { label: "None",      dot: "bg-gray-200",   text: "text-gray-400"   },
};

const OWNER_OPTIONS: ActionOwner[] = [
  "Candidate", "Client", "Referee", "Manager",
  "Sophie", "Mia", "Grace", "Sammie", "Lilly", "System",
];
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5, 6, 9];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sourceLabel(source: string, agent?: string | null): string {
  if (source === "ai" && agent) return agent.charAt(0).toUpperCase() + agent.slice(1);
  if (source === "recruiter") return "Recruiter";
  return "System";
}

// ── Sub-components ────────────────────────────────────────────────────────────

export function WaitingOnBadge({ owner }: { owner: ActionOwner }) {
  const cfg = OWNER_CONFIG[owner] ?? OWNER_CONFIG.System;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {owner}
    </span>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  const p = Math.min(Math.max(Math.round(priority), 1), 9);
  const cfg = PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG[5];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cfg.text}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── WorkflowPanel ─────────────────────────────────────────────────────────────

interface WorkflowPanelProps {
  state: WorkflowStateData | null;
  activity: WorkflowActivityData[];
  derived: DerivedWorkflowState;
  onUpdate: (updates: Partial<WorkflowStateData>) => Promise<void>;
  onLogActivity: (desc: string, source?: "system" | "ai" | "recruiter") => Promise<void>;
  variant?: "compact" | "full";
  agent?: string;
  className?: string;
}

export function WorkflowPanel({
  state, activity, derived, onUpdate, onLogActivity,
  variant = "compact", agent, className = "",
}: WorkflowPanelProps) {
  const [editing, setEditing] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Resolved values: DB state takes precedence, derived is fallback
  const waitingOn: ActionOwner = (state?.waiting_on as ActionOwner) ?? derived.waitingOn;
  const nextAction = state?.next_action ?? derived.nextAction;
  const aiRec = state?.ai_recommendation ?? derived.aiRecommendation;
  const priority = state?.priority ?? derived.priority;
  const lastAt = state?.last_activity_at;
  const lastDesc = state?.last_activity_desc;
  const followUp = state?.next_followup_at;

  // Edit form state
  const [editForm, setEditForm] = useState({
    waiting_on: waitingOn,
    next_action: nextAction,
    priority: String(priority),
    next_followup_at: followUp ? followUp.slice(0, 10) : "",
  });

  const openEdit = () => {
    setEditForm({
      waiting_on: waitingOn,
      next_action: nextAction ?? "",
      priority: String(priority),
      next_followup_at: followUp ? followUp.slice(0, 10) : "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await onUpdate({
      waiting_on: editForm.waiting_on as ActionOwner,
      next_action: editForm.next_action || null,
      priority: Number(editForm.priority),
      next_followup_at: editForm.next_followup_at ? new Date(editForm.next_followup_at).toISOString() : null,
    });
    setEditing(false);
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await onLogActivity(noteText.trim(), "recruiter");
    setNoteText("");
    setSaving(false);
  };

  const isDone = waitingOn === "System";

  return (
    <div className={`rounded-xl border border-border/40 overflow-hidden text-xs ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-muted/20 border-b border-border/30">
        <div className="flex items-center gap-3 flex-wrap">
          {variant === "full" && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Activity className="h-3 w-3" /> AI Workflow
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Waiting on</span>
            <WaitingOnBadge owner={waitingOn} />
          </div>
          <PriorityDot priority={priority} />
          {followUp && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{fmtDate(followUp)}</span>
            </div>
          )}
        </div>
        <button
          onClick={openEdit}
          className="inline-flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          title="Edit workflow state"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-3.5 py-3 bg-muted/10 border-b border-border/30 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Waiting On</label>
              <select
                value={editForm.waiting_on}
                onChange={e => setEditForm(p => ({ ...p, waiting_on: e.target.value as ActionOwner }))}
                className="w-full h-7 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-teal/40"
              >
                {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Priority</label>
              <select
                value={editForm.priority}
                onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full h-7 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-teal/40"
              >
                {PRIORITY_OPTIONS.map(n => <option key={n} value={n}>{PRIORITY_CONFIG[n]?.label ?? n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Next Action</label>
            <input
              type="text"
              value={editForm.next_action}
              onChange={e => setEditForm(p => ({ ...p, next_action: e.target.value }))}
              className="w-full h-7 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-teal/40"
              placeholder="What needs to happen next?"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Next Follow-up</label>
            <input
              type="date"
              value={editForm.next_followup_at}
              onChange={e => setEditForm(p => ({ ...p, next_followup_at: e.target.value }))}
              className="w-full h-7 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-teal/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Log Activity Note</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addNote(); }}
                className="flex-1 h-7 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-teal/40"
                placeholder="Add a recruiter note…"
              />
              <button onClick={addNote} disabled={!noteText.trim() || saving}
                className="h-7 px-2.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 disabled:opacity-40">
                Log
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button onClick={saveEdit} disabled={saving}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-navy text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
              <Check className="h-3 w-3" /> Save
            </button>
            <button onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border text-xs font-medium hover:bg-muted/40">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Next action + AI rec */}
      {!isDone && (
        <div className="px-3.5 py-2.5 space-y-1.5">
          {nextAction && (
            <div className="flex items-start gap-1.5">
              <span className="text-muted-foreground/60 shrink-0 mt-0.5">→</span>
              <span className="text-foreground/80 font-medium">{nextAction}</span>
            </div>
          )}
          {aiRec && aiRec !== "No action required" && (
            <div className="flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-500 shrink-0 mt-0.5" />
              <span className="text-purple-700">
                {agent ? `${agent.charAt(0).toUpperCase() + agent.slice(1)}: ` : "AI: "}
                {aiRec}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last activity + timeline toggle */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-border/20">
        <div className="flex items-center gap-1.5 text-muted-foreground/70 min-w-0">
          <Clock className="h-3 w-3 shrink-0" />
          {lastDesc ? (
            <span className="truncate">{fmtRelative(lastAt)} · {lastDesc}</span>
          ) : (
            <span className="italic">No activity recorded</span>
          )}
        </div>
        {activity.length > 0 && (
          <button
            onClick={() => setShowActivity(p => !p)}
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {showActivity ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{activity.length}</span>
          </button>
        )}
      </div>

      {/* Activity timeline */}
      {showActivity && activity.length > 0 && (
        <div className="border-t border-border/20 divide-y divide-border/10 max-h-48 overflow-y-auto">
          {activity.map(a => (
            <div key={a.id} className="flex items-start gap-2.5 px-3.5 py-2">
              <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                a.source === "ai" ? "bg-purple-400" : a.source === "recruiter" ? "bg-blue-400" : "bg-gray-300"
              }`} />
              <div className="flex-1 min-w-0">
                <span className="text-foreground/70">{a.description}</span>
              </div>
              <div className="text-muted-foreground/50 shrink-0 text-[10px] text-right">
                <div>{fmtRelative(a.created_at)}</div>
                <div>{sourceLabel(a.source, a.agent)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
