import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapView from './components/MapView';
import MapLegend from './components/MapLegend';
import MapControls from './components/MapControls';
import LocationPopup from './components/LocationPopup';
import { featuresToLocations, getGisFeatures } from '../../services/gisService';
import ConnectionBanner from '../../components/common/ConnectionBanner';
import EmptyState from '../../components/common/EmptyState';

const DEFAULT_ACTIVE_TYPES = {
  intervention: true,
  flagged: true,
  waterbody: true,
  'jal-saheli': true,
  ndvi: false,
  ndwi: false,
  'change-detection': false,
};

export default function GISMapPage() {
  const [activeTypes, setActiveTypes] = useState(DEFAULT_ACTIVE_TYPES);
  const [selectedId, setSelectedId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const collection = await getGisFeatures();
      setLocations(featuresToLocations(collection));
    } catch (err) {
      setError(err.message);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const focus = params.get('id');
    if (focus) setSelectedId(focus);
  }, [params]);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId) || null,
    [locations, selectedId],
  );

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">GIS Intelligence Map</h1>
        <p className="text-sm text-slate-500">
          Live watershed features from the GeoWise API (SQLite/PostGIS). Designed for future GeoServer WMS/WFS and raster tiles.
        </p>
      </div>
      <ConnectionBanner />
      {error && (
        <EmptyState
          title="GIS features unavailable"
          message={`${error} Authoritative module is this map; the unused src/pages/GisMap.jsx page is not routed.`}
          action={<button type="button" className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs" onClick={load}>Retry</button>}
        />
      )}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="min-h-[420px] lg:min-h-0">
          <MapView
            locations={loading ? [] : locations}
            activeTypes={activeTypes}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          />
        </div>
        <div className="flex flex-col gap-4">
          <MapControls activeTypes={activeTypes} onToggle={(key) => setActiveTypes((prev) => ({ ...prev, [key]: !prev[key] }))} />
          <MapLegend />
          <LocationPopup
            location={selectedLocation}
            onClose={() => setSelectedId(null)}
            onAnalyze={(id) => navigate(`/submission-analysis?id=${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
