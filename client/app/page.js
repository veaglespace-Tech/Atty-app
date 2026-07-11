"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, ShieldCheck, Star, Zap } from "lucide-react";

const featureCards = [
  {
    icon: Zap,
    title: "Spatial Tracking",
    desc: "Next-generation geo-fencing with 25m precision, so your team is exactly where they need to be.",
    accent:
      "text-blue-600 dark:text-blue-300",
  },
  {
    icon: ShieldCheck,
    title: "Ironclad Isolation",
    desc: "Every organization lives in its own secure space with strong tenant boundaries and encrypted defaults.",
    accent:
      "text-emerald-600 dark:text-emerald-300",
  },
  {
    icon: BarChart3,
    title: "Neural Reports",
    desc: "Sharper attendance forecasting and performance metrics that help operators move faster with confidence.",
    accent:
      "text-indigo-600 dark:text-indigo-300",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950 transition-colors duration-500 dark:bg-slate-950 dark:text-white">
      <section className="theme-hero-mesh relative overflow-hidden px-4 pb-20 pt-24 md:px-0 md:pb-32 md:pt-40">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 top-1/4 h-72 w-72 animate-pulse rounded-full bg-slate-900/10 blur-[110px] dark:bg-blue-400/18 md:h-[520px] md:w-[520px] md:blur-[160px]" />
          <div className="absolute -right-10 bottom-1/4 h-72 w-72 animate-pulse rounded-full bg-blue-500/20 blur-[110px] delay-700 dark:bg-indigo-400/18 md:h-[500px] md:w-[500px] md:blur-[160px]" />
        </div>

        <div className="container relative z-10 mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 shadow-[0_18px_44px_rgba(59,130,246,0.12)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(59,130,246,0.16)] dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200 dark:shadow-black/20 md:mb-8 md:text-xs">
                <Star size={14} className="animate-pulse text-blue-600 dark:text-blue-300" />
                The Future of Workspace
              </span>

              <h1 className="mb-6 text-5xl font-black leading-[1] tracking-tight md:mb-8 md:text-8xl md:leading-[0.95]">
                Veagle <br className="hidden md:block" />
                <span className="gradient-text">Space</span>
              </h1>

              <p className="mx-auto mb-8 max-w-2xl px-4 text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300 md:mb-12 md:px-0 md:text-2xl">
                The most advanced multi-tenant workforce platform. Manage attendance, logs,
                and teams with spatial intelligence.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 px-6 sm:flex-row md:gap-6 md:px-0">
                <Link
                  href="/register"
                  className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-base font-black text-white shadow-[0_26px_68px_rgba(59,130,246,0.28)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_30px_78px_rgba(15,23,42,0.20)] active:scale-95 dark:bg-blue-500 dark:text-slate-950 dark:shadow-blue-950/40 dark:hover:bg-blue-300 sm:w-auto md:rounded-[2rem] md:px-10 md:py-5 md:text-lg"
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
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-slate-50 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/40 md:px-0 md:py-32">
        <div className="container mx-auto">
          <div className="mb-16 text-center md:mb-20">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:mb-6 md:text-5xl">
              Why Veagle Space?
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 md:text-xs">
              Unmatched features for modern scaling teams
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-10">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 dark:bg-slate-950 md:px-0 md:py-32">
        <div className="container mx-auto">
          <motion.div
            whileHover={{ y: -10 }}
            className="relative flex flex-col items-center justify-between gap-12 overflow-hidden rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-[0_34px_96px_rgba(59,130,246,0.24)] transition-all duration-500 hover:shadow-[0_40px_108px_rgba(59,130,246,0.28)] dark:border-slate-800 dark:from-blue-500 dark:via-indigo-600 dark:to-blue-700 dark:shadow-black/30 md:gap-16 md:rounded-[4rem] md:p-20 lg:flex-row lg:p-24"
          >
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-white/20 blur-[180px] opacity-40" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-white/10 blur-[180px] opacity-40" />

            <div className="relative z-10 order-2 max-w-xl text-center lg:order-1 lg:text-left">
              <h3 className="mb-6 text-3xl font-black leading-tight md:mb-8 md:text-6xl">
                Join the space <br className="hidden md:block" /> of tomorrow.
              </h3>
              <div className="mb-10 flex flex-wrap justify-center gap-3 lg:justify-start">
                {["Automated", "Secure", "ISO Certified", "Fast API"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-10 py-4 text-base font-black text-blue-600 transition-all hover:scale-105 hover:bg-slate-900 hover:text-white active:scale-95 md:text-lg"
              >
                Start Free Trial
              </Link>
            </div>

            <div className="relative z-10 order-1 w-full lg:order-2 lg:w-auto">
              <div className="mx-auto grid max-w-md grid-cols-2 gap-4 rounded-[2rem] bg-white/10 p-6 outline outline-1 outline-white/20 backdrop-blur-3xl md:gap-8 md:rounded-[3.5rem] md:p-12">
                <StatBox value="10M+" label="Logs" />
                <StatBox value="500+" label="Orgs" />
                <StatBox value="99.9%" label="Uptime" />
                <StatBox value="24/7" label="Support" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent }) {
  return (
    <motion.div
      whileHover={{ y: -12, scale: 1.02 }}
      className="group relative overflow-hidden rounded-[2.5rem] border border-transparent bg-white p-8 shadow-[0_28px_78px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-500 hover:border-blue-100 hover:shadow-[0_34px_92px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-blue-500/20 dark:hover:shadow-blue-950/20 md:rounded-[3rem] md:p-10"
    >
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 transition-all duration-500 group-hover:rotate-6 group-hover:bg-blue-600 md:h-20 md:w-20 md:rounded-[2rem]">
        <Icon size={32} className={`${accent} transition-colors duration-500 group-hover:text-white`} />
      </div>
      <h4 className="mb-4 text-xl font-black text-slate-950 dark:text-white md:text-2xl">{title}</h4>
      <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        {desc}
      </p>
    </motion.div>
  );
}

function StatBox({ value, label }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-2xl font-black text-white md:text-3xl">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest leading-none text-blue-300">
        {label}
      </div>
    </div>
  );
}
