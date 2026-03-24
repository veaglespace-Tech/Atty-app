"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  ArrowUpRight,
  Clock,
  Loader2,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  Settings,
  BarChart3,
  CalendarCheck,
} from "lucide-react";
import { ROLES, formatRoleLabel } from "@/utils/roles";
import { useGetDashboardActivitiesQuery, useGetDashboardStatsQuery } from "@/services/api/dashboardApi";

const ROLE_LINKS = {
  admin: [
    { href: "/dashboard/employees", label: "Manage Team", icon: Users },
    { href: "/dashboard/reports", label: "View Reports", icon: BarChart3 },
    { href: "/dashboard/settings", label: "Workspace Settings", icon: Settings },
  ],
  member: [
    { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/dashboard/settings", label: "Profile Settings", icon: Settings },
  ],
};

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role || ROLES.MEMBER;

  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching } =
    useGetDashboardStatsQuery(undefined, { skip: !user });
  const {
    data: activityData,
    isLoading: activitiesLoading,
    isFetching: activitiesFetching,
  } = useGetDashboardActivitiesQuery(undefined, { skip: !user });
  const loading = statsLoading || statsFetching || activitiesLoading || activitiesFetching;
  const stats = statsData || null;
  const activities = Array.isArray(activityData) ? activityData.slice(0, 6) : [];
  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";
  const isManager = userRole === ROLES.ADMIN || userRole === ROLES.SUBADMIN;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="brand-kicker">Loading your dashboard...</p>
      </div>
    );
  }

  const statCards = isManager
    ? [
        { icon: Users, label: "Total Members", value: stats?.totalMembers || "0", tone: "blue" },
        { icon: ShieldCheck, label: "Team Leaders", value: stats?.totalTLs || "0", tone: "indigo" },
        { icon: Clock, label: "Present Today", value: stats?.presentToday || "0", tone: "emerald" },
        {
          icon: TrendingUp,
          label: "Avg Productivity",
          value: `${stats?.productivity || "0"}%`,
          tone: "amber",
        },
      ]
    : [
        { icon: Clock, label: "Daily Attendance", value: stats?.myAttendance || "0/0", tone: "blue" },
        { icon: Zap, label: "Active Streak", value: `${stats?.streak || "0"} Days`, tone: "amber" },
        { icon: ShieldCheck, label: "Verified", value: "Yes", tone: "emerald" },
        { icon: TrendingUp, label: "Attendance Focus", value: "On Track", tone: "indigo" },
      ];

  const quickLinks = isManager ? ROLE_LINKS.admin : ROLE_LINKS.member;

  return (
    <div className="space-y-6 pb-10">
      <section className="light-glow-card-static relative overflow-hidden rounded-[2.2rem] px-6 py-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div>
            <div className="brand-chip">
              <ShieldCheck size={12} />
              Attendance Snapshot
            </div>
            <h1 className="brand-hero-title mt-4">
              {firstName}&apos;s Dashboard
            </h1>
            <p className="brand-copy mt-3 max-w-2xl">
              See today&apos;s attendance, recent activity, and the actions that matter most for your day.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="brand-chip">
                {formatRoleLabel(userRole)}
              </span>
              <span className="brand-chip">
                {user?.organizationCode || "Workspace"}
              </span>
            </div>

            {isManager ? (
              <div className="mt-6">
                <Link
                  href="/dashboard/employees"
                  className="brand-btn brand-btn-primary brand-btn-lg rounded-[1.25rem]"
                >
                  <PlusCircle size={18} />
                  Add Team Member
                </Link>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCard label="Status" value={isManager ? "Manager View" : "Member View"} />
            <MiniCard
              label="Today"
              value={isManager ? `${stats?.presentToday || 0} Present` : stats?.myAttendance || "0/0"}
            />
            <MiniCard label="Organization" value={user?.organizationCode || "Veagle Attendee"} />
            <MiniCard
              label={isManager ? "Productivity" : "Streak"}
              value={isManager ? `${stats?.productivity || 0}%` : `${stats?.streak || 0} Days`}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            icon={<card.icon />}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="light-glow-card-static rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="brand-section-title text-[1.35rem]">Recent Activity</h3>
              <p className="brand-copy-sm mt-2">
                Latest check-ins, updates, and attendance activity.
              </p>
            </div>
            <Link
              href={isManager ? "/dashboard/reports" : "/dashboard/attendance"}
              className="brand-kicker inline-flex items-center gap-1 text-blue-600 transition hover:gap-2 dark:text-blue-300"
            >
              Open
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <article
                  key={`${activity.description || "activity"}-${index}`}
                  className="brand-panel-soft rounded-[1.5rem] p-4 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black">
                      {activity.userName?.[0] || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="brand-kicker mt-1">
                        {activity.time} | {activity.category}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        activity.status === "Success"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                No recent activity found in your workspace.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="light-glow-card-static rounded-[2rem] p-6">
            <h3 className="brand-section-title text-[1.35rem]">Quick Actions</h3>
            <div className="mt-5 space-y-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="brand-panel-soft group flex items-center justify-between rounded-[1.35rem] px-4 py-4 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="brand-icon-shell flex h-10 w-10 items-center justify-center rounded-2xl">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-blue-600 dark:group-hover:text-blue-300"
                  />
                </Link>
              ))}
            </div>
          </section>

          <section className="brand-spotlight relative overflow-hidden rounded-[2.2rem] p-6">
            <div className="brand-spotlight-orb-primary absolute right-0 top-0 h-48 w-48 rounded-full blur-[120px]" />
            <div className="brand-spotlight-orb-secondary absolute bottom-0 left-0 h-40 w-40 rounded-full blur-[110px]" />
            <p className="brand-spotlight-kicker relative text-[11px] font-black uppercase tracking-[0.2em]">
              Privacy Check
            </p>
            <h4 className="brand-spotlight-title relative mt-4 text-2xl font-black">
              Organization Protected
            </h4>
            <p className="brand-spotlight-copy relative mt-3 text-sm leading-6">
              Your data stays visible only inside <strong>{user?.organizationCode || "your organization"}</strong>.
            </p>
            <div className="brand-spotlight-chip relative mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em]">
              <ShieldCheck size={14} />
              Encrypted Session
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="brand-panel-soft rounded-[1.45rem] p-4">
      <p className="brand-kicker">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50/90 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
    indigo:
      "border-indigo-100 bg-indigo-50/90 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200",
    emerald:
      "border-emerald-100 bg-emerald-50/90 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber:
      "border-amber-100 bg-amber-50/90 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return (
    <div
      className={`light-glow-soft rounded-[1.8rem] border p-5 transition-transform duration-300 hover:-translate-y-1 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="brand-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="brand-kicker mt-2">
        {label}
      </p>
    </div>
  );
}
