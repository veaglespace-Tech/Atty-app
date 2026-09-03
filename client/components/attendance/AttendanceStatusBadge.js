import React from "react";

export default function AttendanceStatusBadge({ status }) {
  const normalizedStatus = String(status || "UNKNOWN").toUpperCase();

  let colorClass =
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";

  if (normalizedStatus === "PRESENT") {
    colorClass =
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400";
  } else if (normalizedStatus === "ABSENT") {
    colorClass =
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400";
  } else if (normalizedStatus === "HALF_DAY") {
    colorClass =
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400";
  } else if (normalizedStatus === "OVERTIME") {
    colorClass =
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-400";
  } else if (normalizedStatus === "REGULARIZED") {
    colorClass =
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400";
  }

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${colorClass}`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}
