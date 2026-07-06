import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Users, Briefcase, Building2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const options = [
  {
    label: "Add Temporary Candidate",
    description: "Register a candidate available for temp shifts",
    icon: Users,
    to: "/candidates" as const,
    search: { open: "temp" },
    accent: "bg-teal text-teal-foreground",
  },
  {
    label: "Add Permanent Candidate",
    description: "Register a candidate for permanent placement",
    icon: Users,
    to: "/candidates" as const,
    search: { open: "perm" },
    accent: "bg-navy/10 text-navy",
  },
  {
    label: "Add Client",
    description: "Onboard a new nursery, family or agency partner",
    icon: Building2,
    to: "/clients" as const,
    search: { open: "new" },
    accent: "bg-teal/25 text-teal-foreground",
  },
  {
    label: "Add Job",
    description: "Post a new role or vacancy",
    icon: Briefcase,
    to: "/jobs" as const,
    search: { open: "new" },
    accent: "bg-warning/25 text-[oklch(0.45_0.12_75)]",
  },
];

export function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-9 px-3.5 inline-flex items-center rounded-full bg-navy text-navy-foreground hover:opacity-90 transition-opacity gap-1.5">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="text-xs font-semibold">Add new</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create new</DialogTitle>
          <DialogDescription>What would you like to add to SOAR?</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setOpen(false);
                navigate({ to: opt.to, search: opt.search });
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-navy/40 hover:bg-muted/60 transition-all group text-left"
            >
              <div className={`w-10 h-10 rounded-lg grid place-items-center ${opt.accent}`}>
                <opt.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-navy group-hover:translate-x-0.5 transition" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
