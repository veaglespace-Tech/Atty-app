import { ClipboardList, FileBadge2, ShieldCheck } from "lucide-react";
import KnowledgePageShell from "@/components/knowledge/KnowledgePageShell";
import { policyTemplates } from "../knowledgeData";

const icons = [ClipboardList, FileBadge2, ShieldCheck];

export default function PolicyTemplatesPage() {
  return (
    <KnowledgePageShell
      eyebrow="Policy Templates"
      title="Ready-To-Adapt Policy Blueprints"
      description="Use these templates as a practical starting point for attendance, leave, and field compliance rules. Review with your HR or legal team before publishing to employees."
      ctaLabel="Contact For Rollout Help"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        {policyTemplates.map((template, index) => {
          const Icon = icons[index % icons.length];

          return (
            <section
              key={template.title}
              className="rounded-[2.25rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
                <Icon size={24} />
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                {template.focus}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {template.title}
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                {template.summary}
              </p>

              <div className="mt-8 rounded-[1.75rem] bg-slate-50/90 p-5 dark:bg-slate-900/80">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Template Outline
                </p>
                <div className="mt-4 space-y-3">
                  {template.sections.map((section) => (
                    <div key={section} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                      <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                        {section}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </KnowledgePageShell>
  );
}
