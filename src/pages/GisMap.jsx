import React from 'react';
import PageHeader from '../components/common/PageHeader';
import MapPanel from '../components/maps/MapPanel';
import { MOCK_MAP_MARKERS } from '../data/mockData';
import { Filter, Download, Maximize2 } from 'lucide-react';

export default function GisMap() {
  return (
    <div className="space-y-4 flex flex-col h-full">
      <PageHeader
        title="GIS Map — Spatial Intelligence Workspace"
        subtitle="Multi-layered Sentinel-2 spatial analysis and ground geotag visual verification"
        actions={
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Sector</span>
            </button>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800">
              <Download className="w-3.5 h-3.5" />
              <span>Export GeoJSON</span>
            </button>
          </div>
        }
      />

      {/* Main Full Height Map */}
      <div className="flex-1 min-h-[600px] w-full">
        <MapPanel markers={MOCK_MAP_MARKERS} height="h-[640px]" />
      </div>
    </div>
  );
}
