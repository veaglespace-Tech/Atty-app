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
import { motion } from "framer-motion";
import { ROLES, formatRoleLabel } from "@/utils/roles";
import { useGetDashboardActivitiesQuery, useGetDashboardStatsQuery } from "@/store/api/dashboardApi";

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
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Syncing Workspace Data...
        </p>
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
        { icon: TrendingUp, label: "Task Velocity", value: "High", tone: "indigo" },
      ];

  const quickLinks = isManager ? ROLE_LINKS.admin : ROLE_LINKS.member;

  return (
    <div className="space-y-6 pb-10">
      <section className="light-glow-card-static relative overflow-hidden rounded-[2.2rem] px-6 py-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <ShieldCheck size={12} />
              Workspace Snapshot
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white lg:text-4xl">
              {firstName}&apos;s Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Clean overview of team activity, attendance health, and the most important shortcuts
              for your day.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-200 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
                {formatRoleLabel(userRole)}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
                {user?.organizationCode || "Workspace"}
              </span>
            </div>

            {isManager ? (
              <div className="mt-6">
                <Link
                  href="/dashboard/employees"
                  className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_44px_rgba(59,130,246,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  <PlusCircle size={18} />
                  Add User
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
            <MiniCard label="Workspace" value={user?.organizationCode || "Veagle"} />
            <MiniCard label="Momentum" value={isManager ? `${stats?.productivity || 0}%` : `${stats?.streak || 0} Days`} />
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
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Latest workspace events and check-ins.
              </p>
            </div>
            <Link
              href={isManager ? "/dashboard/reports" : "/dashboard/attendance"}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 transition hover:gap-2 dark:text-blue-300"
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
                  className="rounded-[1.5rem] border border-white/80 bg-white/88 p-4 shadow-[0_14px_34px_rgba(59,130,246,0.08)] transition-all duration-300 hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950/75"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                      {activity.userName?.[0] || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
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
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
            <div className="mt-5 space-y-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-[1.35rem] border border-slate-200 bg-slate-50/90 px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-blue-500/20 dark:hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_12px_26px_rgba(59,130,246,0.08)] dark:bg-slate-950 dark:text-slate-200">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
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

          <section className="overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-6 text-white shadow-[0_30px_80px_rgba(59,130,246,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">
              Security Check
            </p>
            <h4 className="mt-4 text-2xl font-black">Workspace Isolated</h4>
            <p className="mt-3 text-sm leading-6 text-blue-50/90">
              Your data is visible only inside <strong>{user?.organizationCode || "your workspace"}</strong>.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em]">
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
    <div className="rounded-[1.45rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_44px_rgba(59,130,246,0.10)] dark:border-slate-800 dark:bg-slate-950/75">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{value}</p>
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
    <motion.div
      whileHover={{ y: -4 }}
      className={`light-glow-soft rounded-[1.8rem] border p-5 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-[0_12px_28px_rgba(59,130,246,0.10)] dark:bg-slate-950 dark:text-white">
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </motion.div>
  );
}
