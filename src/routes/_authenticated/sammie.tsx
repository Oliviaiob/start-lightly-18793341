import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Paperclip, Plus, Users, Briefcase, X,
  Copy, Check, ChevronRight, Search, Filter, Phone, Mail,
  ExternalLink, Bookmark, MoreHorizontal, MapPin, Star,
  MessageSquare, RefreshCw, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtQual } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sammie")({
  component: SammiePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgRole = "user" | "sammie";

interface ChatMessage {
  id: string;
  role: MsgRole;
  content: string;
  timestamp: Date;
  resultType?: "search_candidates" | "search_jobs" | "generate_boolean_search" | "draft_content";
  searchBullets?: string[];
  resultCount?: number;
  draftSubject?: string;
}

interface CandidateResult {
  id: string;
  name: string;
  qualification_level: string | null;
  candidate_type: string | null;
  town: string | null;
  postcode: string | null;
  current_position: string | null;
  current_employer: string | null;
  commute_radius: string | null;
  available_days: string[] | null;
  drives: boolean | null;
  has_dbs: boolean | null;
  matchScore: number;
}

interface JobResult {
  id: string;
  title: string | null;
  status: string | null;
  location_postcode: string | null;
  qualification_required: string | null;
  salary_min: number | null;
  salary_max: number | null;
  client_name: string | null;
}

interface DrawerData {
  type: "candidates" | "jobs" | "boolean" | "draft" | null;
  candidates: CandidateResult[];
  jobs: JobResult[];
  boolean: { broad: string; standard: string; perfect: string } | null;
  draft: { subject?: string; body: string } | null;
  searchBullets: string[];
  title: string;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: Users, label: "Find candidates", text: "Find me a Level 3 qualified temp available tomorrow in Croydon" },
  { icon: Search, label: "Boolean search", text: "Generate boolean searches for a Level 3 Room Leader role in SE London" },
  { icon: MessageSquare, label: "Draft message", text: "Draft an interview invitation for a Nursery Nurse role" },
  { icon: Briefcase, label: "Find jobs", text: "Show me all active Level 3 permanent vacancies" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreCandidate(cand: any, params: any): number {
  let score = 0;
  const type = (cand.candidate_type ?? "").toLowerCase();
  const pType = (params.candidate_type ?? "any").toLowerCase();
  if (pType !== "any") {
    if (pType === "temp" && type.includes("temp")) score += 30;
    else if (pType === "perm" && (type.includes("perm") || type === "both")) score += 30;
    else if (pType === "both" && type === "both") score += 30;
    else if (pType !== "any") score -= 50;
  }
  if (params.qualification_level) {
    const ql = (cand.qualification_level ?? "").toLowerCase().replace(/\s+/g, "_");
    const pql = params.qualification_level.toLowerCase().replace(/\s+/g, "_");
    if (ql.includes(pql) || pql.includes(ql)) score += 25;
  }
  if (params.location) {
    const loc = params.location.toLowerCase();
    const town = (cand.town ?? "").toLowerCase();
    const pc = (cand.postcode ?? "").toLowerCase();
    if (town.includes(loc) || loc.includes(town) || pc.startsWith(loc.toUpperCase().slice(0,2))) score += 25;
  }
  if (params.keywords) {
    const kw = params.keywords.toLowerCase();
    const profile = [cand.current_position, cand.current_employer, cand.qualifications_text, cand.notes].filter(Boolean).join(" ").toLowerCase();
    if (profile.includes(kw)) score += 20;
  }
  return Math.max(0, Math.min(100, score));
}

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Components ───────────────────────────────────────────────────────────────

function CandidateCard({ c, onView }: { c: CandidateResult; onView: () => void }) {
  const [copied, setCopied] = useState(false);
  const scoreColor = c.matchScore >= 80 ? "bg-success/20 text-[oklch(0.4_0.12_155)]"
    : c.matchScore >= 55 ? "bg-teal/20 text-teal-foreground"
    : "bg-muted text-muted-foreground";
  const initials = c.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-navy/30 hover:bg-muted/20 transition-all group">
      <div className="w-9 h-9 rounded-lg bg-navy/10 text-navy grid place-items-center text-xs font-bold shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onView} className="font-semibold text-sm hover:text-teal transition-colors text-left truncate">{c.name}</button>
          <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>{c.matchScore}%</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{fmtQual(c.qualification_level) || c.current_position || "—"}</div>
        {(c.town || c.postcode) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" />{[c.town, c.postcode].filter(Boolean).join(", ")}
          </div>
        )}
        {c.available_days && c.available_days.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-teal mt-0.5">
            <Clock className="h-3 w-3" />Available {c.available_days.slice(0,2).join(", ")}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onView} className="h-7 w-7 rounded-lg border grid place-items-center hover:bg-muted transition-colors" title="View profile"><ExternalLink className="h-3 w-3" /></button>
        <button
          onClick={() => { navigator.clipboard.writeText(c.name); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="h-7 w-7 rounded-lg border grid place-items-center hover:bg-muted transition-colors" title="Copy name">
          {copied ? <Check className="h-3 w-3 text-teal" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function JobCard({ j, onView }: { j: JobResult; onView: () => void }) {
  const statusColor = j.status === "active" ? "bg-success/20 text-[oklch(0.4_0.12_155)]"
    : j.status === "filled" ? "bg-navy/10 text-navy"
    : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-navy/30 hover:bg-muted/20 transition-all group">
      <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal grid place-items-center shrink-0"><Briefcase className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onView} className="font-semibold text-sm hover:text-teal transition-colors text-left truncate">{j.title || "Untitled"}</button>
          <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColor}`}>{j.status || "—"}</span>
        </div>
        {j.client_name && <div className="text-xs text-muted-foreground mt-0.5">{j.client_name}</div>}
        <div className="flex items-center gap-3 mt-0.5">
          {j.qualification_required && <span className="text-xs text-muted-foreground">{fmtQual(j.qualification_required)}</span>}
          {j.location_postcode && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{j.location_postcode}</span>}
        </div>
      </div>
      <button onClick={onView} className="h-7 w-7 rounded-lg border grid place-items-center hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 transition-opacity" title="View job"><ExternalLink className="h-3 w-3" /></button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SammiePage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<DrawerData>({ type: null, candidates: [], jobs: [], boolean: null, draft: null, searchBullets: [], title: "" });
  const [drawerFilter, setDrawerFilter] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchCandidates = async (params: any): Promise<CandidateResult[]> => {
    let query = (supabase as any).from("candidates").select(
      "id,first_name,last_name,qualification_level,candidate_type,town,postcode,current_position,current_employer,commute_radius,available_days,drives,has_dbs,qualifications_text,notes"
    );
    if (params.candidate_type && params.candidate_type !== "any") {
      if (params.candidate_type === "temp") query = query.ilike("candidate_type", "%temp%");
      else if (params.candidate_type === "perm") query = query.or("candidate_type.ilike.%perm%,candidate_type.ilike.%both%");
    }
    if (params.location) {
      query = query.or(`town.ilike.%${params.location}%,postcode.ilike.%${params.location.slice(0,3)}%`);
    }
    const { data } = await query.limit(50);
    const scored = ((data ?? []) as any[]).map(c => ({
      id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      qualification_level: c.qualification_level, candidate_type: c.candidate_type,
      town: c.town, postcode: c.postcode, current_position: c.current_position,
      current_employer: c.current_employer, commute_radius: c.commute_radius,
      available_days: c.available_days, drives: c.drives, has_dbs: c.has_dbs,
      matchScore: scoreCandidate(c, params),
    }));
    return scored.sort((a, b) => b.matchScore - a.matchScore);
  };

  const fetchJobs = async (params: any): Promise<JobResult[]> => {
    let query = supabase.from("jobs").select("id,title,status,location_postcode,qualification_required,salary_min,salary_max,clients(name)");
    if (params.status) query = (query as any).eq("status", params.status);
    if (params.qualification) query = (query as any).ilike("qualification_required", `%${params.qualification}%`);
    if (params.keywords) query = (query as any).ilike("title", `%${params.keywords}%`);
    if (params.location) query = (query as any).ilike("location_postcode", `%${params.location}%`);
    const { data } = await query.limit(30);
    return ((data ?? []) as any[]).map(j => ({
      id: j.id, title: j.title, status: j.status,
      location_postcode: j.location_postcode, qualification_required: j.qualification_required,
      salary_min: j.salary_min, salary_max: j.salary_max,
      client_name: j.clients?.name ?? null,
    }));
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role === "sammie" ? "assistant" : "user", content: m.content }));

    try {
      const { data, error } = await supabase.functions.invoke("sammie-chat", { body: { messages: history } });
      if (error) throw error;

      if (data.type === "search_candidates") {
        const candidates = await fetchCandidates(data.params);
        const bullets: string[] = data.params.search_bullets ?? [];
        const sammieMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "sammie",
          content: data.params.summary ?? `Found ${candidates.length} candidates.`,
          timestamp: new Date(), resultType: "search_candidates",
          searchBullets: bullets, resultCount: candidates.length,
        };
        setMessages(prev => [...prev, sammieMsg]);
        setDrawer({ type: "candidates", candidates, jobs: [], boolean: null, draft: null, searchBullets: bullets, title: "Candidates" });
      } else if (data.type === "search_jobs") {
        const jobs = await fetchJobs(data.params);
        const bullets: string[] = data.params.search_bullets ?? [];
        const sammieMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "sammie",
          content: data.params.summary ?? `Found ${jobs.length} jobs.`,
          timestamp: new Date(), resultType: "search_jobs",
          searchBullets: bullets, resultCount: jobs.length,
        };
        setMessages(prev => [...prev, sammieMsg]);
        setDrawer({ type: "jobs", candidates: [], jobs, boolean: null, draft: null, searchBullets: bullets, title: "Jobs" });
      } else if (data.type === "generate_boolean_search") {
        const b = { broad: data.params.broad, standard: data.params.standard, perfect: data.params.perfect };
        const sammieMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "sammie",
          content: data.params.summary ?? "Here are your Boolean search strings.",
          timestamp: new Date(), resultType: "generate_boolean_search",
        };
        setMessages(prev => [...prev, sammieMsg]);
        setDrawer({ type: "boolean", candidates: [], jobs: [], boolean: b, draft: null, searchBullets: [], title: "Boolean Searches" });
      } else if (data.type === "draft_content") {
        const sammieMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "sammie",
          content: data.params.summary ?? "Here is your draft.",
          timestamp: new Date(), resultType: "draft_content",
          draftSubject: data.params.subject,
        };
        setMessages(prev => [...prev, sammieMsg]);
        setDrawer({ type: "draft", candidates: [], jobs: [], boolean: null, draft: { subject: data.params.subject, body: data.params.draft_body }, searchBullets: [], title: "Draft" });
      } else {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "sammie", content: data.content ?? "...", timestamp: new Date() }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "sammie", content: "Sorry, I ran into an issue. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const filteredCandidates = drawer.candidates.filter(c =>
    !drawerFilter || c.name.toLowerCase().includes(drawerFilter.toLowerCase()) ||
    (c.town ?? "").toLowerCase().includes(drawerFilter.toLowerCase()) ||
    (c.qualification_level ?? "").toLowerCase().includes(drawerFilter.toLowerCase())
  );
  const filteredJobs = drawer.jobs.filter(j =>
    !drawerFilter || (j.title ?? "").toLowerCase().includes(drawerFilter.toLowerCase()) ||
    (j.client_name ?? "").toLowerCase().includes(drawerFilter.toLowerCase())
  );

  const drawerOpen = drawer.type !== null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      <div className={`flex flex-col transition-all duration-300 ${drawerOpen ? "w-[55%]" : "w-full"} min-w-0 border-r border-border/40`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <img src="/sammie.png" alt="Sammie" className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-teal/20" />
            <div>
              <h1 className="text-sm font-semibold">Sammie</h1>
              <p className="text-xs text-muted-foreground">SOAR AI Recruitment Assistant</p>
            </div>
          </div>
          <button
            onClick={() => { setMessages([]); setDrawer({ type: null, candidates: [], jobs: [], boolean: null, draft: null, searchBullets: [], title: "" }); }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-8">
              <img src="/sammie.png" alt="Sammie" className="w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-teal/30" />
              <div>
                <h2 className="text-xl font-semibold">Hey, I'm Sammie ✨</h2>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">Your AI recruitment assistant. I can help you find candidates, search vacancies, generate Boolean strings, draft messages and more.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTED_PROMPTS.map(p => (
                  <button key={p.label} onClick={() => sendMessage(p.text)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-border/70 hover:border-teal/40 hover:bg-muted/40 text-left transition-all group">
                    <p.icon className="h-4 w-4 text-teal shrink-0" />
                    <span className="text-xs font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
              {msg.role === "sammie" && (
                <img src="/sammie.png" alt="Sammie" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-teal/20" />
              )}
              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-navy text-white rounded-br-sm"
                    : "bg-card border border-border/50 text-foreground rounded-bl-sm shadow-sm"
                }`}>
                  {msg.content}
                </div>

                {/* Search summary card */}
                {msg.role === "sammie" && msg.searchBullets && msg.searchBullets.length > 0 && (
                  <div className="bg-muted/40 rounded-xl border border-border/40 p-3 text-xs space-y-1.5 w-full">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Search summary</div>
                    {msg.searchBullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-teal shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                    {msg.resultCount !== undefined && (
                      <button onClick={() => {}}
                        className="mt-2 inline-flex items-center gap-1.5 text-teal font-medium hover:opacity-80 transition-opacity">
                        {msg.resultCount} results — View in panel <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground px-1">{relativeTime(msg.timestamp)}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start gap-3">
              <img src="/sammie.png" alt="Sammie" className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-teal/20" />
              <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-border/40 bg-card/50 shrink-0">
          <div className="flex items-end gap-2 bg-background rounded-2xl border border-border/60 focus-within:border-teal/40 focus-within:ring-2 focus-within:ring-teal/10 transition-all px-4 py-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Sammie anything…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ height: "auto" }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 128) + "px"; }}
              disabled={loading}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={() => toast.info("File attached — mention it in your message")} />
              <button onClick={() => fileRef.current?.click()} className="h-8 w-8 rounded-lg hover:bg-muted transition-colors grid place-items-center text-muted-foreground" title="Attach file">
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="h-8 w-8 rounded-full bg-teal text-teal-foreground grid place-items-center hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">Sammie can make mistakes. Always verify candidate details.</p>
        </div>
      </div>

      {/* ── Results Drawer ────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="flex flex-col w-[45%] min-w-0 bg-card/30">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
            <div>
              <h2 className="text-sm font-semibold">{drawer.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {drawer.type === "candidates" ? `${filteredCandidates.length} candidates found`
                  : drawer.type === "jobs" ? `${filteredJobs.length} jobs found`
                  : drawer.type === "boolean" ? "3 search strings generated"
                  : "Draft ready to copy"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(drawer.type === "candidates" || drawer.type === "jobs") && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    value={drawerFilter}
                    onChange={e => setDrawerFilter(e.target.value)}
                    placeholder="Filter…"
                    className="h-8 pl-8 pr-3 rounded-full border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-teal/30 w-36"
                  />
                </div>
              )}
              <button onClick={() => setDrawer({ type: null, candidates: [], jobs: [], boolean: null, draft: null, searchBullets: [], title: "" })}
                className="h-8 w-8 rounded-full border grid place-items-center hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">

            {/* Candidates */}
            {drawer.type === "candidates" && (
              filteredCandidates.length === 0
                ? <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2"><Users className="h-8 w-8 text-muted-foreground/30" />No candidates found</div>
                : filteredCandidates.map(c => <CandidateCard key={c.id} c={c} onView={() => navigate({ to: "/candidates/$id", params: { id: c.id } })} />)
            )}

            {/* Jobs */}
            {drawer.type === "jobs" && (
              filteredJobs.length === 0
                ? <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2"><Briefcase className="h-8 w-8 text-muted-foreground/30" />No jobs found</div>
                : filteredJobs.map(j => <JobCard key={j.id} j={j} onView={() => navigate({ to: "/jobs/$id", params: { id: j.id } })} />)
            )}

            {/* Boolean searches */}
            {drawer.type === "boolean" && drawer.boolean && (
              <div className="space-y-3">
                {(["broad", "standard", "perfect"] as const).map(key => (
                  <div key={key} className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{key}</span>
                      <button onClick={() => copyText(drawer.boolean![key], key)}
                        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors">
                        {copiedKey === key ? <><Check className="h-3 w-3 text-teal" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                      </button>
                    </div>
                    <p className="text-xs font-mono leading-relaxed text-foreground bg-muted/40 rounded-lg p-3">{drawer.boolean[key]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Draft */}
            {drawer.type === "draft" && drawer.draft && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                {drawer.draft.subject && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</div>
                    <div className="text-sm font-medium">{drawer.draft.subject}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</div>
                    <button onClick={() => copyText(drawer.draft!.body, "draft")}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors">
                      {copiedKey === "draft" ? <><Check className="h-3 w-3 text-teal" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-xl p-4">{drawer.draft.body}</div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer footer */}
          {drawer.type === "candidates" && filteredCandidates.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-border/40 shrink-0">
              <button onClick={() => navigate({ to: "/candidates" })}
                className="w-full h-9 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Users className="h-4 w-4" /> View all candidates
              </button>
            </div>
          )}
          {drawer.type === "jobs" && filteredJobs.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-border/40 shrink-0">
              <button onClick={() => navigate({ to: "/jobs" })}
                className="w-full h-9 rounded-full bg-navy text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Briefcase className="h-4 w-4" /> View all jobs
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
