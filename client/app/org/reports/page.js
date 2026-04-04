"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  Download,
  FileBox,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCcw,
} from "lucide-react"
import {
  useDownloadOrgReportExcelMutation,
  useDownloadOrgReportPdfMutation,
  useGetOrgReportsQuery,
} from "@/services/api/orgApi"
import { formatHoursValue } from "@/utils/time"

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

const todayKey = () => new Date().toISOString().split("T")[0]

const daysAgoKey = (days) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - Number(days || 0))
  return date.toISOString().split("T")[0]
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
  const downloadMenuRef = useRef(null)

  const rangeRules = useMemo(
    () => ({
      minDays: 90,
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

  const canDownload = Boolean(meta?.canDownload)
  const planName = meta?.planName || "TRIAL"
  const planCode = meta?.planCode || ""
  const downloadRestrictedReason =
    meta?.downloadRestrictedReason || "Report downloads are available only on paid plans."
  const loading = isLoading || isFetching
  const visibleItems = customRangeError ? [] : items
  const visibleSummaryMap = customRangeError ? new Map() : summaryMap
  const downloadDisabled = loading || Boolean(customRangeError) || downloading || downloadingExcel

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

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">
              Organization Reports
            </h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Generate attendance reports for daily, weekly, monthly, or custom date windows. Custom
              range is reserved for longer history between 90 and 364 days.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
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

            {canDownload ? (
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
            ) : meta?.planName ? (
              <div className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                <LockKeyhole size={16} />
                Download locked on free plan.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => {
            const active = period === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onPeriodChange(option.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                {option.label}
              </button>
            )
          })}
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
              {visibleItems.map((item) => (
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
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
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
