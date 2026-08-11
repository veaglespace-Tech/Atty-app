const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");
const { todayKey, monthWindow, dateKey } = require("../services/common.service");

exports.getStats = asyncHandler(async (req, res) => {
  const orgId = Number(req.user.organizationId || req.user.organization);
  const userId = Number(req.user.id);
  const role = resolveUserRole(req.user, orgId);

  if (role === "ORG_ADMIN" || role === "SUB_ADMIN") {
    const [orgData, totalMembers, totalTLs, presentToday, approvedMembers] = await Promise.all([
      prisma.organization.findUnique({
        where: {
          id: orgId,
        },
        select: {
          subscriptionExpiry: true,
          subscriptionStatus: true,
          plan: {
            select: {
              name: true,
              maxUsers: true,
              memberLimit: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          memberships: {
            some: {
              orgId,
              isActive: true,
            },
          },
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          memberships: {
            some: {
              orgId,
              role: "TEAM_LEADER",
              isActive: true,
            },
          },
          deletedAt: null,
        },
      }),
      prisma.attendance.count({
        where: {
          orgId,
          date: todayKey(),
          deletedAt: null,
          status: { in: ["PRESENT", "HALF_DAY"] },
        },
      }),
      prisma.user.count({
        where: {
          memberships: {
            some: {
              orgId,
              isActive: true,
            },
          },
          status: "APPROVED",
          deletedAt: null,
        },
      }),
    ]);

    const maxUsers = Number(orgData?.plan?.maxUsers || orgData?.plan?.memberLimit || 0);

    const subscription = {
      planName: orgData?.plan?.name || "TRIAL",
      expiry: orgData?.subscriptionExpiry || null,
      status: orgData?.subscriptionStatus || "TRIAL",
      maxUsers: maxUsers > 0 ? maxUsers : "Unlimited",
      usagePercentage:
        maxUsers > 0
          ? Math.round((approvedMembers / maxUsers) * 100)
          : 0,
    };

    res.status(200).json({
      totalMembers,
      approvedMembers,
      totalTLs,
      presentToday,
      subscription,
      productivity: 85,
    });
    return;
  }

  const { from: monthFrom, to: monthTo } = monthWindow(new Date());

  const [myAttendance, recentAttendances] = await Promise.all([
    prisma.attendance.count({
      where: {
        userId,
        deletedAt: null,
        date: {
          gte: monthFrom,
          lte: monthTo,
        },
        status: {
          in: ["PRESENT", "HALF_DAY"],
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { date: "desc" },
      take: 60,
      select: { date: true, status: true },
    }),
  ]);

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  let streak = 0;
  const attendanceDateSet = new Map();
  recentAttendances.forEach((a) => {
    if (a.status === "PRESENT" || a.status === "HALF_DAY") {
      attendanceDateSet.set(a.date, true);
    }
  });

  const checkDate = new Date();
  const todayStr = dateKey(checkDate);

  if (!attendanceDateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 60; i++) {
    const dStr = dateKey(checkDate);
    const dayOfWeek = checkDate.getDay();
    if (attendanceDateSet.has(dStr)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dayOfWeek === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  res.status(200).json({
    myAttendance: `${myAttendance}/${totalDaysInMonth}`,
    streak,
  });
});

exports.getActivities = asyncHandler(async (req, res) => {
  const orgId = Number(req.user.organizationId || req.user.organization);

  const attendances = await prisma.attendance.findMany({
    where: {
      orgId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      createdAt: true,
      punchInAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const activities = attendances.map((record) => ({
    userName: record.user?.name || "Unknown",
    description: `${record.user?.name || "A user"} punched in`,
    time: record.punchInAt ? new Date(record.punchInAt).toLocaleTimeString() : new Date(record.createdAt).toLocaleTimeString(),
    category: "Attendance",
    status: "Success",
  }));

  res.status(200).json(activities);
});
