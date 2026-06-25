"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileBox,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
} from "lucide-react"
import PaginationControls from "@/components/dashboard/PaginationControls"
import useLocalPagination from "@/hooks/useLocalPagination"
import {
  useGetSuperAdminAttendanceReportsQuery,
  useDownloadSuperAdminAttendanceReportsPdfMutation,
  useDownloadSuperAdminAttendanceReportsExcelMutation,
  useGetSuperAdminUserAttendanceLogsQuery,
  useDownloadSuperAdminUserAttendancePdfMutation,
  useDownloadSuperAdminUserAttendanceExcelMutation,
  useGetSuperAdminOrganizationsQuery,
} from "@/services/api/superAdminApi"
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits"
import { getDateKey, getTodayDateKey } from "@/utils/date"
import { formatHoursValue } from "@/utils/time"
import { formatRoleLabel } from "@/utils/roles"

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
]

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

const toQueryString = ({ period, from, to, orgId, search }) => {
  const params = new URLSearchParams({
    period,
  })

  if (period === "custom") {
    if (from) params.set("from", from)
    if (to) params.set("to", to)
  }

  if (orgId) {
    params.set("orgId", orgId)
  }

  if (search) {
    params.set("search", search)
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

export default function SuperAdminAttendanceReportsPage() {
  const [period, setPeriod] = useState("monthly")
  const [customRange, setCustomRange] = useState(getDefaultCustomRange)
  const [orgFilter, setOrgFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [downloadError, setDownloadError] = useState("")
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [showUserDownloadMenu, setShowUserDownloadMenu] = useState(false)
  const downloadMenuRef = useRef(null)
  const userDownloadMenuRef = useRef(null)
  const [selectedUserReport, setSelectedUserReport] = useState(null)

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Get all organizations for filter dropdown
  const { data: orgsData, isLoading: orgsLoading } = useGetSuperAdminOrganizationsQuery()
  const organizations = useMemo(() => (Array.isArray(orgsData?.items) ? orgsData.items : []), [orgsData])

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
        orgId: orgFilter,
        search: debouncedSearch,
      }),
    [customRange.from, customRange.to, period, orgFilter, debouncedSearch]
  )

  // Query platform-wide reports
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetSuperAdminAttendanceReportsQuery(queryString, {
    skip: period === "custom" && Boolean(customRangeError),
  })

  // Query logs for selected user drill-down
  const {
    data: userLogsData,
    isLoading: userLogsLoading,
    isFetching: userLogsFetching,
    refetch: refetchUserLogs,
  } = useGetSuperAdminUserAttendanceLogsQuery(
    { userId: selectedUserReport?.id, params: queryString },
    { skip: !selectedUserReport }
  )

  // Download mutations
  const [downloadReportsPdf, { isLoading: downloadingPdf }] = useDownloadSuperAdminAttendanceReportsPdfMutation()
  const [downloadReportsExcel, { isLoading: downloadingExcel }] = useDownloadSuperAdminAttendanceReportsExcelMutation()
  
  const [downloadUserPdf, { isLoading: downloadingUserPdf }] = useDownloadSuperAdminUserAttendancePdfMutation()
  const [downloadUserExcel, { isLoading: downloadingUserExcel }] = useDownloadSuperAdminUserAttendanceExcelMutation()

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data])
  const meta = data?.meta || {}

  const loading = isLoading || isFetching
  const visibleItems = customRangeError ? [] : items
  const downloadDisabled = loading || Boolean(customRangeError) || downloadingPdf || downloadingExcel
  
  const userLogs = useMemo(() => (Array.isArray(userLogsData?.items) ? userLogsData.items : []), [userLogsData])
  const userSummary = useMemo(() => (Array.isArray(userLogsData?.summary) ? userLogsData.summary : []), [userLogsData])
  const userLoading = userLogsLoading || userLogsFetching

  // Main table pagination
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
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.REPORTS?.[0] || 10,
    dependencies: [queryString, visibleItems.length],
  })

  // User logs pagination
  const userPagination = useLocalPagination(userLogs, {
    initialPageSize: 10,
    dependencies: [queryString, userLogs.length],
  })

  const onDownloadPdf = async () => {
    try {
      setDownloadError("")
      const blob = await downloadReportsPdf(queryString).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `super-admin-attendance-report-${meta?.period || period}.pdf`
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
      const blob = await downloadReportsExcel(queryString).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `super-admin-attendance-report-${meta?.period || period}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download report Excel"))
    }
  }

  const onDownloadUserPdf = async () => {
    if (!selectedUserReport) return
    try {
      setDownloadError("")
      const blob = await downloadUserPdf({ userId: selectedUserReport.id, params: queryString }).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const safeName = String(selectedUserReport.member).replace(/[^a-z0-9_-]+/gi, "-")
      anchor.download = `attendance-logs-${safeName}-${meta?.from}-to-${meta?.to}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download user report PDF"))
    }
  }

  const onDownloadUserExcel = async () => {
    if (!selectedUserReport) return
    try {
      setDownloadError("")
      const blob = await downloadUserExcel({ userId: selectedUserReport.id, params: queryString }).unwrap()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const safeName = String(selectedUserReport.member).replace(/[^a-z0-9_-]+/gi, "-")
      anchor.download = `attendance-logs-${safeName}-${meta?.from}-to-${meta?.to}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download user report Excel"))
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false)
      }
      if (userDownloadMenuRef.current && !userDownloadMenuRef.current.contains(event.target)) {
        setShowUserDownloadMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const onPeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    setDownloadError("")
    setShowDownloadMenu(false)
    setShowUserDownloadMenu(false)

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
    setShowUserDownloadMenu(false)
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

  const getMetricValue = (key) => {
    const target = summary.find(s => s.label === key)
    return target ? target.value : 0
  }

  const getUserMetricValue = (key) => {
    const target = userSummary.find(s => s.label === key)
    return target ? target.value : 0
  }

  // DRILL-DOWN VIEW (Single User Details)
  if (selectedUserReport) {
    return (
      <section className="space-y-6">
        <div className="light-glow-card-static rounded-[1.9rem] p-6 relative z-20 overflow-visible">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserReport(null)
                  setDownloadError("")
                }}
                className="brand-btn brand-btn-secondary brand-btn-md self-start sm:self-auto"
              >
                <ArrowLeft size={16} />
                Back to Attendance
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedUserReport.member}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  {formatRoleLabel(selectedUserReport.role)} • {selectedUserReport.orgName} ({selectedUserReport.orgCode})
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2 text-left sm:text-right">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected Range</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">
                  {formatRange(meta)}
                </p>
              </div>

              {/* Individual user download menu */}
              <div className="relative w-full sm:w-auto mt-1" ref={userDownloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDownloadMenu((prev) => !prev)}
                  disabled={userLoading || downloadingUserPdf || downloadingUserExcel}
                  className="brand-btn brand-btn-primary brand-btn-sm w-full sm:w-auto"
                >
                  <Download size={14} />
                  Download User Report
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${showUserDownloadMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showUserDownloadMenu && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:left-auto sm:right-0 sm:w-48">
                    <button
                      type="button"
                      onClick={() => {
                        onDownloadUserPdf()
                        setShowUserDownloadMenu(false)
                      }}
                      disabled={downloadingUserPdf}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
                    >
                      {downloadingUserPdf ? (
                        <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                      ) : (
                        <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                      )}
                      Export PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onDownloadUserExcel()
                        setShowUserDownloadMenu(false)
                      }}
                      disabled={downloadingUserExcel}
                      className="flex w-full items-center gap-3 border-t border-slate-50 dark:border-slate-900 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
                    >
                      {downloadingUserExcel ? (
                        <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <FileBox size={16} className="text-emerald-600 dark:text-emerald-400" />
                      )}
                      Export Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Logs" value={userLoading ? "-" : getUserMetricValue("Total Logs")} />
          <MetricCard label="Present Days" value={userLoading ? "-" : getUserMetricValue("Present Days")} />
          <MetricCard label="Half Days" value={userLoading ? "-" : getUserMetricValue("Half Days")} />
          <MetricCard label="Worked Hours" value={userLoading ? "-" : `${getUserMetricValue("Worked Hrs")} hrs`} />
        </div>

        {downloadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {downloadError}
          </p>
        ) : null}

        {/* Daily Attendance Logs */}
        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
              Daily Attendance Logs ({userLogs.length} entries)
            </h3>
            <button
              type="button"
              onClick={refetchUserLogs}
              disabled={userLoading}
              className="brand-btn brand-btn-secondary brand-btn-xs self-start sm:self-auto"
            >
              {userLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Refresh Logs
            </button>
          </div>

          {userLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm font-medium">Loading user logs...</span>
            </div>
          ) : userLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
              <FileText size={20} className="mx-auto mb-2 text-slate-400" />
              No daily attendance records found for this period.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:hidden">
                {userPagination.paginatedItems.map((log) => (
                  <article key={log.id} className="dashboard-mobile-record-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{log.date}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          In: {log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString() : "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Out: {log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString() : "-"}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                        {log.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70 md:block">
                <table className="min-w-[640px] w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-900/85">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Date</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Status</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Punch In</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Punch Out</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Worked Hours</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Geo Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userPagination.paginatedItems.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{log.date}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{formatWorkedHours(log)} hrs</td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{formatGeoStatus(log)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={userPagination.page}
                pageSize={userPagination.pageSize}
                totalItems={userLogs.length}
                totalPages={userPagination.totalPages}
                startIndex={userPagination.startIndex}
                endIndex={userPagination.endIndex}
                onPageChange={userPagination.setPage}
                onPageSizeChange={userPagination.setPageSize}
                pageSizeOptions={[10, 25, 50]}
                label="logs"
              />
            </div>
          )}
        </div>
      </section>
    )
  }

  // MAIN REPORTS VIEW (All Platform Users)
  return (
    <section className="space-y-6">
      <div className="light-glow-card-static rounded-[1.9rem] p-6 relative z-20 overflow-visible">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900 dark:text-white">
              Platform Attendance Reports
            </h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600 dark:text-slate-300">
              Generate and export workforce attendance summaries across all organizations or filter by a specific organization.
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

            <div className="relative w-full sm:w-auto" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu((prev) => !prev)}
                disabled={downloadDisabled}
                className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
              >
                <Download size={16} />
                Download Reports
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showDownloadMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showDownloadMenu && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:left-auto sm:right-0 sm:w-48">
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadPdf()
                      setShowDownloadMenu(false)
                    }}
                    disabled={downloadingPdf}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
                  >
                    {downloadingPdf ? (
                      <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <FileText size={16} className="text-blue-600 dark:text-blue-400" />
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
                    className="flex w-full items-center gap-3 border-t border-slate-50 dark:border-slate-900 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
                  >
                    {downloadingExcel ? (
                      <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileBox size={16} className="text-emerald-600 dark:text-emerald-400" />
                    )}
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Org Filter */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Filter by Organization
            </label>
            <select
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value)
                setPage(1)
              }}
              disabled={orgsLoading}
              className="dashboard-field-control dashboard-select-control mt-2 w-full"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>

          {/* User Search */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Search Member
            </label>
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Name or email..."
                className="dashboard-field-control w-full pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {/* Date range Period selection */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Report Period
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const active = period === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onPeriodChange(option.value)
                      setPage(1)
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {period === "custom" ? (
          <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/40 p-4 md:grid-cols-2">
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
            <p className="md:col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Custom report window must stay between {rangeRules.minDays} and {rangeRules.maxDays} days.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {getErrorMessage(error, "Failed to load report")}
          </p>
        ) : null}

        {customRangeError ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-400">
            {customRangeError}
          </p>
        ) : null}

        {downloadError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {downloadError}
          </p>
        ) : null}
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Platform Members" value={loading ? "-" : getMetricValue("Members")} />
        <MetricCard label="Present Days" value={loading ? "-" : getMetricValue("Present Days")} />
        <MetricCard label="Absent Days" value={loading ? "-" : getMetricValue("Absent Days")} />
        <MetricCard label="Total Worked Hours" value={loading ? "-" : `${getMetricValue("Worked Hrs")} hrs`} />
      </div>

      {/* Main Reports List */}
      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Platform Report Records
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Range: {formatRange(meta)}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading reports...</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-6 text-center text-sm text-slate-500">
            <FileText size={20} className="mx-auto mb-2 text-slate-400" />
            No report data available for this period.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Mobile Cards */}
            <div className="grid gap-3 md:hidden">
              {paginatedItems.map((item) => (
                <article key={`mobile-${item.id}`} className="dashboard-mobile-record-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black text-slate-900 dark:text-white">{item.member}</h4>
                      <p className="mt-1 text-xs text-slate-500 truncate">{item.email}</p>
                      <p className="mt-0.5 text-xs text-slate-400 truncate">{item.orgName} ({item.orgCode})</p>
                    </div>
                    <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                      {formatRoleLabel(item.role)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ReportMetric label="Present" value={item.presentDays} />
                    <ReportMetric label="Half Day" value={item.halfDays} />
                    <ReportMetric label="Absent" value={item.absentDays} />
                    <ReportMetric label="Worked Hours" value={`${item.workedHours} hrs`} />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserReport(item)
                        setDownloadError("")
                      }}
                      className="brand-btn brand-btn-soft brand-btn-sm w-full"
                    >
                      View Details & Logs
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70 md:block">
              <table className="min-w-[760px] w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/85">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Member
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Organization
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Role
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Present
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Half Day
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Absent
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Worked Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedUserReport(item)
                        setDownloadError("")
                      }}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.member}</p>
                        <p className="text-[12px] text-slate-500 truncate">{item.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{item.orgName}</p>
                        <p className="text-[11px] text-slate-400">{item.orgCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{formatRoleLabel(item.role)}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{item.presentDays}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{item.halfDays}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{item.absentDays}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-bold">{item.workedHours.toFixed(2)} hrs</td>
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
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.REPORTS || [10, 25, 50]}
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
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function ReportMetric({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}
