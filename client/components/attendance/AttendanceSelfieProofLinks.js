export default function AttendanceSelfieProofLinks({
  punchInSelfieUrl,
  punchOutSelfieUrl,
  missingLabel = "Missing",
}) {
  if (!punchInSelfieUrl && !punchOutSelfieUrl) {
    return (
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {missingLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {punchInSelfieUrl ? (
        <a
          href={punchInSelfieUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
        >
          In Selfie
        </a>
      ) : null}
      {punchOutSelfieUrl ? (
        <a
          href={punchOutSelfieUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          Out Selfie
        </a>
      ) : null}
    </div>
  );
}
