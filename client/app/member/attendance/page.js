"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Loader2, MapPinned, RefreshCcw, Timer, UserCheck, XCircle } from "lucide-react";
import AttendanceFaceCaptureModal from "@/components/attendance/AttendanceFaceCaptureModal";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { useGetMemberAttendanceQuery, useGetMemberDashboardQuery } from "@/services/api/memberApi";
import { usePunchInMutation, usePunchOutMutation } from "@/services/api/attendanceApi";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { getCurrentCoordinates } from "@/utils/location";
import { formatHoursValue } from "@/utils/time";

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

const formatWorkedHours = (record) =>
  formatHoursValue(record?.workedHours ?? record?.workedMinutes, {
    fromMinutes: record?.workedHours == null,
  });

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
  const [pendingPunchType, setPendingPunchType] = useState("");
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
  } = useGetMemberAttendanceQuery(DASHBOARD_FETCH_LIMITS.MEMBER_ATTENDANCE, { skip: !user });
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
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedRecords,
    setPage,
    setPageSize,
  } = useLocalPagination(records, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.ATTENDANCE[0],
  });

  const todayRecord = useMemo(
    () => records.find((record) => String(record.date) === todayKey()) || null,
    [records]
  );
  const todayStatusValue = summaryMap.get("Today Status") || todayRecord?.status || "No Record";

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


  const submitPunch = async (type, selfieImageDataUrl) => {
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
              selfieImageDataUrl,
            }).unwrap()
          : await punchOutMutation({
              userLocation: locationPayload.coordinates,
              location: locationPayload.location,
              selfieImageDataUrl,
            }).unwrap();

      setMessage(
        response?.message || (type === "in" ? "Punch in successful" : "Punch out successful")
      );
      setPendingPunchType("");
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
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">Member Attendance</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Punch in/out with device location or manual coordinates, and track your attendance history.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAttendance}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => setPendingPunchType("in")}
            disabled={!canPunchIn || actionLoading !== ""}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {actionLoading === "in" ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
            Punch In
          </button>

          <button
            type="button"
            onClick={() => setPendingPunchType("out")}
            disabled={!canPunchOut || actionLoading !== ""}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {actionLoading === "out" ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />}
            Punch Out
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="mobile-hide-chip rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Attendance Mode
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
            Live Location (GPS Only)
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Live Selfie Required
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
          value={todayStatusValue}
          valueClassName={todayStatusValue === "No Record" ? "text-xl" : undefined}
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
          label="Worked Hrs"
          value={formatHoursValue(summaryMap.get("Worked Hrs This Month") || 0)}
          icon={<Timer size={16} />}
        />
      </div>

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Today Snapshot</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Snapshot label="Date" value={todayRecord?.date || todayKey()} />
          <Snapshot label="Punch In" value={formatDateTime(todayRecord?.punchInAt)} />
          <Snapshot label="Punch Out" value={formatDateTime(todayRecord?.punchOutAt)} />
          <Snapshot label="Worked Hrs" value={formatWorkedHours(todayRecord)} />
        </div>
      </div>

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance History</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading attendance...</span>
          </div>
        ) : records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No attendance records found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500">
              Showing {startIndex}-{endIndex} of {records.length} attendance records
            </p>

            <div className="grid gap-3 md:hidden">
              {paginatedRecords.map((record) => (
                <article
                  key={`mobile-${record.id}`}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black text-slate-900">{record.date}</h4>
                      <p className="mt-1 text-xs text-slate-500">{record.status}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {record.punchInValid === false || record.punchOutValid === false ? "Geo No" : "Geo Yes"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HistoryDetail label="Punch In" value={formatDateTime(record.punchInAt)} />
                    <HistoryDetail label="Punch Out" value={formatDateTime(record.punchOutAt)} />
                    <HistoryDetail label="Location" value={formatPunchLocation(record)} />
                    <HistoryDetail label="Worked Hrs" value={formatWorkedHours(record)} />
                    <HistoryDetail
                      label="Selfie Proof"
                      value={
                        <AttendanceSelfieProofLinks
                          punchInSelfieUrl={record.punchInSelfieUrl}
                          punchOutSelfieUrl={record.punchOutSelfieUrl}
                        />
                      }
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Location</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Worked Hrs</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Geo Valid</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Selfie Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-3 py-2 text-slate-700">{record.date}</td>
                      <td className="px-3 py-2 text-slate-700">{record.status}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchInAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchOutAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatPunchLocation(record)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatWorkedHours(record)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {record.punchInValid === false || record.punchOutValid === false ? "No" : "Yes"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <AttendanceSelfieProofLinks
                          punchInSelfieUrl={record.punchInSelfieUrl}
                          punchOutSelfieUrl={record.punchOutSelfieUrl}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={records.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.ATTENDANCE}
              label="records"
            />
          </div>
        )}
      </div>

      <AttendanceFaceCaptureModal
        open={Boolean(pendingPunchType)}
        actionLabel={pendingPunchType === "out" ? "Punch Out" : "Punch In"}
        isSubmitting={actionLoading !== ""}
        onClose={() => setPendingPunchType("")}
        onSubmit={(selfieImageDataUrl) => submitPunch(pendingPunchType, selfieImageDataUrl)}
      />
    </section>
  );
}

function MetricCard({ label, value, icon, valueClassName = "text-2xl" }) {
  return (
    <div className="dashboard-summary-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p className={`mt-2 font-black text-slate-900 ${valueClassName}`}>{value}</p>
    </div>
  );
}

function Snapshot({ label, value }) {
  return (
    <div className="dashboard-detail-tile rounded-[1.25rem] px-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function HistoryDetail({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
