"use client";

import { useEffect, useRef, useState } from "react";

export default function DownloadMenuButton({
  label = "Download",
  onDownloadPdf,
  onDownloadExcel,
  downloadingPdf = false,
  downloadingExcel = false,
  disabled = false,
  align = "right",
  className = "brand-btn brand-btn-secondary brand-btn-md",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const busy = disabled || downloadingPdf || downloadingExcel;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const buttonLabel = downloadingPdf
    ? "Downloading PDF..."
    : downloadingExcel
      ? "Downloading Excel..."
      : label;

  const menuPositionClassName =
    align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right";

  return (
    <div ref={rootRef} className="relative z-40 w-full sm:w-auto">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`${className} w-full min-w-0 justify-center sm:min-w-[9rem]`}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          className={`dashboard-dropdown-menu absolute top-full z-50 mt-2 w-full p-2 ${menuPositionClassName} sm:min-w-[12rem] sm:w-auto`}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDownloadPdf?.();
            }}
            className="flex w-full items-center justify-start rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Download in PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDownloadExcel?.();
            }}
            className="mt-1 flex w-full items-center justify-start rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Download in Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}
