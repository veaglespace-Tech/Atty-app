import SectionEyebrow from "@/components/SectionEyebrow";
import { cn } from "@/lib/utils";

export const authPageShellClassName =
  "page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-3 pb-10 pt-24 transition-colors duration-500 sm:px-4 sm:pb-12 sm:pt-28 md:pt-32";

export const authCardClassName =
  "surface-card overflow-hidden rounded-[1.6rem] transition-colors duration-500 sm:rounded-[2rem] md:rounded-[2.4rem]";

export const authFieldClassName =
  "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-slate-900 shadow-[0_18px_46px_rgba(59,130,246,0.12),0_10px_28px_rgba(15,23,42,0.07)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80 dark:border-white/75 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500 dark:shadow-[0_18px_45px_rgba(2,6,23,0.35)] dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

export const authFieldNormalClassName =
  "border-slate-200 hover:border-slate-300 dark:border-white/80";

export const authFieldErrorClassName =
  "border-red-400 bg-red-50/70 focus:border-red-500 focus:ring-red-500/10 dark:border-red-300 dark:bg-white";

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer = null,
  maxWidthClassName = "max-w-xl",
  cardClassName = "",
}) {
  return (
    <div className={authPageShellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-6%] top-24 h-80 w-80 rounded-full blur-[120px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-36 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-10 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className={cn("relative z-10 w-full", maxWidthClassName)}>
        <div className={cn(authCardClassName, cardClassName)}>
          <div className="surface-accent-bar h-1.5" />

          <div className="p-5 sm:p-7 md:p-10 lg:p-12">
            {eyebrow || title || description ? (
              <div className="mb-8 text-center sm:mb-10">
                {eyebrow ? <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow> : null}
                {title ? (
                  <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl md:text-4xl">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="font-medium tracking-wide text-slate-500 dark:text-slate-300">
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {children}

            {footer ? <div className="mt-10 text-center">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
