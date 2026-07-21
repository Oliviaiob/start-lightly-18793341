import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Upload, Eye, EyeOff, UserPlus,
  Loader2, X, Building2, Users, User, ChevronRight
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings/")({ component: SettingsPage });

interface Profile { id: string; first_name: string | null; last_name: string | null; display_name: string | null; job_title: string | null; phone: string | null; email: string | null; is_active: boolean | null; }
interface AgencySettings { id: string; agency_name: string | null; address_line1: string | null; address_line2: string | null; city: string | null; postcode: string | null; phone: string | null; email: string | null; logo_url: string | null; default_placement_recruiter_id: string | null; }
interface RecruiterOption { id: string; display_name: string | null; first_name: string | null; last_name: string | null; is_ai: boolean | null; }
interface TeamMember { id: string; first_name: string | null; last_name: string | null; display_name: string | null; email: string | null; job_title: string | null; is_active: boolean | null; role: string; }

const INPUT = "flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const LABEL = "block text-sm font-medium text-foreground mb-1.5";
const SAVE_BTN = "px-5 py-2 text-sm font-medium rounded-xl bg-navy text-white hover:bg-navy/90 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer";
const SECTION_TITLE = "text-base font-semibold text-foreground";

function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pf, setPf] = useState({ first_name: "", last_name: "", display_name: "", job_title: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Agency
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [recruiterOptions, setRecruiterOptions] = useState<RecruiterOption[]>([]);
  const [defaultRecruiterId, setDefaultRecruiterId] = useState<string>("");
  const [savingDefaultRecruiter, setSavingDefaultRecruiter] = useState(false);
  const [ag, setAg] = useState({ agency_name: "", address_line1: "", address_line2: "", city: "", postcode: "", phone: "", email: "" });
  const [savingAgency, setSavingAgency] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ first_name: "", last_name: "", email: "", role: "recruiter" });
  const [inviting, setInviting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      init(data.user.id);
    });
  }, []);

  const init = async (uid: string) => {
    setLoading(true);
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    if (prof) { setProfile(prof as Profile); setPf({ first_name: prof.first_name ?? "", last_name: prof.last_name ?? "", display_name: prof.display_name ?? "", job_title: prof.job_title ?? "", phone: (prof as any).phone ?? "" }); }
    const admin = (roleRow as any)?.role === "admin";
    setIsAdmin(admin);
    if (admin) { loadAgency(); loadTeam(); }
    setLoading(false);
  };

  const loadAgency = async () => {
    const [{ data }, { data: recProfs }] = await Promise.all([
      supabase.from("agency_settings").select("*").maybeSingle(),
      supabase.from("profiles").select("id, display_name, first_name, last_name, is_ai").eq("is_active", true).order("first_name"),
    ]);
    if (data) {
      setAgency(data as AgencySettings);
      setAg({ agency_name: data.agency_name ?? "", address_line1: data.address_line1 ?? "", address_line2: data.address_line2 ?? "", city: data.city ?? "", postcode: data.postcode ?? "", phone: data.phone ?? "", email: data.email ?? "" });
      if (data.logo_url) setLogoPreview(data.logo_url);
      setDefaultRecruiterId((data as any).default_placement_recruiter_id ?? "");
    }
    setRecruiterOptions((recProfs as RecruiterOption[]) || []);
  };

  const loadTeam = async () => {
    setLoadingTeam(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,first_name,last_name,display_name,email,job_title,is_active").eq("is_ai", false),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (profs && roles) {
      const roleMap: Record<string, string> = {};
      for (const r of roles as any[]) roleMap[r.user_id] = r.role;
      setTeam((profs as any[]).map(p => ({ ...p, role: roleMap[p.id] ?? "recruiter" })));
    }
    setLoadingTeam(false);
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ first_name: pf.first_name, last_name: pf.last_name, display_name: pf.display_name, job_title: pf.job_title, phone: pf.phone }).eq("id", userId);
    setSavingProfile(false);
    error ? toast.error("Failed to save") : toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (pw.password !== pw.confirm) return toast.error("Passwords don't match");
    if (pw.password.length < 8) return toast.error("Minimum 8 characters");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw.password });
    setSavingPw(false);
    error ? toast.error(error.message) : (toast.success("Password changed"), setPw({ password: "", confirm: "" }));
  };

  const saveAgency = async () => {
    setSavingAgency(true);
    const payload = { ...ag, updated_at: new Date().toISOString() };
    if (agency) await supabase.from("agency_settings").update(payload).eq("id", agency.id);
    else await supabase.from("agency_settings").insert(payload);
    setSavingAgency(false);
    toast.success("Agency details saved");
    loadAgency();
  };

  const uploadLogo = async () => {
    if (!logoFile || !agency) return;
    setUploadingLogo(true);
    const { error } = await supabase.storage.from("brand").upload("Logo-white.png", logoFile, { upsert: true, contentType: logoFile.type });
    if (error) { setUploadingLogo(false); return toast.error("Upload failed"); }
    const url = `https://ltpsljknjenpomsxixlx.supabase.co/storage/v1/object/public/brand/Logo-white.png?v=${Date.now()}`;
    await supabase.from("agency_settings").update({ logo_url: url }).eq("id", agency.id);
    setUploadingLogo(false);
    setLogoFile(null);
    setLogoPreview(url);
    toast.success("Logo updated — sidebar will reflect it on next load");
  };

  const inviteUser = async () => {
    if (!inv.email || !inv.first_name) return toast.error("Name and email required");
    setInviting(true);
    const { error } = await supabase.functions.invoke("admin-user-management", { body: { action: "invite", ...inv } });
    setInviting(false);
    if (error) return toast.error("Invite failed");
    toast.success(`Invite sent to ${inv.email}`);
    setInviteOpen(false);
    setInv({ first_name: "", last_name: "", email: "", role: "recruiter" });
    loadTeam();
  };

  const setRole = async (memberId: string, role: string) => {
    if (memberId === userId) return toast.error("Can't change your own role");
    setUpdatingRoleId(memberId);
    await supabase.from("user_roles").update({ role }).eq("user_id", memberId);
    setUpdatingRoleId(null);
    toast.success("Role updated");
    loadTeam();
  };

  const toggleActive = async (member: TeamMember) => {
    if (member.id === userId) return toast.error("Can't deactivate yourself");
    setTogglingId(member.id);
    const action = member.is_active === false ? "reactivate" : "deactivate";
    await supabase.functions.invoke("admin-user-management", { body: { action, user_id: member.id } });
    setTogglingId(null);
    toast.success(action === "reactivate" ? "User reactivated" : "User deactivated");
    loadTeam();
  };

  const saveDefaultRecruiter = async () => {
    if (!agency) return;
    setSavingDefaultRecruiter(true);
    await supabase.from("agency_settings").update({ default_placement_recruiter_id: defaultRecruiterId || null }).eq("id", agency.id);
    setSavingDefaultRecruiter(false);
    toast.success("Default placement recruiter saved");
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
      <PageHeader eyebrow="Workspace" title="Settings" description={isAdmin ? "Manage your profile, agency details, and team." : "Manage your profile and preferences."} icon={SettingsIcon} />

      {/* ── COMPANY SETTINGS SHORTCUT (admin only) ── */}
      {isAdmin && (
        <Link to="/settings/company" className="block group">
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-teal/30 bg-teal/5 hover:bg-teal/10 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-teal/15 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">Company Settings</div>
              <div className="text-xs text-muted-foreground mt-0.5">Pay &amp; charge rates, key documents</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* ── MY PROFILE ── */}
      <Card className="p-6 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-5">
        <div className="flex items-center gap-2 mb-1"><User className="h-4 w-4 text-muted-foreground" /><h2 className={SECTION_TITLE}>My Profile</h2></div>
        <div className="grid grid-cols-2 gap-4">
          {[["First Name","first_name"],["Last Name","last_name"],["Display Name","display_name"],["Job Title","job_title"],["Phone","phone"]].map(([lbl, key]) => (
            <div key={key}><label className={LABEL}>{lbl}</label><input className={INPUT} value={(pf as any)[key]} onChange={e => setPf(p => ({ ...p, [key]: e.target.value }))} /></div>
          ))}
          <div><label className={LABEL}>Email</label><input className={INPUT} value={profile?.email ?? ""} disabled /></div>
        </div>
        <div className="flex justify-end pt-1">
          <button className={SAVE_BTN} onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Save Profile
          </button>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Change Password</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>New Password</label>
              <div className="relative">
                <input className={INPUT + " pr-10"} type={showPw ? "text" : "password"} value={pw.password} onChange={e => setPw(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={LABEL}>Confirm Password</label>
              <input className={INPUT} type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className={SAVE_BTN} onClick={changePassword} disabled={savingPw || !pw.password}>
              {savingPw && <Loader2 className="h-4 w-4 animate-spin" />} Change Password
            </button>
          </div>
        </div>
      </Card>

      {/* ── AGENCY DETAILS ── */}
      {isAdmin && (
        <Card className="p-6 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card space-y-5">
          <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4 text-muted-foreground" /><h2 className={SECTION_TITLE}>Agency Details</h2></div>

          <div>
            <label className={LABEL}>Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-36 h-14 bg-navy rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="max-h-10 max-w-[120px] object-contain" />
                  : <span className="text-xs text-white/40">No logo</span>}
              </div>
              <div className="flex items-center gap-3">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
                <button className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted/40 flex items-center gap-2 transition-colors" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choose file
                </button>
                {logoFile && (
                  <button className={SAVE_BTN} onClick={uploadLogo} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Upload
                  </button>
                )}
                {logoFile && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{logoFile.name}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className={LABEL}>Agency Name</label><input className={INPUT} value={ag.agency_name} onChange={e => setAg(a => ({ ...a, agency_name: e.target.value }))} /></div>
            <div className="col-span-2"><label className={LABEL}>Address Line 1</label><input className={INPUT} value={ag.address_line1} onChange={e => setAg(a => ({ ...a, address_line1: e.target.value }))} /></div>
            <div className="col-span-2"><label className={LABEL}>Address Line 2</label><input className={INPUT} value={ag.address_line2} onChange={e => setAg(a => ({ ...a, address_line2: e.target.value }))} /></div>
            <div><label className={LABEL}>City</label><input className={INPUT} value={ag.city} onChange={e => setAg(a => ({ ...a, city: e.target.value }))} /></div>
            <div><label className={LABEL}>Postcode</label><input className={INPUT} value={ag.postcode} onChange={e => setAg(a => ({ ...a, postcode: e.target.value }))} /></div>
            <div><label className={LABEL}>Phone</label><input className={INPUT} value={ag.phone} onChange={e => setAg(a => ({ ...a, phone: e.target.value }))} /></div>
            <div><label className={LABEL}>Contact Email</label><input className={INPUT} value={ag.email} onChange={e => setAg(a => ({ ...a, email: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end pt-1">
            <button className={SAVE_BTN} onClick={saveAgency} disabled={savingAgency}>
              {savingAgency && <Loader2 className="h-4 w-4 animate-spin" />} Save Agency Details
            </button>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Default Placement Recruiter</h3>
            <p className="text-xs text-muted-foreground mb-3">Automatically assigned to candidates when compliance is completed.</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <select
                  className={INPUT}
                  value={defaultRecruiterId}
                  onChange={e => setDefaultRecruiterId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {recruiterOptions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.display_name ?? (`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unnamed")}
                      {r.is_ai ? " (AI)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button className={SAVE_BTN} onClick={saveDefaultRecruiter} disabled={savingDefaultRecruiter}>
                {savingDefaultRecruiter && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── TEAM ── */}
      {isAdmin && (
        <Card className="p-6 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><h2 className={SECTION_TITLE}>Team</h2></div>
            <button className={SAVE_BTN} onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite
            </button>
          </div>

          {loadingTeam
            ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : <div className="space-y-2">
                {team.map(m => (
                  <div key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-opacity ${m.is_active === false ? "opacity-50 border-border/30" : "border-border/50"} bg-background/50`}>
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0 uppercase">
                      {(m.first_name?.[0] ?? "") + (m.last_name?.[0] ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.display_name ?? (`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Unnamed")}
                        {m.id === userId && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                    <select
                      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-teal/50 disabled:opacity-40 cursor-pointer"
                      value={m.role}
                      disabled={m.id === userId || !!updatingRoleId}
                      onChange={e => setRole(m.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="recruiter">Recruiter</option>
                    </select>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${m.is_active === false ? "bg-red-500/10 text-red-500" : "bg-teal/10 text-teal"}`}>
                      {m.is_active === false ? "Inactive" : "Active"}
                    </span>
                    {m.id !== userId && (
                      <button
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-40 shrink-0 ${m.is_active === false ? "border-teal/40 text-teal hover:bg-teal/10" : "border-red-400/40 text-red-500 hover:bg-red-500/10"}`}
                        onClick={() => toggleActive(m)}
                        disabled={!!togglingId}
                      >
                        {togglingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : m.is_active === false ? "Reactivate" : "Deactivate"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
          }
        </Card>
      )}

      {/* ── INVITE MODAL ── */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setInviteOpen(false)}>
          <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl border border-border/50 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Invite Team Member</h3>
              <button onClick={() => setInviteOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>First Name</label><input className={INPUT} value={inv.first_name} onChange={e => setInv(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><label className={LABEL}>Last Name</label><input className={INPUT} value={inv.last_name} onChange={e => setInv(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div><label className={LABEL}>Email</label><input className={INPUT} type="email" value={inv.email} onChange={e => setInv(f => ({ ...f, email: e.target.value }))} placeholder="recruiter@example.com" /></div>
              <div>
                <label className={LABEL}>Role</label>
                <select className={INPUT} value={inv.role} onChange={e => setInv(f => ({ ...f, role: e.target.value }))}>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button className="flex-1 py-2 text-sm rounded-xl border border-border hover:bg-muted/40 transition-colors" onClick={() => setInviteOpen(false)}>Cancel</button>
                <button className={SAVE_BTN + " flex-1 justify-center"} onClick={inviteUser} disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
