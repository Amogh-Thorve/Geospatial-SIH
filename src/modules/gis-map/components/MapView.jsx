import { useMemo, useState } from "react";
import { typeMeta } from "../data/mapData";

/*
 * MapView
 * -------
 * This component owns the map implementation for the GIS module.
 *
 * NOTE: This project does not currently have react-leaflet as a dependency,
 * and no new dependencies may be installed for this module. To keep the
 * module fully functional and self-contained, MapView renders a clean,
 * lightweight mock "map" surface (an SVG viewport with a lat/lng -> screen
 * projection over an Andhra Pradesh bounding box) with markers, hover
 * tooltips, and click-to-select behavior.
 *
 * If react-leaflet + leaflet are added to this project later, this file is
 * the only place that needs to change: swap the SVG viewport below for a
 * <MapContainer> / <TileLayer> / <Marker> implementation using the same
 * `locations`, `activeTypes`, `selectedId`, and `onSelect` props.
 */

// Rough bounding box around Andhra Pradesh used only for mock projection.
const BOUNDS = {
  minLat: 12.6,
  maxLat: 19.1,
  minLng: 76.7,
  maxLng: 84.8,
};

function project(lat, lng, width, height) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width;
  const y = height - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
  return { x, y };
}

const VIEW_W = 800;
const VIEW_H = 560;

export default function MapView({ locations, activeTypes, selectedId, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  const visibleLocations = useMemo(
    () => locations.filter((loc) => activeTypes[loc.type]),
    [locations, activeTypes]
  );

  const hoveredLocation = visibleLocations.find((l) => l.id === hoveredId);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      {/* Mock analysis layer overlays */}
      {activeTypes.ndvi && (
        <div className="pointer-events-none absolute inset-0 bg-green-500/10" />
      )}
      {activeTypes.ndwi && (
        <div className="pointer-events-none absolute inset-0 bg-blue-500/10" />
      )}
      {activeTypes["change-detection"] && (
        <div className="pointer-events-none absolute inset-0 border-4 border-amber-400/40" />
      )}

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Base grid to suggest a map surface */}
        <defs>
          <pattern id="gw-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="#f8fafc" />
        <rect width={VIEW_W} height={VIEW_H} fill="url(#gw-grid)" />

        {/* Mock Andhra Pradesh outline (simplified, non-geographic placeholder shape) */}
        <path
          d="M 90 480 L 130 360 L 110 250 L 180 150 L 300 90 L 460 70 L 620 110 L 700 200 L 690 340 L 620 460 L 480 520 L 300 530 Z"
          fill="#eef2f7"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Markers */}
        {visibleLocations.map((loc) => {
          const { x, y } = project(loc.lat, loc.lng, VIEW_W, VIEW_H);
          const meta = typeMeta[loc.type];
          const isSelected = loc.id === selectedId;
          const isHovered = loc.id === hoveredId;
          const radius = isSelected ? 9 : isHovered ? 8 : 6;

          return (
            <g
              key={loc.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onClick={() => onSelect(loc.id)}
              onMouseEnter={() => setHoveredId(loc.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === loc.id ? null : cur))}
            >
              {isSelected && (
                <circle r={radius + 6} fill={meta.color} fillOpacity={0.18} />
              )}
              <circle
                r={radius}
                fill={meta.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredLocation && (
        <div className="pointer-events-none absolute left-3 top-3 rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
          <div className="font-medium text-slate-800">{hoveredLocation.name}</div>
          <div className="text-slate-500">{hoveredLocation.location}</div>
        </div>
      )}

      {/* Mock scale / disclaimer footer */}
      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-400">
        Mock projection · Andhra Pradesh region · Demo data only
      </div>
    </div>
  );
}
