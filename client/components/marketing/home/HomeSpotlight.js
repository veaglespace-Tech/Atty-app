import Link from "next/link";
import { SPOTLIGHT_STATS, SPOTLIGHT_TAGS } from "./homeData";

export default function HomeSpotlight() {
  return (
    <section className="bg-white px-4 py-20 dark:bg-slate-950 md:px-0 md:py-32">
      <div className="container mx-auto">
        <div className="brand-spotlight relative flex flex-col items-center justify-between gap-12 overflow-hidden rounded-[2.5rem] p-8 transition-transform duration-500 hover:-translate-y-2 md:gap-16 md:rounded-[4rem] md:p-20 lg:flex-row lg:p-24">
          <div className="brand-spotlight-orb-primary absolute right-0 top-0 h-96 w-96 rounded-full blur-[180px]" />
          <div className="brand-spotlight-orb-secondary absolute bottom-0 left-0 h-96 w-96 rounded-full blur-[180px]" />

          <div className="relative z-10 order-2 max-w-xl text-center lg:order-1 lg:text-left">
            <h3 className="brand-spotlight-title mb-6 text-3xl font-black leading-tight md:mb-8 md:text-6xl">
              Make attendance easier <br className="hidden md:block" /> for everyone.
            </h3>
            <div className="mb-10 flex flex-wrap justify-center gap-3 lg:justify-start">
              {SPOTLIGHT_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="brand-spotlight-chip rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link
              href="/register"
              className="brand-spotlight-button px-10 py-4 text-base active:scale-95 md:text-lg"
            >
              Start Free Trial
            </Link>
          </div>

          <div className="relative z-10 order-1 w-full lg:order-2 lg:w-auto">
            <div className="brand-spotlight-panel mx-auto grid max-w-md grid-cols-2 gap-4 rounded-[2rem] p-6 md:gap-8 md:rounded-[3.5rem] md:p-12">
              {SPOTLIGHT_STATS.map((stat) => (
                <StatBox key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBox({ value, label }) {
  return (
    <div className="text-center">
      <div className="brand-spotlight-stat-value mb-1 text-2xl font-black md:text-3xl">{value}</div>
      <div className="brand-spotlight-stat-label text-[10px] font-black uppercase tracking-widest leading-none">
        {label}
      </div>
    </div>
  );
}
