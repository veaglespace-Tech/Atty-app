const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { parseBoolean, parseId, parseLimit, toSummaryItem } = require("../services/common.service");
const { archiveOrganization, restoreOrganizationFromArchive } = require("../services/archive.service");
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
      toSummaryItem("Revenue", Number(paymentAggregate?._sum?.amount || 0)),
    ],
    items,
    meta: {
      users: userCount,
      successfulPayments: Number(paymentAggregate?._count?._all || 0),
    },
  };
};

const buildSuperAdminPaymentsPayload = async (limit = 150) => {
  const [payments, aggregate] = await Promise.all([
    prisma.payment.findMany({
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

  const organizations = await prisma.organization.findMany({
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
  });

  const items = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    code: org.organizationCode,
    email: org.email || "",
    phone: org.phone || "",
    phoneCountryCode: org.phoneCountryCode || "",
    users: Number(org._count?.users || 0),
    teams: Number(org._count?.teams || 0),
    planName: org.plan?.name || "TRIAL",
    subscriptionStatus: org.subscriptionStatus,
    blocked: Boolean(org.isBlocked),
    active: Boolean(org.isActive),
    createdAt: org.createdAt,
  }));

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Organizations", items.length),
      toSummaryItem("Active", items.filter((item) => item.active).length),
      toSummaryItem("Blocked", items.filter((item) => item.blocked).length),
    ],
    items,
    meta: {
      limit,
      total: items.length,
    },
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

  const items = plans.map((plan) => {
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
      { label: "Organizations", value: payload.summary[0]?.value || 0 },
      { label: "Active Organizations", value: payload.summary[1]?.value || 0 },
      { label: "Blocked Organizations", value: payload.summary[2]?.value || 0 },
      { label: "Revenue", value: formatMoney(payload.summary[3]?.value || 0) },
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

  const pdfBuffer = await buildGenericTablePdf({
    title: "SUPER ADMIN PAYMENTS REPORT",
    subtitleLines: [
      `Included Records: ${payload.items.length}`,
      `Successful Transactions: ${payload.meta?.successfulTransactions || 0}`,
    ],
    summaryCards: [
      { label: "Payments", value: payload.summary[0]?.value || 0 },
      { label: "Success", value: payload.summary[1]?.value || 0 },
      { label: "Failed", value: payload.summary[2]?.value || 0 },
      { label: "Revenue", value: formatMoney(payload.summary[3]?.value || 0) },
    ],
    columns: [
      { key: "organization", label: "Organization", width: 110 },
      { key: "organizationCode", label: "Org Code", width: 62 },
      { key: "user", label: "User", width: 82 },
      { key: "userEmail", label: "Email", width: 130 },
      { key: "planCode", label: "Plan", width: 62, align: "center" },
      { key: "amountLabel", label: "Amount", width: 74, align: "right" },
      { key: "status", label: "Status", width: 68, align: "center" },
      { key: "gateway", label: "Gateway", width: 66, align: "center" },
      { key: "createdAtLabel", label: "Created At", width: 110 },
    ],
    rows: payload.items.map((item) => ({
      ...item,
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

  const summarySheet = xlsx.utils.json_to_sheet(
    payload.summary.map((item) => ({
      Metric: item.label,
      Value: item.value,
    }))
  );

  const recordSheet = xlsx.utils.json_to_sheet(
    payload.items.map((item) => ({
      Organization: item.organization,
      "Org Code": item.organizationCode,
      User: item.user,
      "User Email": item.userEmail,
      Plan: item.planCode,
      Amount: Number(item.amount || 0),
      Currency: item.currency,
      Status: item.status,
      Gateway: item.gateway,
      "Order Id": item.orderId,
      "Payment Id": item.paymentId,
      "Created At": formatDateTime(item.createdAt),
    }))
  );

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, summarySheet, "Summary");
  xlsx.utils.book_append_sheet(workbook, recordSheet, "Payments");

  const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

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
