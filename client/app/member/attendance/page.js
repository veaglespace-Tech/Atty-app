"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Loader2, MapPinned, RefreshCcw, Timer, UserCheck, XCircle } from "lucide-react";
import { useGetMemberAttendanceQuery, useGetMemberDashboardQuery } from "@/store/api/memberApi";
import { usePunchInMutation, usePunchOutMutation } from "@/store/api/attendanceApi";
import { getCurrentCoordinates } from "@/utils/location";

const todayKey = () => new Date().toISOString().split("T")[0];

const toSummaryMap = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatHours = (minutes) => {
  const total = Number(minutes || 0);
  return (total / 60).toFixed(2);
};

const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return "-";
  }
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return "-";
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatPunchLocation = (record) => {
  if (record?.punchInLocationMeta?.displayText) {
    return record.punchInLocationMeta.displayText;
  }
  return formatCoordinates(record?.punchInCoordinates);
};



export default function MemberAttendancePage() {
  const user = useSelector((state) => state.auth.user);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isFetching: dashboardFetching,
    refetch: refetchDashboard,
  } = useGetMemberDashboardQuery(undefined, { skip: !user });
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    refetch: refetchAttendance,
  } = useGetMemberAttendanceQuery(45, { skip: !user });
  const [punchInMutation] = usePunchInMutation();
  const [punchOutMutation] = usePunchOutMutation();

  const records = useMemo(
    () => (Array.isArray(attendanceData?.items) ? attendanceData.items : []),
    [attendanceData]
  );
  const summary = useMemo(
    () => (Array.isArray(dashboardData?.summary) ? dashboardData.summary : []),
    [dashboardData]
  );
  const loading = dashboardLoading || dashboardFetching || attendanceLoading || attendanceFetching;

  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);

  const todayRecord = useMemo(
    () => records.find((record) => String(record.date) === todayKey()) || null,
    [records]
  );

  const fetchAttendance = async () => {
    try {
      setError("");
      await Promise.all([refetchDashboard(), refetchAttendance()]);
    } catch (err) {
      setError(err?.data?.message || err?.error || "Unable to fetch attendance data");
    }
  };


  const resolvePunchLocationPayload = async () => {
    const coordinates = await getCurrentCoordinates();
    return {
      coordinates,
      location: {
        inputFormat: "NEW2",
        mode: "AUTO",
        source: "DEVICE_GPS",
        displayText: `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
        coordinates,
      },
    };
  };


  const handlePunch = async (type) => {
    try {
      setActionLoading(type);
      setError("");
      setMessage("");

      const locationPayload = await resolvePunchLocationPayload();
      const response =
        type === "in"
          ? await punchInMutation({
              userLocation: locationPayload.coordinates,
              location: locationPayload.location,
            }).unwrap()
          : await punchOutMutation({
              userLocation: locationPayload.coordinates,
              location: locationPayload.location,
            }).unwrap();

      setMessage(response?.message || (type === "in" ? "Punch in successful" : "Punch out successful"));
      await fetchAttendance();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Attendance action failed");
    } finally {
      setActionLoading("");
    }
  };

  const canPunchIn = !todayRecord?.punchInAt;
  const canPunchOut = Boolean(todayRecord?.punchInAt) && !todayRecord?.punchOutAt;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Member Attendance</h2>
            <p className="mt-2 text-sm text-slate-600">
              Punch in/out with device location or manual coordinates, and track your attendance history.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAttendance}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handlePunch("in")}
            disabled={!canPunchIn || actionLoading !== ""}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {actionLoading === "in" ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
            Punch In
          </button>

          <button
            type="button"
            onClick={() => handlePunch("out")}
            disabled={!canPunchOut || actionLoading !== ""}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {actionLoading === "out" ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />}
            Punch Out
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Mode</p>
          <p className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Location (GPS Only)
          </p>
        </div>


        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today Status"
          value={summaryMap.get("Today Status") || todayRecord?.status || "NO_RECORD"}
          icon={<UserCheck size={16} />}
        />
        <MetricCard
          label="Present This Month"
          value={summaryMap.get("Present This Month") || 0}
          icon={<CheckCircle2 size={16} />}
        />
        <MetricCard
          label="Absent This Month"
          value={summaryMap.get("Absent This Month") || 0}
          icon={<XCircle size={16} />}
        />
        <MetricCard
          label="Worked Hours"
          value={summaryMap.get("Worked Hours This Month") || 0}
          icon={<Timer size={16} />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Today Snapshot</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Snapshot label="Date" value={todayRecord?.date || todayKey()} />
          <Snapshot label="Punch In" value={formatDateTime(todayRecord?.punchInAt)} />
          <Snapshot label="Punch Out" value={formatDateTime(todayRecord?.punchOutAt)} />
          <Snapshot label="Worked Hours" value={formatHours(todayRecord?.workedMinutes)} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance History</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading attendance...</span>
          </div>
        ) : records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No attendance records found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Location</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Worked Hours</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Geo Valid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-2 text-slate-700">{record.date}</td>
                    <td className="px-3 py-2 text-slate-700">{record.status}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchInAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchOutAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatPunchLocation(record)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatHours(record.workedMinutes)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {record.punchInValid === false || record.punchOutValid === false ? "No" : "Yes"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function Snapshot({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
