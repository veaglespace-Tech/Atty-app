import { Camera } from "lucide-react";

export default function AttendanceSelfieProofLinks({
  punchInSelfieUrl,
  punchOutSelfieUrl,
  missingLabel = "Missing",
}) {
  if (!punchInSelfieUrl && !punchOutSelfieUrl) {
    return (
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {missingLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {punchInSelfieUrl ? (
        <a
          href={punchInSelfieUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-100/90 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
        >
          <Camera size={11} className="opacity-80 shrink-0" />
          In Selfie
        </a>
      ) : null}
      {punchOutSelfieUrl ? (
        <a
          href={punchOutSelfieUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100/90 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <Camera size={11} className="opacity-80 shrink-0" />
          Out Selfie
        </a>
      ) : null}
    </div>
  );
}

