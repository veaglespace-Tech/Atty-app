import Link from "next/link";
import { ArrowRight, BookOpen, FileText, HelpCircle } from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
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
    icon: "text-blue-600 dark:text-blue-300",
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    border: "hover:border-blue-100 dark:hover:border-blue-500/20",
  },
  amber: {
    icon: "text-blue-600 dark:text-blue-300",
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    border: "hover:border-blue-100 dark:hover:border-blue-500/20",
  },
};

export default function AboutPage() {
  return (
    <div className="page-shell relative min-h-screen overflow-hidden px-4 pb-24 pt-32 transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-8%] top-24 h-72 w-72 rounded-full blur-[110px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-32 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-16 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <SectionEyebrow className="mb-6">
            Knowledge Center
          </SectionEyebrow>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
            User Guide, Templates
            <br className="hidden md:block" /> and Support Answers
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            Open the resource you need and get ready-to-use guidance for onboarding, policy drafting, and day-to-day workspace operations.
          </p>
        </div>

        <div className="grid gap-8 md:auto-rows-fr md:grid-cols-2 xl:grid-cols-3">
          {knowledgeCards.map((card) => {
            const Icon = iconMap[card.slug];
            const accent = accentMap[card.accent] || accentMap.blue;

            return (
              <Link
                key={card.slug}
                href={`/about/${card.slug}`}
                className={`group flex h-full min-h-[320px] rounded-[2.5rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_36px_98px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] md:min-h-[340px] dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)] ${accent.border}`}
              >
                <div className="flex w-full items-start gap-5">
                  <div className="brand-hover-white-media flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-transform duration-500 group-hover:scale-105 group-hover:bg-blue-600 dark:bg-slate-900 dark:shadow-black/20 dark:group-hover:bg-blue-500">
                    <Icon size={26} className={accent.icon} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col self-stretch">
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${accent.chip}`}>
                      {card.eyebrow}
                    </span>
                    <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      {card.title}
                    </h2>
                    <p className="mt-3 max-w-[24ch] text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                      {card.desc}
                    </p>
                    <div className="mt-auto pt-8 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-blue-600 transition-all duration-300 group-hover:gap-4 dark:text-blue-200">
                      Open Page
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="brand-spotlight relative mt-20 overflow-hidden rounded-[3rem] p-12 text-center">
          <div className="brand-spotlight-orb-primary absolute right-0 top-0 h-80 w-80 rounded-full blur-[160px]" />
          <div className="brand-spotlight-orb-secondary absolute bottom-0 left-0 h-72 w-72 rounded-full blur-[150px]" />
          <div className="relative z-10">
            <h2 className="brand-spotlight-title text-3xl font-black">Need Personal Assistance?</h2>
            <p className="brand-spotlight-copy mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed">
              Our support team can help with workspace launch, attendance flow design, and policy customization.
            </p>
            <Link
              href="/contact"
              className="brand-spotlight-button mt-8 px-10 py-4"
            >
              Talk To Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
