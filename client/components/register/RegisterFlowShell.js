import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const pageShellClassName =
  "relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,rgba(240,247,255,0.96),rgba(255,255,255,0.98),rgba(240,247,255,0.94))] px-4 pb-16 pt-28 transition-colors duration-500 dark:bg-[linear-gradient(180deg,rgba(4,12,30,0.98),rgba(5,18,44,0.98),rgba(8,24,57,0.98))]";

const cardShellClassName =
  "relative z-10 overflow-hidden rounded-[2rem] border border-[rgba(205,224,244,0.78)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,247,255,0.9))] shadow-[0_38px_108px_rgba(30,112,209,0.14),0_18px_44px_rgba(4,18,48,0.08)] backdrop-blur-2xl transition-colors duration-500 dark:border-[rgba(31,70,128,0.82)] dark:bg-[linear-gradient(180deg,rgba(5,18,44,0.92),rgba(8,24,57,0.9))] dark:shadow-[0_35px_100px_rgba(3,10,28,0.55)] md:rounded-[2.4rem]";

export default function RegisterFlowShell({
  badge,
  badgeIcon: BadgeIcon = ShieldCheck,
  title,
  description,
  children,
  beforeCard,
  afterCard,
  maxWidthClassName = "max-w-2xl",
  containerClassName = "",
  cardClassName = "",
  contentClassName = "",
  headerClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  badgeClassName = "",
  align = "center",
}) {
  const alignClassName = align === "left" ? "text-left" : "text-center";

  return (
    <div className={pageShellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-24 h-80 w-80 rounded-full bg-cyan-400/18 blur-[120px] dark:bg-cyan-400/14" />
        <div className="absolute right-[-8%] top-36 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-blue-400/18" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-sky-400/14 blur-[120px] dark:bg-cyan-500/12" />
      </div>

      <div className={cn("relative z-10 mx-auto w-full", maxWidthClassName, containerClassName)}>
        {beforeCard ? <div className="mb-8">{beforeCard}</div> : null}

        <div className={cn(cardShellClassName, cardClassName)}>
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 dark:from-cyan-300 dark:via-blue-400 dark:to-blue-600" />

          <div className={cn("p-8 md:p-12", contentClassName)}>
            {(badge || title || description) && (
              <div className={cn("mb-10", alignClassName, headerClassName)}>
                {badge ? (
                  <div
                    className={cn(
                      "mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 shadow-lg shadow-blue-100/60 dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200",
                      badgeClassName
                    )}
                  >
                    <BadgeIcon size={14} className="text-blue-600 dark:text-blue-300" />
                    {badge}
                  </div>
                ) : null}

                {title ? (
                  <h2
                    className={cn(
                      "mb-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl",
                      titleClassName
                    )}
                  >
                    {title}
                  </h2>
                ) : null}

                {description ? (
                  <p className={cn("font-medium text-slate-500 dark:text-slate-300", descriptionClassName)}>
                    {description}
                  </p>
                ) : null}
              </div>
            )}

            {children}
          </div>
        </div>

        {afterCard ? <div className="mt-8">{afterCard}</div> : null}
      </div>
    </div>
  );
}
