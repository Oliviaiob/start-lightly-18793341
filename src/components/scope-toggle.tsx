import { useScope } from "@/contexts/scope-context";
import { useRouterState } from "@tanstack/react-router";
import { User, Building2 } from "lucide-react";

export function ScopeToggle() {
  const { scope, setScope, isPrivileged } = useScope();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname === "/" || pathname === "";

  // On the dashboard, hide from non-privileged (recruiter) users.
  if (isDashboard && !isPrivileged) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Scope"
      className="inline-flex items-center h-9 p-0.5 rounded-full bg-card border border-border/60 shadow-sm"
    >
      <button
        role="radio"
        aria-checked={scope === "mine"}
        onClick={() => setScope("mine")}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
          scope === "mine"
            ? "bg-navy text-navy-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <User className="h-3.5 w-3.5" />
        Mine
      </button>
      <button
        role="radio"
        aria-checked={scope === "company"}
        onClick={() => setScope("company")}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
          scope === "company"
            ? "bg-teal text-teal-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
        Company
      </button>
    </div>
  );
}
