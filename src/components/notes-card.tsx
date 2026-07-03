import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Plus, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Note = { id: string; content: string; completed: boolean; created_at: string };

export function NotesCard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase
        .from("todos")
        .select("id, content, completed, created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotes(data || []);
      setLoading(false);
    })();
  }, []);

  const add = async () => {
    const content = draft.trim();
    if (!content || !userId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("todos")
      .insert({ user_id: userId, content })
      .select("id, content, completed, created_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Couldn't save note");
      return;
    }
    setNotes((n) => [data, ...n]);
    setDraft("");
  };

  const toggle = async (id: string, completed: boolean) => {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, completed: !completed } : x)));
    await supabase.from("todos").update({ completed: !completed }).eq("id", id);
  };

  const remove = async (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  };

  return (
    <Card className="p-5 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-warning" /> Quick Notes / To Dos
        </h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {notes.filter((n) => !n.completed).length} open
        </span>
      </div>
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Jot a reminder… (⌘+Enter to save)"
          className="min-h-[70px] resize-none rounded-lg border-border/70 bg-muted/40 focus-visible:bg-card"
        />
        <div className="flex justify-end">
          <button
            onClick={add}
            disabled={!draft.trim() || saving}
            className="h-8 px-3 rounded-lg bg-navy text-navy-foreground text-xs font-medium disabled:opacity-40 hover:opacity-90 transition inline-flex items-center gap-1.5"
          >
            <Plus className="h-3 w-3" />
            Save note
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1 max-h-[260px] overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No notes yet</div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="group flex items-start gap-2 p-2 rounded-lg hover:bg-muted/60 transition"
            >
              <button
                onClick={() => toggle(n.id, n.completed)}
                className={`mt-0.5 w-4 h-4 rounded border shrink-0 grid place-items-center transition ${
                  n.completed
                    ? "bg-teal border-teal text-teal-foreground"
                    : "border-border hover:border-navy/50"
                }`}
                aria-label="Toggle done"
              >
                {n.completed && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <div
                className={`flex-1 text-sm leading-snug whitespace-pre-wrap break-words ${
                  n.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {n.content}
              </div>
              <button
                onClick={() => remove(n.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                aria-label="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
