import { BookOpenCheck, CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import KnowledgePageShell from "@/components/knowledge/KnowledgePageShell";
import { userGuideSections } from "../knowledgeData";

const icons = [BookOpenCheck, UsersRound, ShieldCheck, CheckCircle2];

export default function UserGuidePage() {
  return (
    <KnowledgePageShell
      eyebrow="User Guide"
      title="Operational Guide For Your Workspace"
      description="Follow these rollout and daily-use playbooks to configure the workspace, approve the right people, keep attendance accurate, and turn reports into action."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {userGuideSections.map((section, index) => {
          const Icon = icons[index % icons.length];

          return (
            <section
              key={section.title}
              className="rounded-[2.25rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {section.audience}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    {section.summary}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {section.steps.map((step, stepIndex) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-[1.6rem] bg-slate-50/90 p-4 dark:bg-slate-900/80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-blue-600 shadow-sm dark:bg-slate-950 dark:text-blue-200">
                      {String(stepIndex + 1).padStart(2, "0")}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </KnowledgePageShell>
  );
}
