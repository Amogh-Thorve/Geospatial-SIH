import { typeMeta } from "../data/mapData";

export default function MapLegend() {
  const entries = ["intervention", "flagged", "waterbody", "jal-saheli"];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Legend
      </div>
      <ul className="space-y-1.5">
        {entries.map((key) => {
          const meta = typeMeta[key];
          return (
            <li key={key} className="flex items-center gap-2 text-xs text-slate-700">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-200"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}