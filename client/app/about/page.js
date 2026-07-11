"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileText, HelpCircle } from "lucide-react";
import { knowledgeCards } from "./knowledgeData";

const iconMap = {
  "user-guide": BookOpen,
  "policy-templates": FileText,
  faqs: HelpCircle,
};

const accentMap = {
  blue: {
    icon: "text-blue-600 dark:text-blue-300",
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    border: "hover:border-blue-100 dark:hover:border-blue-500/20",
  },
  indigo: {
    icon: "text-indigo-600 dark:text-indigo-300",
    chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200",
    border: "hover:border-indigo-100 dark:hover:border-indigo-500/20",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-300",
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200",
    border: "hover:border-amber-100 dark:hover:border-amber-500/20",
  },
};

export default function AboutPage() {
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
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 shadow-[0_18px_44px_rgba(59,130,246,0.12)] backdrop-blur-xl dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200">
            <BookOpen size={14} className="text-blue-600 dark:text-blue-300" />
            Knowledge Center
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
            User Guide, Templates
            <br className="hidden md:block" /> and Support Answers
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            Open the resource you need and get ready-to-use guidance for onboarding, policy drafting, and day-to-day workspace operations.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeCards.map((card, index) => {
            const Icon = iconMap[card.slug];
            const accent = accentMap[card.accent] || accentMap.blue;

            return (
              <motion.div
                key={card.slug}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Link
                  href={`/about/${card.slug}`}
                  className={`group block rounded-[2.5rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_36px_98px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)] ${accent.border}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-transform duration-500 group-hover:scale-105 dark:bg-slate-900 dark:shadow-black/20">
                      <Icon size={26} className={accent.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${accent.chip}`}>
                        {card.eyebrow}
                      </span>
                      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        {card.title}
                      </h2>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                        {card.desc}
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-blue-600 transition-all duration-300 group-hover:gap-4 dark:text-blue-200">
                        Open Page
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative mt-20 overflow-hidden rounded-[3rem] bg-blue-600 p-12 text-center text-white shadow-[0_34px_96px_rgba(59,130,246,0.22)] dark:shadow-blue-950/30"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white">Need Personal Assistance?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-blue-100">
              Our support team can help with workspace launch, attendance flow design, and policy customization.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-10 py-4 font-black text-blue-600 shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            >
              Talk To Support
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
