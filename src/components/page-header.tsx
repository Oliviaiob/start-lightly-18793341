import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <Card className="relative overflow-hidden p-6 md:p-7 border-transparent rounded-2xl bg-gradient-to-br from-navy via-navy to-[oklch(0.3_0.08_260)] text-navy-foreground shadow-[var(--shadow-card)]">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" aria-hidden />
      <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-teal/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur grid place-items-center text-teal shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            {eyebrow && (
              <div className="text-[11px] font-semibold text-navy-foreground/60 uppercase tracking-[0.16em]">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-0.5 text-2xl md:text-[28px] font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-navy-foreground/70 mt-1.5 max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </Card>
  );
}
