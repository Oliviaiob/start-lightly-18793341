import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Scope = "mine" | "company";
export type Role = "admin" | "management" | "recruiter" | string;

type ScopeContextValue = {
  scope: Scope;
  setScope: (s: Scope) => void;
  userId: string | null;
  role: Role | null;
  isPrivileged: boolean; // admin or management
};

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);
const STORAGE_KEY = "app.scope";

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<Scope>(() => {
    if (typeof window === "undefined") return "company";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "mine" ? "mine" : "company";
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        setRole((prof?.role as Role) ?? null);
      }
    })();
  }, []);

  const setScope = (s: Scope) => {
    setScopeState(s);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, s);
  };

  const isPrivileged =
    !!role && ["admin", "management", "manager"].includes(String(role).toLowerCase());

  return (
    <ScopeContext.Provider value={{ scope, setScope, userId, role, isPrivileged }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}

/**
 * Effective scope for a page.
 * - On the dashboard, recruiters are locked to "mine".
 * - Elsewhere, the user's chosen scope is used.
 */
export function useEffectiveScope(opts?: { dashboard?: boolean }): Scope {
  const { scope, isPrivileged } = useScope();
  if (opts?.dashboard && !isPrivileged) return "mine";
  return scope;
}
