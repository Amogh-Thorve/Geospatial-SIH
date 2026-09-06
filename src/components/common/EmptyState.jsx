import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({ title = "No data available", message = "There is currently no information to display here.", action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-sm text-center my-4">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
        <Database className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
