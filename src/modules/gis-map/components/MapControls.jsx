import { layerToggles } from "../data/mapData";

export default function MapControls({ activeTypes, onToggle }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Layers
      </div>
      <div className="space-y-1.5">
        {layerToggles.map((layer) => {
          const checked = !!activeTypes[layer.key];
          return (
            <label
              key={layer.key}
              className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              <span>{layer.label}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(layer.key)}
                className="h-3.5 w-3.5 accent-slate-700"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}