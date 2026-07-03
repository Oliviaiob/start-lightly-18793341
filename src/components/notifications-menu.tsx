import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Activity = {
  id: string;
  action: string | null;
  entity_type: string | null;
  created_at: string | null;
  actor?: { display_name: string | null; first_name: string | null; last_name: string | null } | null;
};

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsMenu() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("id, action, entity_type, created_at, actor:profiles(display_name, first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(10);
    setItems((data as unknown as Activity[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 grid place-items-center rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {items && items.length > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0 rounded-xl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-sm">Notifications</div>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Recent activity</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items === null && <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading…</div>}
          {items && items.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">No recent activity</div>
          )}
          {items?.map((a) => {
            const name =
              a.actor?.display_name ||
              [a.actor?.first_name, a.actor?.last_name].filter(Boolean).join(" ") ||
              "Someone";
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/60 border-b last:border-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-navy text-navy-foreground text-[10px] font-semibold">
                    {initialsFrom(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug">
                    <span className="font-medium">{name}</span>{" "}
                    <span className="text-muted-foreground">
                      {a.action || "updated"} {a.entity_type || ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.created_at ? timeAgo(a.created_at) : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
