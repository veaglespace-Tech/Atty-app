const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");

exports.getStats = asyncHandler(async (req, res) => {
  const orgId = Number(req.user.organizationId || req.user.organization);
  const userId = Number(req.user.id);
  const role = resolveUserRole(req.user, orgId);

  if (role === "ORG_ADMIN" || role === "SUB_ADMIN") {
    const [orgData, totalMembers, totalTLs, presentToday] = await Promise.all([
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
          date: new Date().toISOString().split("T")[0],
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
          ? Math.round((totalMembers / maxUsers) * 100)
          : 0,
    };

    res.status(200).json({
      totalMembers,
      totalTLs,
      presentToday,
      subscription,
      productivity: 85,
    });
    return;
  }

  const myAttendance = await prisma.attendance.count({
    where: {
      userId,
      deletedAt: null,
    },
  });

  res.status(200).json({
    myAttendance: `${myAttendance}/30`,
    streak: 5,
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
