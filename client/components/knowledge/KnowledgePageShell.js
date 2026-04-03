import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";

export default function KnowledgePageShell({
  eyebrow,
  title,
  description,
  ctaHref = "/contact",
  ctaLabel = "Talk to Support",
  children,
}) {
  return (
    <div className="page-shell relative min-h-screen overflow-hidden px-4 pb-24 pt-32 transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-8%] top-24 h-72 w-72 rounded-full blur-[110px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-32 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-16 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-12">
          <Link
            href="/about"
            className="surface-pill mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600 transition-all hover:-translate-y-0.5 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-200"
          >
            <ArrowLeft size={14} />
            Back To Knowledge Center
          </Link>

          <div className="surface-card rounded-[2.5rem] p-8 transition-colors duration-500 md:p-12">
            <SectionEyebrow className="mb-6">
              {eyebrow}
            </SectionEyebrow>

            <div className="grid gap-8 lg:grid-cols-[1.5fr,0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </div>

              <div className="surface-panel rounded-[2rem] p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-200">
                  Need Help Rolling This Out?
                </p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  Our team can help you map workflow, refine permissions, and prepare onboarding content for your workspace.
                </p>
                <Link
                  href={ctaHref}
                  className="brand-btn brand-btn-primary mt-5 inline-flex w-full max-w-full whitespace-nowrap rounded-2xl px-4 py-3 text-[13px] font-black sm:w-auto sm:px-5 sm:text-sm"
                >
                  {ctaLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
