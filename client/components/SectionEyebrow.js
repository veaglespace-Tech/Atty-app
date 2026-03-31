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
        "relative inline-flex items-center gap-2 overflow-visible rounded-full border border-slate-200/85 bg-white/78 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-blue-400/18 dark:bg-slate-950/58 dark:text-slate-100 dark:shadow-[0_18px_48px_rgba(2,6,23,0.24)] sm:px-4 sm:py-2 sm:text-[10px]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 -inset-y-1 rounded-full bg-[radial-gradient(circle,rgba(92,209,229,0.20),rgba(30,112,209,0.02)_70%)] blur-xl dark:bg-[radial-gradient(circle,rgba(92,209,229,0.18),rgba(30,112,209,0.03)_70%)]"
      />
      {Icon ? (
        <Icon
          size={14}
          className={cn("relative shrink-0 text-blue-600 dark:text-blue-300", iconClassName)}
        />
      ) : null}
      <span className="relative leading-none">{children}</span>
    </div>
  );
}
