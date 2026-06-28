"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import {
  ChevronDown,
  Download,
  FileBox,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  X,
} from "lucide-react"
import PaginationControls from "@/components/dashboard/PaginationControls"
import useLocalPagination from "@/hooks/useLocalPagination"
import {
  useDownloadOrgReportExcelMutation,
  useDownloadOrgReportPdfMutation,
  useGetOrgReportsQuery,
  useGetOrgAttendanceQuery,
} from "@/services/api/orgApi"
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits"
import { getDateKey, getTodayDateKey } from "@/utils/date"
import { formatHoursValue } from "@/utils/time"

import { hasPermission, PERMISSIONS } from "@/utils/roles"

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
]

const summaryMapFromArray = (summary) => {
  const map = new Map()
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value)
    }
  }
  return map
}

const formatRange = (meta) => {
  if (!meta?.from || !meta?.to) return "-"
  return `${meta.from} to ${meta.to}`
}

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback

const todayKey = getTodayDateKey

const daysAgoKey = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - Number(days || 0))
  return getDateKey(date)
}

const getDefaultCustomRange = () => ({
  from: daysAgoKey(89),
  to: todayKey(),
})

const toQueryString = ({ period, from, to }) => {
  const params = new URLSearchParams({
    period,
  })

  if (period === "custom") {
    if (from) params.set("from", from)
    if (to) params.set("to", to)
  }

  return params.toString()
}

const getInclusiveDaySpan = (from, to) => {
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T00:00:00.000Z`)
  const diffInMs = toDate.getTime() - fromDate.getTime()
  return Math.floor(diffInMs / (24 * 60 * 60 * 1000)) + 1
}

const getCustomRangeError = ({ period, from, to, minDays, maxDays }) => {
  if (period !== "custom") return ""
  if (!from || !to) return "Select both From and To dates for a custom report."
  if (from > to) return "From date cannot be after To date."

  const today = todayKey()
  if (to > today) return "Custom report range cannot extend into future dates."

  const span = getInclusiveDaySpan(from, to)
  if (span < minDays || span > maxDays) {
    return `Custom range must stay between ${minDays} and ${maxDays} days.`
  }

  return ""
}

export default function OrgReportsPage() {
  const [period, setPeriod] = useState("monthly")
  const [customRange, setCustomRange] = useState(getDefaultCustomRange)
  const [downloadError, setDownloadError] = useState("")
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const downloadMenuRef = useRef(null)
  const [selectedMemberReport, setSelectedMemberReport] = useState(null)
  
  const authUser = useSelector((state) => state.auth.user)
  const isFreePlan = authUser?.organization?.plan?.code === "FREE_7D_TRIAL" || authUser?.organization?.planCode === "FREE_7D_TRIAL"

  const { data: attendanceData, isLoading: attendanceLoading } = useGetOrgAttendanceQuery("limit=2000", {
    skip: !selectedMemberReport,
  })

  const filteredMemberLogs = useMemo(() => {
    if (!selectedMemberReport || !attendanceData?.items) return []
    return attendanceData.items.filter(
      (log) =>
        log.userId === selectedMemberReport.id ||
        log.member === selectedMemberReport.member
    )
  }, [selectedMemberReport, attendanceData])

  const rangeRules = useMemo(
    () => ({
      minDays: 1,
      maxDays: 364,
    }),
    []
  )

  const customRangeError = useMemo(
    () =>
      getCustomRangeError({
        period,
        from: customRange.from,
        to: customRange.to,
        minDays: rangeRules.minDays,
        maxDays: rangeRules.maxDays,
      }),
    [customRange.from, customRange.to, period, rangeRules.maxDays, rangeRules.minDays]
  )

  const queryString = useMemo(
    () =>
      toQueryString({
        period,
        from: customRange.from,
        to: customRange.to,
      }),
    [customRange.from, customRange.to, period]
  )

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetOrgReportsQuery(queryString, {
    skip: period === "custom" && Boolean(customRangeError),
  })

  const [downloadOrgReportPdf, { isLoading: downloading }] = useDownloadOrgReportPdfMutation()
  const [downloadOrgReportExcel, { isLoading: downloadingExcel }] = useDownloadOrgReportExcelMutation()

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data])
  const meta = data?.meta || {}
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary])

  const canDownload = Boolean(meta?.canDownload) && !isFreePlan && hasPermission(authUser, PERMISSIONS.REPORTS_DOWNLOAD)
  const planName = meta?.planName || authUser?.organization?.plan?.name || "TRIAL"
  const planCode = meta?.planCode || authUser?.organization?.plan?.code || ""
  const downloadRestrictedReason = isFreePlan 
    ? "Download locked on free plan." 
    : !hasPermission(authUser, PERMISSIONS.REPORTS_DOWNLOAD)
      ? "You do not have permission to download reports."
      : (meta?.downloadRestrictedReason || "Report downloads are available only on paid plans.")
  const loading = isLoading || isFetching
  const visibleItems = customRangeError ? [] : items
  const visibleSummaryMap = customRangeError ? new Map() : summaryMap
  const downloadDisabled = loading || Boolean(customRangeError) || downloading || downloadingExcel || !canDownload
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(visibleItems, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.REPORTS[0],
    dependencies: [period, customRange.from, customRange.to, visibleItems.length],
  })

  const onDownloadPdf = async () => {
    try {
      setDownloadError("")
      const blob = await downloadOrgReportPdf(queryString).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `attendance-report-${meta?.period || period}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download report PDF"))
    }
  }

  const onDownloadExcel = async () => {
    try {
      setDownloadError("")
      const blob = await downloadOrgReportExcel(queryString).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `attendance-report-${meta?.period || period}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download report Excel"))
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const onPeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    setDownloadError("")
    setShowDownloadMenu(false)

    if (nextPeriod === "custom" && (!customRange.from || !customRange.to)) {
      setCustomRange(getDefaultCustomRange())
    }
  }

  const onCustomRangeChange = (event) => {
    const { name, value } = event.target
    setCustomRange((prev) => ({
      ...prev,
      [name]: value,
    }))
    setDownloadError("")
    setShowDownloadMenu(false)
  }

  const formatWorkedHours = (record) => {
    const val = record?.workedHours ?? record?.workedMinutes
    if (val == null) return "-"
    return typeof val === "number" ? val.toFixed(2) : String(val)
  }

  const formatGeoStatus = (record) => {
    if (record?.punchInValid === false) return "No"
    if (record?.punchOutValid === false) return "No"
    if (record?.punchInValid === true || record?.punchOutValid === true) return "Yes"
    return "-"
  }

  if (selectedMemberReport) {
    return (
      <section className="space-y-6">
        {/* Back button and profile header */}
        <div className="light-glow-card-static rounded-[1.9rem] p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setSelectedMemberReport(null)}
                className="brand-btn brand-btn-secondary brand-btn-md self-start sm:self-auto"
              >
                ← Back to Reports
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedMemberReport.member}
                </h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                  {selectedMemberReport.role || "Member"} • Attendance History
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected Range</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">
                {formatRange(meta)}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Present Days" value={selectedMemberReport.presentDays} />
          <MetricCard label="Half Days" value={selectedMemberReport.halfDays} />
          <MetricCard label="Absent Days" value={selectedMemberReport.absentDays} />
          <MetricCard label="Total Worked Hrs" value={selectedMemberReport.workedHours} />
        </div>

        {/* Daily Attendance Logs */}
        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 mb-4">
            Daily Attendance Logs ({filteredMemberLogs.length} entries)
          </h3>

          {attendanceLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm font-medium">Loading history logs...</span>
            </div>
          ) : filteredMemberLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              <FileText size={20} className="mx-auto mb-2 text-slate-400" />
              No daily attendance records found for this period.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:hidden">
                {filteredMemberLogs.map((log) => (
                  <article key={log.id} className="dashboard-mobile-record-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{log.date}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          In: {log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString() : "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Out: {log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString() : "-"}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {log.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white/90 md:block">
                <table className="min-w-[640px] w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Date</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Status</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Punch In</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Punch Out</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Worked Hrs</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Geo Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMemberLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-3 font-semibold text-slate-900">{log.date}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-700">{log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString() : "-"}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString() : "-"}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{formatWorkedHours(log)} hrs</td>
                        <td className="px-3 py-3 text-center text-slate-700">{formatGeoStatus(log)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel relative z-20 overflow-visible rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">
              Organization Reports
            </h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Generate attendance reports for daily, weekly, monthly, or custom date windows. Custom
              range is reserved for history between 1 and 364 days.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!customRangeError) {
                  refetch()
                }
              }}
              disabled={loading || Boolean(customRangeError)}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>

            {canDownload && !isFreePlan ? (
              <div className="relative w-full sm:w-auto" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowDownloadMenu((prev) => !prev)}
                  disabled={downloadDisabled}
                  className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
                >
                  <Download size={16} />
                  Download
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showDownloadMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showDownloadMenu && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:left-auto sm:right-0 sm:w-48">
                    <button
                      type="button"
                      onClick={() => {
                        onDownloadPdf()
                        setShowDownloadMenu(false)
                      }}
                      disabled={downloading}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloading ? (
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      ) : (
                        <FileText size={16} className="text-blue-600" />
                      )}
                      Export PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onDownloadExcel()
                        setShowDownloadMenu(false)
                      }}
                      disabled={downloadingExcel}
                      className="flex w-full items-center gap-3 border-t border-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloadingExcel ? (
                        <Loader2 size={16} className="animate-spin text-emerald-600" />
                      ) : (
                        <FileBox size={16} className="text-emerald-600" />
                      )}
                      Export Excel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                <LockKeyhole size={16} />
                Download locked on free plan.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-start gap-4">
          <button
            type="button"
            onClick={() => onPeriodChange("custom")}
            className={`rounded-lg border px-4 py-2 text-sm font-black uppercase tracking-wide transition ${
              period === "custom"
                ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Custom
          </button>

          <div className="relative z-40">
            <button
              type="button"
              onClick={() => setShowPeriodMenu((prev) => !prev)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-black uppercase tracking-wide transition ${
                period !== "custom"
                  ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {period !== "custom" 
                ? PERIOD_OPTIONS.find((o) => o.value === period)?.label || "Monthly"
                : "Standard Periods"}
              <ChevronDown
                size={14}
                className={`transition-transform ${showPeriodMenu ? "rotate-180" : ""}`}
              />
            </button>
            
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                {PERIOD_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onPeriodChange(option.value)
                      setShowPeriodMenu(false)
                    }}
                    className={`flex w-full items-center justify-start px-4 py-3 text-left text-sm font-bold uppercase transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      period === option.value ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {period === "custom" ? (
          <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="custom-from"
                className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
              >
                From Date
              </label>
              <input
                id="custom-from"
                name="from"
                type="date"
                value={customRange.from}
                onChange={onCustomRangeChange}
                max={todayKey()}
                className="dashboard-field-control mt-2 w-full"
              />
            </div>
            <div>
              <label
                htmlFor="custom-to"
                className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
              >
                To Date
              </label>
              <input
                id="custom-to"
                name="to"
                type="date"
                value={customRange.to}
                onChange={onCustomRangeChange}
                max={todayKey()}
                className="dashboard-field-control mt-2 w-full"
              />
            </div>
            <p className="md:col-span-2 text-xs font-semibold text-slate-500">
              Custom report window must stay between {rangeRules.minDays} and {rangeRules.maxDays} days.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {getErrorMessage(error, "Failed to load report")}
          </p>
        ) : null}

        {customRangeError ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {customRangeError}
          </p>
        ) : null}

        {!canDownload && meta?.planName ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Current plan: {planName}
            {planCode ? ` (${planCode})` : ""}. {downloadRestrictedReason}
          </p>
        ) : null}

        {downloadError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {downloadError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Members" value={visibleSummaryMap.get("Members") || 0} />
        <MetricCard label="Present" value={visibleSummaryMap.get("Present Days") || 0} />
        <MetricCard label="Absent" value={visibleSummaryMap.get("Absent Days") || 0} />
        <MetricCard
          label="Worked Hrs"
          value={formatHoursValue(visibleSummaryMap.get("Worked Hrs") || 0)}
        />
      </div>

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Report Records
          </h3>
          <p className="mobile-hide-helper text-xs font-semibold text-slate-500">
            Range: {formatRange(meta)}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading report...</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            <FileText size={20} className="mx-auto mb-2 text-slate-400" />
            No report data available for this period.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:hidden">
              {paginatedItems.map((item) => (
                <article key={`mobile-${item.id}`} className="dashboard-mobile-record-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black text-slate-900">{item.member}</h4>
                      <p className="mt-1 text-xs text-slate-500">{item.role || "-"}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      Report
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ReportMetric label="Present" value={item.presentDays} />
                    <ReportMetric label="Half Day" value={item.halfDays} />
                    <ReportMetric label="Absent" value={item.absentDays} />
                    <ReportMetric label="Worked Hrs" value={formatHoursValue(item.workedHours)} />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberReport(item)}
                      className="brand-btn brand-btn-soft brand-btn-sm w-full"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white/90 md:block">
              <table className="min-w-[640px] w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Member
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Role
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Present
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Half Day
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Absent
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Worked Hrs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedMemberReport(item)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">{item.member}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{item.role}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{item.presentDays}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{item.halfDays}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{item.absentDays}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{formatHoursValue(item.workedHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={visibleItems.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.REPORTS}
              label="records"
            />
          </div>
        )}
    </div>
  </section>
)
}

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

function ReportMetric({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
