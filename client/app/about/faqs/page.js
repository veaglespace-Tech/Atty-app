"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import KnowledgePageShell from "@/components/knowledge/KnowledgePageShell";
import { faqGroups } from "../knowledgeData";

export default function FaqPage() {
  const [openKey, setOpenKey] = useState("0-0");

  return (
    <KnowledgePageShell
      eyebrow="FAQs"
      title="Answers Teams Ask Most Often"
      description="Browse the most common setup, attendance, and support questions so your rollout team can respond quickly and consistently."
      ctaLabel="Ask A Specific Question"
    >
      <div className="space-y-8">
        {faqGroups.map((group, groupIndex) => (
          <motion.section
            key={group.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.08 }}
            className="rounded-[2.25rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200">
                <HelpCircle size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  FAQ Group
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {group.title}
                </h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {group.items.map((item, itemIndex) => {
                const key = `${groupIndex}-${itemIndex}`;
                const open = openKey === key;

                return (
                  <div
                    key={item.question}
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenKey(open ? "" : key)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {item.question}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-slate-500 transition-transform dark:text-slate-300 ${open ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-5 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            {item.answer}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </KnowledgePageShell>
  );
}
