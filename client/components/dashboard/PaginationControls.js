"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
  label = "items",
}) {
  if (!totalItems || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Page View
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Showing {startIndex}-{endIndex} of {totalItems} {label}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="dashboard-field-control dashboard-select-control min-w-[88px] px-3 py-2 text-xs"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="brand-btn brand-btn-secondary brand-btn-sm min-w-[92px]"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <p className="min-w-[88px] text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="brand-btn brand-btn-secondary brand-btn-sm min-w-[92px]"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
