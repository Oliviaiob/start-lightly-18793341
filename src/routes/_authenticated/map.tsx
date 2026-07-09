import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapIcon, Users, Building2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/map")({
  component: Page,
});

// Fix Leaflet default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom circle marker factories
function candidateIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#0d9488;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function clientIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:4px;background:#0f172a;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

type MapCandidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  postcode: string | null;
  town: string | null;
  qualification_level: string | null;
  status_temp: string | null;
  latitude: number | null;
  longitude: number | null;
};

type MapClient = {
  id: string;
  company_name: string | null;
  postcode: string | null;
  address: string | null;
  client_type: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Geocode a UK postcode via postcodes.io (free, no key)
async function geocodePostcode(postcode: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const json = await res.json();
    if (json.status === 200 && json.result) {
      return [json.result.latitude, json.result.longitude];
    }
  } catch {}
  return null;
}

// Save coords back to Supabase so we don't geocode again
async function saveCoords(table: "candidates" | "clients", id: string, lat: number, lng: number) {
  await supabase.from(table).update({ latitude: lat, longitude: lng }).eq("id", id);
}

function StatusBadge({ label }: { label: string }) {
  const colour =
    label === "active" ? "bg-teal/20 text-teal-foreground" :
    label === "pending_compliance" ? "bg-warning/20 text-warning-foreground" :
    "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colour}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function Page() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const [candidates, setCandidates] = useState<MapCandidate[]>([]);
  const [clients, setClients] = useState<MapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showClients, setShowClients] = useState(true);
  const markersRef = useRef<L.Layer[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [candRes, clientRes] = await Promise.all([
      supabase
        .from("candidates")
        .select("id,first_name,last_name,postcode,town,qualification_level,status_temp,latitude,longitude")
        .eq("candidate_type", "temp")
        .in("status_temp", ["active", "pending_compliance"]),
      supabase
        .from("clients")
        .select("id,company_name,postcode,address,client_type,status,latitude,longitude"),
    ]);
    setCandidates((candRes.data as MapCandidate[]) || []);
    setClients((clientRes.data as MapClient[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Geocode any missing coords
  const geocodeMissing = useCallback(async () => {
    setGeocoding(true);
    const toGeocodeCands = candidates.filter(c => !c.latitude && c.postcode);
    const toGeocodeClients = clients.filter(c => !c.latitude && c.postcode);

    for (const c of toGeocodeCands) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) {
        await saveCoords("candidates", c.id, coords[0], coords[1]);
        setCandidates(prev => prev.map(p => p.id === c.id ? { ...p, latitude: coords[0], longitude: coords[1] } : p));
      }
    }
    for (const c of toGeocodeClients) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) {
        await saveCoords("clients", c.id, coords[0], coords[1]);
        setClients(prev => prev.map(p => p.id === c.id ? { ...p, latitude: coords[0], longitude: coords[1] } : p));
      }
    }
    setGeocoding(false);
  }, [candidates, clients]);

  // Auto-geocode when data loads
  useEffect(() => {
    const needsGeocode =
      candidates.some(c => !c.latitude && c.postcode) ||
      clients.some(c => !c.latitude && c.postcode);
    if (!loading && needsGeocode) geocodeMissing();
  }, [loading]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, {
      center: [52.5, -1.5], // UK centre
      zoom: 7,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletRef.current);

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  }, []);

  // Render markers whenever data or visibility changes
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds: [number, number][] = [];

    if (showCandidates) {
      candidates.filter(c => c.latitude && c.longitude).forEach(c => {
        const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidate";
        const marker = L.marker([c.latitude!, c.longitude!], { icon: candidateIcon() })
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${name}</div>
              ${c.qualification_level ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px">${c.qualification_level.replace(/_/g," ")}</div>` : ""}
              ${c.town ? `<div style="font-size:11px;color:#6b7280">${c.town}${c.postcode ? " · " + c.postcode : ""}</div>` : ""}
              ${c.status_temp ? `<div style="margin-top:6px"><span style="background:#ccfbf1;color:#0f766e;font-size:10px;font-weight:600;padding:2px 6px;border-radius:9999px">${c.status_temp.replace(/_/g," ")}</span></div>` : ""}
              <div style="margin-top:8px"><a href="/candidates/${c.id}" style="font-size:11px;color:#0d9488;font-weight:500">View profile →</a></div>
            </div>
          `)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.push([c.latitude!, c.longitude!]);
      });
    }

    if (showClients) {
      clients.filter(c => c.latitude && c.longitude).forEach(c => {
        const marker = L.marker([c.latitude!, c.longitude!], { icon: clientIcon() })
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${c.company_name ?? "Client"}</div>
              ${c.client_type ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px">${c.client_type}</div>` : ""}
              ${c.address ? `<div style="font-size:11px;color:#6b7280">${c.address}${c.postcode ? ", " + c.postcode : ""}</div>` : ""}
              ${c.status ? `<div style="margin-top:6px"><span style="background:#e2e8f0;color:#334155;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px">${c.status}</span></div>` : ""}
              <div style="margin-top:8px"><a href="/clients/${c.id}" style="font-size:11px;color:#0f172a;font-weight:500">View client →</a></div>
            </div>
          `)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.push([c.latitude!, c.longitude!]);
      });
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [candidates, clients, showCandidates, showClients]);

  const mappedCandidates = candidates.filter(c => c.latitude && c.longitude).length;
  const mappedClients = clients.filter(c => c.latitude && c.longitude).length;
  const unmapped = candidates.filter(c => !c.latitude && !c.postcode).length + clients.filter(c => !c.latitude && !c.postcode).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pt-2">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Operations"
          title="Map"
          description="Active and processing temporary candidates and clients."
          icon={MapIcon}
        />
        <button
          onClick={geocodeMissing}
          disabled={geocoding || loading}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 shrink-0 mt-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${geocoding ? "animate-spin" : ""}`} />
          {geocoding ? "Geocoding…" : "Refresh coords"}
        </button>
      </div>

      {/* Legend + toggles */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setShowCandidates(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showCandidates ? "bg-teal/10 border-teal/30 text-teal-foreground" : "border-border text-muted-foreground opacity-50"}`}
        >
          <span className="w-3 h-3 rounded-full bg-teal shrink-0" />
          <Users className="h-3.5 w-3.5" />
          Candidates
          <span className="text-xs opacity-70">{mappedCandidates}</span>
        </button>
        <button
          onClick={() => setShowClients(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showClients ? "bg-navy/10 border-navy/30 text-navy" : "border-border text-muted-foreground opacity-50"}`}
        >
          <span className="w-3 h-3 rounded bg-navy shrink-0" />
          <Building2 className="h-3.5 w-3.5" />
          Clients
          <span className="text-xs opacity-70">{mappedClients}</span>
        </button>
        {unmapped > 0 && (
          <span className="text-xs text-muted-foreground">{unmapped} record{unmapped !== 1 ? "s" : ""} missing postcode — won't appear on map</span>
        )}
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
        {geocoding && <span className="text-xs text-muted-foreground">Geocoding postcodes…</span>}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden shadow-[var(--shadow-card)] border border-transparent"
        style={{ height: "calc(100vh - 260px)", minHeight: "480px" }}
      />
    </div>
  );
}
