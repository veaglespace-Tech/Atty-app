"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Download,
  Loader2,
  MapPin,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatRoleLabel } from "@/utils/roles";
import { useGetAttendanceQuery, useGetAttendanceSummaryQuery } from "@/services/api/attendanceApi";

const SUMMARY_CARDS = [
  { key: "present", label: "Present", icon: UserCheck, tone: "emerald" },
  { key: "late", label: "Late", icon: Clock, tone: "amber" },
  { key: "absent", label: "Absent", icon: UserX, tone: "rose" },
  { key: "leaves", label: "On Leave", icon: CalendarDays, tone: "blue" },
];

export default function AttendancePage() {
  const { user } = useSelector((state) => state.auth);
  const [searchValue, setSearchValue] = useState("");
  const { data: attendanceData, isLoading: attendanceLoading, isFetching: attendanceFetching } =
    useGetAttendanceQuery("", { skip: !user });
  const { data: summaryData, isLoading: summaryLoading, isFetching: summaryFetching } =
    useGetAttendanceSummaryQuery(undefined, { skip: !user });
  const loading = attendanceLoading || attendanceFetching || summaryLoading || summaryFetching;
  const attendance = useMemo(
    () => (Array.isArray(attendanceData) ? attendanceData : []),
    [attendanceData]
  );
  const summary = summaryData || { present: 0, late: 0, absent: 0, leaves: 0 };
  const query = searchValue.trim().toLowerCase();

  const filteredAttendance = useMemo(() => {
    if (!query) return attendance;

    return attendance.filter((row) =>
      [row?.userName, row?.userRole, row?.locationName, row?.status].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [attendance, query]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="brand-kicker">Fetching daily attendance...</p>
      </div>
    );
  }

  const totalRecords = attendance.length;
  const visibleRecords = filteredAttendance.length;

  return (
    <div className="space-y-6 pb-10">
      <section className="light-glow-card-static relative overflow-hidden rounded-[2.2rem] px-6 py-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_28%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
          <div>
            <div className="brand-chip mobile-hide-chip">
              Live Attendance
            </div>
            <h1 className="brand-hero-title mobile-compact-hero-title mt-3 sm:mt-4">Daily Attendance Hub</h1>
            <p className="brand-copy mobile-hide-copy mt-3 max-w-2xl">
              Review who is on time, late, or away across{" "}
              <strong>{user?.organizationCode || "your workspace"}</strong> without leaving the
              dashboard.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="brand-chip">
                {formatRoleLabel(user?.role)}
              </span>
              <span className="brand-chip mobile-hide-chip">
                {totalRecords} Records Today
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="brand-btn brand-btn-primary brand-btn-lg rounded-[1.25rem]"
              >
                <Download size={18} />
                Export Snapshot
              </button>
              <button
                type="button"
                className="brand-btn brand-btn-secondary brand-btn-lg mobile-hide-chip rounded-[1.25rem]"
              >
                Review Logs
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SUMMARY_CARDS.map((card) => (
              <AttendanceMetric
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={summary[card.key] || 0}
                tone={card.tone}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="light-glow-card-static overflow-hidden rounded-[2rem]">
        <div className="flex flex-col gap-4 border-b border-white/70 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <h2 className="brand-section-title text-[1.35rem]">Attendance Records</h2>
            <p className="brand-copy-sm mobile-hide-helper mt-2">
              {query
                ? `Showing ${visibleRecords} of ${totalRecords} records matching "${searchValue}".`
                : `Showing all ${totalRecords} attendance records for today.`}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end lg:w-auto">
            <label className="relative min-w-0 flex-1 md:min-w-[320px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by member, role, status, or location"
                className="w-full rounded-[1.2rem] border border-slate-200 bg-white/88 py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-100/60 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:border-blue-500/25 dark:focus:ring-blue-500/10"
              />
            </label>
            <button
              type="button"
              className="brand-btn brand-btn-secondary brand-btn-md rounded-[1.2rem]"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {filteredAttendance.length > 0 ? (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {filteredAttendance.map((row, index) => (
                <article
                  key={row._id || `${row.userName || "user"}-${index}`}
                  className="brand-panel-soft rounded-[1.6rem] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="brand-icon-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black">
                      {String(row.userName || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
                          {row.userName || "Unknown Member"}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusClasses(
                            row.status
                          )}`}
                        >
                          {row.status || "Unknown"}
                        </span>
                      </div>
                      <p className="brand-kicker mt-2">{formatRoleLabel(row.userRole)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <AttendanceRecordDetail label="Check In" value={row.checkIn || "--:--"} />
                    <AttendanceRecordDetail
                      label="Location"
                      value={row.locationName || "Office Space"}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[760px] w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Member
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Check In
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Location
                  </th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendance.map((row, index) => (
                    <tr
                      key={row._id || `${row.userName || "user"}-${index}`}
                      className="bg-white/70 transition-colors hover:bg-blue-50/60 dark:bg-transparent dark:hover:bg-slate-900/70"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black">
                            {String(row.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                              {row.userName || "Unknown Member"}
                            </p>
                            <p className="brand-kicker mt-1">{formatRoleLabel(row.userRole)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusClasses(
                            row.status
                          )}`}
                        >
                          {row.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                          {row.checkIn || "--:--"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">{row.locationName || "Office Space"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <Search size={22} />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              No matching attendance records
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Try a different search term or clear the filter to see all logs for today.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function AttendanceMetric({ icon: Icon, label, value }) {
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

function AttendanceRecordDetail({ label, value }) {
  return (
    <div className="dashboard-detail-tile px-4 py-3">
      <p className="brand-kicker">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function getStatusClasses(status) {
  if (status === "Present") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (status === "Absent") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200";
}
