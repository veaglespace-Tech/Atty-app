import { FEATURE_CARDS } from "./homeData";

export default function HomeFeatureGrid() {
  return (
    <section className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(240,247,255,0.8),rgba(255,255,255,0.95))] px-4 py-20 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(5,18,44,0.64),rgba(8,24,57,0.52))] md:px-0 md:py-32">
      <div className="container mx-auto">
        <div className="mb-16 text-center md:mb-20">
          <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:mb-6 md:text-5xl">
            Why Veagle Attendee?
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 md:text-xs">
            Built for teams that want clarity, not complexity
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-10">
          {FEATURE_CARDS.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] border border-transparent bg-white p-8 shadow-[0_28px_78px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-100 hover:shadow-[0_34px_92px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-blue-500/20 dark:hover:shadow-blue-950/20 md:rounded-[3rem] md:p-10">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 transition-all duration-500 group-hover:rotate-6 group-hover:bg-blue-600 md:h-20 md:w-20 md:rounded-[2rem]">
        <Icon size={32} className={`${accent} transition-colors duration-500 group-hover:text-white`} />
      </div>
      <h4 className="mb-4 text-xl font-black text-slate-950 dark:text-white md:text-2xl">{title}</h4>
      <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
        {desc}
      </p>
    </div>
  );
}
