const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { parseBoolean, parseId, parseLimit, toSummaryItem } = require("../services/common.service");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const xlsx = require("xlsx");

const SUBSCRIPTION_STATUS = new Set(["TRIAL", "ACTIVE", "EXPIRED", "PAYMENT_PENDING"]);

const toMonthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthSequence = (count = 6) => {
  const result = [];
  const base = new Date();
  base.setUTCDate(1);
  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - index, 1));
    result.push(`${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return result;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN");
};

const formatMoney = (amount, currency = "INR") => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return String(amount ?? "-");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatExportSequence = (index) => String(Number(index || 0) + 1).padStart(3, "0");

const getSummaryValue = (summary = [], label) =>
  summary.find((item) => String(item?.label || "").toLowerCase() === String(label || "").toLowerCase())
    ?.value;

const normalizeQueryValue = (value) => String(value || "").trim();

const normalizeQueryOption = (value, allowedValues, fallback = "ALL") => {
  const normalized = normalizeQueryValue(value).toUpperCase();
  if (!normalized || !allowedValues.has(normalized)) return fallback;
  return normalized;
};

const buildOrganizationFilters = (query = {}) => ({
  search: normalizeQueryValue(query.search).toLowerCase(),
  subscriptionStatus: normalizeQueryOption(query.subscriptionStatus, new Set(["ALL", ...SUBSCRIPTION_STATUS])),
  access: normalizeQueryOption(query.access, new Set(["ALL", "ACTIVE", "INACTIVE"])),
  block: normalizeQueryOption(query.block, new Set(["ALL", "BLOCKED", "UNBLOCKED"])),
});

const filterOrganizationItems = (items = [], filters = {}) =>
  items.filter((item) => {
    const subscriptionStatus = String(item.subscriptionStatus || "TRIAL").toUpperCase();

    if (filters.subscriptionStatus && filters.subscriptionStatus !== "ALL") {
      if (subscriptionStatus !== filters.subscriptionStatus) return false;
    }

    if (filters.access === "ACTIVE" && !item.active) return false;
    if (filters.access === "INACTIVE" && item.active) return false;
    if (filters.block === "BLOCKED" && !item.blocked) return false;
    if (filters.block === "UNBLOCKED" && item.blocked) return false;

    if (!filters.search) return true;

    const haystack = [
      item.name,
      item.code,
      item.email,
      item.phone,
      item.phoneCountryCode,
      item.adminName,
      item.adminEmail,
      item.adminPhone,
      item.adminPhoneCountryCode,
      item.planName,
      item.planCode,
      [item.phoneCountryCode, item.phone].filter(Boolean).join(" "),
      [item.adminPhoneCountryCode, item.adminPhone].filter(Boolean).join(" "),
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return haystack.includes(filters.search);
  });

const formatOrganizationFiltersLabel = (filters = {}) => {
  const labels = [];

  if (filters.search) {
    labels.push(`Search: ${filters.search}`);
  }
  if (filters.subscriptionStatus && filters.subscriptionStatus !== "ALL") {
    labels.push(`Subscription: ${filters.subscriptionStatus}`);
  }
  if (filters.access && filters.access !== "ALL") {
    labels.push(`Access: ${filters.access}`);
  }
  if (filters.block && filters.block !== "ALL") {
    labels.push(`Block: ${filters.block}`);
  }

  return labels.join(" | ");
};

const buildExportWorkbookBuffer = ({
  title,
  subtitleLines = [],
  sheetName,
  columns = [],
  rows = [],
}) => {
  const normalizedColumns = Array.isArray(columns) ? columns.filter((column) => column?.label) : [];
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const infoLines = subtitleLines.map((line) => normalizeQueryValue(line)).filter(Boolean);
  const sheetData = [
    [normalizeQueryValue(title) || "Records"],
    ...infoLines.map((line) => [line]),
    [],
    normalizedColumns.map((column) => column.label),
    ...normalizedRows.map((row) =>
      normalizedColumns.map((column) => {
        const value = row?.[column.key];
        return value === null || value === undefined || value === "" ? "-" : String(value);
      })
    ),
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
  const lastColumnIndex = Math.max(normalizedColumns.length - 1, 0);
  const lastColumnLabel = xlsx.utils.encode_col(lastColumnIndex);
  const headerRowNumber = infoLines.length + 3;

  worksheet["!cols"] = normalizedColumns.map((column) => ({
    wch: Math.max(12, Math.round(Number(column.width || 84) / 6)),
  }));
  worksheet["!merges"] = Array.from({ length: infoLines.length + 1 }, (_, index) => ({
    s: { r: index, c: 0 },
    e: { r: index, c: lastColumnIndex },
  }));
  worksheet["!autofilter"] = {
    ref: `A${headerRowNumber}:${lastColumnLabel}${headerRowNumber}`,
  };

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName || "Records");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const buildSuperAdminDashboardPayload = async (limit = 12) => {
  const [orgCount, activeOrgCount, blockedOrgCount, userCount, paymentAggregate, recentOrgs] =
    await Promise.all([
      prisma.organization.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.organization.count({
        where: {
          deletedAt: null,
          isActive: true,
          isBlocked: false,
        },
      }),
      prisma.organization.count({
        where: {
          deletedAt: null,
          isBlocked: true,
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          role: {
            not: "SUPER_ADMIN",
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          user: {
            deletedAt: null,
            role: {
              not: "SUPER_ADMIN",
            },
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.organization.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          plan: {
            select: {
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              users: {
                where: {
                  deletedAt: null,
                },
              },
              teams: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: limit,
      }),
    ]);

  const items = recentOrgs.map((org) => ({
    id: org.id,
    organization: org.name,
    code: org.organizationCode,
    planName: org.plan?.name || "TRIAL",
    subscriptionStatus: org.subscriptionStatus,
    users: Number(org._count?.users || 0),
    teams: Number(org._count?.teams || 0),
    blocked: Boolean(org.isBlocked),
    active: Boolean(org.isActive),
    createdAt: org.createdAt,
  }));

  return {
    summary: [
      toSummaryItem("Organizations", orgCount),
      toSummaryItem("Active Organizations", activeOrgCount),
      toSummaryItem("Blocked Organizations", blockedOrgCount),
      toSummaryItem("Users", userCount),
      toSummaryItem("Successful Payments", Number(paymentAggregate?._count?._all || 0)),
      toSummaryItem("Revenue", Number(paymentAggregate?._sum?.amount || 0)),
    ],
    items,
    meta: {
      users: userCount,
      successfulPayments: Number(paymentAggregate?._count?._all || 0),
    },
  };
};

const buildSuperAdminOrganizationsPayload = async (limit = 500, filters = {}) => {
  const [organizations, paymentAggregate] = await Promise.all([
    prisma.organization.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        plan: {
          select: {
            name: true,
            code: true,
          },
        },
        orgAdmin: {
          select: {
            name: true,
            email: true,
            mobile: true,
            mobileCountryCode: true,
          },
        },
        _count: {
          select: {
            users: {
              where: {
                deletedAt: null,
              },
            },
            teams: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    }),
    prisma.payment.groupBy({
      by: ["orgId"],
      where: {
        status: "SUCCESS",
        user: {
          deletedAt: null,
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
      _max: {
        createdAt: true,
      },
    }),
  ]);

  const paymentByOrganization = new Map(
    paymentAggregate.map((entry) => [
      Number(entry.orgId),
      {
        successfulPayments: Number(entry._count?._all || 0),
        totalRevenue: Number(entry._sum?.amount || 0),
        lastPaymentAt: entry._max?.createdAt || null,
      },
    ])
  );

  const items = filterOrganizationItems(
    organizations.map((org) => {
    const paymentStats = paymentByOrganization.get(Number(org.id)) || {
      successfulPayments: 0,
      totalRevenue: 0,
      lastPaymentAt: null,
    };

    return {
      id: org.id,
      name: org.name,
      code: org.organizationCode,
      email: org.email || "",
      phone: org.phone || "",
      phoneCountryCode: org.phoneCountryCode || "",
      adminName: org.orgAdmin?.name || "",
      adminEmail: org.orgAdmin?.email || "",
      adminPhone: org.orgAdmin?.mobile || "",
      adminPhoneCountryCode: org.orgAdmin?.mobileCountryCode || "",
      users: Number(org._count?.users || 0),
      teams: Number(org._count?.teams || 0),
      planName: org.plan?.name || "TRIAL",
      planCode: org.plan?.code || "",
      subscriptionStatus: org.subscriptionStatus,
      subscriptionExpiry: org.subscriptionExpiry,
      successfulPayments: paymentStats.successfulPayments,
      totalRevenue: paymentStats.totalRevenue,
      lastPaymentAt: paymentStats.lastPaymentAt,
      blocked: Boolean(org.isBlocked),
      active: Boolean(org.isActive),
      createdAt: org.createdAt,
    };
    }),
    filters
  );

  return {
    summary: [
      toSummaryItem("Organizations", items.length),
      toSummaryItem("Active", items.filter((item) => item.active).length),
      toSummaryItem("Blocked", items.filter((item) => item.blocked).length),
      toSummaryItem(
        "Successful Payments",
        items.reduce((sum, item) => sum + Number(item.successfulPayments || 0), 0)
      ),
      toSummaryItem(
        "Revenue",
        items.reduce((sum, item) => sum + Number(item.totalRevenue || 0), 0)
      ),
    ],
    items,
    meta: {
      limit,
      total: items.length,
    },
  };
};

const buildSuperAdminPaymentsPayload = async (limit = 150) => {
  const [payments, aggregate] = await Promise.all([
    prisma.payment.findMany({
      where: {
        organization: {
          deletedAt: null,
        },
        user: {
          deletedAt: null,
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      include: {
        organization: {
          select: {
            name: true,
            organizationCode: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    }),
    prisma.payment.aggregate({
      where: {
        status: "SUCCESS",
        organization: {
          deletedAt: null,
        },
        user: {
          deletedAt: null,
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const items = payments.map((payment) => ({
    id: payment.id,
    organization: payment.organization?.name || "Unknown",
    organizationCode: payment.organization?.organizationCode || "",
    user: payment.user?.name || "Unknown",
    userEmail: payment.user?.email || "",
    planName: payment.planName || payment.planCode || "",
    planCode: payment.planCode,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    gateway: payment.gateway,
    orderId: payment.razorpayOrderId,
    paymentId: payment.razorpayPaymentId || "",
    createdAt: payment.createdAt,
  }));

  return {
    summary: [
      toSummaryItem("Payments", items.length),
      toSummaryItem("Success", items.filter((item) => item.status === "SUCCESS").length),
      toSummaryItem("Failed", items.filter((item) => item.status === "FAILED").length),
      toSummaryItem("Revenue", Number(aggregate?._sum?.amount || 0)),
    ],
    items,
    meta: {
      successfulTransactions: Number(aggregate?._count?._all || 0),
      limit,
    },
  };
};

exports.getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const payload = await buildSuperAdminDashboardPayload(12);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

exports.getSuperAdminOrganizations = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 2000);
  const filters = buildOrganizationFilters(req.query);
  const payload = await buildSuperAdminOrganizationsPayload(limit, filters);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

exports.updateOrganizationAccess = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const updates = {};
  if (req.body?.isBlocked !== undefined) {
    const next = parseBoolean(req.body.isBlocked, null);
    if (next === null) {
      res.status(400);
      throw new Error("isBlocked must be boolean");
    }
    updates.isBlocked = next;
  }

  if (req.body?.isActive !== undefined) {
    const next = parseBoolean(req.body.isActive, null);
    if (next === null) {
      res.status(400);
      throw new Error("isActive must be boolean");
    }
    updates.isActive = next;
  }

  if (req.body?.subscriptionStatus !== undefined) {
    const subscriptionStatus = String(req.body.subscriptionStatus || "")
      .trim()
      .toUpperCase();
    if (!SUBSCRIPTION_STATUS.has(subscriptionStatus)) {
      res.status(400);
      throw new Error("Invalid subscription status");
    }
    updates.subscriptionStatus = subscriptionStatus;
    if (subscriptionStatus === "EXPIRED") {
      updates.subscriptionExpiry = new Date();
      updates.subscriptionId = null;
    }
    if (subscriptionStatus === "ACTIVE") {
      updates.subscriptionExpiry = updates.subscriptionExpiry || undefined;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update");
  }

  const updated = await prisma.organization.update({
    where: {
      id: organizationId,
    },
    data: updates,
    include: {
      plan: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          users: {
            where: {
              deletedAt: null,
            },
          },
          teams: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  if (updates.subscriptionStatus === "EXPIRED") {
    await prisma.subscription.updateMany({
      where: {
        orgId: organizationId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
        activeKey: null,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: "Organization access updated",
    item: {
      id: updated.id,
      name: updated.name,
      code: updated.organizationCode,
      email: updated.email || "",
      phone: updated.phone || "",
      phoneCountryCode: updated.phoneCountryCode || "",
      users: Number(updated._count?.users || 0),
      teams: Number(updated._count?.teams || 0),
      planName: updated.plan?.name || "TRIAL",
      subscriptionStatus: updated.subscriptionStatus,
      blocked: Boolean(updated.isBlocked),
      active: Boolean(updated.isActive),
      createdAt: updated.createdAt,
    },
  });
});

// @desc    Archive Organization (Full Move)
// @route   POST /api/super-admin/organizations/:organizationId/archive
// @access  Super Admin
exports.archiveOrganizationAction = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  const { reason } = req.body;

  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const archived = await archiveOrganization({
    orgId: organizationId,
    reason: reason || "Archived by Super Admin",
    archivedById: Number(req.user.id),
  });

  if (!archived) {
    res.status(500);
    throw new Error("Failed to archive organization");
  }

  res.status(200).json({
    success: true,
    message: "Organization moved to archive successfully",
    archivedId: archived.id,
  });
});

// @desc    Restore Organization from Archive
// @route   POST /api/super-admin/organizations/:organizationId/restore
// @access  Super Admin
exports.restoreOrganizationAction = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);

  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const restored = await restoreOrganizationFromArchive({
    orgId: organizationId,
  });

  if (!restored) {
    res.status(500);
    throw new Error("Failed to restore organization from archive");
  }

  res.status(200).json({
    success: true,
    message: "Organization restored successfully",
    id: restored.id,
  });
});

exports.getSuperAdminPlans = asyncHandler(async (req, res) => {
  const [plans, subscriptionAgg, paymentAgg] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ id: "asc" }],
    }),
    prisma.subscription.groupBy({
      by: ["planCode"],
      _count: {
        _all: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["planCode"],
      where: {
        status: "SUCCESS",
        user: {
          deletedAt: null,
          role: {
            not: "SUPER_ADMIN",
          },
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const subscriberMap = new Map(
    subscriptionAgg.map((entry) => [String(entry.planCode).toUpperCase(), Number(entry._count?._all || 0)])
  );
  const revenueMap = new Map(
    paymentAgg.map((entry) => [String(entry.planCode).toUpperCase(), Number(entry._sum?.amount || 0)])
  );

  const items = filterVisiblePlans(plans).map((plan) => {
    const code = String(plan.code || "").toUpperCase();
    return {
      id: plan.id,
      name: plan.name,
      code: plan.code,
      price: plan.price,
      durationInDays: plan.durationInDays,
      memberLimit: plan.memberLimit || plan.maxUsers || 0,
      active: Boolean(plan.isActive),
      isDefault: Boolean(plan.isDefault),
      subscribersTotal: subscriberMap.get(code) || 0,
      revenue: revenueMap.get(code) || 0,
      createdAt: plan.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Plans", items.length),
      toSummaryItem("Active Plans", items.filter((item) => item.active).length),
      toSummaryItem("Default Plans", items.filter((item) => item.isDefault).length),
      toSummaryItem(
        "Total Subscribers",
        items.reduce((sum, item) => sum + Number(item.subscribersTotal || 0), 0)
      ),
    ],
    items,
    meta: {
      totalRevenue: items.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    },
  });
});

exports.getSuperAdminPayments = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 150, 1000);
  const payload = await buildSuperAdminPaymentsPayload(limit);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

exports.downloadSuperAdminOrganizationsPdf = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 2000);
  const filters = buildOrganizationFilters(req.query);
  const payload = await buildSuperAdminOrganizationsPayload(limit, filters);
  const filterLabel = formatOrganizationFiltersLabel(filters);
  const exportColumns = [
    { key: "entryNo", label: "No.", width: 42, align: "left" },
    { key: "name", label: "Organization", width: 128 },
    { key: "code", label: "Org Code", width: 72, align: "left" },
    { key: "adminName", label: "Admin", width: 94 },
    { key: "adminEmail", label: "Admin Email", width: 132 },
    { key: "planName", label: "Plan", width: 86 },
    { key: "subscriptionStatus", label: "Subscription", width: 84, align: "left" },
    { key: "users", label: "Users", width: 54, align: "left" },
    { key: "teams", label: "Teams", width: 54, align: "left" },
    { key: "successfulPayments", label: "Payments", width: 68, align: "left" },
    { key: "totalRevenueLabel", label: "Revenue", width: 84, align: "left" },
    { key: "lastPaymentAtLabel", label: "Last Payment", width: 114 },
  ];

  const pdfBuffer = await buildGenericTablePdf({
    title: "ORGANIZATION RECORDS",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      filterLabel ? `Applied Filters: ${filterLabel}` : "",
    ],
    summaryCards: [],
    columns: exportColumns,
    rows: payload.items.map((item, index) => ({
      ...item,
      entryNo: formatExportSequence(index),
      totalRevenueLabel: formatMoney(item.totalRevenue || 0),
      lastPaymentAtLabel: formatDateTime(item.lastPaymentAt),
    })),
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-organizations-records.pdf"');
  res.status(200).send(pdfBuffer);
});

exports.downloadSuperAdminOrganizationsExcel = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 2000);
  const filters = buildOrganizationFilters(req.query);
  const payload = await buildSuperAdminOrganizationsPayload(limit, filters);
  const filterLabel = formatOrganizationFiltersLabel(filters);
  const excelBuffer = buildExportWorkbookBuffer({
    title: "Organization Records",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      filterLabel ? `Applied Filters: ${filterLabel}` : "",
      `Generated At: ${new Date().toLocaleString("en-IN")}`,
    ],
    sheetName: "Organizations",
    columns: [
      { key: "entryNo", label: "No.", width: 42 },
      { key: "name", label: "Organization", width: 128 },
      { key: "code", label: "Org Code", width: 72 },
      { key: "email", label: "Email", width: 132 },
      { key: "phoneLabel", label: "Phone", width: 104 },
      { key: "adminName", label: "Admin Name", width: 110 },
      { key: "adminEmail", label: "Admin Email", width: 132 },
      { key: "planName", label: "Plan", width: 86 },
      { key: "planCode", label: "Plan Code", width: 80 },
      { key: "subscriptionStatus", label: "Subscription", width: 86 },
      { key: "usersLabel", label: "Users", width: 54 },
      { key: "teamsLabel", label: "Teams", width: 54 },
      { key: "paymentsLabel", label: "Payments", width: 68 },
      { key: "revenueLabel", label: "Revenue", width: 84 },
      { key: "lastPaymentAtLabel", label: "Last Payment", width: 114 },
      { key: "accessLabel", label: "Access", width: 76 },
      { key: "createdAtLabel", label: "Created At", width: 112 },
    ],
    rows: payload.items.map((item, index) => ({
      ...item,
      entryNo: formatExportSequence(index),
      phoneLabel: [item.phoneCountryCode, item.phone].filter(Boolean).join(" ") || "-",
      usersLabel: String(Number(item.users || 0)),
      teamsLabel: String(Number(item.teams || 0)),
      paymentsLabel: String(Number(item.successfulPayments || 0)),
      revenueLabel: formatMoney(item.totalRevenue || 0),
      lastPaymentAtLabel: formatDateTime(item.lastPaymentAt),
      accessLabel: item.blocked ? "BLOCKED" : item.active ? "ACTIVE" : "INACTIVE",
      createdAtLabel: formatDateTime(item.createdAt),
    })),
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-organizations-records.xlsx"');
  res.status(200).send(excelBuffer);
});

exports.downloadSuperAdminDashboardPdf = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 250, 1000);
  const payload = await buildSuperAdminDashboardPayload(limit);

  const pdfBuffer = await buildGenericTablePdf({
    title: "SUPER ADMIN DASHBOARD REPORT",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      `Generated Scope: Global SaaS summary`,
    ],
    summaryCards: [
      { label: "Organizations", value: getSummaryValue(payload.summary, "Organizations") || 0 },
      {
        label: "Active Organizations",
        value: getSummaryValue(payload.summary, "Active Organizations") || 0,
      },
      {
        label: "Blocked Organizations",
        value: getSummaryValue(payload.summary, "Blocked Organizations") || 0,
      },
      { label: "Users", value: getSummaryValue(payload.summary, "Users") || 0 },
      {
        label: "Payments",
        value: getSummaryValue(payload.summary, "Successful Payments") || 0,
      },
      {
        label: "Revenue",
        value: formatMoney(getSummaryValue(payload.summary, "Revenue") || 0),
      },
    ],
    columns: [
      { key: "organization", label: "Organization", width: 140 },
      { key: "code", label: "Code", width: 78 },
      { key: "planName", label: "Plan", width: 92 },
      { key: "subscriptionStatus", label: "Subscription", width: 86 },
      { key: "users", label: "Users", width: 52, align: "center" },
      { key: "teams", label: "Teams", width: 52, align: "center" },
      { key: "access", label: "Access", width: 62, align: "center" },
      { key: "createdAtLabel", label: "Created At", width: 140 },
    ],
    rows: payload.items.map((item) => ({
      ...item,
      access: item.blocked ? "BLOCKED" : item.active ? "ACTIVE" : "INACTIVE",
      createdAtLabel: formatDateTime(item.createdAt),
    })),
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-dashboard-records.pdf"');
  res.status(200).send(pdfBuffer);
});

exports.downloadSuperAdminDashboardExcel = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 250, 1000);
  const payload = await buildSuperAdminDashboardPayload(limit);

  const summarySheet = xlsx.utils.json_to_sheet(
    payload.summary.map((item) => ({
      Metric: item.label,
      Value: item.value,
    }))
  );

  const recordSheet = xlsx.utils.json_to_sheet(
    payload.items.map((item) => ({
      Organization: item.organization,
      Code: item.code,
      Plan: item.planName,
      Subscription: item.subscriptionStatus,
      Users: item.users,
      Teams: item.teams,
      Access: item.blocked ? "BLOCKED" : item.active ? "ACTIVE" : "INACTIVE",
      "Created At": formatDateTime(item.createdAt),
    }))
  );

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, summarySheet, "Summary");
  xlsx.utils.book_append_sheet(workbook, recordSheet, "Records");

  const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-dashboard-records.xlsx"');
  res.status(200).send(excelBuffer);
});

exports.downloadSuperAdminPaymentsPdf = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 1000);
  const payload = await buildSuperAdminPaymentsPayload(limit);
  const exportColumns = [
    { key: "entryNo", label: "No.", width: 42, align: "left" },
    { key: "organization", label: "Organization", width: 112 },
    { key: "organizationCode", label: "Org Code", width: 64, align: "left" },
    { key: "user", label: "User", width: 82 },
    { key: "planName", label: "Plan", width: 92 },
    { key: "amountLabel", label: "Amount", width: 82, align: "left" },
    { key: "status", label: "Status", width: 70, align: "left" },
    { key: "gateway", label: "Gateway", width: 68, align: "left" },
    { key: "orderId", label: "Order Id", width: 102 },
    { key: "paymentId", label: "Payment Id", width: 102 },
    { key: "createdAtLabel", label: "Created At", width: 114 },
  ];

  const pdfBuffer = await buildGenericTablePdf({
    title: "PAYMENT RECORDS",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      `Successful Transactions: ${payload.meta?.successfulTransactions || 0}`,
      `Total Revenue: ${formatMoney(getSummaryValue(payload.summary, "Revenue") || 0)}`,
    ],
    summaryCards: [],
    columns: exportColumns,
    rows: payload.items.map((item, index) => ({
      ...item,
      entryNo: formatExportSequence(index),
      amountLabel: formatMoney(item.amount, item.currency),
      createdAtLabel: formatDateTime(item.createdAt),
    })),
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-payments-records.pdf"');
  res.status(200).send(pdfBuffer);
});

exports.downloadSuperAdminPaymentsExcel = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 1000);
  const payload = await buildSuperAdminPaymentsPayload(limit);
  const excelBuffer = buildExportWorkbookBuffer({
    title: "Payment Records",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      `Successful Transactions: ${payload.meta?.successfulTransactions || 0}`,
      `Generated At: ${new Date().toLocaleString("en-IN")}`,
    ],
    sheetName: "Payments",
    columns: [
      { key: "entryNo", label: "No.", width: 42 },
      { key: "organization", label: "Organization", width: 112 },
      { key: "organizationCode", label: "Org Code", width: 64 },
      { key: "user", label: "User", width: 82 },
      { key: "userEmail", label: "User Email", width: 132 },
      { key: "planName", label: "Plan", width: 92 },
      { key: "amountLabel", label: "Amount", width: 82 },
      { key: "currency", label: "Currency", width: 62 },
      { key: "status", label: "Status", width: 70 },
      { key: "gateway", label: "Gateway", width: 68 },
      { key: "orderId", label: "Order Id", width: 102 },
      { key: "paymentId", label: "Payment Id", width: 102 },
      { key: "createdAtLabel", label: "Created At", width: 114 },
    ],
    rows: payload.items.map((item, index) => ({
      ...item,
      entryNo: formatExportSequence(index),
      amountLabel: formatMoney(item.amount, item.currency),
      createdAtLabel: formatDateTime(item.createdAt),
    })),
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="super-admin-payments-records.xlsx"');
  res.status(200).send(excelBuffer);
});

exports.getSuperAdminAnalytics = asyncHandler(async (req, res) => {
  const months = monthSequence(6);
  const oldestMonth = `${months[0]}-01`;

  const [organizations, users, payments] = await Promise.all([
    prisma.organization.findMany({
      where: {
        createdAt: {
          gte: new Date(`${oldestMonth}T00:00:00.000Z`),
        },
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(`${oldestMonth}T00:00:00.000Z`),
        },
        deletedAt: null,
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: new Date(`${oldestMonth}T00:00:00.000Z`),
        },
      },
      select: {
        createdAt: true,
        amount: true,
        status: true,
      },
    }),
  ]);

  const metrics = new Map(
    months.map((month) => [
      month,
      {
        month,
        organizations: 0,
        users: 0,
        payments: 0,
        revenue: 0,
      },
    ])
  );

  organizations.forEach((entry) => {
    const month = toMonthKey(entry.createdAt);
    if (!month || !metrics.has(month)) return;
    metrics.get(month).organizations += 1;
  });

  users.forEach((entry) => {
    const month = toMonthKey(entry.createdAt);
    if (!month || !metrics.has(month)) return;
    metrics.get(month).users += 1;
  });

  payments.forEach((entry) => {
    const month = toMonthKey(entry.createdAt);
    if (!month || !metrics.has(month)) return;
    metrics.get(month).payments += 1;
    if (entry.status === "SUCCESS") {
      metrics.get(month).revenue += Number(entry.amount || 0);
    }
  });

  const items = months.map((month) => metrics.get(month));

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem(
        "Organizations",
        items.reduce((sum, item) => sum + Number(item.organizations || 0), 0)
      ),
      toSummaryItem("Users", items.reduce((sum, item) => sum + Number(item.users || 0), 0)),
      toSummaryItem(
        "Payments",
        items.reduce((sum, item) => sum + Number(item.payments || 0), 0)
      ),
      toSummaryItem(
        "Revenue",
        items.reduce((sum, item) => sum + Number(item.revenue || 0), 0)
      ),
    ],
    items,
    meta: {
      months,
    },
  });
});
