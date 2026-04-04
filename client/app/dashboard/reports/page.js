"use client";

import { useSelector } from "react-redux";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { formatRoleLabel, ROLES } from "@/utils/roles";

const REPORT_METRICS = [
  { label: "Team Efficiency", value: "94.2%", icon: TrendingUp, tone: "blue" },
  { label: "Avg Login Time", value: "09:12 AM", icon: Clock, tone: "emerald" },
  { label: "Monthly Avg", value: "23.5 Days", icon: CalendarDays, tone: "indigo" },
  { label: "Access Tier", value: "Verified", icon: ShieldCheck, tone: "amber" },
];

const REPORT_TYPES = [
  {
    id: 1,
    title: "Daily Attendance Ledger",
    desc: "Detailed per-member check-in and check-out logs with traceable shift activity.",
    meta: "Operations / Daily",
    icon: FileText,
    tone: "blue",
  },
  {
    id: 2,
    title: "Monthly Productivity Audit",
    desc: "Aggregated attendance patterns, late arrivals, and working-hour consistency.",
    meta: "Leadership / Monthly",
    icon: BarChart3,
    tone: "indigo",
  },
  {
    id: 3,
    title: "Anomaly & Late Entry Log",
    desc: "Policy exceptions, missed punch windows, and recurring attendance anomalies.",
    meta: "Compliance / Alerts",
    icon: ShieldCheck,
    tone: "emerald",
  },
];

const EXPORT_NOTES = [
  "PDF exports are tuned for clean sharing with management and HR.",
  "Artifact groups stay focused on attendance, productivity, and compliance.",
  "Your access level controls which records can be generated from this view.",
];

export default function ReportsPage() {
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.currentRole || ROLES.MEMBER;
  const roleLabel = formatRoleLabel(userRole);
  const roleSummary = getRoleSummary(userRole);

  return (
    <div className="space-y-6 pb-10">
      <section className="light-glow-card-static relative overflow-hidden rounded-[2.2rem] px-6 py-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_28%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)]">
          <div>
            <div className="brand-chip mobile-hide-chip">
              Insights Workspace
            </div>
            <h1 className="brand-hero-title mobile-compact-hero-title mt-3 sm:mt-4">Intelligence & Reports</h1>
            <p className="brand-copy mobile-hide-copy mt-3 max-w-2xl">
              Exportable attendance analytics for{" "}
              <strong>{user?.organizationCode || "your workspace"}</strong>. {roleSummary}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="brand-chip">
                {roleLabel}
              </span>
              <span className="brand-chip mobile-hide-chip">
                {REPORT_TYPES.length} Artifact Types
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="brand-btn brand-btn-primary brand-btn-lg rounded-[1.25rem]"
              >
                <Download size={18} />
                Bulk Export
              </button>
              <button
                type="button"
                className="brand-btn brand-btn-secondary brand-btn-lg mobile-hide-chip rounded-[1.25rem]"
              >
                <Filter size={18} />
                Global Filters
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {REPORT_METRICS.map((metric) => (
              <ReportMetric
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="light-glow-card-static overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-3 border-b border-white/70 px-5 py-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="brand-section-title text-[1.35rem]">Available Artifacts</h2>
              <p className="brand-copy-sm mobile-hide-helper mt-2">
                Generate polished report packs for leadership review, payroll follow-up, and
                daily monitoring.
              </p>
            </div>
            <div className="brand-chip mobile-hide-chip">Ready to Export</div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            {REPORT_TYPES.map((report) => (
              <article
                key={report.id}
                className="brand-panel-soft group flex flex-col gap-6 rounded-[1.8rem] p-5 transition-all duration-300 hover:-translate-y-0.5 md:flex-row md:items-center"
              >
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] brand-icon-shell ${getToneStyles(
                    report.tone
                  )}`}
                >
                  <report.icon size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
                      {report.title}
                    </h3>
                    <span className="brand-chip mobile-hide-chip px-2.5 py-1 text-[10px]">
                      {report.meta}
                    </span>
                  </div>
                  <p className="brand-copy-sm mobile-hide-copy mt-2">{report.desc}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="brand-btn brand-btn-secondary h-12 w-12 rounded-2xl p-0"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    className="brand-btn brand-btn-primary brand-btn-md rounded-[1.2rem]"
                  >
                    Generate
                    <ChevronRight size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="light-glow-card-static rounded-[2rem] p-6">
            <h3 className="brand-section-title text-[1.35rem]">Export Standards</h3>
            <div className="mt-5 space-y-3">
              {EXPORT_NOTES.map((note) => (
                <div
                  key={note}
                  className="brand-panel-soft rounded-[1.35rem] px-4 py-4 text-sm"
                >
                  {note}
                </div>
              ))}
            </div>
          </section>

          <section className="brand-spotlight relative overflow-hidden rounded-[2.2rem] p-6">
            <div className="brand-spotlight-orb-primary absolute right-0 top-0 h-48 w-48 rounded-full blur-[120px]" />
            <div className="brand-spotlight-orb-secondary absolute bottom-0 left-0 h-40 w-40 rounded-full blur-[110px]" />
            <p className="brand-spotlight-kicker mobile-hide-chip relative text-[11px] font-black uppercase tracking-[0.2em]">
              Protected Access
            </p>
            <h4 className="brand-spotlight-title relative mt-4 text-2xl font-black">
              Role-Aware Reporting
            </h4>
            <p className="brand-spotlight-copy mobile-hide-copy relative mt-3 text-sm leading-6">
              This workspace is configured for <strong>{roleLabel}</strong> visibility, so exported
              data stays aligned with the access level assigned to your session.
            </p>
            <div className="brand-spotlight-chip mobile-hide-chip relative mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em]">
              Secure Artifact Generation
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ReportMetric({ icon: Icon, label, value }) {
  return (
    <div className="dashboard-summary-card">
      <div className="flex items-center justify-between gap-3">
        <div className="brand-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="brand-kicker mt-2">{label}</p>
    </div>
  );
}

function getToneStyles(tone) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200",
  };

  return tones[tone] || tones.blue;
}

function getRoleSummary(role) {
  if (role === ROLES.ADMIN || role === ROLES.ORG_ADMIN) {
    return "You have the broadest view across operational and leadership-ready exports.";
  }

  if (role === ROLES.SUBADMIN) {
    return "Use this space to monitor attendance patterns and keep supervisors aligned.";
  }

  if (role === ROLES.TEAM_LEADER) {
    return "Your exports stay focused on day-to-day team visibility and attendance follow-up.";
  }

  return "Your view highlights the reports that are most relevant to personal attendance visibility.";
}
