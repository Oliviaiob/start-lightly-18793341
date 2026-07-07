import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, Search, Phone, Mail, MessageCircle, CheckCheck, Clock, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inbox" as any)({ component: InboxPage });

interface Candidate { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null; }
interface Message { id: string; candidate_id: string; content: string; direction: "inbound" | "outbound"; channel: string; status: string; created_at: string; }
interface Thread { candidate: Candidate; lastMessage: Message | null; unread: number; }

const channelIcon = (ch: string) => ch === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5 text-green-500" /> : ch === "sms" ? <Phone className="h-3.5 w-3.5 text-blue-500" /> : ch === "email" ? <Mail className="h-3.5 w-3.5 text-orange-400" /> : <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
const channelLabel = (ch: string) => ({ whatsapp: "WhatsApp", sms: "SMS", email: "Email", internal: "CRM" }[ch] ?? ch);
const fmtTime = (iso: string) => { const d = new Date(iso); const now = new Date(); const diff = (now.getTime() - d.getTime()) / 86400000; return diff < 1 ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : diff < 7 ? d.toLocaleDateString("en-GB", { weekday: "short" }) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); };

function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState<"internal" | "whatsapp" | "sms">("internal");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  // Load threads
  const loadThreads = useCallback(async () => {
    const { data: msgs } = await (supabase as any).from("messages")
      .select("id,candidate_id,content,direction,channel,status,created_at")
      .order("created_at", { ascending: false });

    const { data: cands } = await supabase.from("candidates")
      .select("id,first_name,last_name,phone,email");

    if (!msgs || !cands) return;
    const byCandidate: Record<string, Message[]> = {};
    for (const m of msgs) { if (!byCandidate[m.candidate_id]) byCandidate[m.candidate_id] = []; byCandidate[m.candidate_id].push(m); }

    const allCandIds = [...new Set(msgs.map((m: Message) => m.candidate_id))];
    const ts: Thread[] = allCandIds.map(cid => {
      const cand = cands.find((c: Candidate) => c.id === cid);
      if (!cand) return null;
      const candMsgs = byCandidate[cid as string] ?? [];
      const unread = candMsgs.filter((m: Message) => m.direction === "inbound" && m.status !== "read").length;
      return { candidate: cand, lastMessage: candMsgs[0] ?? null, unread };
    }).filter(Boolean) as Thread[];

    setThreads(ts);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load messages for selected thread
  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await (supabase as any).from("messages")
      .select("*").eq("candidate_id", cid).order("created_at", { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    // Mark inbound as read
    await (supabase as any).from("messages").update({ status: "read" }).eq("candidate_id", cid).eq("direction", "inbound").neq("status", "read");
    loadThreads();
  }, [loadThreads]);

  useEffect(() => { if (selected) loadMessages(selected); }, [selected, loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.candidate_id === selected) setMessages(prev => [...prev, msg]);
        loadThreads();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected, loadThreads]);

  const selectedCandidate = threads.find(t => t.candidate.id === selected)?.candidate;

  const sendMsg = async () => {
    if (!input.trim() || !selected || !userId) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-message", {
        body: { candidate_id: selected, recruiter_id: userId, content: input.trim(), channel, candidate_phone: selectedCandidate?.phone },
      });
      if (error) throw error;
      setInput("");
      loadMessages(selected);
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const filtered = threads.filter(t => {
    const name = `${t.candidate.first_name ?? ""} ${t.candidate.last_name ?? ""}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Thread list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border/40 bg-card/30">
        <div className="px-4 py-4 border-b border-border/40">
          <h1 className="text-sm font-semibold mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              className="w-full h-8 pl-8 pr-3 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-teal/30" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              No conversations yet
            </div>
          )}
          {filtered.map(t => {
            const name = `${t.candidate.first_name ?? ""} ${t.candidate.last_name ?? ""}`.trim();
            const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            const isActive = selected === t.candidate.id;
            return (
              <button key={t.candidate.id} onClick={() => setSelected(t.candidate.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/30 ${isActive ? "bg-muted/60" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-navy/10 text-navy grid place-items-center text-xs font-bold shrink-0 relative">
                  {initials}
                  {t.unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal text-white text-[9px] grid place-items-center font-bold">{t.unread}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs truncate ${t.unread > 0 ? "font-semibold" : "font-medium"}`}>{name}</span>
                    {t.lastMessage && <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(t.lastMessage.created_at)}</span>}
                  </div>
                  {t.lastMessage && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {channelIcon(t.lastMessage.channel)}
                      <span className="text-[11px] text-muted-foreground truncate">{t.lastMessage.direction === "outbound" ? "You: " : ""}{t.lastMessage.content}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conversation ── */}
      {selected && selectedCandidate ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-navy/10 text-navy grid place-items-center text-xs font-bold">
                {`${selectedCandidate.first_name?.[0] ?? ""}${selectedCandidate.last_name?.[0] ?? ""}`.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">{selectedCandidate.first_name} {selectedCandidate.last_name}</div>
                <div className="text-xs text-muted-foreground">{selectedCandidate.phone ?? selectedCandidate.email ?? "No contact info"}</div>
              </div>
            </div>
            <button onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted transition-colors">
              View profile <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                No messages yet. Send the first one below.
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${msg.direction === "outbound" ? "bg-navy text-white rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm shadow-sm"}`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center gap-1.5 mt-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] opacity-60">{fmtTime(msg.created_at)}</span>
                    {channelIcon(msg.channel)}
                    {msg.direction === "outbound" && msg.status === "delivered" && <CheckCheck className="h-3 w-3 opacity-60" />}
                    {msg.direction === "outbound" && msg.status === "read" && <CheckCheck className="h-3 w-3 text-teal opacity-80" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="px-5 py-4 border-t border-border/40 bg-card/50 shrink-0 space-y-2">
            {/* Channel selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Send via:</span>
              {(["internal", "whatsapp", "sms"] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors ${channel === ch ? "bg-navy text-white" : "border hover:bg-muted"}`}>
                  {channelIcon(ch)}{channelLabel(ch)}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 bg-background rounded-xl border border-border/60 focus-within:border-teal/40 focus-within:ring-2 focus-within:ring-teal/10 transition-all px-4 py-2.5">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder="Type a message…" rows={1} disabled={sending}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none leading-relaxed max-h-28 overflow-y-auto"
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 112) + "px"; }} />
              <button onClick={sendMsg} disabled={!input.trim() || sending}
                className="h-8 w-8 rounded-full bg-teal text-teal-foreground grid place-items-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm">Select a conversation to get started</p>
        </div>
      )}
    </div>
  );
}

// ── CandidateDrawer ────────────────────────────────────────────────────────────
function CandidateDrawer({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const [candidate, setCandidate] = useState<{
    id: string; first_name: string | null; last_name: string | null;
    email: string | null; phone: string | null; qualification_level: string | null;
    candidate_type: string | null; status_perm: string | null; status_temp: string | null;
    postcode: string | null; city: string | null; source: string | null;
    has_dbs: boolean | null; available_days: string[] | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from("candidates")
      .select("id,first_name,last_name,email,phone,qualification_level,candidate_type,status_perm,status_temp,postcode,city,source,has_dbs,available_days")
      .eq("id", candidateId).maybeSingle()
      .then(({ data }) => { setCandidate(data as any); setLoading(false); });
  }, [candidateId]);

  const name = candidate ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() : "";
  const initials = candidate ? `${candidate.first_name?.[0] ?? ""}${candidate.last_name?.[0] ?? ""}`.toUpperCase() : "…";
  const fmtQual = (q: string | null) => q ? q.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";
  const typeLabel = (t: string | null) => ({ perm: "Permanent", temp: "Temp", both: "Perm & Temp" }[t ?? ""] ?? t ?? "—");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] bg-card shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-navy shrink-0">
          <span className="text-white font-semibold text-sm">Candidate Profile</span>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}

        {!loading && candidate && (
          <div className="flex-1 p-6 space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
              <div>
                <div className="text-lg font-bold">{name}</div>
                <div className="text-sm text-muted-foreground">{fmtQual(candidate.qualification_level)}</div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Contact</div>
              <DrawerRow label="Email" value={candidate.email ?? "—"} />
              <DrawerRow label="Phone" value={candidate.phone ?? "—"} />
            </div>

            {/* Location */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Location</div>
              <DrawerRow label="City" value={candidate.city ?? "—"} />
              <DrawerRow label="Postcode" value={candidate.postcode ?? "—"} />
            </div>

            {/* Status */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">Status</div>
              <DrawerRow label="Type" value={typeLabel(candidate.candidate_type)} />
              {(candidate.candidate_type === "perm" || candidate.candidate_type === "both") && (
                <DrawerRow label="Perm status" value={candidate.status_perm ?? "—"} />
              )}
              {(candidate.candidate_type === "temp" || candidate.candidate_type === "both") && (
                <DrawerRow label="Temp status" value={candidate.status_temp ?? "—"} />
              )}
              <DrawerRow label="DBS" value={candidate.has_dbs ? "✓ Valid DBS" : "No DBS"} />
            </div>

            {/* Availability */}
            {candidate.available_days && candidate.available_days.length > 0 && (
              <div className="rounded-xl bg-muted/30 p-4">
                <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Availability</div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.available_days.map((d) => (
                    <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-navy/10 text-navy font-medium capitalize">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Open full profile */}
            <a href={`/candidates/${candidate.id}`}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Open full profile <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
