import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Layers, ExternalLink } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { useNavigate } from 'react-router-dom';

// Custom colored div icons for Leaflet markers
const createCustomIcon = (type) => {
  let colorClass = 'bg-sky-600';
  if (type === 'verified') colorClass = 'bg-emerald-600';
  if (type === 'flagged') colorClass = 'bg-rose-600';
  if (type === 'jal-saheli') colorClass = 'bg-amber-600';
  if (type === 'water-body') colorClass = 'bg-blue-600';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="w-6 h-6 ${colorClass} text-white rounded-full flex items-center justify-center border-2 border-white shadow-md font-bold text-[10px]">
      📍
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function MapPanel({ markers = [], height = "h-[450px]" }) {
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState('all');

  const filteredMarkers = markers.filter(m => {
    if (activeLayer === 'all') return true;
    return m.type === activeLayer;
  });

  return (
    <div className={`relative ${height} w-full border border-slate-200 rounded-sm overflow-hidden bg-slate-100 shadow-xs flex flex-col`}>
      {/* Top Map Layer Control Bar */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs flex items-center justify-between z-20 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">GIS Spatial Layers</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveLayer('all')}
            className={`px-2 py-1 rounded text-[11px] font-medium ${activeLayer === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            All Layers
          </button>
          <button
            onClick={() => setActiveLayer('verified')}
            className={`px-2 py-1 rounded text-[11px] font-medium ${activeLayer === 'verified' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Verified
          </button>
          <button
            onClick={() => setActiveLayer('flagged')}
            className={`px-2 py-1 rounded text-[11px] font-medium ${activeLayer === 'flagged' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Flagged
          </button>
          <button
            onClick={() => setActiveLayer('jal-saheli')}
            className={`px-2 py-1 rounded text-[11px] font-medium ${activeLayer === 'jal-saheli' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            Jal Saheli
          </button>
        </div>
      </div>

      {/* Main Interactive Leaflet Canvas */}
      <div className="flex-1 w-full relative z-10">
        <MapContainer
          center={[14.8000, 78.5000]}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredMarkers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createCustomIcon(marker.type)}
            >
              <Popup>
                <div className="p-1 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold text-xs text-slate-900">{marker.id}</span>
                    <StatusBadge status={marker.type} text={marker.typeLabel} />
                  </div>
                  <h4 className="font-semibold text-xs text-slate-800 leading-tight">{marker.title}</h4>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p><span className="font-medium text-slate-700">District:</span> {marker.district}</p>
                    <p><span className="font-medium text-slate-700">Submitter:</span> {marker.submitter}</p>
                    <p><span className="font-medium text-slate-700">Confidence:</span> {marker.confidence}</p>
                    <p className="italic text-slate-500 text-[10px] mt-1">{marker.description}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/submission-analysis?id=${marker.id}`)}
                    className="w-full mt-2 py-1 px-2 bg-slate-900 text-white rounded text-[11px] font-semibold flex items-center justify-center space-x-1 hover:bg-slate-800"
                  >
                    <span>View Inspection Detail</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-none border border-slate-300 rounded px-3 py-2 text-[11px] z-20 shadow-md flex items-center space-x-4">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Legend:</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span className="text-slate-700 font-medium">Verified Intervention</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          <span className="text-slate-700 font-medium">Flagged Zone</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span className="text-slate-700 font-medium">Water Body</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
          <span className="text-slate-700 font-medium">Jal Saheli</span>
        </div>
      </div>
    </div>
  );
}
