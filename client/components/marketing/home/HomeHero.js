import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";

export default function HomeHero() {
  return (
    <section className="theme-hero-mesh relative overflow-hidden px-3 pb-16 pt-20 sm:px-4 sm:pb-20 sm:pt-24 md:px-0 md:pb-32 md:pt-36 lg:pt-40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-1/4 h-72 w-72 animate-pulse rounded-full bg-cyan-300/20 blur-[110px] dark:bg-cyan-300/14 md:h-[520px] md:w-[520px] md:blur-[160px]" />
        <div className="absolute -right-10 bottom-1/4 h-72 w-72 animate-pulse rounded-full bg-blue-500/20 blur-[110px] delay-700 dark:bg-blue-400/18 md:h-[500px] md:w-[500px] md:blur-[160px]" />
      </div>

      <div className="site-container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <SectionEyebrow className="mb-6 md:mb-8">
            Attendance Made Simple
          </SectionEyebrow>

          <h1 className="mb-5 text-4xl font-black leading-[1.02] tracking-tight sm:mb-6 sm:text-5xl md:mb-8 md:text-7xl md:leading-[0.95] lg:text-8xl">
            Veagle <br className="hidden md:block" />
            <span className="gradient-text">Attendee</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl px-1 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:px-3 sm:text-lg md:mb-12 md:px-0 md:text-2xl">
            Manage attendance, teams, and daily check-ins in one place with a system that feels clear, fast, and easy to use.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 px-2 sm:flex-row sm:gap-4 md:gap-6 md:px-0">
            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-base font-black text-white shadow-[0_26px_68px_rgba(30,112,209,0.28)] transition-all duration-500 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-[0_30px_78px_rgba(4,18,48,0.20)] active:scale-95 dark:bg-blue-500 dark:text-slate-950 dark:shadow-blue-950/40 dark:hover:bg-blue-300 sm:w-auto md:rounded-[2rem] md:px-10 md:py-5 md:text-lg"
            >
              Get Started Now
              <ArrowRight size={22} className="transition-transform duration-500 group-hover:translate-x-2" />
            </Link>
            <Link
              href="/login"
              className="w-full rounded-2xl border-2 border-slate-100 bg-white/85 px-8 py-4 text-base font-black text-slate-900 shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-blue-600 hover:text-blue-600 hover:shadow-[0_24px_62px_rgba(59,130,246,0.16)] active:scale-95 dark:border-slate-700 dark:bg-slate-900/75 dark:text-white dark:shadow-black/20 dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-100 sm:w-auto md:rounded-[2rem] md:px-10 md:py-5 md:text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
