import React, { createFileRoute, Link } from "@tanstack/react-router";
import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapIcon, Building2, RefreshCw, X, Phone, MapPin, Award, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/map")({
  component: Page,
});

type MapCandidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  postcode: string | null;
  town: string | null;
  qualification_level: string | null;
  status_temp: string | null;
  dbs_verified: boolean | null;
  right_to_work_verified: boolean | null;
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
    if (json.status === 200 && json.result) return [json.result.latitude, json.result.longitude];
  } catch {}
  return null;
}

async function saveCoords(table: "candidates" | "clients", id: string, lat: number, lng: number) {
  await supabase.from(table).update({ latitude: lat, longitude: lng }).eq("id", id);
}

function isActive(c: MapCandidate) {
  return c.status_temp === "active";
}

// Star SVG icon — teal for active, purple for pending_compliance
function starIconHtml(active: boolean) {
  const color = active ? "#00E5C8" : "#7C3AED";
  const shadow = active ? "0 2px 8px rgba(0,229,200,0.5)" : "0 2px 8px rgba(124,58,237,0.5)";
  return `<div style="filter:drop-shadow(${shadow})">
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <polygon points="14,2 17.5,10.5 27,11.5 20.5,17.5 22.5,27 14,22 5.5,27 7.5,17.5 1,11.5 10.5,10.5"
        fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  </div>`;
}

function clientIconHtml() {
  return `<div style="width:18px;height:18px;border-radius:5px;background:#0f172a;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;
}

function fmtQual(q: string | null) {
  if (!q) return null;
  return q.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Drawer panel
function CandidateDrawer({ candidate, onClose }: { candidate: MapCandidate; onClose: () => void }) {
  const name = `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() || "Candidate";
  const active = isActive(candidate);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />
      {/* Panel */}
      <div className="relative pointer-events-auto w-80 h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-base">{name}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              active
                ? "bg-teal/15 text-teal-foreground"
                : "bg-purple-100 text-purple-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${active ? "bg-teal" : "bg-purple-500"}`} />
              {active ? "Active" : "Pending Compliance"}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {candidate.qualification_level && (
              <div className="flex items-start gap-3">
                <Award className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Qualification</div>
                  <div className="text-sm font-medium">{fmtQual(candidate.qualification_level)}</div>
                </div>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a href={`tel:${candidate.phone}`} className="text-sm font-medium hover:text-teal transition-colors">
                    {candidate.phone}
                  </a>
                </div>
              </div>
            )}
            {(candidate.town || candidate.postcode) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="text-sm font-medium">
                    {[candidate.town, candidate.postcode].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compliance status */}
          <div className="rounded-xl border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance</div>
            <div className="flex items-center justify-between text-sm">
              <span>DBS</span>
              <span className={candidate.dbs_verified ? "text-teal font-medium" : "text-muted-foreground"}>
                {candidate.dbs_verified ? "✓ Verified" : "Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Right to Work</span>
              <span className={candidate.right_to_work_verified ? "text-teal font-medium" : "text-muted-foreground"}>
                {candidate.right_to_work_verified ? "✓ Verified" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <Link
            to="/candidates/$id"
            params={{ id: candidate.id }}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-navy text-navy-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={onClose}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View full profile
          </Link>
        </div>
      </div>
    </div>
  );
}


// ── Route Checker ─────────────────────────────────────────────────────────────

function RouteChecker({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1001] flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto w-[360px] h-full bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-base">Route Checker</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Travel times between candidate and client</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🗺️</div>
          <div>
            <div className="font-semibold text-base mb-1">Coming Soon</div>
            <p className="text-sm text-muted-foreground">
              Route Checker will show car, bus and train travel times between any candidate and client — directly from the map.
            </p>
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-teal/10 text-teal-foreground text-xs font-semibold">In development</span>
        </div>
      </div>
    </div>
  );
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
  const [selectedCandidate, setSelectedCandidate] = useState<MapCandidate | null>(null);
  // Keep a ref to setSelectedCandidate for use inside Leaflet callbacks
  const setSelectedRef = useRef(setSelectedCandidate);
  useEffect(() => { setSelectedRef.current = setSelectedCandidate; }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [candRes, clientRes] = await Promise.all([
      supabase
        .from("candidates")
        .select("id,first_name,last_name,phone,postcode,town,qualification_level,status_temp,dbs_verified,right_to_work_verified,latitude,longitude")
        .eq("candidate_type", "temp")
        .in("status_temp", ["active", "pending_compliance"]),
      supabase
        .from("clients")
        .select("id,company_name,postcode,address,client_type,status,latitude,longitude")]);
    setCandidates((candRes.data as MapCandidate[]) || []);
    setClients((clientRes.data as MapClient[]) || []);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const geocodeMissing = useCallback(async (cands: MapCandidate[], cls: MapClient[]) => {
    setGeocoding(true);
    const updatedCands = [...cands];
    const updatedClients = [...cls];
    for (const c of updatedCands.filter(x => !x.latitude && x.postcode)) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) { c.latitude = coords[0]; c.longitude = coords[1]; await saveCoords("candidates", c.id, coords[0], coords[1]); }
    }
    for (const c of updatedClients.filter(x => !x.latitude && x.postcode)) {
      const coords = await geocodePostcode(c.postcode!);
      if (coords) { c.latitude = coords[0]; c.longitude = coords[1]; await saveCoords("clients", c.id, coords[0], coords[1]); }
    }
    setCandidates([...updatedCands]);
    setClients([...updatedClients]);
    setGeocoding(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const needsGeocode = candidates.some(c => !c.latitude && c.postcode) || clients.some(c => !c.latitude && c.postcode);
    if (needsGeocode) geocodeMissing(candidates, clients);
  }, [loading]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(mapRef.current!, { center: [52.5, -1.5], zoom: 7, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      leafletMapRef.current = { map, L };
      setMapReady(true);
    });
    return () => { leafletMapRef.current?.map?.remove(); leafletMapRef.current = null; };
  }, []);

  // Render markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const { map, L } = leafletMapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const bounds: [number, number][] = [];

    if (showCandidates) {
      candidates.filter(c => c.latitude && c.longitude).forEach(c => {
        const active = isActive(c);
        const icon = L.divIcon({
          className: "",
          html: starIconHtml(active),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([c.latitude!, c.longitude!], { icon })
          .on("click", () => setSelectedRef.current(c))
          .addTo(map);
        markersRef.current.push(marker);
        bounds.push([c.latitude!, c.longitude!]);
      });
    }

    if (showClients) {
      clients.filter(c => c.latitude && c.longitude).forEach(c => {
        const icon = L.divIcon({
          className: "",
          html: clientIconHtml(),
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([c.latitude!, c.longitude!], { icon })
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif;line-height:1.5">
              <div style="font-weight:600;font-size:13px;margin-bottom:3px">${c.company_name ?? "Client"}</div>
              ${c.client_type ? `<div style="font-size:11px;color:#6b7280">${c.client_type}</div>` : ""}
              ${c.address ? `<div style="font-size:11px;color:#6b7280">${c.address}${c.postcode ? ", " + c.postcode : ""}</div>` : ""}
              ${c.status ? `<div style="margin-top:5px"><span style="background:#e2e8f0;color:#334155;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px">${c.status}</span></div>` : ""}
              <div style="margin-top:8px"><a href="/clients/${c.id}" style="font-size:11px;color:#0f172a;font-weight:500">View client →</a></div>
            </div>
          `)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.push([c.latitude!, c.longitude!]);
      });
    }

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [candidates, clients, showCandidates, showClients, mapReady]);

  const activeCands = candidates.filter(c => isActive(c) && c.latitude && c.longitude).length;
  const processingCands = candidates.filter(c => !isActive(c) && c.latitude && c.longitude).length;
  const mappedClients = clients.filter(c => c.latitude && c.longitude).length;
  const unmapped = candidates.filter(c => !c.latitude && !c.postcode).length + clients.filter(c => !c.latitude && !c.postcode).length;

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {selectedCandidate && (
        <CandidateDrawer candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
      )}
      {showRouteChecker && (
        <RouteChecker onClose={() => setShowRouteChecker(false)} />
      )}

      <div className="max-w-[1400px] mx-auto space-y-4 pt-2">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            eyebrow="Operations"
            title="Map"
            description="Active and processing temporary candidates and clients."
            icon={MapIcon}
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setShowRouteChecker(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-navy text-navy-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              🗺️ Route Checker
            </button>
            <button
              onClick={() => geocodeMissing(candidates, clients)}
              disabled={geocoding || loading}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${geocoding ? "animate-spin" : ""}`} />
              {geocoding ? "Geocoding…" : "Refresh coords"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowCandidates(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showCandidates ? "bg-card border-border" : "opacity-40 border-border"}`}
          >
            <svg width="14" height="14" viewBox="0 0 28 28"><polygon points="14,2 17.5,10.5 27,11.5 20.5,17.5 22.5,27 14,22 5.5,27 7.5,17.5 1,11.5 10.5,10.5" fill="#00E5C8" stroke="white" strokeWidth="1.5"/></svg>
            Active <span className="text-xs text-muted-foreground">{activeCands}</span>
            <svg width="14" height="14" viewBox="0 0 28 28"><polygon points="14,2 17.5,10.5 27,11.5 20.5,17.5 22.5,27 14,22 5.5,27 7.5,17.5 1,11.5 10.5,10.5" fill="#7C3AED" stroke="white" strokeWidth="1.5"/></svg>
            Processing <span className="text-xs text-muted-foreground">{processingCands}</span>
          </button>
          <button
            onClick={() => setShowClients(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showClients ? "bg-card border-border" : "opacity-40 border-border"}`}
          >
            <span className="w-3 h-3 rounded bg-navy shrink-0" />
            <Building2 className="h-3.5 w-3.5" />
            Clients <span className="text-xs text-muted-foreground">{mappedClients}</span>
          </button>
          {unmapped > 0 && <span className="text-xs text-muted-foreground">{unmapped} record{unmapped !== 1 ? "s" : ""} missing postcode</span>}
          {(loading || geocoding) && <span className="text-xs text-muted-foreground">{loading ? "Loading…" : "Geocoding postcodes…"}</span>}
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
