import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  MoreHorizontal, UserCheck, UserMinus, PowerOff, Power,
  Bot, User, Crown, ArrowLeft, Loader2, X, AlertTriangle,
  ExternalLink, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings/team")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isOwner = (roles ?? []).some((r: any) => r.role === "owner");
    if (!isOwner) throw redirect({ to: "/settings" });
  },
  component: TeamManagementPage,
});

interface ManagedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  profile_role: string;
  display_role: "Owner" | "Recruiter AI" | "Recruiter" | "User";
  user_roles: string[];
  is_ai: boolean;
  is_active: boolean;
  is_owner: boolean;
  last_sign_in_at: string | null;
  created_at: string | null;
  linked_candidate: { id: string; name: string } | null;
}

type SortField = "display_name" | "email" | "display_role" | "is_active" | "last_sign_in_at" | "created_at";
type SortDir   = "asc" | "desc";

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  "Owner":        { label: "Owner",        cls: "bg-amber-500/15 text-amber-600 border border-amber-400/30" },
  "Recruiter AI": { label: "Recruiter AI", cls: "bg-blue-500/15 text-blue-600 border border-blue-400/30" },
  "Recruiter":    { label: "Recruiter",    cls: "bg-teal/15 text-teal border border-teal/30" },
  "User":         { label: "User",         cls: "bg-muted text-muted-foreground border border-border/50" },
};

const INPUT = "flex h-9 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal disabled:opacity-50 transition-colors";
const LABEL = "block text-sm font-medium text-foreground mb-1.5";
const BTN_PRIMARY = "px-4 py-2 text-sm font-medium rounded-xl bg-navy text-white hover:bg-navy/90 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer";
const BTN_GHOST   = "px-3 py-2 text-sm rounded-xl border border-border hover:bg-muted/40 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40";
const BTN_DANGER  = "px-3 py-2 text-sm rounded-xl border border-red-400/40 text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return formatDate(iso);
}

function initials(u: ManagedUser): string {
  return ((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")).toUpperCase() || u.email[0]?.toUpperCase() || "?";
}

function MenuItem({ icon: Icon, onClick, danger = false, children }: {
  icon: React.ElementType; onClick: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm transition-colors text-left ${danger ? "text-red-500 hover:bg-red-500/10" : "text-foreground hover:bg-muted/50"}`}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </button>
  );
}

function TeamManagementPage() {
  const [callerId, setCallerId]     = useState<string>("");
  const [users, setUsers]           = useState<ManagedUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch]               = useState("");
  const [filterRole, setFilterRole]       = useState("all");
  const [filterType, setFilterType]       = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [sortField, setSortField]         = useState<SortField>("display_name");
  const [sortDir, setSortDir]             = useState<SortDir>("asc");

  const [actionTarget, setActionTarget]   = useState<ManagedUser | null>(null);
  const [actionType, setActionType]       = useState<"change_role"|"assign_owner"|"revoke_owner"|"deactivate"|"reactivate"|"complete_name"|null>(null);
  const [pendingRole, setPendingRole]     = useState<"recruiter"|"user">("recruiter");
  const [aiConfirmed, setAiConfirmed]     = useState(false);
  const [completeName, setCompleteName]   = useState({ first: "", last: "" });
  const [acting, setActing]               = useState(false);
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCallerId(data.user.id); });
    loadUsers();
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  const loadUsers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-user-management", { body: { action: "list_users" } });
    if (error || data?.error) { toast.error("Failed to load users"); }
    else { setUsers(data.users as ManagedUser[]); }
    if (showRefresh) setRefreshing(false); else setLoading(false);
  };

  const owners  = useMemo(() => users.filter(u => u.is_owner), [users]);

  const filtered = useMemo(() => {
    let list = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filterRole !== "all")   list = list.filter(u => u.display_role === filterRole);
    if (filterType !== "all")   list = list.filter(u => filterType === "ai" ? u.is_ai : !u.is_ai);
    if (filterStatus !== "all") list = list.filter(u => filterStatus === "active" ? u.is_active : !u.is_active);
    list.sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (sortField === "display_name")    { av = a.display_name.toLowerCase(); bv = b.display_name.toLowerCase(); }
      else if (sortField === "email")      { av = a.email.toLowerCase();         bv = b.email.toLowerCase(); }
      else if (sortField === "display_role") { av = a.display_role;             bv = b.display_role; }
      else if (sortField === "is_active")  { av = a.is_active ? 1 : 0;          bv = b.is_active ? 1 : 0; }
      else if (sortField === "last_sign_in_at") { av = a.last_sign_in_at ?? ""; bv = b.last_sign_in_at ?? ""; }
      else if (sortField === "created_at") { av = a.created_at ?? "";            bv = b.created_at ?? ""; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [users, search, filterRole, filterType, filterStatus, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-teal" /> : <ChevronDown className="h-3 w-3 text-teal" />;
  };

  const openAction = (u: ManagedUser, type: typeof actionType, role?: "recruiter"|"user") => {
    setOpenMenuId(null);
    setActionTarget(u);
    setActionType(type);
    setAiConfirmed(false);
    setCompleteName({ first: u.first_name, last: u.last_name });
    if (role) setPendingRole(role);
  };

  const closeModal = () => { setActionTarget(null); setActionType(null); setAiConfirmed(false); setActing(false); };

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-user-management", { body });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Unknown error");
  };

  const runAction = async () => {
    if (!actionTarget || !actionType) return;
    setActing(true);
    try {
      const id  = actionTarget.id;
      const ai  = actionTarget.is_ai ? aiConfirmed : undefined;
      if (actionType === "complete_name") {
        if (!completeName.first.trim() || !completeName.last.trim()) { toast.error("Both names are required"); setActing(false); return; }
        await invoke({ action: "update_profile_name", target_user_id: id, first_name: completeName.first.trim(), last_name: completeName.last.trim() });
        toast.success("Name saved — you can now promote this account");
        closeModal(); await loadUsers(true); return;
      }
      if (actionType === "change_role")  await invoke({ action: "change_role",  target_user_id: id, new_role: pendingRole, confirm_ai_change: ai });
      if (actionType === "assign_owner") await invoke({ action: "assign_owner", target_user_id: id, confirm_ai_change: ai });
      if (actionType === "revoke_owner") await invoke({ action: "revoke_owner", target_user_id: id });
      if (actionType === "deactivate")   await invoke({ action: "set_active",   target_user_id: id, is_active: false, confirm_ai_change: ai });
      if (actionType === "reactivate")   await invoke({ action: "set_active",   target_user_id: id, is_active: true,  confirm_ai_change: ai });
      const msgs: Record<string, string> = {
        change_role:  pendingRole === "recruiter" ? "Promoted to Recruiter" : "Demoted to User",
        assign_owner: "Owner access granted",
        revoke_owner: "Owner access revoked",
        deactivate:   "Account deactivated",
        reactivate:   "Account reactivated",
      };
      toast.success(msgs[actionType] ?? "Done");
      closeModal(); await loadUsers(true);
    } catch (err: any) {
      const msg: string = err.message ?? "";
      if (msg === "INCOMPLETE_PROFILE") { setActing(false); setActionType("complete_name"); toast.info("Add a name before granting CRM access"); return; }
      toast.error(msg || "Action failed"); setActing(false);
    }
  };

  const badge = (role: string) => {
    const cfg = ROLE_BADGE[role] ?? ROLE_BADGE["User"];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
        {role === "Owner"        && <Crown className="h-3 w-3" />}
        {role === "Recruiter AI" && <Bot   className="h-3 w-3" />}
        {cfg.label}
      </span>
    );
  };

  const TH = ({ field, children, className = "" }: { field?: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap ${field ? "cursor-pointer select-none hover:text-foreground" : ""} ${className}`}
        onClick={field ? () => toggleSort(field) : undefined}>
      <span className="inline-flex items-center gap-1">{children}{field && <SortIcon field={field} />}</span>
    </th>
  );

  const needsAiConfirm = actionTarget?.is_ai && !aiConfirmed && actionType !== "complete_name" && actionType !== "revoke_owner";
  const canRun = !acting && !needsAiConfirm && actionType !== null;

  const modalTitle: Record<string, string> = {
    complete_name: "Complete profile before promoting",
    change_role:   pendingRole === "recruiter" ? "Promote to Recruiter" : "Demote to User",
    assign_owner:  "Grant Owner access",
    revoke_owner:  "Revoke Owner access",
    deactivate:    "Deactivate account",
    reactivate:    "Reactivate account",
  };

  const modalDesc = () => {
    if (!actionTarget) return "";
    const n = actionTarget.display_name;
    if (actionType === "complete_name")                             return `${n} has no name on record. Add one before granting CRM access.`;
    if (actionType === "change_role" && pendingRole === "recruiter") return `${n} will gain Recruiter access to the CRM.`;
    if (actionType === "change_role" && pendingRole === "user")      return `${n} will lose CRM access and revert to a candidate account.`;
    if (actionType === "assign_owner")   return `${n} will have full system ownership, including management of all other accounts.`;
    if (actionType === "revoke_owner")   return `${n} will retain Recruiter access but lose Owner privileges.`;
    if (actionType === "deactivate")     return `${n}'s account will be immediately deactivated. All history is preserved and can be reactivated at any time.`;
    if (actionType === "reactivate")     return `${n}'s account will be restored and they will regain access.`;
    return "";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader eyebrow="Settings" title="User Management" description="Manage accounts, roles, and access across the platform." icon={Shield} />
        <button className={BTN_GHOST + " ml-auto shrink-0"} onClick={() => loadUsers(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Owner Spotlight */}
      {owners.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-400/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              System {owners.length === 1 ? "Owner" : "Owners"} — Full Platform Control
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {owners.map(o => (
              <div key={o.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/20">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400">
                  {initials(o)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{o.display_name}</div>
                  <div className="text-xs text-muted-foreground">{o.email}</div>
                </div>
                {o.id === callerId && <span className="text-xs text-amber-600/70 font-medium">(you)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input className={INPUT + " pl-9"} placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {[
            { value: filterRole,   set: setFilterRole,   opts: [["all","All roles"],["Owner","Owner"],["Recruiter AI","Recruiter AI"],["Recruiter","Recruiter"],["User","User"]] },
            { value: filterType,   set: setFilterType,   opts: [["all","Human & AI"],["human","Human only"],["ai","AI only"]] },
            { value: filterStatus, set: setFilterStatus, opts: [["all","Active & Inactive"],["active","Active only"],["inactive","Inactive only"]] },
          ].map(({ value, set, opts }, i) => (
            <select key={i} className="h-9 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/50"
              value={value} onChange={e => set(e.target.value)}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {(search || filterRole !== "all" || filterType !== "all" || filterStatus !== "all") && (
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => { setSearch(""); setFilterRole("all"); setFilterType("all"); setFilterStatus("all"); }}>
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {users.length}</span>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50 bg-muted/20">
              <tr>
                <TH field="display_name">Name</TH>
                <TH field="email">Email</TH>
                <TH field="display_role">Role</TH>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                <TH field="is_active">Status</TH>
                <TH field="last_sign_in_at">Last Login</TH>
                <TH field="created_at">Created</TH>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Record</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No accounts match your filters.</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className={`transition-colors hover:bg-muted/20 ${!u.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase ${u.is_owner ? "bg-amber-500/20 text-amber-600" : "bg-navy/10 text-navy"}`}>
                        {u.is_ai ? <Bot className="h-4 w-4" /> : initials(u)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {u.display_name}
                          {u.id === callerId && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{badge(u.display_role)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.is_ai
                      ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-400/20"><Bot className="h-3 w-3" />AI</span>
                      : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"><User className="h-3 w-3" />Human</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? "bg-teal/10 text-teal border border-teal/20" : "bg-red-500/10 text-red-500 border border-red-400/20"}`}>
                      {u.is_active ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatRelative(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.linked_candidate
                      ? <Link to="/candidates/$id" params={{ id: u.linked_candidate.id }} className="inline-flex items-center gap-1 text-xs text-teal hover:underline"><ExternalLink className="h-3 w-3" />{u.linked_candidate.name || "Candidate"}</Link>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuId === u.id && (
                        <div className="absolute right-0 top-8 z-50 min-w-[185px] bg-card border border-border rounded-xl shadow-xl py-1 overflow-hidden">
                          {u.display_role === "User" && (
                            <MenuItem icon={UserCheck} onClick={() => openAction(u, "change_role", "recruiter")}>Promote to Recruiter</MenuItem>
                          )}
                          {(u.display_role === "Recruiter" || u.display_role === "Recruiter AI") && u.id !== callerId && (
                            <MenuItem icon={UserMinus} onClick={() => openAction(u, "change_role", "user")}>Demote to User</MenuItem>
                          )}
                          {!u.is_owner && (
                            <MenuItem icon={Crown} onClick={() => openAction(u, "assign_owner")}>Grant Owner access</MenuItem>
                          )}
                          {u.is_owner && u.id !== callerId && (
                            <MenuItem icon={Crown} onClick={() => openAction(u, "revoke_owner")} danger>Revoke Owner access</MenuItem>
                          )}
                          {u.id !== callerId && <div className="border-t border-border/40 my-1" />}
                          {u.id !== callerId && u.is_active  && <MenuItem icon={PowerOff} onClick={() => openAction(u, "deactivate")} danger>Deactivate account</MenuItem>}
                          {u.id !== callerId && !u.is_active && <MenuItem icon={Power}    onClick={() => openAction(u, "reactivate")}>Reactivate account</MenuItem>}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {actionType && actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden mx-4">
            <div className={`px-6 py-4 flex items-start justify-between gap-3 border-b ${actionType === "revoke_owner" || actionType === "deactivate" ? "border-red-400/20 bg-red-500/5" : actionType === "assign_owner" ? "border-amber-400/20 bg-amber-500/5" : "border-border/50"}`}>
              <div>
                <h3 className="text-base font-semibold">{modalTitle[actionType] ?? ""}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{actionTarget.display_name} · {actionTarget.email}</p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {actionTarget.is_ai && actionType !== "complete_name" && actionType !== "revoke_owner" && (
                <div className="flex gap-3 p-3.5 rounded-xl bg-blue-500/8 border border-blue-400/25">
                  <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                    <p className="font-medium">This is an AI recruiter account</p>
                    <p>Changes may affect automated workflows and AI-driven operations.</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={aiConfirmed} onChange={e => setAiConfirmed(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                      <span className="font-medium">I understand and want to proceed</span>
                    </label>
                  </div>
                </div>
              )}
              {actionType === "complete_name" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{modalDesc()}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>First name</label><input className={INPUT} value={completeName.first} onChange={e => setCompleteName(n => ({ ...n, first: e.target.value }))} placeholder="First" autoFocus /></div>
                    <div><label className={LABEL}>Last name</label><input className={INPUT} value={completeName.last} onChange={e => setCompleteName(n => ({ ...n, last: e.target.value }))} placeholder="Last" /></div>
                  </div>
                </div>
              )}
              {actionType !== "complete_name" && (!actionTarget.is_ai || aiConfirmed) && (
                <p className="text-sm text-muted-foreground">{modalDesc()}</p>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button className={BTN_GHOST} onClick={closeModal}>Cancel</button>
              <button
                className={actionType === "deactivate" || actionType === "revoke_owner" ? BTN_DANGER : BTN_PRIMARY}
                onClick={runAction}
                disabled={!canRun}
              >
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === "complete_name" && "Save name"}
                {actionType === "change_role"   && (pendingRole === "recruiter" ? "Promote" : "Demote")}
                {actionType === "assign_owner"  && "Grant Owner"}
                {actionType === "revoke_owner"  && "Revoke Owner"}
                {actionType === "deactivate"    && "Deactivate"}
                {actionType === "reactivate"    && "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
