import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapIcon, Users, Building2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/map")({
  component: Page,
});

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

async function saveCoords(table: "candidates" | "clients", id: string, lat: number, lng: number) {
  await supabase.from(table).update({ latitude: lat, longitude: lng }).eq("id", id);
}

function Page() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [candidates, setCandidates] = useState<MapCandidate[]>([]);
  const [clients, setClients] = useState<MapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showClients, setShowClients] = useState(true);
  const [mapReady, setMapReady] = useState(false);

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

  // Init Leaflet client-side only via dynamic import
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [52.5, -1.5],
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = { map, L };
      setMapReady(true);
    });

    return () => {
      leafletMapRef.current?.map?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Geocode missing coords
  const geocodeMissing = useCallback(async (cands: MapCandidate[], cls: MapClient[]) => {
    setGeocoding(true);
    const updatedCands = [...cands];
    const updatedClients = [...cls];

    for (const c of updatedCands.filter(x => !x.latitude && x.postcode)) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) {
        c.latitude = coords[0];
        c.longitude = coords[1];
        await saveCoords("candidates", c.id, coords[0], coords[1]);
      }
    }
    for (const c of updatedClients.filter(x => !x.latitude && x.postcode)) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) {
        c.latitude = coords[0];
        c.longitude = coords[1];
        await saveCoords("clients", c.id, coords[0], coords[1]);
      }
    }
    setCandidates([...updatedCands]);
    setClients([...updatedClients]);
    setGeocoding(false);
  }, []);

  // Auto-geocode when data loads
  useEffect(() => {
    if (loading) return;
    const needsGeocode =
      candidates.some(c => !c.latitude && c.postcode) ||
      clients.some(c => !c.latitude && c.postcode);
    if (needsGeocode) geocodeMissing(candidates, clients);
  }, [loading]);

  // Render markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const { map, L } = leafletMapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const candidateIcon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#0d9488;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const clientIcon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;border-radius:4px;background:#0f172a;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const bounds: [number, number][] = [];

    if (showCandidates) {
      candidates.filter(c => c.latitude && c.longitude).forEach(c => {
        const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidate";
        const marker = L.marker([c.latitude!, c.longitude!], { icon: candidateIcon })
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif;line-height:1.4">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${name}</div>
              ${c.qualification_level ? `<div style="font-size:11px;color:#6b7280;margin-bottom:2px">${c.qualification_level.replace(/_/g," ")}</div>` : ""}
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
        const marker = L.marker([c.latitude!, c.longitude!], { icon: clientIcon })
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif;line-height:1.4">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${c.company_name ?? "Client"}</div>
              ${c.client_type ? `<div style="font-size:11px;color:#6b7280;margin-bottom:2px">${c.client_type}</div>` : ""}
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
  }, [candidates, clients, showCandidates, showClients, mapReady]);

  const mappedCandidates = candidates.filter(c => c.latitude && c.longitude).length;
  const mappedClients = clients.filter(c => c.latitude && c.longitude).length;
  const unmapped = candidates.filter(c => !c.latitude && !c.postcode).length +
    clients.filter(c => !c.latitude && !c.postcode).length;

  return (
    <>
      {/* Leaflet CSS — injected as a link tag to avoid SSR issues */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div className="max-w-[1400px] mx-auto space-y-4 pt-2">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            eyebrow="Operations"
            title="Map"
            description="Active and processing temporary candidates and clients."
            icon={MapIcon}
          />
          <button
            onClick={() => geocodeMissing(candidates, clients)}
            disabled={geocoding || loading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 shrink-0 mt-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${geocoding ? "animate-spin" : ""}`} />
            {geocoding ? "Geocoding…" : "Refresh coords"}
          </button>
        </div>

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
            <span className="text-xs text-muted-foreground">
              {unmapped} record{unmapped !== 1 ? "s" : ""} missing postcode
            </span>
          )}
          {(loading || geocoding) && (
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading…" : "Geocoding postcodes…"}
            </span>
          )}
        </div>

        <div
          ref={mapRef}
          className="w-full rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
          style={{ height: "calc(100vh - 260px)", minHeight: "480px" }}
        />
      </div>
    </>
  );
}
