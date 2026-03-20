"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2, RefreshCcw, ChevronDown, FileBox, FileArchive, FilePen, FileJson } from "lucide-react";
import {
  useDownloadOrgReportPdfMutation,
  useDownloadOrgReportExcelMutation,
  useGetOrgReportsQuery,
} from "@/store/api/orgApi";

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const formatRange = (meta) => {
  if (!meta?.from || !meta?.to) return "-";
  return `${meta.from} to ${meta.to}`;
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function OrgReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const [downloadError, setDownloadError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const queryString = `period=${period}`;

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetOrgReportsQuery(queryString);

  const [downloadOrgReportPdf, { isLoading: downloading }] = useDownloadOrgReportPdfMutation();
  const [downloadOrgReportExcel, { isLoading: downloadingExcel }] = useDownloadOrgReportExcelMutation();

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrgReportPdf(queryString).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report-${period}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download report PDF"));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrgReportExcel(queryString).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report-${period}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download report Excel"));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Organization Reports</h2>
            <p className="mt-2 text-sm text-slate-600">
              Generate attendance reports and download PDF/Excel for daily, weekly, or monthly period.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>

            <div className="relative" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={downloading || downloadingExcel}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                <Download size={16} />
                Download
                <ChevronDown size={14} className={`transition-transform ${showDownloadMenu ? "rotate-180" : ""}`} />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadPdf();
                      setShowDownloadMenu(false);
                    }}
                    disabled={downloading}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {downloading ? (
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                    ) : (
                      <FileText size={16} className="text-blue-600" />
                    )}
                    Download with PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDownloadExcel();
                      setShowDownloadMenu(false);
                    }}
                    disabled={downloadingExcel}
                    className="flex w-full items-center gap-3 border-t border-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {downloadingExcel ? (
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                    ) : (
                      <FileBox size={16} className="text-emerald-600" />
                    )}
                    Download with Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => {
            const active = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {getErrorMessage(error, "Failed to load report")}
          </p>
        ) : null}

        {downloadError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Members" value={summaryMap.get("Members") || 0} />
        <MetricCard label="Present Days" value={summaryMap.get("Present Days") || 0} />
        <MetricCard label="Absent Days" value={summaryMap.get("Absent Days") || 0} />
        <MetricCard label="Worked Hours" value={summaryMap.get("Worked Hours") || 0} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Report Data</h3>
          <p className="text-xs font-semibold text-slate-500">Range: {formatRange(data?.meta)}</p>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading report...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            <FileText size={20} className="mx-auto mb-2 text-slate-400" />
            No report data available for this period.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Member</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Present</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Half Day</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Absent</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Worked Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.member}</td>
                    <td className="px-3 py-2 text-slate-700">{item.role}</td>
                    <td className="px-3 py-2 text-slate-700">{item.presentDays}</td>
                    <td className="px-3 py-2 text-slate-700">{item.halfDays}</td>
                    <td className="px-3 py-2 text-slate-700">{item.absentDays}</td>
                    <td className="px-3 py-2 text-slate-700">{item.workedHours}</td>
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

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
