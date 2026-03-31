import SectionEyebrow from "@/components/SectionEyebrow";
import { cn } from "@/lib/utils";

export const authPageShellClassName =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 pb-12 pt-32 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900";

export const authCardClassName =
  "overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 shadow-[0_34px_100px_rgba(59,130,246,0.16),0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-colors duration-500 dark:border-slate-700/80 dark:bg-slate-950/78 dark:shadow-[0_35px_100px_rgba(2,6,23,0.55)] md:rounded-[2.4rem]";

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
        <div className="absolute left-[-6%] top-24 h-80 w-80 rounded-full bg-indigo-400/16 blur-[120px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-36 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/16" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-cyan-400/12 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <div className={cn("relative z-10 w-full", maxWidthClassName)}>
        <div className={cn(authCardClassName, cardClassName)}>
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300" />

          <div className="p-7 sm:p-8 md:p-12">
            {eyebrow || title || description ? (
              <div className="mb-10 text-center">
                {eyebrow ? <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow> : null}
                {title ? (
                  <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
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
