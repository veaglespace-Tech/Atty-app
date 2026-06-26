import { X } from "lucide-react";
import { formatRoleLabel } from "@/utils/roles";
import { formatHoursValue } from "@/utils/time";
import AttendanceSelfieProofLinks from "./AttendanceSelfieProofLinks";

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

export default function AttendanceDetailModal({ selectedRecord, onClose }) {
  if (!selectedRecord) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 p-6 sm:p-7">
        <div className="brand-metric-glow" />
        <div className="relative flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Attendance Details</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Detailed punch log and verification</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800/50"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto py-4 space-y-4 pr-1">
            {/* Member Profile info */}
            <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-200 font-bold text-base">
                {selectedRecord.member?.[0] || "M"}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{selectedRecord.member}</h4>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{formatRoleLabel(selectedRecord.role)}</p>
              </div>
            </div>

            {/* Date & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="dashboard-detail-tile">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Date</p>
                <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{selectedRecord.date}</p>
              </div>
              <div className="dashboard-detail-tile">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{selectedRecord.status}</p>
              </div>
            </div>

            {/* Geo Validation & Worked Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div className="dashboard-detail-tile">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Geo Valid</p>
                <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{formatGeoStatus(selectedRecord)}</p>
              </div>
              <div className="dashboard-detail-tile">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worked Hours</p>
                <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{formatWorkedHours(selectedRecord)}</p>
              </div>
            </div>

            {/* Punch In Info */}
            <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In Details</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedRecord.punchInAt)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{formatLocation(selectedRecord)}</p>
                </div>
              </div>
            </div>

            {/* Punch Out Info */}
            <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out Details</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedRecord.punchOutAt)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {selectedRecord.punchOutLocationMeta?.displayText || selectedRecord.punchOutLocationMeta?.areaLabel || formatCoordinates(selectedRecord.punchOutCoordinates)}
                  </p>
                </div>
              </div>
            </div>

            {/* Selfie Proof */}
            <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Selfie Verification</h5>
              <AttendanceSelfieProofLinks
                punchInSelfieUrl={selectedRecord.punchInSelfieUrl}
                punchOutSelfieUrl={selectedRecord.punchOutSelfieUrl}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-slate-200/60 pt-4 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="brand-btn brand-btn-secondary brand-btn-md px-6"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
