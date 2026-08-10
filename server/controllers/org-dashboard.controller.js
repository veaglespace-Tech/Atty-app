const asyncHandler = require("express-async-handler")
const prisma = require("../lib/prisma")
const {
  ensureOrganizationId,
  dateKey,
  formatHoursValue,
  monthWindow,
  parseLimit,
  toDateKey,
  toSummaryItem,
  todayKey,
  toPdfTime,
} = require("../services/common.service")
const { mapAttendanceRecord } = require("../services/attendance-query.service")
const { buildAttendanceReport } = require("../services/report-query.service")
const {
  attendanceRecordSelect,
  organizationDashboardSelect,
  organizationSubscriptionSelect,
  reportPdfUserSelect,
} = require("../services/prisma-selects.service")
const { isFreePlan } = require("../services/organization-plan.service")
const { buildGenericTablePdf } = require("../utils/pdf-report")
const { syncOrganizationSubscriptionState } = require("../services/subscription.service")
const { assertPermission } = require("../services/access.service")
const { PERMISSIONS } = require("../constants/permissions")
const xlsx = require("xlsx")

const REPORT_PERIODS = new Set(["daily", "weekly", "monthly", "custom"])
const CUSTOM_REPORT_MIN_DAYS = 1
const CUSTOM_REPORT_MAX_DAYS = 364
const DAY_IN_MS = 24 * 60 * 60 * 1000

const defaultRange = () => {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  return {
    from: dateKey(from),
    to: dateKey(now),
  }
}

const rangeFromPeriod = (period = "monthly") => {
  const now = new Date()
  const today = todayKey()
  const normalized = String(period || "monthly").trim().toLowerCase()

  if (normalized === "daily") {
    return { from: today, to: today, periodLabel: "Daily" }
  }

  if (normalized === "weekly") {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return {
      from: dateKey(from),
      to: today,
      periodLabel: "Weekly",
    }
  }

  const { from: monthStart } = monthWindow(now)
  return {
    from: monthStart,
    to: today,
    periodLabel: "Monthly",
  }
}

const toUtcDate = (value) => new Date(`${value}T00:00:00.000Z`)

const getInclusiveDaySpan = (from, to) =>
  Math.floor((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_IN_MS) + 1

const createBadRequestError = (message) => {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

const getReportAccessMeta = (organization = null) => {
  const plan = organization?.plan || null
  const restricted = isFreePlan({
    plan,
    subscriptionStatus: organization?.subscriptionStatus || "",
  })

  return {
    planName: plan?.name || "TRIAL",
    planCode: plan?.code || "",
    canDownload: !restricted,
    downloadRestrictedReason: restricted
      ? "Report downloads are available only on paid plans."
      : "",
  }
}

const assertReportDownloadAccess = ({ organization, res }) => {
  const accessMeta = getReportAccessMeta(organization)
  if (accessMeta.canDownload) return accessMeta

  res.status(403)
  throw new Error(accessMeta.downloadRestrictedReason)
}

const resolveReportRange = ({ period, fromInput, toInput }) => {
  const normalizedPeriod = REPORT_PERIODS.has(String(period || "").trim().toLowerCase())
    ? String(period || "").trim().toLowerCase()
    : "monthly"

  if (normalizedPeriod !== "custom") {
    return {
      ...rangeFromPeriod(normalizedPeriod),
      period: normalizedPeriod,
      customDays: null,
    }
  }

  const rangeFrom = toDateKey(fromInput)
  const rangeTo = toDateKey(toInput)
  if (!rangeFrom || !rangeTo) {
    throw createBadRequestError("Custom reports require both from and to dates.")
  }

  if (rangeFrom > rangeTo) {
    throw createBadRequestError("From date cannot be after to date.")
  }

  const today = todayKey()
  if (rangeTo > today) {
    throw createBadRequestError("Custom report range cannot extend into future dates.")
  }

  const customDays = getInclusiveDaySpan(rangeFrom, rangeTo)
  if (customDays < CUSTOM_REPORT_MIN_DAYS || customDays > CUSTOM_REPORT_MAX_DAYS) {
    throw createBadRequestError(
      `Custom report range must stay between ${CUSTOM_REPORT_MIN_DAYS} and ${CUSTOM_REPORT_MAX_DAYS} days.`
    )
  }

  return {
    from: rangeFrom,
    to: rangeTo,
    period: "custom",
    periodLabel: "Custom",
    customDays,
  }
}

const compareNames = (left, right) =>
  String(left || "").trim().toLowerCase().localeCompare(String(right || "").trim().toLowerCase())

const buildAttendanceExcelBuffer = ({
  organization,
  periodLabel,
  rangeFrom,
  rangeTo,
  summary,
  rows,
}) => {
  const startDate = new Date(rangeFrom + "T00:00:00.000Z")
  const endDate = new Date(rangeTo + "T00:00:00.000Z")
  const dateColumns = []
  const dates = []
  let current = new Date(startDate)
  
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  while (current <= endDate) {
    const yyyy = current.getUTCFullYear()
    const mm = String(current.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(current.getUTCDate()).padStart(2, "0")
    const dateKey = `${yyyy}-${mm}-${dd}`
    
    const dayName = shortDays[current.getUTCDay()]
    const label = `${dd} ${dayName}`
    
    dateColumns.push({ key: dateKey, label, width: 45 })
    dates.push({ key: dateKey, isSunday: current.getUTCDay() === 0 })
    
    current.setUTCDate(current.getUTCDate() + 1)
  }

  const baseColumns = [
    { key: "srNo", label: "Sr. No", width: 45 },
    { key: "member", label: "Name", width: 140 },
    { key: "id", label: "ID", width: 60 },
    { key: "department", label: "Department", width: 90 },
    { key: "existingMember", label: "Employee Type", width: 90 },
  ]

  const summaryColumns = [
    { key: "presentDays", label: "Present", width: 60 },
    { key: "absentDays", label: "Absent", width: 60 },
    { key: "halfDays", label: "Half Day", width: 60 },
    { key: "overtimeDays", label: "Overtime", width: 60 },
    { key: "workedHours", label: "Worked Hrs", width: 80 },
    { key: "totalDays", label: "Total Days Count", width: 80 },
  ]

  const columns = [...baseColumns, ...dateColumns, ...summaryColumns]

  const infoLines = [
    `Organization: ${organization?.name || "Organization"} | Code: ${organization?.organizationCode || "-"}`,
    `Period: ${String(periodLabel || "Report").toUpperCase()} | Range: ${rangeFrom} to ${rangeTo}`,
  ]

  const sheetData = [
    ["ATTENDANCE REPORT"],
    ...infoLines.map((line) => [line]),
    [],
    columns.map((column) => column.label),
  ]
  
  const totalDaysCount = dates.length;
  const today = new Date();

  rows.forEach((row, idx) => {
    const rowData = [
      idx + 1,
      row.member || "-",
      row.id || "-",
      row.department || "-",
      row.existingMember || "-",
    ]
    
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let overtime = 0;
    
    dates.forEach(({ key: dateKey }) => {
      const status = row.daily?.[dateKey];
      let displayStatus = "";
      
      if (status) {
        if (status === "PRESENT") { displayStatus = "P"; present++; }
        else if (status === "OVERTIME") { displayStatus = "O"; overtime++; present++; }
        else if (status === "ABSENT") { displayStatus = "A"; absent++; }
        else if (status === "HALF_DAY") { displayStatus = "Half Day"; halfDay++; }
        else { displayStatus = status; }
      } else {
        const dateObj = new Date(dateKey + "T00:00:00.000Z");
        if (dateObj > today) {
          displayStatus = "";
        } else {
          displayStatus = "A";
          absent++;
        }
      }
      
      rowData.push(displayStatus);
    });
    
    rowData.push(present);
    rowData.push(absent);
    rowData.push(halfDay);
    rowData.push(overtime);
    rowData.push(row.workedHours || "00:00");
    rowData.push(totalDaysCount);
    
    sheetData.push(rowData);
  })

  const worksheet = xlsx.utils.aoa_to_sheet(sheetData)
  const lastColumnIndex = Math.max(columns.length - 1, 0)
  const lastColumnLabel = xlsx.utils.encode_col(lastColumnIndex)
  const headerRowNumber = infoLines.length + 3

  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.max(8, Math.round(Number(column.width || 84) / 6)),
  }))
  worksheet["!merges"] = Array.from({ length: infoLines.length + 1 }, (_, index) => ({
    s: { r: index, c: 0 },
    e: { r: index, c: lastColumnIndex },
  }))
  worksheet["!autofilter"] = {
    ref: `A${headerRowNumber}:${lastColumnLabel}${headerRowNumber}`,
  }

  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report")
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })
}



const toPdfContact = (user) => {
  const code = String(user?.mobileCountryCode || "").trim()
  const mobile = String(user?.mobile || "").trim()
  if (!code && !mobile) return "-"
  return `${code}${mobile}`
}

const buildOrganizationReportData = async ({ orgId, rangeFrom, rangeTo }) => {
  return buildAttendanceReport({
    orgId,
    rangeFrom,
    rangeTo,
  })
}

const buildOrganizationPdfReportData = async ({ orgId, rangeFrom, rangeTo }) => {
  const records = await prisma.attendance.findMany({
    where: {
      orgId,
      deletedAt: null,
      date: {
        gte: rangeFrom,
        lte: rangeTo,
      },
    },
    select: {
      userId: true,
      date: true,
      punchInAt: true,
      punchOutAt: true,
      totalMinutesWorked: true,
      status: true,
      user: {
        select: reportPdfUserSelect,
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })

  let presentEntries = 0
  let absentEntries = 0
  let totalWorkedMinutes = 0
  let totalPresentMinutes = 0

  const sortedRecords = [...records].sort((left, right) => {
    if (String(left.date || "") !== String(right.date || "")) {
      return String(left.date || "").localeCompare(String(right.date || ""))
    }

    const nameComparison = compareNames(left.user?.name, right.user?.name)
    if (nameComparison !== 0) return nameComparison

    return Number(left.userId || 0) - Number(right.userId || 0)
  })

  const rows = sortedRecords.map((record, index) => {
    const totalMinutesWorked = Number(record.totalMinutesWorked || 0)
    const isAbsent = String(record.status || "").toUpperCase() === "ABSENT"
    const presentMinutes = isAbsent ? 0 : totalMinutesWorked

    if (isAbsent) absentEntries += 1
    else presentEntries += 1

    totalWorkedMinutes += totalMinutesWorked
    totalPresentMinutes += presentMinutes

    return {
      entryNo: String(index + 1).padStart(3, "0"),
      userId: String(record.user?.id ?? record.userId ?? "-"),
      userName: record.user?.name || "-",
      contact: toPdfContact(record.user),
      email: record.user?.email || "-",
      date: record.date || "-",
      punchIn: toPdfTime(record.punchInAt),
      punchOut: toPdfTime(record.punchOutAt),
      totalHours: formatHoursValue(totalMinutesWorked, { fromMinutes: true }),
      presentHours: formatHoursValue(presentMinutes, { fromMinutes: true }),
      absent: isAbsent ? "YES" : "NO",
    }
  })

  return {
    rows,
    summary: {
      totalRecords: records.length,
      presentEntries,
      absentEntries,
      totalWorkedMinutes,
      totalPresentMinutes,
    },
  }
}

exports.getOrgDashboard = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  const limit = parseLimit(req.query.limit, 50, 500)
  const today = todayKey()

  const [organization, totalUsers, approvedUsers, totalTeams, presentToday, recentAttendance] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: organizationDashboardSelect,
      }),
      prisma.user.count({
        where: {
          orgId,
          deletedAt: null,
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          orgId,
          deletedAt: null,
          isActive: true,
          status: "APPROVED",
        },
      }),
      prisma.team.count({
        where: {
          orgId,
          deletedAt: null,
          isActive: true,
        },
      }),
      prisma.attendance.count({
        where: {
          orgId,
          date: today,
          deletedAt: null,
          status: { in: ["PRESENT", "HALF_DAY"] },
        },
      }),
      prisma.attendance.findMany({
        where: {
          orgId,
          date: today,
          deletedAt: null,
        },
        select: attendanceRecordSelect,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
      }),
    ])

  const maxUsers = Number(organization?.plan?.memberLimit || organization?.plan?.maxUsers || 0);
  const usersDisplay = maxUsers > 0 ? `${approvedUsers}/${maxUsers}` : totalUsers;

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Total Users", usersDisplay),
      toSummaryItem("Total Teams", totalTeams),
      toSummaryItem("Present Today", presentToday),
      toSummaryItem("Subscription Status", organization?.subscriptionStatus || "TRIAL"),
    ],
    items: recentAttendance.map(mapAttendanceRecord),
    meta: {
      organizationId: orgId,
      organizationCode: organization?.organizationCode || "",
      plan: organization?.plan?.name || "TRIAL",
      subscriptionExpiry: organization?.subscriptionExpiry || null,
      activeSubscriptionId: organization?.subscriptionId || null,
    },
  })
})

exports.getOrgReports = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  assertPermission(res, req.user, PERMISSIONS.REPORTS.VIEW, orgId)
  const range = resolveReportRange({
    period: req.query.period || "monthly",
    fromInput: req.query.from,
    toInput: req.query.to,
  })

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildOrganizationReportData({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
    }),
  ])

  const accessMeta = getReportAccessMeta(organization)

  res.status(200).json({
    success: true,
    summary: reportData.summary,
    items: reportData.items,
    meta: {
      from: range.from,
      to: range.to,
      period: range.period,
      periodLabel: range.periodLabel,
      records: reportData.recordsCount,
      customDays: range.customDays,
      customRangeMinDays: CUSTOM_REPORT_MIN_DAYS,
      customRangeMaxDays: CUSTOM_REPORT_MAX_DAYS,
      ...accessMeta,
    },
  })
})

exports.downloadOrgReportsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  assertPermission(res, req.user, PERMISSIONS.REPORTS.DOWNLOAD, orgId)
  const range = resolveReportRange({
    period: req.query.period || "monthly",
    fromInput: req.query.from,
    toInput: req.query.to,
  })

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildOrganizationReportData({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
    }),
  ])

  assertReportDownloadAccess({ organization, res })

  const pdfBuffer = await buildGenericTablePdf({
    title: "Organization Attendance Report",
    subtitleLines: [
      `Organization: ${organization?.name || "-"} (${organization?.organizationCode || "-"})`,
      `Period: ${String(range.periodLabel || "Report")} | ${range.from} to ${range.to}`,
    ],
    summaryCards: reportData.summary,
    columns: [
      { key: "id", label: "ID", width: 35 },
      { key: "member", label: "Member Name", width: 95 },
      { key: "role", label: "Role", width: 65 },
      { key: "department", label: "Department", width: 75 },
      { key: "existingMember", label: "Type", width: 60 },
      { key: "presentDays", label: "Present Days", width: 55, align: "center" },
      { key: "halfDays", label: "Half Days", width: 45, align: "center" },
      { key: "absentDays", label: "Absent Days", width: 55, align: "center" },
      { key: "overtimeDays", label: "Overtime Days", width: 60, align: "center" },
      { key: "workedHours", label: "Worked Hrs", width: 60, align: "center" },
    ],
    rows: reportData.items,
  })

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-")
  const filename = `attendance-report-${safePeriod}-${range.from}-to-${range.to}.pdf`

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment filename=\"${filename}\"`)
  res.status(200).send(pdfBuffer)
})

exports.downloadOrgReportsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  assertPermission(res, req.user, PERMISSIONS.REPORTS.DOWNLOAD, orgId)
  const range = resolveReportRange({
    period: req.query.period || "monthly",
    fromInput: req.query.from,
    toInput: req.query.to,
  })

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildOrganizationReportData({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
    }),
  ])

  assertReportDownloadAccess({ organization, res })

  const excelBuffer = buildAttendanceExcelBuffer({
    organization,
    periodLabel: range.periodLabel,
    rangeFrom: range.from,
    rangeTo: range.to,
    summary: reportData.summary,
    rows: reportData.items,
  })

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-")
  const filename = `attendance-report-${safePeriod}-${range.from}-to-${range.to}.xlsx`

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader("Content-Disposition", `attachment filename=\"${filename}\"`)
  res.status(200).send(excelBuffer)
})

exports.getOrgSubscription = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  assertPermission(res, req.user, PERMISSIONS.SUBSCRIPTION.VIEW, orgId)
  const limit = parseLimit(req.query.limit, 25, 200)
  const { activeSubscription } = await syncOrganizationSubscriptionState({ organizationId: orgId, now: new Date() })

  const [organization, subscriptions, paymentAggregate, userCount, teamCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: organizationSubscriptionSelect }),
    prisma.subscription.findMany({ where: { orgId }, orderBy: [{ createdAt: "desc" }], take: limit }),
    prisma.payment.aggregate({ where: { orgId, status: "SUCCESS" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.user.count({ where: { orgId, deletedAt: null } }),
    prisma.team.count({ where: { orgId, deletedAt: null } }),
  ])

  const items = subscriptions.map((sub) => ({
    id: sub.id,
    planName: sub.planName,
    planCode: sub.planCode,
    status: sub.status,
    amount: sub.amount,
    currency: sub.currency,
    startDate: sub.startDate,
    endDate: sub.endDate,
    createdAt: sub.createdAt,
    paymentOrderId: sub.paymentOrderId || "",
    paymentReferenceId: sub.paymentReferenceId || "",
  }))

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Current Plan", organization?.plan?.name || "TRIAL"),
      toSummaryItem("Subscription Status", organization?.subscriptionStatus || "TRIAL"),
      toSummaryItem("Payments", Number(paymentAggregate?._count?._all || 0)),
      toSummaryItem("Revenue", Number(paymentAggregate?._sum?.amount || 0)),
    ],
    items,
    meta: {
      organizationId: orgId,
      organizationName: organization?.name || "",
      organizationCode: organization?.organizationCode || "",
      currentPlanName: organization?.plan?.name || "",
      currentPlanCode: organization?.plan?.code || "",
      currentPlanPrice: Number(organization?.plan?.price || 0),
      currentPlanDurationInDays: Number(organization?.plan?.durationInDays || 0),
      planLimits: {
        maxUsers: Number(organization?.plan?.memberLimit || organization?.plan?.maxUsers || 0),
        maxTeams: Number(organization?.plan?.maxTeams || 0),
        maxLocations: Number(organization?.plan?.maxLocations || 0),
      },
      usage: { users: Number(userCount || 0), teams: Number(teamCount || 0) },
      subscriptionStatus: organization?.subscriptionStatus || "TRIAL",
      subscriptionExpiry: organization?.subscriptionExpiry || null,
      activeSubscriptionId: organization?.subscriptionId || null,
      subscriptionStartDate: activeSubscription?.startDate || null,
      subscriptionEndDate: activeSubscription?.endDate || organization?.subscriptionExpiry || null,
      attendanceRadius: organization?.attendanceRadius || 25,
      limit,
    },
  })
})

exports.buildOrganizationReportData = buildOrganizationReportData
exports.buildAttendanceExcelBuffer = buildAttendanceExcelBuffer
