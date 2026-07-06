import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtQual(q: string | null | undefined): string {
  if (!q || q === "__none__") return "—";
  return q.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
