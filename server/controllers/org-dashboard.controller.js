const asyncHandler = require("express-async-handler")
const prisma = require("../lib/prisma")
const { ensureOrganizationId, parseLimit, toSummaryItem, todayKey } = require("../services/common.service")
const { mapAttendanceRecord } = require("../services/attendance-query.service")
const { buildAttendanceReport } = require("../services/report-query.service")
const {
  attendanceRecordSelect,
  organizationDashboardSelect,
  organizationSubscriptionSelect,
  reportPdfUserSelect,
} = require("../services/prisma-selects.service")
const { buildAttendanceDetailedPdf, minutesToDuration } = require("../utils/pdf-report")
const xlsx = require("xlsx")

const defaultRange = () => {
  const now = new Date()
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - 29)
  return {
    from: from.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  }
}

const rangeFromPeriod = (period = "monthly") => {
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const normalized = String(period || "monthly").trim().toLowerCase()

  if (normalized === "daily") {
    return { from: today, to: today, periodLabel: "Daily" }
  }

  if (normalized === "weekly") {
    const from = new Date(now)
    from.setUTCDate(from.getUTCDate() - 6)
    return {
      from: from.toISOString().split("T")[0],
      to: today,
      periodLabel: "Weekly",
    }
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return {
    from: monthStart.toISOString().split("T")[0],
    to: today,
    periodLabel: "Monthly",
  }
}

const toPdfTime = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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
    sortByWorkedMinutes: true,
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

  const rows = records.map((record) => {
    const totalMinutesWorked = Number(record.totalMinutesWorked || 0)
    const isAbsent = String(record.status || "").toUpperCase() === "ABSENT"
    const presentMinutes = isAbsent ? 0 : totalMinutesWorked

    if (isAbsent) absentEntries += 1
    else presentEntries += 1

    totalWorkedMinutes += totalMinutesWorked
    totalPresentMinutes += presentMinutes

    return {
      userId: String(record.user?.id ?? record.userId ?? "-"),
      userName: record.user?.name || "-",
      contact: toPdfContact(record.user),
      email: record.user?.email || "-",
      date: record.date || "-",
      punchIn: toPdfTime(record.punchInAt),
      punchOut: toPdfTime(record.punchOutAt),
      totalDuration: minutesToDuration(totalMinutesWorked),
      presentDuration: minutesToDuration(presentMinutes),
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
  const limit = parseLimit(req.query.limit, 12, 100)
  const today = todayKey()

  const [organization, totalUsers, totalTeams, presentToday, recentAttendance] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: organizationDashboardSelect,
      }),
      prisma.user.count({
        where: {
          orgId,
          deletedAt: null,
        },
      }),
      prisma.team.count({
        where: {
          orgId,
          deletedAt: null,
        },
      }),
      prisma.attendance.count({
        where: {
          orgId,
          date: today,
          deletedAt: null,
          status: "PRESENT",
        },
      }),
      prisma.attendance.findMany({
        where: {
          orgId,
          deletedAt: null,
        },
        select: attendanceRecordSelect,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: limit,
      }),
    ])

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Total Users", totalUsers),
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
  const preset = rangeFromPeriod(req.query.period || "monthly")
  const fallback = defaultRange()
  const rangeFrom = String(req.query.from || preset.from || fallback.from)
  const rangeTo = String(req.query.to || preset.to || fallback.to)
  const { summary, items, recordsCount } = await buildOrganizationReportData({
    orgId,
    rangeFrom,
    rangeTo,
  })

  res.status(200).json({
    success: true,
    summary,
    items,
    meta: {
      from: rangeFrom,
      to: rangeTo,
      period: String(req.query.period || "custom").toLowerCase(),
      records: recordsCount,
    },
  })
})

exports.downloadOrgReportsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  const preset = rangeFromPeriod(req.query.period || "monthly")
  const fallback = defaultRange()
  const rangeFrom = String(req.query.from || preset.from || fallback.from)
  const rangeTo = String(req.query.to || preset.to || fallback.to)

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        organizationCode: true,
      },
    }),
    buildOrganizationPdfReportData({
      orgId,
      rangeFrom,
      rangeTo,
    }),
  ])

  const periodLabel = req.query.period
    ? String(req.query.period).trim().toLowerCase()
    : preset.periodLabel.toLowerCase()
  const pdfBuffer = await buildAttendanceDetailedPdf({
    organizationName: organization?.name || "Organization",
    organizationCode: organization?.organizationCode || "",
    periodLabel: String(periodLabel).toUpperCase(),
    rangeFrom,
    rangeTo,
    summary: reportData.summary,
    rows: reportData.rows,
  })

  const safePeriod = String(periodLabel || "report").replace(/[^a-z0-9_-]+/gi, "-")
  const filename = `attendance-report-${safePeriod}-${rangeFrom}-to-${rangeTo}.pdf`

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment filename=\"${filename}\"`)
  res.status(200).send(pdfBuffer)
})

exports.downloadOrgReportsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  const preset = rangeFromPeriod(req.query.period || "monthly")
  const fallback = defaultRange()
  const rangeFrom = String(req.query.from || preset.from || fallback.from)
  const rangeTo = String(req.query.to || preset.to || fallback.to)

  const reportData = await buildOrganizationPdfReportData({
    orgId,
    rangeFrom,
    rangeTo,
  })

  // Transform rows for better Excel display (optional, but good for readability)
  const excelRows = reportData.rows.map(row => ({
    "Date": row.date,
    "Member ID": row.userId,
    "Member Name": row.userName,
    "Contact": row.contact,
    "Email": row.email,
    "Punch In": row.punchIn,
    "Punch Out": row.punchOut,
    "Total Duration": row.totalDuration,
    "Present Duration": row.presentDuration,
    "Is Absent": row.absent
  }))

  const worksheet = xlsx.utils.json_to_sheet(excelRows)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report")

  const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

  const periodLabel = req.query.period
    ? String(req.query.period).trim().toLowerCase()
    : preset.periodLabel.toLowerCase()
  const safePeriod = String(periodLabel || "report").replace(/[^a-z0-9_-]+/gi, "-")
  const filename = `attendance-report-${safePeriod}-${rangeFrom}-to-${rangeTo}.xlsx`

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader("Content-Disposition", `attachment filename=\"${filename}\"`)
  res.status(200).send(excelBuffer)
})

exports.getOrgSubscription = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res)
  const limit = parseLimit(req.query.limit, 25, 200)

  const [organization, subscriptions, paymentAggregate] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    prisma.subscription.findMany({
      where: {
        orgId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    }),
    prisma.payment.aggregate({
      where: {
        orgId,
        status: "SUCCESS",
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
  ])

  const items = subscriptions.map((subscription) => ({
    id: subscription.id,
    planName: subscription.planName,
    planCode: subscription.planCode,
    status: subscription.status,
    amount: subscription.amount,
    currency: subscription.currency,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    createdAt: subscription.createdAt,
    razorpayOrderId: subscription.razorpayOrderId || "",
    razorpayPaymentId: subscription.razorpayPaymentId || "",
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
      organizationCode: organization?.organizationCode || "",
      subscriptionExpiry: organization?.subscriptionExpiry || null,
      attendanceRadius: organization?.attendanceRadius || 25,
      limit,
    },
  })
})
