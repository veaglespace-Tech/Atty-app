const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");
const { todayKey } = require("../services/common.service");

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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Calculate total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get start and end of current month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
  // Create YYYY-MM-DD keys for querying
  const startKey = startOfMonth.toISOString().split('T')[0];
  const endKey = endOfMonth.toISOString().split('T')[0];

  const myAttendance = await prisma.attendance.count({
    where: {
      userId,
      deletedAt: null,
      date: {
        gte: startKey,
        lte: endKey
      },
      status: "PRESENT" // Only count actual present days
    },
  });

  // Basic streak calculation: count consecutive previous days present
  let streak = 0;
  const recentLogs = await prisma.attendance.findMany({
    where: { userId, deletedAt: null, status: "PRESENT" },
    orderBy: { date: 'desc' },
    take: 30
  });

  if (recentLogs.length > 0) {
    let currentDate = new Date();
    // Start checking from today
    for (let i = 0; i < 30; i++) {
      const dateToCheck = new Date(currentDate);
      dateToCheck.setDate(currentDate.getDate() - i);
      const dateKey = dateToCheck.toISOString().split('T')[0];
      
      const log = recentLogs.find(l => l.date === dateKey);
      if (log) {
        streak++;
      } else if (i > 0) {
        // If it's not today and there's no log, streak breaks
        // If it is today, maybe they just haven't punched in yet, so don't break immediately
        // but for simplicity, we break on first missing past day.
        const yesterdayDateKey = new Date(currentDate.setDate(currentDate.getDate() - 1)).toISOString().split('T')[0];
        if(i === 0) continue; // skip missing today
        break;
      }
    }
  }

  res.status(200).json({
    myAttendance: `${myAttendance}/${daysInMonth}`,
    streak: streak,
  });
});

exports.getActivities = asyncHandler(async (req, res) => {
  const orgId = Number(req.user.organizationId || req.user.organization);
  const userId = Number(req.user.id);
  const role = resolveUserRole(req.user, orgId);

  let whereClause = {
    orgId,
    deletedAt: null,
  };

  if (role === "MEMBER" || role === "LIFE_MEMBER") {
    whereClause.userId = userId;
  } else if (role === "TEAM_LEADER") {
    const accessibleTeams = await prisma.team.findMany({
      where: {
        orgId,
        deletedAt: null,
        OR: [
          { leaderId: userId },
          { createdById: userId },
          { members: { some: { userId } } }
        ],
      },
      select: { id: true }
    });
    const teamIds = accessibleTeams.map(t => t.id);
    if (teamIds.length > 0) {
      whereClause.OR = [
        { teamId: { in: teamIds } },
        { userId: userId }
      ];
    } else {
      whereClause.userId = userId;
    }
  }

  const attendances = await prisma.attendance.findMany({
    where: whereClause,
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
