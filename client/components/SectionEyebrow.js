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
        "surface-pill relative inline-flex items-center gap-2 overflow-visible rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-600 dark:text-slate-100 sm:px-4 sm:py-2 sm:text-[10px]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 -inset-y-1 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.14),rgba(37,99,235,0.01)_70%)] blur-xl dark:bg-[radial-gradient(circle,rgba(96,165,250,0.18),rgba(37,99,235,0.02)_70%)]"
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
