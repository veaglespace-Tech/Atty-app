"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function KnowledgePageShell({
  eyebrow,
  title,
  description,
  ctaHref = "/contact",
  ctaLabel = "Talk to Support",
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 pb-24 pt-32 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-24 h-72 w-72 rounded-full bg-indigo-400/14 blur-[110px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-32 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/18" />
        <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-indigo-500/12 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            href="/about"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-[0_22px_52px_rgba(59,130,246,0.12)] dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-300 dark:shadow-black/20 dark:hover:border-blue-500/30 dark:hover:text-blue-200"
          >
            <ArrowLeft size={14} />
            Back To Knowledge Center
          </Link>

          <div className="rounded-[2.5rem] border border-white/70 bg-white/82 p-8 shadow-[0_38px_110px_rgba(59,130,246,0.18),0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-colors duration-500 dark:border-slate-700/80 dark:bg-slate-950/78 dark:shadow-[0_35px_100px_rgba(2,6,23,0.55)] md:p-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 shadow-lg shadow-blue-100/60 dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200">
              <Sparkles size={14} className="text-blue-600 dark:text-blue-300" />
              {eyebrow}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.5fr,0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </div>

              <div className="rounded-[2rem] border border-blue-100 bg-blue-50/80 p-6 shadow-[0_24px_62px_rgba(59,130,246,0.14)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:shadow-blue-950/20">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-200">
                  Need Help Rolling This Out?
                </p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  Our team can help you map workflow, refine permissions, and prepare onboarding content for your workspace.
                </p>
                <Link
                  href={ctaHref}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_20px_52px_rgba(59,130,246,0.24)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30 dark:hover:bg-blue-300"
                >
                  {ctaLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {children}
      </div>
    </div>
  );
}
