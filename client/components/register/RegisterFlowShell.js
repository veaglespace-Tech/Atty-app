"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const pageShellClassName =
  "relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 pb-16 pt-28 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900";

const cardShellClassName =
  "relative z-10 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_38px_108px_rgba(59,130,246,0.16),0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-colors duration-500 dark:border-slate-700/80 dark:bg-slate-950/78 dark:shadow-[0_35px_100px_rgba(2,6,23,0.55)] md:rounded-[2.4rem]";

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
        <div className="absolute left-[-6%] top-24 h-80 w-80 rounded-full bg-indigo-400/14 blur-[120px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-36 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/16" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <div className={cn("relative z-10 mx-auto w-full", maxWidthClassName, containerClassName)}>
        {beforeCard ? <div className="mb-8">{beforeCard}</div> : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(cardShellClassName, cardClassName)}
        >
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300" />

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
        </motion.div>

        {afterCard ? <div className="mt-8">{afterCard}</div> : null}
      </div>
    </div>
  );
}
