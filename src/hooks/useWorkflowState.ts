import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStateData, WorkflowActivityData } from "@/components/workflow-panel";

// ── useWorkflowState ──────────────────────────────────────────────────────────
// Standalone hook for single-entity pages (candidate profile, job, placement…).
// For bulk loading (e.g. compliance page with 15 items) load all at once in the
// page component and pass data down as props to <WorkflowPanel> instead.

export function useWorkflowState(
  entityType: string,
  entityId: string,
  itemKey = ""
) {
  const [state, setState] = useState<WorkflowStateData | null>(null);
  const [activity, setActivity] = useState<WorkflowActivityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true); // false if tables not yet migrated

  const load = useCallback(async () => {
    if (!entityId || !available) return;
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        (supabase as any)
          .from("workflow_states")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("item_key", itemKey)
          .maybeSingle(),
        (supabase as any)
          .from("workflow_activity")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("item_key", itemKey)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (sRes.error?.code === "42P01") { setAvailable(false); setLoading(false); return; }
      setState(sRes.data ?? null);
      setActivity(aRes.data ?? []);
    } catch { setAvailable(false); }
    setLoading(false);
  }, [entityType, entityId, itemKey, available]);

  useEffect(() => { load(); }, [load]);

  const updateState = useCallback(async (
    updates: Partial<Omit<WorkflowStateData, "id" | "entity_type" | "entity_id" | "item_key">>
  ) => {
    if (!available) return;
    const patch = { entity_type: entityType, entity_id: entityId, item_key: itemKey, ...updates, updated_at: new Date().toISOString() };
    try {
      const { data, error } = await (supabase as any)
        .from("workflow_states")
        .upsert(patch, { onConflict: "entity_type,entity_id,item_key" })
        .select("*").single();
      if (!error) setState(data);
    } catch {}
  }, [entityType, entityId, itemKey, available]);

  const logActivity = useCallback(async (
    description: string,
    source: "system" | "ai" | "recruiter" = "system",
    agent?: string
  ) => {
    if (!available) return;
    try {
      const { data } = await (supabase as any)
        .from("workflow_activity")
        .insert({ entity_type: entityType, entity_id: entityId, item_key: itemKey, description, source, agent: agent ?? null })
        .select("*").single();
      if (data) {
        setActivity(prev => [data, ...prev]);
        await updateState({ last_activity_at: data.created_at, last_activity_desc: description });
      }
    } catch {}
  }, [entityType, entityId, itemKey, available, updateState]);

  return { state, activity, loading, available, reload: load, updateState, logActivity };
}
