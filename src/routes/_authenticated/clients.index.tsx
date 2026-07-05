import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Search, Plus, X, MapPin, Phone, Check } from "lucide-react";
import { useEffectiveScope, useScope } from "@/contexts/scope-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: Page,
});

type Client = {
  id: string;
  company_name: string;
  client_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postcode: string | null;
  status: string | null;
  tob_signed: boolean | null;
  last_activity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const ALL = "__all__";

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function typeLabel(t: string | null) {
  const map: Record<string, string> = {
    nursery: "Nursery",
    school: "School",
    private_family: "Private Family",
    other: "Other",
  };
  return map[t ?? ""] ?? t ?? "—";
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
        Active
      </span>
    );
  if (status === "prospect")
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-warning/20 text-[oklch(0.45_0.12_75)]">
        Prospect
      </span>
    );
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
      Inactive
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full bg-muted/40 border-transparent text-xs font-medium">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Page() {
  const navigate = useNavigate({ from: "/clients" });
  const scope = useEffectiveScope();
  const { userId } = useScope();

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [tobFilter, setTobFilter] = useState<string>(ALL);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("clients")
        .select(
          "id,company_name,client_type,contact_name,contact_email,contact_phone,address,postcode,status,tob_signed,last_activity_date,created_at,updated_at",
        )
        .order("company_name", { ascending: true })
        .limit(500);
      if (scope === "mine") query = query.eq("created_by", userId);
      const { data, error } = await query;
      if (error) toast.error("Failed to load clients");
      setRows((data as Client[]) || []);
      setLoading(false);
    })();
  }, [userId, scope]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== ALL && r.client_type !== typeFilter) return false;
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (tobFilter === "signed" && !r.tob_signed) return false;
      if (tobFilter === "unsigned" && r.tob_signed) return false;
      if (needle) {
        const hay =
          `${r.company_name ?? ""} ${r.contact_name ?? ""} ${r.postcode ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, typeFilter, statusFilter, tobFilter]);

  const hasFilters =
    !!q || typeFilter !== ALL || statusFilter !== ALL || tobFilter !== ALL;

  const clearFilters = () => {
    setQ("");
    setTypeFilter(ALL);
    setStatusFilter(ALL);
    setTobFilter(ALL);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pt-2">
      <PageHeader
        eyebrow="Recruitment"
        title="Clients"
        description={
          loading
            ? "Loading clients…"
            : `${rows.length} total — ${filtered.length} shown`
        }
        icon={Building2}
        actions={
          <button
            onClick={() => toast.info("Add client form — coming soon")}
            className="h-9 px-3.5 rounded-full bg-teal text-teal-foreground text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Client
          </button>
        }
      />

      {/* Filters */}
      <Card className="p-4 rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, contact, postcode…"
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>

          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Type"
            options={[
              { value: "nursery", label: "Nursery" },
              { value: "school", label: "School" },
              { value: "private_family", label: "Private Family" },
              { value: "other", label: "Other" },
            ]}
          />

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "prospect", label: "Prospect" },
              { value: "inactive", label: "Inactive" },
            ]}
          />

          <FilterSelect
            value={tobFilter}
            onChange={setTobFilter}
            placeholder="ToB"
            options={[
              { value: "signed", label: "ToB Signed" },
              { value: "unsigned", label: "ToB Unsigned" },
            ]}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 h-9 px-2"
            >
              Clear filters <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-transparent shadow-[var(--shadow-card)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground border-b">
                <th className="text-left font-semibold py-3 px-4">Client</th>
                <th className="text-left font-semibold py-3 px-3">Type</th>
                <th className="text-left font-semibold py-3 px-3">Status</th>
                <th className="text-left font-semibold py-3 px-3">Location</th>
                <th className="text-left font-semibold py-3 px-3">Primary Contact</th>
                <th className="text-left font-semibold py-3 px-3">Phone</th>
                <th className="text-center font-semibold py-3 px-3">ToB</th>
                <th className="text-right font-semibold py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-muted-foreground"
                  >
                    Loading clients…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-muted-foreground"
                  >
                    {rows.length === 0
                      ? "No clients yet."
                      : "No clients match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      navigate({ to: "/clients/$id", params: { id: r.id } })
                    }
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-navy-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {r.company_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.contact_email || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {typeLabel(r.client_type)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span>{r.postcode || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs font-medium">
                      {r.contact_name || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span>{r.contact_phone || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.tob_signed ? (
                        <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-success/20 text-[oklch(0.4_0.12_155)]">
                          <Check className="h-3 w-3" /> Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {relTime(r.last_activity_date || r.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
