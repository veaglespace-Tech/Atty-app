import { cn } from "@/lib/utils";

export default function SectionEyebrow({
  icon: Icon = null,
  children,
  className = "",
  iconClassName = "",
}) {
  if (!children) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-200 dark:shadow-black/20 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.18em]",
        className
      )}
    >
      {Icon ? (
        <Icon size={14} className={cn("shrink-0 text-blue-600 dark:text-blue-300", iconClassName)} />
      ) : null}
      <span className="leading-none">{children}</span>
    </div>
  );
}
