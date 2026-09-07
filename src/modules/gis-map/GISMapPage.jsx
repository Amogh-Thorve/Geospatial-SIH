import { useMemo, useState } from "react";
import MapView from "./components/MapView";
import MapLegend from "./components/MapLegend";
import MapControls from "./components/MapControls";
import LocationPopup from "./components/LocationPopup";
import { mapLocations } from "./data/mapData";

const DEFAULT_ACTIVE_TYPES = {
  intervention: true,
  flagged: true,
  waterbody: true,
  "jal-saheli": true,
  ndvi: false,
  ndwi: false,
  "change-detection": false,
};

export default function GISMapPage() {
  const [activeTypes, setActiveTypes] = useState(DEFAULT_ACTIVE_TYPES);
  const [selectedId, setSelectedId] = useState(null);

  const selectedLocation = useMemo(
    () => mapLocations.find((loc) => loc.id === selectedId) || null,
    [selectedId]
  );

  const handleToggle = (key) => {
    setActiveTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-50 p-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">GIS Intelligence Map</h1>
        <p className="text-sm text-slate-500">
          Geospatial visualization of watershed interventions and field intelligence
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="min-h-[420px] lg:min-h-0">
          <MapView
            locations={mapLocations}
            activeTypes={activeTypes}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        <div className="flex flex-col gap-4">
          <MapControls activeTypes={activeTypes} onToggle={handleToggle} />
          <MapLegend />
          <LocationPopup location={selectedLocation} onClose={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  );
}