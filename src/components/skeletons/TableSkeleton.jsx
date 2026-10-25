import React from 'react';
import { Skeleton } from './BaseSkeleton';

/**
 * Standard Table Loading Skeleton for tabular views.
 * Accurately mimics table geometry, columns, header borders, and action cells.
 */
export function TableSkeleton({
  rows = 6,
  cols = 4,
  columns, // optional array of custom column definitions: [{ width: 'w-2/5' }, { width: 'w-1/4' }, ...]
  className = '',
  minWidth = 'min-w-[680px]',
}) {
  // Default 4-column balanced layout matching typical dashboard tables
  const defaultCols = [
    { width: 'w-2/5', align: 'left', primary: true },
    { width: 'w-1/5', align: 'left' },
    { width: 'w-1/5', align: 'left' },
    { width: 'w-1/5', align: 'right', isAction: true },
  ];

  const activeColumns = columns || (cols === 4 ? defaultCols : Array.from({ length: cols }).map((_, i) => ({
    width: i === 0 ? 'w-1/3' : i === cols - 1 ? 'w-1/6' : 'w-1/5',
    align: i === cols - 1 ? 'right' : 'left',
    primary: i === 0,
    isAction: i === cols - 1,
  })));

  return (
    <div className={`overflow-x-auto w-full ${className}`}>
      <table className={`w-full text-left text-sm ${minWidth}`}>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low/40 whitespace-nowrap">
            {activeColumns.map((col, idx) => (
              <th
                key={`th-${idx}`}
                className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                <div className={`inline-block ${col.align === 'right' ? 'float-right' : ''}`}>
                  <Skeleton variant="text" className="h-3.5 w-24" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={`tr-${rIdx}`} className="hover:bg-surface-container-low/30 transition-colors">
              {activeColumns.map((col, cIdx) => (
                <td
                  key={`td-${rIdx}-${cIdx}`}
                  className={`py-3.5 px-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.primary ? (
                    <div className="space-y-1.5">
                      <Skeleton variant="text" className="h-4 w-3/4" />
                      <Skeleton variant="text" className="h-3 w-1/2 opacity-70" />
                    </div>
                  ) : col.isAction ? (
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton variant="rounded" className="h-7 w-20 rounded-lg inline-block" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Skeleton variant="text" className="h-3.5 w-3/5" />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableSkeleton;

