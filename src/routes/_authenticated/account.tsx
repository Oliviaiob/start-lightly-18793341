import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCircle2, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  component: Page,
});

function Page() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, email, phone")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          display_name: data.display_name || "",
          email: data.email || u.user.email || "",
          phone: data.phone || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        display_name: form.display_name,
        phone: form.phone,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error("Couldn't save changes");
    else toast.success("Profile updated");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Personal"
        title="My Account"
        description="Update your personal profile details and preferences."
        icon={UserCircle2}
      />
      <Card className="p-6 md:p-7 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card max-w-2xl">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} disabled />
              <p className="text-[11px] text-muted-foreground">Managed via authentication.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="h-10 px-4 rounded-lg bg-navy text-navy-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
