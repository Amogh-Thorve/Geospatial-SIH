import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { typeMeta, mapCenter } from "../data/mapData";

/*
 * MapView
 * -------
 * Real interactive map using react-leaflet + OpenStreetMap tiles.
 * Supports native pan/zoom, marker click-to-select, and popups with
 * location details pulled straight from mapData.js.
 *
 * Requires "leaflet" and "react-leaflet" as project dependencies.
 * If they are not yet installed, run:
 *   npm install leaflet react-leaflet
 */

// Build a small colored pin icon per location type using a div icon
// (avoids the classic Leaflet + bundler "missing marker image" issue).
function buildIcon(type, isSelected) {
  const color = typeMeta[type]?.color || "#475569";
  const size = isSelected ? 26 : 20;
  return L.divIcon({
    className: "gw-marker",
    html: `<div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border:2px solid #ffffff;
        border-radius:50%;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function MapView({ locations, activeTypes, selectedId, onSelect }) {
  const visibleLocations = useMemo(
    () => locations.filter((loc) => activeTypes[loc.type]),
    [locations, activeTypes]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-slate-200">
      {/* Mock analysis layer overlays (NDVI / NDWI / Change Detection) */}
      {activeTypes.ndvi && (
        <div className="pointer-events-none absolute inset-0 z-[500] bg-green-500/10" />
      )}
      {activeTypes.ndwi && (
        <div className="pointer-events-none absolute inset-0 z-[500] bg-blue-500/10" />
      )}
      {activeTypes["change-detection"] && (
        <div className="pointer-events-none absolute inset-0 z-[500] border-4 border-amber-400/40" />
      )}

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={buildIcon(loc.type, loc.id === selectedId)}
            eventHandlers={{
              click: () => onSelect(loc.id),
            }}
          >
            <Popup>
              <div className="min-w-[190px] space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-900">{loc.id}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize"
                    style={{
                      backgroundColor: `${typeMeta[loc.type]?.color}1a`,
                      color: typeMeta[loc.type]?.color,
                    }}
                  >
                    {loc.status}
                  </span>
                </div>
                <div className="font-semibold text-slate-800">{loc.name}</div>
                <div className="text-slate-500">{loc.location}</div>
                <div className="flex justify-between pt-1 text-slate-600">
                  <span>Type</span>
                  <span className="font-medium">{typeMeta[loc.type]?.label ?? loc.type}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Confidence</span>
                  <span className="font-medium">{Math.round(loc.confidence * 100)}%</span>
                </div>
                {loc.description && (
                  <p className="border-t border-slate-100 pt-1 text-[11px] leading-relaxed text-slate-500">
                    {loc.description}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Mock scale / disclaimer footer */}
      <div className="pointer-events-none absolute bottom-2 right-3 z-[500] rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500">
        OpenStreetMap · Demo location data
      </div>
    </div>
  );
}