"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useGetOrgAttendanceLogByIdQuery } from "@/services/api/orgApi";
import { formatRoleLabel } from "@/utils/roles";
import { formatHoursValue } from "@/utils/time";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";

const formatDate = (value) => {
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

const formatLocation = (record) => {
  if (record?.punchInLocationMeta?.displayText) return record.punchInLocationMeta.displayText;
  if (record?.punchInLocationMeta?.areaLabel) return record.punchInLocationMeta.areaLabel;
  return formatCoordinates(record?.punchInCoordinates);
};

const formatGeoStatus = (record) => {
  if (record?.punchInValid === false) return "No";
  if (record?.punchOutValid === false) return "No";
  return "Yes";
};

export default function OrgAttendanceLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const logId = params?.logId;

  const { data, isLoading, error } = useGetOrgAttendanceLogByIdQuery(logId, {
    skip: !logId,
  });

  const record = data?.item;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold text-slate-800">Log Not Found</p>
        <p className="mt-2 text-sm text-slate-500">
          The attendance log you are looking for does not exist or you don&apos;t have permission to view it.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-6 brand-btn brand-btn-secondary"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Attendance Details</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Detailed punch log and verification
          </p>
        </div>
      </div>

      <div className="light-glow-card-static rounded-[2rem] p-6 sm:p-8 bg-white border border-slate-100/50 shadow-sm">
        <div className="space-y-6">
          {/* Member Profile info */}
          <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xl">
              {record.member?.name?.[0] || record.member?.email?.[0] || "M"}
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">{record.member?.name || record.member?.email}</h4>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                {formatRoleLabel(record.member?.role)}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Date & Status */}
            <div className="dashboard-detail-tile">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{record.date}</p>
            </div>
            <div className="dashboard-detail-tile">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
              <p className="mt-1 text-sm font-black text-slate-800 uppercase tracking-wider">{record.status}</p>
            </div>

            {/* Geo Validation & Worked Hours */}
            <div className="dashboard-detail-tile">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Geo Valid</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatGeoStatus(record)}</p>
            </div>
            <div className="dashboard-detail-tile">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worked Hours</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatWorkedHours(record)}</p>
            </div>
          </div>

          {/* Punch In Info */}
          <div className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Punch In Details</h5>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Time</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(record.punchInAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</p>
                <p className="text-sm font-semibold text-slate-800 truncate" title={formatLocation(record)}>
                  {formatLocation(record)}
                </p>
              </div>
            </div>
          </div>

          {/* Punch Out Info */}
          <div className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Punch Out Details</h5>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Time</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(record.punchOutAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</p>
                <p className="text-sm font-semibold text-slate-800 truncate" title={record.punchOutLocationMeta?.displayText || record.punchOutLocationMeta?.areaLabel || formatCoordinates(record.punchOutCoordinates)}>
                  {record.punchOutLocationMeta?.displayText || record.punchOutLocationMeta?.areaLabel || formatCoordinates(record.punchOutCoordinates)}
                </p>
              </div>
            </div>
          </div>

          {/* Selfie Proof */}
          <div className="border border-slate-100 bg-slate-50/40 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Selfie Verification</h5>
            <AttendanceSelfieProofLinks
              punchInSelfieUrl={record.punchInSelfieUrl}
              punchOutSelfieUrl={record.punchOutSelfieUrl}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
