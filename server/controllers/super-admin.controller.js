const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const {
  parseBoolean,
  parseId,
  parseLimit,
  toSummaryItem,
  truncateText,
  normalizeStatus,
} = require("../services/common.service");
const { filterVisiblePlans } = require("../services/plan.service");
const { archiveOrganization, restoreOrganizationFromArchive } = require("../services/archive.service");
const {
  resolveManagedSubscriptionWindow,
  syncOrganizationSubscriptionState,
} = require("../services/subscription.service");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const { getCachedValue } = require("../services/runtime-cache.service");
const sendEmail = require("../utils/email");
const { buildEmailTemplate } = require("../utils/email-template");
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const { generateUniqueOrgCode } = require("../utils/org-code");
const { generateUniqueReferralCode } = require("../utils/referral-code");
const { normalizeRole } = require("../constants/rbac");
const { createOrganizationMembership } = require("../services/organization-member.service");


const SUBSCRIPTION_STATUS = new Set(["TRIAL", "ACTIVE", "EXPIRED", "PAYMENT_PENDING"]);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMIN_ANALYTICS_CACHE_TTL_MS = 20 * 1000;
const NON_SUPER_ADMIN_USER_WHERE = {
  deletedAt: null,
  memberships: {
    none: {
      role: "SUPER_ADMIN",
      isActive: true,
    },
  },
};
const VISIBLE_PAYMENT_WHERE = {
  organization: {
    deletedAt: null,
  },
};
const ORGANIZATION_MEMBER_COUNT_SELECT = {
  members: {
    where: {
      isActive: true,
      user: NON_SUPER_ADMIN_USER_WHERE,
    },
  },
  teams: {
    where: {
      deletedAt: null,
    },
  },
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

const monthRangeFromKey = (monthKey) => {
  const [yearValue, monthValue] = String(monthKey || "").split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  return { from, to };
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
const normalizeCurrencyCode = (value, fallback = "INR") =>
  String(value || fallback)
    .trim()
    .toUpperCase()
    .slice(0, 10) || fallback;

const normalizeTextValue = (value, limit = 191) => truncateText(value, limit);

const normalizeOptionalTextValue = (value, limit = 191) => {
  if (value === undefined) return undefined;
  const normalized = truncateText(value, limit);
  return normalized || "";
};

const normalizeOptionalNullableTextValue = (value, limit = 191) => {
  if (value === undefined) return undefined;
  const normalized = truncateText(value, limit);
  return normalized || null;
};

const normalizePaymentRecordStatus = (value, fallback = "CREATED") =>
  String(value || fallback)
    .trim()
    .toUpperCase()
    .slice(0, 40) || fallback;

const normalizeSubscriptionRecordStatus = (value, fallback = "ACTIVE") =>
  String(value || fallback)
    .trim()
    .toUpperCase()
    .slice(0, 40) || fallback;

const normalizeOptionalNumber = (value, { label = "Value", min = 0 } = {}) => {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min) {
    const error = new Error(`${label} must be a valid number${min > 0 ? ` and at least ${min}` : ""}`);
    error.statusCode = 400;
    throw error;
  }
  return Number(numeric.toFixed(2));
};

const normalizeCoordinateValue = (value, { label, min, max } = {}) => {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    const error = new Error(`${label} is out of range`);
    error.statusCode = 400;
    throw error;
  }
  return numeric;
};

const normalizeAttendanceRadiusValue = (value) => {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 5 || numeric > 1000) {
    const error = new Error("Attendance radius must be between 5 and 1000");
    error.statusCode = 400;
    throw error;
  }
  return Math.round(numeric);
};

const getSubscriptionPlanDuration = (subscription, organization) =>
  Number(subscription?.plan?.durationInDays || organization?.plan?.durationInDays || 0);

const buildOrganizationAccessLabel = (item) =>
  item?.blocked ? "BLOCKED" : item?.active ? "ACTIVE" : "INACTIVE";

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
    wch: Math.max(12, Math.round(Number(column.width || 84) / 4.5)),
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
        where: NON_SUPER_ADMIN_USER_WHERE,
      }),
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          ...VISIBLE_PAYMENT_WHERE,
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
            select: ORGANIZATION_MEMBER_COUNT_SELECT,
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
    users: Number(org._count?.members || 0),
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
          select: ORGANIZATION_MEMBER_COUNT_SELECT,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    }),
    prisma.payment.groupBy({
      by: ["orgId"],
      where: {
        status: "SUCCESS",
        ...VISIBLE_PAYMENT_WHERE,
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
      users: Number(org._count?.members || 0),
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
        ...VISIBLE_PAYMENT_WHERE,
      },
      include: {
        organization: {
          select: {
            id: true,
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
        ...VISIBLE_PAYMENT_WHERE,
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
    orderId: payment.paymentOrderId,
    paymentId: payment.paymentReferenceId || "",
    subscriptionId: payment.subscriptionId,
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

const buildSuperAdminOrganizationDetailPayload = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: Number(organizationId),
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          price: true,
          currency: true,
          durationInDays: true,
          memberLimit: true,
          maxUsers: true,
          maxTeams: true,
          maxLocations: true,
          isActive: true,
        },
      },
      orgAdmin: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          mobileCountryCode: true,
          role: true,
          status: true,
          isActive: true,
          createdAt: true,
        },
      },
      activeSubscription: {
        select: {
          id: true,
          planId: true,
          planName: true,
          planCode: true,
          amount: true,
          currency: true,
          status: true,
          startDate: true,
          endDate: true,
          paymentGateway: true,
          paymentOrderId: true,
          paymentReferenceId: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
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
          payments: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!organization || organization.deletedAt) {
    return null;
  }

  const [paymentAggregate, recentPayments, recentSubscriptions] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        orgId: Number(organization.id),
        status: "SUCCESS",
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
      _max: {
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        orgId: Number(organization.id),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        planName: true,
        planCode: true,
        amount: true,
        currency: true,
        status: true,
        paymentOrderId: true,
        paymentReferenceId: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findMany({
      where: {
        orgId: Number(organization.id),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        planName: true,
        planCode: true,
        amount: true,
        currency: true,
        status: true,
        startDate: true,
        endDate: true,
        notes: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    id: organization.id,
    name: organization.name,
    code: organization.organizationCode,
    email: organization.email || "",
    phone: organization.phone || "",
    phoneCountryCode: organization.phoneCountryCode || "",
    address: organization.address || "",
    city: organization.city || "",
    state: organization.state || "",
    country: organization.country || "India",
    latitude: organization.latitude,
    longitude: organization.longitude,
    attendanceRadius: organization.attendanceRadius || 25,
    subscriptionStatus: organization.subscriptionStatus || "TRIAL",
    subscriptionExpiry: organization.subscriptionExpiry || null,
    blocked: Boolean(organization.isBlocked),
    active: Boolean(organization.isActive),
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    counts: {
      users: Number(organization._count?.users || 0),
      teams: Number(organization._count?.teams || 0),
      payments: Number(organization._count?.payments || 0),
      subscriptions: Number(organization._count?.subscriptions || 0),
    },
    plan: organization.plan
      ? {
          id: organization.plan.id,
          name: organization.plan.name,
          code: organization.plan.code,
          price: Number(organization.plan.price || 0),
          currency: organization.plan.currency || "INR",
          durationInDays: Number(organization.plan.durationInDays || 0),
          memberLimit: Number(organization.plan.memberLimit || organization.plan.maxUsers || 0),
          maxTeams: Number(organization.plan.maxTeams || 0),
          maxLocations: Number(organization.plan.maxLocations || 0),
          active: Boolean(organization.plan.isActive),
        }
      : null,
    admin: organization.orgAdmin
      ? {
          id: organization.orgAdmin.id,
          name: organization.orgAdmin.name,
          email: organization.orgAdmin.email,
          mobile: organization.orgAdmin.mobile,
          mobileCountryCode: organization.orgAdmin.mobileCountryCode || "",
          role: organization.orgAdmin.role,
          status: organization.orgAdmin.status,
          active: Boolean(organization.orgAdmin.isActive),
          createdAt: organization.orgAdmin.createdAt,
        }
      : null,
    activeSubscription: organization.activeSubscription
      ? {
          id: organization.activeSubscription.id,
          planId: organization.activeSubscription.planId,
          planName: organization.activeSubscription.planName,
          planCode: organization.activeSubscription.planCode,
          amount: Number(organization.activeSubscription.amount || 0),
          currency: organization.activeSubscription.currency || "INR",
          status: organization.activeSubscription.status,
          startDate: organization.activeSubscription.startDate,
          endDate: organization.activeSubscription.endDate,
          paymentGateway: organization.activeSubscription.paymentGateway || "",
          orderId: organization.activeSubscription.paymentOrderId || "",
          paymentId: organization.activeSubscription.paymentReferenceId || "",
          notes: organization.activeSubscription.notes || "",
          createdAt: organization.activeSubscription.createdAt,
          updatedAt: organization.activeSubscription.updatedAt,
        }
      : null,
    paymentSummary: {
      successfulPayments: Number(paymentAggregate?._count?._all || 0),
      totalRevenue: Number(paymentAggregate?._sum?.amount || 0),
      lastPaymentAt: paymentAggregate?._max?.createdAt || null,
    },
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      planName: payment.planName || payment.planCode || "",
      planCode: payment.planCode || "",
      amount: Number(payment.amount || 0),
      currency: payment.currency || "INR",
      status: payment.status,
      orderId: payment.paymentOrderId || "",
      paymentId: payment.paymentReferenceId || "",
      createdAt: payment.createdAt,
    })),
    recentSubscriptions: recentSubscriptions.map((subscription) => ({
      id: subscription.id,
      planName: subscription.planName || "",
      planCode: subscription.planCode || "",
      amount: Number(subscription.amount || 0),
      currency: subscription.currency || "INR",
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      notes: subscription.notes || "",
      createdAt: subscription.createdAt,
    })),
  };
};

const buildSuperAdminPaymentDetailPayload = async (paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: Number(paymentId),
    },
    include: {
      organization: {
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              price: true,
              currency: true,
              durationInDays: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          mobileCountryCode: true,
          role: true,
          status: true,
        },
      },
      subscription: {
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              price: true,
              currency: true,
              durationInDays: true,
            },
          },
        },
      },
    },
  });

  if (!payment || payment.organization?.deletedAt) {
    return null;
  }

  const subscriptionPaymentCount = await prisma.payment.count({
    where: {
      subscriptionId: Number(payment.subscriptionId),
    },
  });

  return {
    id: payment.id,
    status: payment.status,
    amount: Number(payment.amount || 0),
    currency: payment.currency || "INR",
    gateway: payment.gateway || "",
    planName: payment.planName || payment.subscription?.planName || "",
    planCode: payment.planCode || payment.subscription?.planCode || "",
    orderId: payment.paymentOrderId || "",
    paymentId: payment.paymentReferenceId || "",
    signature: payment.paymentSignature || "",
    failureReason: payment.failureReason || "",
    rawResponse: payment.rawResponse || null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    organization: {
      id: payment.organization.id,
      name: payment.organization.name,
      code: payment.organization.organizationCode,
      email: payment.organization.email || "",
      phone: payment.organization.phone || "",
      phoneCountryCode: payment.organization.phoneCountryCode || "",
      subscriptionStatus: payment.organization.subscriptionStatus || "TRIAL",
      subscriptionExpiry: payment.organization.subscriptionExpiry || null,
      blocked: Boolean(payment.organization.isBlocked),
      active: Boolean(payment.organization.isActive),
      planName: payment.organization.plan?.name || payment.subscription?.planName || "",
      planCode: payment.organization.plan?.code || payment.subscription?.planCode || "",
    },
    user: payment.user
      ? {
          id: payment.user.id,
          name: payment.user.name,
          email: payment.user.email,
          mobile: payment.user.mobile || "",
          mobileCountryCode: payment.user.mobileCountryCode || "",
          role: payment.user.role,
          status: payment.user.status,
        }
      : null,
    subscription: payment.subscription
      ? {
          id: payment.subscription.id,
          planId: payment.subscription.planId,
          planName: payment.subscription.planName || "",
          planCode: payment.subscription.planCode || "",
          amount: Number(payment.subscription.amount || 0),
          currency: payment.subscription.currency || "INR",
          status: payment.subscription.status,
          startDate: payment.subscription.startDate,
          endDate: payment.subscription.endDate,
          paymentGateway: payment.subscription.paymentGateway || "",
          orderId: payment.subscription.paymentOrderId || "",
          paymentId: payment.subscription.paymentReferenceId || "",
          signature: payment.subscription.paymentSignature || "",
          notes: payment.subscription.notes || "",
          activeKey: payment.subscription.activeKey || "",
          createdAt: payment.subscription.createdAt,
          updatedAt: payment.subscription.updatedAt,
          plan: payment.subscription.plan
            ? {
                id: payment.subscription.plan.id,
                name: payment.subscription.plan.name,
                code: payment.subscription.plan.code,
                price: Number(payment.subscription.plan.price || 0),
                currency: payment.subscription.plan.currency || "INR",
                durationInDays: Number(payment.subscription.plan.durationInDays || 0),
              }
            : null,
          paymentCount: subscriptionPaymentCount,
        }
      : null,
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

exports.getSuperAdminOrganizationById = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  await syncOrganizationSubscriptionState({
    organizationId,
    now: new Date(),
  });

  const item = await buildSuperAdminOrganizationDetailPayload(organizationId);
  if (!item) {
    res.status(404);
    throw new Error("Organization not found");
  }

  res.status(200).json({
    success: true,
    item,
  });
});

exports.getSuperAdminOrganizationUsers = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const users = await prisma.user.findMany({
    where: {
      orgId: organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      mobileCountryCode: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    items: users,
  });
});

exports.getSuperAdminOrganizationTeams = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const teams = await prisma.team.findMany({
    where: {
      orgId: organizationId,
      deletedAt: null,
    },
    include: {
      leader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = teams.map((team) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    leader: team.leader ? { id: team.leader.id, name: team.leader.name, email: team.leader.email } : null,
    memberCount: team._count?.members || 0,
    createdAt: team.createdAt,
  }));

  res.status(200).json({
    success: true,
    items,
  });
});

exports.patchSuperAdminOrganization = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }

  const currentOrganization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!currentOrganization || currentOrganization.deletedAt) {
    res.status(404);
    throw new Error("Organization not found");
  }

  const updates = {};

  if (typeof req.body?.name === "string") {
    const name = normalizeTextValue(req.body.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("Organization name is required");
    }
    updates.name = name;
  }

  if (req.body?.email !== undefined) {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      res.status(400);
      throw new Error("Organization email is required");
    }
    updates.email = email;
  }

  if (req.body?.phone !== undefined || req.body?.phoneCountryCode !== undefined) {
    const normalizedPhone = normalizePhoneNumber({
      phone: req.body?.phone !== undefined ? req.body.phone : currentOrganization.phone,
      countryCode:
        req.body?.phoneCountryCode !== undefined
          ? req.body.phoneCountryCode
          : currentOrganization.phoneCountryCode,
      requireCountryCode: true,
    });
    updates.phone = normalizedPhone.e164;
    updates.phoneCountryCode = normalizedPhone.countryCode;
  }

  const optionalTextFields = [
    ["address", 191],
    ["city", 120],
    ["state", 120],
    ["country", 120],
  ];

  optionalTextFields.forEach(([field, limit]) => {
    const normalized = normalizeOptionalNullableTextValue(req.body?.[field], limit);
    if (normalized !== undefined) {
      updates[field] = normalized || (field === "country" ? "India" : null);
    }
  });

  const attendanceRadius = normalizeAttendanceRadiusValue(req.body?.attendanceRadius);
  if (attendanceRadius !== undefined) {
    updates.attendanceRadius = attendanceRadius;
  }

  const latitude = normalizeCoordinateValue(req.body?.latitude, {
    label: "Latitude",
    min: -90,
    max: 90,
  });
  if (latitude !== undefined) {
    updates.latitude = latitude;
  }

  const longitude = normalizeCoordinateValue(req.body?.longitude, {
    label: "Longitude",
    min: -180,
    max: 180,
  });
  if (longitude !== undefined) {
    updates.longitude = longitude;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("No valid organization fields provided");
  }

  try {
    await prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: updates,
    });
  } catch (error) {
    if (error?.code === "P2002") {
      res.status(409);
      throw new Error("Organization email already exists");
    }
    throw error;
  }

  const item = await buildSuperAdminOrganizationDetailPayload(organizationId);

  res.status(200).json({
    success: true,
    message: "Organization details updated successfully",
    item,
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
        select: ORGANIZATION_MEMBER_COUNT_SELECT,
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
      users: Number(updated._count?.members || 0),
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
        ...VISIBLE_PAYMENT_WHERE,
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

exports.getSuperAdminPaymentById = asyncHandler(async (req, res) => {
  const paymentId = parseId(req.params.paymentId);
  if (!paymentId) {
    res.status(400);
    throw new Error("Invalid payment id");
  }

  const item = await buildSuperAdminPaymentDetailPayload(paymentId);
  if (!item) {
    res.status(404);
    throw new Error("Payment record not found");
  }

  res.status(200).json({
    success: true,
    item,
  });
});

exports.updateSuperAdminPayment = asyncHandler(async (req, res) => {
  const paymentId = parseId(req.params.paymentId);
  if (!paymentId) {
    res.status(400);
    throw new Error("Invalid payment id");
  }

  const existingPayment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      organization: {
        include: {
          plan: {
            select: {
              durationInDays: true,
            },
          },
        },
      },
      subscription: {
        include: {
          plan: {
            select: {
              durationInDays: true,
            },
          },
        },
      },
    },
  });

  if (!existingPayment || existingPayment.organization?.deletedAt) {
    res.status(404);
    throw new Error("Payment record not found");
  }

  const paymentPatch =
    req.body?.payment && typeof req.body.payment === "object" ? req.body.payment : {};
  const subscriptionPatch =
    req.body?.subscription && typeof req.body.subscription === "object" ? req.body.subscription : {};

  const paymentUpdates = {};
  const subscriptionUpdates = {};

  const requestedPaymentAmount = normalizeOptionalNumber(paymentPatch.amount, {
    label: "Payment amount",
    min: 0,
  });
  if (requestedPaymentAmount !== undefined) {
    paymentUpdates.amount = requestedPaymentAmount;
  }

  const requestedSubscriptionAmount = normalizeOptionalNumber(subscriptionPatch.amount, {
    label: "Subscription amount",
    min: 0,
  });
  if (requestedSubscriptionAmount !== undefined) {
    subscriptionUpdates.amount = requestedSubscriptionAmount;
  }

  if (paymentPatch.status !== undefined) {
    paymentUpdates.status = normalizePaymentRecordStatus(paymentPatch.status, existingPayment.status);
  }
  if (paymentPatch.currency !== undefined) {
    paymentUpdates.currency = normalizeCurrencyCode(paymentPatch.currency, existingPayment.currency || "INR");
  }
  if (paymentPatch.gateway !== undefined) {
    paymentUpdates.gateway = normalizeTextValue(paymentPatch.gateway, 60) || existingPayment.gateway;
  }
  if (paymentPatch.planName !== undefined) {
    paymentUpdates.planName = normalizeTextValue(paymentPatch.planName, 120);
  }
  if (paymentPatch.planCode !== undefined) {
    paymentUpdates.planCode = normalizeTextValue(paymentPatch.planCode, 24).toUpperCase();
  }
  if (paymentPatch.orderId !== undefined) {
    paymentUpdates.paymentOrderId = normalizeOptionalNullableTextValue(paymentPatch.orderId, 191);
  }
  if (paymentPatch.paymentId !== undefined) {
    paymentUpdates.paymentReferenceId = normalizeOptionalNullableTextValue(paymentPatch.paymentId, 191);
  }
  if (paymentPatch.signature !== undefined) {
    paymentUpdates.paymentSignature = normalizeOptionalNullableTextValue(paymentPatch.signature, 191);
  }
  if (paymentPatch.failureReason !== undefined) {
    paymentUpdates.failureReason = normalizeOptionalTextValue(paymentPatch.failureReason, 191) || "";
  }

  let matchedPlan = existingPayment.subscription?.plan || null;
  const hasSubscriptionPlanCode = Object.prototype.hasOwnProperty.call(subscriptionPatch, "planCode");
  const nextPlanCode = hasSubscriptionPlanCode
    ? normalizeTextValue(subscriptionPatch.planCode, 24).toUpperCase()
    : existingPayment.subscription?.planCode || "";

  if (nextPlanCode) {
    matchedPlan = await prisma.plan.findFirst({
      where: {
        code: nextPlanCode,
      },
    });
  }

  if (subscriptionPatch.status !== undefined) {
    subscriptionUpdates.status = normalizeSubscriptionRecordStatus(
      subscriptionPatch.status,
      existingPayment.subscription?.status || "ACTIVE"
    );
  }
  if (subscriptionPatch.currency !== undefined) {
    subscriptionUpdates.currency = normalizeCurrencyCode(
      subscriptionPatch.currency,
      existingPayment.subscription?.currency || "INR"
    );
  }
  if (subscriptionPatch.planName !== undefined) {
    subscriptionUpdates.planName = normalizeTextValue(subscriptionPatch.planName, 120);
  } else if (hasSubscriptionPlanCode && matchedPlan?.name) {
    subscriptionUpdates.planName = matchedPlan.name;
  }
  if (hasSubscriptionPlanCode) {
    subscriptionUpdates.planCode = nextPlanCode;
    subscriptionUpdates.planId = matchedPlan?.id || null;
  }
  if (subscriptionPatch.orderId !== undefined) {
    subscriptionUpdates.paymentOrderId = normalizeOptionalNullableTextValue(subscriptionPatch.orderId, 191);
  }
  if (subscriptionPatch.paymentId !== undefined) {
    subscriptionUpdates.paymentReferenceId = normalizeOptionalNullableTextValue(subscriptionPatch.paymentId, 191);
  }
  if (subscriptionPatch.signature !== undefined) {
    subscriptionUpdates.paymentSignature = normalizeOptionalNullableTextValue(subscriptionPatch.signature, 191);
  }
  if (subscriptionPatch.notes !== undefined) {
    subscriptionUpdates.notes = normalizeOptionalTextValue(subscriptionPatch.notes, 191) || "";
  }

  const hasStartDatePatch = Object.prototype.hasOwnProperty.call(subscriptionPatch, "startDate");
  const hasEndDatePatch = Object.prototype.hasOwnProperty.call(subscriptionPatch, "endDate");
  const hasWindowPatch = hasStartDatePatch || hasEndDatePatch;

  if (existingPayment.subscription && (hasWindowPatch || hasSubscriptionPlanCode)) {
    const { startDate, endDate } = resolveManagedSubscriptionWindow({
      currentStartDate: existingPayment.subscription.startDate,
      currentEndDate: existingPayment.subscription.endDate,
      startDateInput: subscriptionPatch.startDate,
      endDateInput: subscriptionPatch.endDate,
      durationInDays:
        matchedPlan?.durationInDays ||
        getSubscriptionPlanDuration(existingPayment.subscription, existingPayment.organization),
      forceEndDateRecalc: hasSubscriptionPlanCode || hasStartDatePatch,
    });

    subscriptionUpdates.startDate = startDate;
    subscriptionUpdates.endDate = endDate;
  }

  if (
    subscriptionUpdates.status === "EXPIRED" &&
    !Object.prototype.hasOwnProperty.call(subscriptionUpdates, "endDate")
  ) {
    subscriptionUpdates.endDate = new Date();
  }

  if (Object.keys(paymentUpdates).length === 0 && Object.keys(subscriptionUpdates).length === 0) {
    res.status(400);
    throw new Error("No valid payment or subscription fields provided");
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(paymentUpdates).length > 0) {
      await tx.payment.update({
        where: {
          id: paymentId,
        },
        data: paymentUpdates,
      });
    }

    if (existingPayment.subscription && Object.keys(subscriptionUpdates).length > 0) {
      await tx.subscription.update({
        where: {
          id: existingPayment.subscription.id,
        },
        data: subscriptionUpdates,
      });
    }
  });

  if (existingPayment.subscription && Object.keys(subscriptionUpdates).length > 0) {
    await syncOrganizationSubscriptionState({
      organizationId: existingPayment.orgId,
      now: new Date(),
    });
  }

  const item = await buildSuperAdminPaymentDetailPayload(paymentId);

  res.status(200).json({
    success: true,
    message: "Payment record updated successfully",
    item,
  });
});

exports.deleteSuperAdminPayment = asyncHandler(async (req, res) => {
  const paymentId = parseId(req.params.paymentId);
  if (!paymentId) {
    res.status(400);
    throw new Error("Invalid payment id");
  }

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      organization: true,
    },
  });

  if (!payment || payment.organization?.deletedAt) {
    res.status(404);
    throw new Error("Payment record not found");
  }

  let deletedSubscriptionId = null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({
      where: {
        id: paymentId,
      },
    });

    const remainingPayments = await tx.payment.count({
      where: {
        subscriptionId: Number(payment.subscriptionId),
      },
    });

    if (remainingPayments === 0 && payment.subscriptionId) {
      deletedSubscriptionId = Number(payment.subscriptionId);
      await tx.subscription.delete({
        where: {
          id: Number(payment.subscriptionId),
        },
      });
    }
  });

  await syncOrganizationSubscriptionState({
    organizationId: payment.orgId,
    now: new Date(),
  });

  res.status(200).json({
    success: true,
    message: deletedSubscriptionId
      ? "Payment and linked subscription record deleted successfully"
      : "Payment record deleted successfully",
  });
});

exports.downloadSuperAdminOrganizationsPdf = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 500, 2000);
  const filters = buildOrganizationFilters(req.query);
  const payload = await buildSuperAdminOrganizationsPayload(limit, filters);
  const filterLabel = formatOrganizationFiltersLabel(filters);
  const exportColumns = [
    { key: "entryNo", label: "No.", width: 35, align: "left" },
    { key: "name", label: "Organization", width: 140 },
    { key: "code", label: "Org Code", width: 70, align: "left" },
    { key: "adminName", label: "Admin", width: 120 },
    { key: "adminEmail", label: "Admin Email", width: 160 },
    { key: "planName", label: "Plan", width: 80 },
    { key: "subscriptionStatus", label: "Subscription", width: 85, align: "left" },
    { key: "users", label: "Users", width: 55, align: "left" },
    { key: "teams", label: "Teams", width: 55, align: "left" },
    { key: "successfulPayments", label: "Payments", width: 65, align: "left" },
    { key: "totalRevenueLabel", label: "Revenue", width: 90, align: "left" },
    { key: "lastPaymentAtLabel", label: "Last Payment", width: 110 },
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
    size: "A3",
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
      { key: "entryNo", label: "No.", width: 42, align: "left" },
      { key: "organization", label: "Organization", width: 140 },
      { key: "code", label: "Code", width: 78 },
      { key: "planName", label: "Plan", width: 92 },
      { key: "subscriptionStatus", label: "Subscription", width: 86 },
      { key: "users", label: "Users", width: 52, align: "center" },
      { key: "teams", label: "Teams", width: 52, align: "center" },
      { key: "access", label: "Access", width: 62, align: "center" },
      { key: "createdAtLabel", label: "Created At", width: 140 },
    ],
    rows: payload.items.map((item, index) => ({
      ...item,
      entryNo: formatExportSequence(index),
      access: buildOrganizationAccessLabel(item),
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
    payload.items.map((item, index) => ({
      "No.": formatExportSequence(index),
      Organization: item.organization,
      Code: item.code,
      Plan: item.planName,
      Subscription: item.subscriptionStatus,
      Users: item.users,
      Teams: item.teams,
      Access: buildOrganizationAccessLabel(item),
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
  const shouldBypassCache = (() => {
    const raw = String(req.query?.noCache || "").trim().toLowerCase();
    return raw === "1" || raw === "true";
  })();

  const resolveAnalyticsPayload = async () => {
    const items = await Promise.all(
      months.map(async (month) => {
        const range = monthRangeFromKey(month);
        if (!range) {
          return {
            month,
            organizations: 0,
            users: 0,
            payments: 0,
            revenue: 0,
          };
        }

        const [organizations, users, payments, revenueAggregate] = await Promise.all([
          prisma.organization.count({
            where: {
              createdAt: {
                gte: range.from,
                lt: range.to,
              },
            },
          }),
          prisma.user.count({
            where: {
              createdAt: {
                gte: range.from,
                lt: range.to,
              },
              ...NON_SUPER_ADMIN_USER_WHERE,
            },
          }),
          prisma.payment.count({
            where: {
              createdAt: {
                gte: range.from,
                lt: range.to,
              },
            },
          }),
          prisma.payment.aggregate({
            where: {
              createdAt: {
                gte: range.from,
                lt: range.to,
              },
              status: "SUCCESS",
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        return {
          month,
          organizations,
          users,
          payments,
          revenue: Number(revenueAggregate?._sum?.amount || 0),
        };
      })
    );

    return {
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
    };
  };

  const payload = shouldBypassCache
    ? await resolveAnalyticsPayload()
    : await getCachedValue(
        "super-admin:analytics:v2",
        SUPER_ADMIN_ANALYTICS_CACHE_TTL_MS,
        resolveAnalyticsPayload
      );

  res.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
  res.status(200).json({
    success: true,
    ...payload,
  });
});

exports.createSuperAdminOrganization = asyncHandler(async (req, res) => {
  const { organization, admin, planCode } = req.body;

  if (!organization || !admin || !planCode) {
    res.status(400);
    throw new Error("Organization, admin details, and plan code are required");
  }

  const orgEmail = normalizeEmail(organization.email);
  const adminEmail = normalizeEmail(admin.email);

  // Validate plan
  const dbPlan = await prisma.plan.findFirst({
    where: { code: planCode.toUpperCase(), isActive: true }
  });

  if (!dbPlan) {
    res.status(404);
    throw new Error("Selected plan not found or inactive");
  }

  // Check existence
  const [uE, oE] = await Promise.all([
    prisma.user.findUnique({ where: { email: adminEmail } }),
    prisma.organization.findUnique({ where: { email: orgEmail } }),
  ]);

  if (uE) {
    res.status(409);
    throw new Error("Admin user with this email already exists");
  }
  if (oE) {
    res.status(409);
    throw new Error("Organization with this email already exists");
  }

  let organizationPhone, adminPhone;
  try {
    organizationPhone = normalizePhoneNumber({
      phone: organization.phone,
      countryCode: organization.phoneCountryCode || organization.countryCode || "IN",
      requireCountryCode: true
    });
    adminPhone = normalizePhoneNumber({
      phone: admin.mobile,
      countryCode: admin.mobileCountryCode || admin.countryCode || "IN",
      requireCountryCode: true
    });
  } catch (err) {
    res.status(400);
    throw new Error(err.message || "Invalid phone number format");
  }

  const result = await prisma.$transaction(async (tx) => {
    const orgCode = await generateUniqueOrgCode(tx);
    const refCode = await generateUniqueReferralCode(tx);
    const duration = dbPlan.durationInDays || 30;
    const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    const newOrg = await tx.organization.create({
      data: {
        name: truncateText(organization.name, 120),
        organizationCode: orgCode,
        referralCode: refCode,
        email: orgEmail,
        phone: organizationPhone.e164,
        phoneCountryCode: organizationPhone.countryCode,
        address: truncateText(organization.address, 191) || null,
        city: truncateText(organization.city, 120) || null,
        state: truncateText(organization.state, 120) || null,
        country: organization.country || "India",
        latitude: Number(organization.latitude) || 0,
        longitude: Number(organization.longitude) || 0,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiry: expiryDate,
        planId: dbPlan.id,
        isActive: true
      }
    });

    const hashedPw = await bcrypt.hash(admin.password, 10);
    const adminRole = normalizeRole("ORG_ADMIN");

    const newUser = await tx.user.create({
      data: {
        name: truncateText(admin.name, 120),
        email: adminEmail,
        mobile: adminPhone.e164,
        mobileCountryCode: adminPhone.countryCode,
        password: hashedPw,
        role: adminRole,
        orgId: newOrg.id,
        status: "APPROVED",
        isActive: true
      }
    });

    await createOrganizationMembership(tx, {
      userId: newUser.id,
      orgId: newOrg.id,
      role: adminRole,
      isActive: true
    });

    const sub = await tx.subscription.create({
      data: {
        orgId: newOrg.id,
        planId: dbPlan.id,
        planName: dbPlan.name,
        planCode: dbPlan.code,
        amount: Number(dbPlan.price),
        status: "ACTIVE",
        startDate: new Date(),
        endDate: expiryDate,
        paymentGateway: "ADMIN_BYPASS",
        paymentOrderId: `BYPASS_${Date.now()}`,
        createdById: Number(req.user.id),
        activeKey: `ORG_${newOrg.id}`
      }
    });

    await tx.payment.create({
      data: {
        orgId: newOrg.id,
        userId: newUser.id,
        subscriptionId: sub.id,
        planName: dbPlan.name,
        planCode: dbPlan.code,
        amount: 0,
        gateway: "ADMIN_BYPASS",
        paymentOrderId: sub.paymentOrderId,
        status: "SUCCESS"
      }
    });

    await tx.organization.update({
      where: { id: newOrg.id },
      data: { subscriptionId: sub.id, orgAdminId: newUser.id }
    });

    return { organization: newOrg, admin: newUser };
  });

  // Send welcome email (non-fatal)
  try {
    const clientBase = String(process.env.CLIENT_URL || process.env.APP_URL || process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:3000").trim().replace(/\/+$/, "");
    const expiryDate = new Date(Date.now() + (dbPlan.durationInDays || 30) * DAY_IN_MS);
    const html = buildEmailTemplate({
      eyebrow: "Organization Created",
      title: "Welcome to Veagle Attendee",
      subtitle: "Your workspace is ready. Here are your account details.",
      greeting: `Hello ${admin.name},`,
      intro: [
        "Your organization has been successfully set up on Veagle Attendee by the administrator.",
        "Your workspace is now active. Please find your account and subscription details below.",
      ],
      sections: [
        {
          eyebrow: "Account Details",
          title: "Organization Workspace",
          rows: [
            { label: "Org Name",  value: result.organization.name },
            { label: "Org Code",  value: result.organization.organizationCode },
            { label: "Referral Code", value: result.organization.referralCode },
            { label: "Join Link", valueHtml: `<a href="${clientBase}/register/user?ref=${result.organization.referralCode}" style="color:#7dd3fc;text-decoration:underline;word-break:break-all;">${clientBase}/register/user?ref=${result.organization.referralCode}</a>` },
            { label: "Admin",     value: admin.name },
            { label: "Login Email", value: adminEmail },
          ],
        },
        {
          eyebrow: "Subscription Info",
          title: dbPlan.name,
          rows: [
            { label: "Status",     value: "ACTIVE" },
            { label: "Plan",       value: dbPlan.name },
            { label: "Start Date", value: new Date().toLocaleDateString("en-GB") },
            { label: "Expiry Date", value: expiryDate.toLocaleDateString("en-GB") },
          ],
        },
      ],
      action: {
        label: "Go to Login",
        href: `${clientBase}/login`,
      },
      footnotes: [
        "Please keep your Organization Code safe — you and your team will need it to log in.",
        "For security, your password is not included in this email.",
        "If you did not expect this email, please contact support.",
      ],
      footerNote: "Empowering your workspace with smart attendance solutions.",
    });

    await sendEmail({
      email: adminEmail,
      subject: `Welcome to Veagle Attendee — ${truncateText(result.organization.name, 40)}`,
      html,
    });
  } catch (emailErr) {
    console.error("[createSuperAdminOrganization] Welcome email error (non-fatal):", emailErr?.message);
  }

  res.status(201).json({
    success: true,
    message: "Organization created successfully by Super Admin",
    data: result
  });
});

exports.extendSuperAdminOrganizationPlan = asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.organizationId);
  const { additionalDays, planCode } = req.body;

  if (!organizationId) {
    res.status(400);
    throw new Error("Invalid organization id");
  }
  if (!additionalDays || isNaN(Number(additionalDays)) || Number(additionalDays) < 1) {
    res.status(400);
    throw new Error("additionalDays must be a positive number");
  }

  const days = Math.floor(Number(additionalDays));

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true, activeSubscription: true, orgAdmin: true },
  });

  if (!org) {
    res.status(404);
    throw new Error("Organization not found");
  }

  // Decide which plan to use: override or keep existing
  let plan = org.plan;
  if (planCode) {
    plan = await prisma.plan.findFirst({ where: { code: planCode.toUpperCase(), isActive: true } });
    if (!plan) {
      res.status(404);
      throw new Error("Plan not found or inactive");
    }
  }
  if (!plan) {
    res.status(400);
    throw new Error("Organization has no active plan. Please provide a planCode.");
  }

  const now = new Date();
  // Extend from current expiry if still active, otherwise from today
  const baseDate = org.subscriptionExpiry && org.subscriptionExpiry > now
    ? new Date(org.subscriptionExpiry)
    : now;
  const newExpiry = new Date(baseDate.getTime() + days * DAY_IN_MS);

  const result = await prisma.$transaction(async (tx) => {
    // Create a new subscription record for the extension
    const newSub = await tx.subscription.create({
      data: {
        orgId: org.id,
        planId: plan.id,
        planName: plan.name,
        planCode: plan.code,
        amount: 0, // bypass — no charge
        status: "ACTIVE",
        startDate: baseDate,
        endDate: newExpiry,
        paymentGateway: "ADMIN_BYPASS",
        paymentOrderId: `EXTEND_${Date.now()}`,
        createdById: Number(req.user.id),
        activeKey: `ORG_EXT_${org.id}_${Date.now()}`,
      },
    });

    // Create a bypass payment record
    await tx.payment.create({
      data: {
        orgId: org.id,
        userId: org.orgAdminId || Number(req.user.id),
        subscriptionId: newSub.id,
        planName: plan.name,
        planCode: plan.code,
        amount: 0,
        gateway: "ADMIN_BYPASS",
        paymentOrderId: newSub.paymentOrderId,
        status: "SUCCESS",
      },
    });

    // Update organization: new expiry, active plan, active status
    const updatedOrg = await tx.organization.update({
      where: { id: org.id },
      data: {
        subscriptionExpiry: newExpiry,
        subscriptionStatus: "ACTIVE",
        subscriptionId: newSub.id,
        planId: plan.id,
        isActive: true,
      },
    });

    return { organization: updatedOrg, subscription: newSub, newExpiry };
  });

  // Send plan extension email (non-fatal)
  try {
    if (org.orgAdmin && org.orgAdmin.email) {
      const adminEmail = org.orgAdmin.email;
      const clientBase = String(process.env.CLIENT_URL || process.env.APP_URL || process.env.CLIENT_ORIGINS?.split(",")[0] || "http://localhost:3000").trim().replace(/\/+$/, "");
      const html = buildEmailTemplate({
        eyebrow: "Plan Extended",
        title: "Your Subscription Has Been Extended",
        subtitle: "The administrator has extended your workspace plan.",
        greeting: `Hello ${org.orgAdmin.name},`,
        intro: [
          `Great news! The administrator has successfully extended your organization's plan by ${days} day(s).`,
          "Your workspace will continue to operate without any interruptions.",
        ],
        sections: [
          {
            eyebrow: "Extension Details",
            title: "Updated Subscription Info",
            rows: [
              { label: "Org Name",    value: result.organization.name },
              { label: "Plan",        value: plan.name },
              { label: "Days Added",  value: `${days} Days` },
              { label: "New Expiry",  value: result.newExpiry.toLocaleDateString("en-GB") },
            ],
          },
        ],
        action: {
          label: "Go to Dashboard",
          href: `${clientBase}/login`,
        },
        footnotes: [
          "If you have any questions regarding this extension, please contact support.",
        ],
        footerNote: "Empowering your workspace with smart attendance solutions.",
      });

      await sendEmail({
        email: adminEmail,
        subject: `Plan Extended — ${truncateText(result.organization.name, 40)}`,
        html,
      });
    }
  } catch (emailErr) {
    console.error("[extendSuperAdminOrganizationPlan] Extension email error (non-fatal):", emailErr?.message);
  }

  res.status(200).json({
    success: true,
    message: `Plan extended by ${days} day(s). New expiry: ${result.newExpiry.toISOString()}`,
    data: result,
  });
});

exports.getSuperAdminUserById = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          organizationCode: true,
          phone: true,
          phoneCountryCode: true,
          address: true,
          city: true,
          state: true,
          country: true,
        },
      },
      teamMemberships: {
        where: {
          team: {
            deletedAt: null,
            isActive: true,
          },
        },
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      teamsLed: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || user.deletedAt) {
    res.status(404);
    throw new Error("User not found");
  }

  // Calculate attendance summary if they belong to an organization
  let attendanceSummary = {};
  if (user.orgId) {
    const where = {
      orgId: user.orgId,
      userId: user.id,
      deletedAt: null,
    };
    const [statusGroups, aggregates] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),
      prisma.attendance.aggregate({
        where,
        _count: {
          _all: true,
        },
        _sum: {
          totalMinutesWorked: true,
        },
      }),
    ]);
    const counts = statusGroups.reduce(
      (accumulator, item) => ({
        ...accumulator,
        [String(item.status || "").toUpperCase()]: Number(item?._count?._all || 0),
      }),
      {}
    );
    attendanceSummary = {
      totalEntries: Number(aggregates?._count?._all || 0),
      presentDays: Number(counts.PRESENT || 0),
      halfDays: Number(counts.HALF_DAY || 0),
      absentDays: Number(counts.ABSENT || 0),
      totalWorkedMinutes: Number(aggregates?._sum?.totalMinutesWorked || 0),
    };
  }

  const teamNames = user.teamMemberships.map((membership) => membership.team?.name).filter(Boolean);
  const ledTeamNames = user.teamsLed.map((team) => team.name).filter(Boolean);

  res.status(200).json({
    success: true,
    item: {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      mobileCountryCode: user.mobileCountryCode || "",
      emergencyContact: user.emergencyContact || "",
      currentAddress: user.currentAddress || "",
      permanentAddress: user.permanentAddress || "",
      role: user.role,
      approvalStatus: user.status,
      active: user.isActive,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      organization: user.organization,
      attendanceSummary,
      teamNames,
      ledTeamNames,
    },
  });
});

exports.patchSuperAdminUser = asyncHandler(async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.deletedAt) {
    res.status(404);
    throw new Error("User not found");
  }

  const userPayload = {};
  const membershipPayload = {};

  if (typeof req.body?.name === "string") {
    const name = truncateText(req.body.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("Name cannot be empty");
    }
    userPayload.name = name;
  }

  if (req.body?.email !== undefined) {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      res.status(400);
      throw new Error("Email cannot be empty");
    }
    userPayload.email = email;
  }

  if (req.body?.mobile !== undefined) {
    let normalizedPhone = null;
    try {
      normalizedPhone = normalizePhoneNumber({
        phone: req.body.mobile,
        countryCode: req.body.mobileCountryCode || req.body.countryCode,
        requireCountryCode: false,
      });
    } catch (phoneError) {
      res.status(400);
      throw new Error(phoneError.message || "Invalid mobile number");
    }
    userPayload.mobile = normalizedPhone.e164;
    userPayload.mobileCountryCode = normalizedPhone.countryCode;
  }

  if (req.body?.emergencyContact !== undefined) {
    userPayload.emergencyContact = req.body.emergencyContact ? truncateText(req.body.emergencyContact, 120) : null;
  }

  if (req.body?.currentAddress !== undefined) {
    userPayload.currentAddress = req.body.currentAddress ? truncateText(req.body.currentAddress, 191) : null;
  }

  if (req.body?.permanentAddress !== undefined) {
    userPayload.permanentAddress = req.body.permanentAddress ? truncateText(req.body.permanentAddress, 191) : null;
  }

  if (req.body?.role !== undefined) {
    const role = normalizeRole(req.body.role);
    userPayload.role = role;
    membershipPayload.role = role;
  }

  if (req.body?.status !== undefined) {
    const status = normalizeStatus(req.body.status);
    userPayload.status = status;
    if (status === "REJECTED") {
      userPayload.isActive = false;
      membershipPayload.isActive = false;
    }
  }

  if (req.body?.isActive !== undefined) {
    const isActive = parseBoolean(req.body.isActive, null);
    if (isActive === null) {
      res.status(400);
      throw new Error("isActive must be boolean");
    }
    userPayload.isActive = isActive;
    membershipPayload.isActive = isActive;
  }

  if (Array.isArray(req.body?.permissions)) {
    userPayload.permissions = req.body.permissions;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userPayload).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userPayload,
      });
    }

    if (user.orgId && Object.keys(membershipPayload).length > 0) {
      const memberObj = await tx.organizationMember.findUnique({
        where: {
          userId_orgId: {
            userId: userId,
            orgId: user.orgId,
          },
        },
      });
      if (memberObj) {
        await tx.organizationMember.update({
          where: {
            userId_orgId: {
              userId: userId,
              orgId: user.orgId,
            },
          },
          data: membershipPayload,
        });
      }
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          organizationCode: true,
          phone: true,
          phoneCountryCode: true,
          address: true,
          city: true,
          state: true,
          country: true,
        },
      },
      teamMemberships: {
        where: {
          team: {
            deletedAt: null,
            isActive: true,
          },
        },
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      teamsLed: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
        },
      },
    },
  });

  // Calculate attendance summary if they belong to an organization
  let attendanceSummary = {};
  if (updated.orgId) {
    const where = {
      orgId: updated.orgId,
      userId: updated.id,
      deletedAt: null,
    };
    const [statusGroups, aggregates] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),
      prisma.attendance.aggregate({
        where,
        _count: {
          _all: true,
        },
        _sum: {
          totalMinutesWorked: true,
        },
      }),
    ]);
    const counts = statusGroups.reduce(
      (accumulator, item) => ({
        ...accumulator,
        [String(item.status || "").toUpperCase()]: Number(item?._count?._all || 0),
      }),
      {}
    );
    attendanceSummary = {
      totalEntries: Number(aggregates?._count?._all || 0),
      presentDays: Number(counts.PRESENT || 0),
      halfDays: Number(counts.HALF_DAY || 0),
      absentDays: Number(counts.ABSENT || 0),
      totalWorkedMinutes: Number(aggregates?._sum?.totalMinutesWorked || 0),
    };
  }

  const teamNames = updated.teamMemberships.map((membership) => membership.team?.name).filter(Boolean);
  const ledTeamNames = updated.teamsLed.map((team) => team.name).filter(Boolean);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    item: {
      id: updated.id,
      orgId: updated.orgId,
      name: updated.name,
      email: updated.email,
      mobile: updated.mobile,
      mobileCountryCode: updated.mobileCountryCode || "",
      emergencyContact: updated.emergencyContact || "",
      currentAddress: updated.currentAddress || "",
      permanentAddress: updated.permanentAddress || "",
      role: updated.role,
      approvalStatus: updated.status,
      active: updated.isActive,
      profileImageUrl: updated.profileImageUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastLoginAt: updated.lastLoginAt,
      organization: updated.organization,
      attendanceSummary,
      teamNames,
      ledTeamNames,
    },
  });
});

