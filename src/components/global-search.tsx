import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Users, Briefcase, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

type Result =
  | { kind: "candidate"; id: string; label: string; sub?: string }
  | { kind: "job"; id: string; label: string; sub?: string }
  | { kind: "client"; id: string; label: string; sub?: string };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const term = q.trim();
      const like = `%${term}%`;
      const [candRes, jobRes, cliRes] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, first_name, last_name, candidate_type, qualification_level")
          .or(`first_name.ilike.${like},last_name.ilike.${like}`)
          .limit(5),
        supabase
          .from("jobs")
          .select("id, title, status")
          .ilike("title", like)
          .limit(5),
        supabase
          .from("clients")
          .select("id, company_name, address")
          .ilike("company_name", like)
          .limit(5),
      ]);

      const list: Result[] = [];
      (candRes.data || []).forEach((c) =>
        list.push({
          kind: "candidate",
          id: c.id,
          label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Candidate",
          sub: c.qualification_level || c.candidate_type || undefined,
        }),
      );
      (jobRes.data || []).forEach((j) =>
        list.push({
          kind: "job",
          id: j.id,
          label: j.title || "Untitled role",
          sub: [
            (j.client as { name?: string } | null)?.name,
            j.status,
          ]
            .filter(Boolean)
            .join(" · "),
        }),
      );
      (cliRes.data || []).forEach((cl) =>
        list.push({
          kind: "client",
          id: cl.id,
          label: cl.company_name || "Client",
          sub: cl.address || undefined,
        }),
      );
      setResults(list);
      setLoading(false);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const groups: Array<{ kind: Result["kind"]; label: string; icon: typeof Users; route: string }> = [
    { kind: "candidate", label: "Candidates", icon: Users, route: "/candidates" },
    { kind: "job", label: "Jobs", icon: Briefcase, route: "/jobs" },
    { kind: "client", label: "Clients", icon: Building2, route: "/clients" },
  ];

  const go = (r: Result) => {
    const route = groups.find((g) => g.kind === r.kind)!.route;
    setOpen(false);
    setQ("");
    navigate({ to: route });
  };

  return (
    <Popover open={open && (results.length > 0 || loading || q.trim().length > 0)} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-full bg-card border border-border/60 text-sm w-[320px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-navy/40 focus-within:ring-2 focus-within:ring-navy/10 transition">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => q && setOpen(true)}
            placeholder="Search candidates, jobs, clients…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <kbd className="text-[10px] font-medium border border-border/70 rounded px-1.5 py-0.5 bg-muted text-muted-foreground">⌘K</kbd>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[380px] p-0 rounded-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[420px] overflow-y-auto py-2">
          {loading && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">Searching…</div>
          )}
          {!loading && q.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No matches for "{q}"
            </div>
          )}
          {groups.map((g) => {
            const items = results.filter((r) => r.kind === g.kind);
            if (items.length === 0) return null;
            const Icon = g.icon;
            return (
              <div key={g.kind} className="pb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {g.label}
                </div>
                {items.map((r) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => go(r)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-navy/8 text-navy grid place-items-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      {r.sub && <div className="text-[11px] text-muted-foreground truncate">{r.sub}</div>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
          {q.trim() && (
            <div className="border-t mt-1 pt-2 px-2">
              {groups.map((g) => (
                <Link
                  key={g.kind}
                  to={g.route}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                >
                  <g.icon className="h-3 w-3" />
                  View all {g.label.toLowerCase()}
                </Link>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
