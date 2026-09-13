import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/services/locationService";

export type MarkerKind = "collector" | "recycler" | "pickup";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  kind: MarkerKind;
  label: string;
  onSelect?: () => void;
}

const MARKER_COLORS: Record<MarkerKind, string> = {
  collector: "#2563eb",
  recycler: "#16a34a",
  pickup: "#d97706",
};

const MARKER_GLYPHS: Record<MarkerKind, string> = {
  collector: "C",
  recycler: "R",
  pickup: "P",
};

interface MapViewProps {
  center: GeoPoint;
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (point: GeoPoint) => void;
  height?: number;
  selectedId?: string | null;
}

/**
 * OpenStreetMap + Leaflet map. Leaflet only loads in the browser, so the map
 * renders a loading state during SSR/first paint.
 */
export function MapView({ center, zoom = 13, markers = [], onMapClick, height = 320, selectedId }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Keep latest click handler in a ref so the map listener never goes stale.
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(containerRef.current, { center: [center.latitude, center.longitude], zoom });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        map.on("click", (e) => {
          clickRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        });
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the center moves meaningfully.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.latitude, center.longitude], map.getZoom());
  }, [center.latitude, center.longitude]);

  // Redraw markers.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${MARKER_COLORS[m.kind]};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid ${selectedId === m.id ? "#111827" : "#ffffff"};box-shadow:0 1px 4px rgba(0,0,0,.4)">${MARKER_GLYPHS[m.kind]}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([m.latitude, m.longitude], { icon, title: m.label });
      marker.bindTooltip(m.label);
      if (m.onSelect) marker.on("click", () => m.onSelect?.());
      marker.addTo(layer);
    }
  }, [markers, ready, selectedId]);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground"
        style={{ height }}
      >
        The map could not be loaded. Check your internet connection.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border" style={{ height }}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} aria-label="Map" />
    </div>
  );
}
