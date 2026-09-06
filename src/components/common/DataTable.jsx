import React from 'react';

export default function DataTable({ columns, data, onRowClick, emptyText = "No records found" }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-sm text-xs text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-x-auto shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`py-3 px-4 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800">
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`py-3 px-4 ${col.className || ''}`}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
