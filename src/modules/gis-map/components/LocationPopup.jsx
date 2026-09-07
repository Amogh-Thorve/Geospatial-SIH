import { typeMeta } from "../data/mapData";

const statusStyles = {
  verified: "bg-green-50 text-green-700 border-green-200",
  flagged: "bg-red-50 text-red-700 border-red-200",
  monitored: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function LocationPopup({ location, onClose, onAnalyze }) {
  if (!location) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-400">
        Select a marker on the map to view location details.
      </div>
    );
  }

  const meta = typeMeta[location.type];
  const statusClass = statusStyles[location.status] || "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {location.id}
          </div>
          <div className="text-sm font-semibold text-slate-800">{location.name}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span className="text-slate-400">Location</span>
          <span className="font-medium text-slate-700">{location.location}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Type</span>
          <span className="font-medium text-slate-700">{meta?.label ?? location.type}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status</span>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusClass}`}>
            {location.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Confidence</span>
          <span className="font-medium text-slate-700">{Math.round(location.confidence * 100)}%</span>
        </div>
      </div>

      {location.description && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          {location.description}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAnalyze && onAnalyze(location.submissionId || location.id)}
        className="mt-3 w-full rounded border border-slate-300 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        View Analysis
      </button>
    </div>
  );
}