const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { PERMISSION_KEYS, hasPermission } = require("../constants/permissions");
const { resolveUserRole } = require("../utils/membership");
const {
  ensureOrganizationId,
  dateKey,
  parseBoolean,
  parseId,
  parseLimit,
  toSummaryItem,
  uniqueNumberList,
  todayKey,
  truncateText,
  formatHoursValue,
} = require("../services/common.service");
const { assertPermission, assertRoleScope } = require("../services/access.service");
const { normalizeCoordinatesInput } = require("../services/location.service");
const { mapTeamRecord, buildTeamSummary } = require("../services/team-query.service");
const { mapUserForManagement } = require("../services/user-query.service");
const {
  reclaimSoftDeletedTeamName,
  softDeleteTeamRecord,
  isTeamNameUniqueConstraintError,
} = require("../services/team-name.service");
const {
  buildAttendanceWhere,
  buildAttendanceSummary,
  mapAttendanceRecord,
} = require("../services/attendance-query.service");
const { buildAttendanceReport } = require("../services/report-query.service");
const {
  userManagementSelect,
  attendanceRecordSelect,
  teamListSelect,
  teamDetailSelect,
  organizationSubscriptionSelect,
} = require("../services/prisma-selects.service");
const { assertWithinPlanTeamLimit, isFreePlan } = require("../services/organization-plan.service");
const { buildAttendanceDetailedPdf } = require("../utils/pdf-report");
const xlsx = require("xlsx");

const MODULES = [
  {
    key: "TEAMS",
    label: "Teams",
    path: "/team-leader/teams",
    permission: PERMISSION_KEYS.TEAM_VIEW,
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    path: "/team-leader/attendance",
    permission: PERMISSION_KEYS.ATTENDANCE_VIEW,
  },
  {
    key: "REPORTS",
    label: "Reports",
    path: "/team-leader/reports",
    permission: PERMISSION_KEYS.REPORTS_VIEW,
  },
];

const getAccessibleTeams = async ({ orgId, userId, role }) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "ORG_ADMIN" || normalizedRole === "SUB_ADMIN") {
    return prisma.team.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
  }

  return prisma.team.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { leaderId: userId },
        { createdById: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
};

const getAccessibleTeamIds = async ({ orgId, userId, role }) => {
  const teams = await getAccessibleTeams({ orgId, userId, role });
  return teams.map((team) => Number(team.id));
};

const assertTeamMutationAccess = ({ req, res, team, orgId }) => {
  const role = resolveUserRole(req.user, orgId);
  if (role === "ORG_ADMIN" || role === "SUB_ADMIN") return;
  if (Number(team.leaderId) === Number(req.user.id)) return;
  if (Number(team.createdById) === Number(req.user.id)) return;

  res.status(403);
  throw new Error("You can only modify teams assigned to you");
};

const getTeamPatchPermissionState = (req, orgId) => {
  const body = req.body || {};
  const hasMemberIds = Object.prototype.hasOwnProperty.call(body, "memberIds");
  const hasLeaderId = Object.prototype.hasOwnProperty.call(body, "leaderId");
  const hasBasicTeamFields =
    typeof body?.name === "string" ||
    typeof body?.description === "string" ||
    body?.isActive !== undefined;
  const hasAttendanceFields =
    body?.attendanceRadius !== undefined || Boolean(normalizeCoordinatesInput(body));
  const canUpdateTeam = hasPermission(req.user, PERMISSION_KEYS.TEAM_UPDATE, orgId);
  const canManageAttendance = hasPermission(req.user, PERMISSION_KEYS.ATTENDANCE_MANAGE, orgId);

  return {
    canUpdateTeam,
    hasMemberIds,
    hasLeaderId,
    canPatchAttendanceOnly:
      !canUpdateTeam &&
      canManageAttendance &&
      hasAttendanceFields &&
      !hasBasicTeamFields &&
      !hasMemberIds &&
      !hasLeaderId,
  };
};

const validateTeamAssignmentInputs = async ({
  req,
  res,
  orgId,
  memberIds,
  leaderId,
}) => {
  if (leaderId) {
    const leader = await prisma.user.findFirst({
      where: {
        id: leaderId,
        deletedAt: null,
        memberships: {
          some: {
            orgId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        memberships: {
          select: {
            orgId: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!leader) {
      res.status(404);
      throw new Error("Leader not found in organization");
    }
    if (Number(leader.id) !== Number(req.user.id)) {
      assertRoleScope(res, req.user, resolveUserRole(leader, orgId), orgId);
    }
  }

  if (memberIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        deletedAt: null,
        memberships: {
          some: {
            orgId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        memberships: {
          select: {
            orgId: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (users.length !== memberIds.length) {
      res.status(400);
      throw new Error("Some members are not valid organization users");
    }
    users.forEach((user) =>
      assertRoleScope(res, req.user, resolveUserRole(user, orgId), orgId)
    );
  }
};

exports.getTeamLeaderDashboard = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  const today = todayKey();
  const currentRole = resolveUserRole(req.user, orgId);
  const accessibleTeams = await getAccessibleTeams({
    orgId,
    userId,
    role: currentRole,
  });
  const accessibleTeamIds = accessibleTeams.map((team) => team.id);

  const modules = MODULES.map((module) => ({
    ...module,
    enabled: hasPermission(req.user, module.permission, orgId),
  }));

  if (accessibleTeamIds.length === 0) {
    return res.status(200).json({
      success: true,
      summary: [
        toSummaryItem("Enabled Modules", modules.filter((module) => module.enabled).length),
        toSummaryItem("Team Members", 0),
        toSummaryItem("Present Today", 0),
        toSummaryItem("Pending Punch Out", 0),
      ],
      items: [],
      meta: {
        teamName: null,
        message: "No team assignment available for this account",
        modules,
      },
    });
  }

  const [teamMemberRows, presentToday, pendingPunchOut, recentAttendance] = await Promise.all([
    prisma.teamMember.findMany({
      where: {
        teamId: {
          in: accessibleTeamIds,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
    prisma.attendance.count({
      where: {
        orgId,
        teamId: {
          in: accessibleTeamIds,
        },
        date: today,
        status: "PRESENT",
        deletedAt: null,
      },
    }),
    prisma.attendance.count({
      where: {
        orgId,
        teamId: {
          in: accessibleTeamIds,
        },
        date: today,
        punchInAt: {
          not: null,
        },
        punchOutAt: null,
        deletedAt: null,
      },
    }),
    prisma.attendance.findMany({
      where: {
        orgId,
        teamId: {
          in: accessibleTeamIds,
        },
        date: today,
        deletedAt: null,
      },
      select: attendanceRecordSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Enabled Modules", modules.filter((module) => module.enabled).length),
      toSummaryItem("Team Members", teamMemberRows.length),
      toSummaryItem("Present Today", presentToday),
      toSummaryItem("Pending Punch Out", pendingPunchOut),
    ],
    items: recentAttendance.map(mapAttendanceRecord),
    meta: {
      teamId: accessibleTeams[0]?.id || null,
      teamName: accessibleTeams[0]?.name || null,
      modules,
    },
  });
});

exports.getTeamLeaderTeams = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW, orgId);
  const limit = parseLimit(req.query.limit, 300, 2000);
  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  if (accessibleTeamIds.length === 0) {
    return res.status(200).json({
      success: true,
      items: [],
      summary: buildTeamSummary([]),
      meta: { total: 0, limit },
    });
  }

  const teams = await prisma.team.findMany({
    where: {
      orgId,
      id: {
        in: accessibleTeamIds,
      },
      deletedAt: null,
    },
    select: teamListSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const items = teams.map(mapTeamRecord);
  res.status(200).json({
    success: true,
    items,
    summary: buildTeamSummary(items),
    meta: {
      total: items.length,
      limit,
    },
  });
});

exports.getTeamLeaderTeamById = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const teamId = Number(req.params.teamId);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW, orgId);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  if (!accessibleTeamIds.includes(teamId)) {
    res.status(403);
    throw new Error("Access denied or team not found");
  }

  const fullTeam = await prisma.team.findUnique({
    where: { id: teamId },
    select: teamDetailSelect,
  });

  res.status(200).json({
    success: true,
    item: mapTeamRecord(fullTeam, true),
  });
});

exports.getTeamLeaderUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const isForAssignment = req.query.assignable === 'true';
  
  if (isForAssignment) {
    assertPermission(res, req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS, orgId);
  } else {
    assertPermission(res, req.user, PERMISSION_KEYS.USERS_VIEW, orgId);
  }

  const limit = parseLimit(req.query.limit, 500, 2000);
  const userId = Number(req.user.id);

  let whereClause = {
    deletedAt: null,
    isActive: true,
    memberships: {
      some: {
        orgId,
        isActive: true,
      },
    },
  };

  if (!isForAssignment) {
    // Normal view: Get only teams this team leader is associated with
    const accessibleTeamIds = await getAccessibleTeamIds({
      orgId,
      userId,
      role: resolveUserRole(req.user, orgId),
    });

    if (accessibleTeamIds.length === 0) {
      return res.status(200).json({
        success: true,
        items: [],
        summary: [
          toSummaryItem("Total Users", 0),
          toSummaryItem("Active", 0),
        ],
        meta: { total: 0, limit },
      });
    }

    whereClause.OR = [
      { teamMemberships: { some: { teamId: { in: accessibleTeamIds } } } },
      { teamsLed: { some: { id: { in: accessibleTeamIds }, deletedAt: null } } },
    ];
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: userManagementSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const items = users
    .map((user) => mapUserForManagement(user, orgId))
    .filter((user) => user.role !== "SUPER_ADMIN" && user.role !== "ORG_ADMIN");


  res.status(200).json({
    success: true,
    items,
    summary: [
      toSummaryItem("Total Users", items.length),
      toSummaryItem("Active", items.filter((item) => item.active).length),
    ],
    meta: {
      total: items.length,
      limit,
    },
  });
});

exports.createTeamLeaderTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_CREATE, orgId);
  await assertWithinPlanTeamLimit({ orgId, res });

  const canAssignMembers = hasPermission(req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS, orgId);
  const name = truncateText(req.body?.name, 120);
  if (!name) {
    res.status(400);
    throw new Error("Team name is required");
  }

  const existing = await prisma.team.findFirst({
    where: {
      orgId,
      name,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (existing) {
    res.status(409);
    throw new Error("Team with this name already exists");
  }

  const description = truncateText(req.body?.description, 191);
  const radius = Number(req.body?.attendanceRadius || 25);
  if (!Number.isFinite(radius) || radius < 5 || radius > 1000) {
    res.status(400);
    throw new Error("attendanceRadius must be between 5 and 1000");
  }

  const coordinates = normalizeCoordinatesInput(req.body || {});
  const memberIds = canAssignMembers ? uniqueNumberList(req.body?.memberIds || []) : [];
  const requestedLeaderId =
    req.body?.leaderId === null || req.body?.leaderId === ""
      ? null
      : parseId(req.body?.leaderId);
  const leaderId =
    requestedLeaderId ||
    (resolveUserRole(req.user, orgId) === "TEAM_LEADER" ? Number(req.user.id) : null);

  await validateTeamAssignmentInputs({
    req,
    res,
    orgId,
    memberIds,
    leaderId,
  });

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      await reclaimSoftDeletedTeamName({
        tx,
        orgId,
        name,
      });

      const team = await tx.team.create({
        data: {
          orgId,
          name,
          description,
          attendanceRadius: Math.round(radius),
          leaderId,
          longitude: coordinates ? coordinates[0] : null,
          latitude: coordinates ? coordinates[1] : null,
          createdById: Number(req.user.id),
        },
        select: {
          id: true,
        },
      });

      if (memberIds.length > 0) {
        await tx.teamMember.createMany({
          data: memberIds.map((userId) => ({
            teamId: team.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.team.findUnique({
        where: { id: team.id },
        select: teamListSelect,
      });
    });
  } catch (error) {
    if (isTeamNameUniqueConstraintError(error)) {
      res.status(409);
      throw new Error("Team with this name already exists");
    }
    throw error;
  }

  res.status(201).json({
    success: true,
    message: "Team created successfully",
    item: mapTeamRecord(created),
  });
});

exports.patchTeamLeaderTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const teamId = parseId(req.params.teamId);
  if (!teamId) {
    res.status(400);
    throw new Error("Invalid team id");
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      leaderId: true,
      createdById: true,
    },
  });
  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  assertTeamMutationAccess({ req, res, team, orgId });

  const patchPermissionState = getTeamPatchPermissionState(req, orgId);
  if (!patchPermissionState.canUpdateTeam && !patchPermissionState.canPatchAttendanceOnly) {
    res.status(403);
    throw new Error("Missing required permission");
  }

  const payload = {};
  if (typeof req.body?.name === "string") {
    const name = truncateText(req.body.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("Team name cannot be empty");
    }
    payload.name = name;
  }
  if (typeof req.body?.description === "string") {
    payload.description = truncateText(req.body.description, 191);
  }
  if (req.body?.attendanceRadius !== undefined) {
    const radius = Number(req.body.attendanceRadius);
    if (!Number.isFinite(radius) || radius < 5 || radius > 1000) {
      res.status(400);
      throw new Error("attendanceRadius must be between 5 and 1000");
    }
    payload.attendanceRadius = Math.round(radius);
  }
  if (req.body?.isActive !== undefined) {
    const isActive = parseBoolean(req.body.isActive, null);
    if (isActive === null) {
      res.status(400);
      throw new Error("isActive must be boolean");
    }
    payload.isActive = isActive;
  }

  const coordinates = normalizeCoordinatesInput(req.body || {});
  if (coordinates) {
    payload.longitude = coordinates[0];
    payload.latitude = coordinates[1];
  }

  const hasMemberIds = Object.prototype.hasOwnProperty.call(req.body || {}, "memberIds");
  const hasLeaderId = Object.prototype.hasOwnProperty.call(req.body || {}, "leaderId");
  const memberIds = uniqueNumberList(req.body?.memberIds || []);
  const leaderId =
    req.body?.leaderId === null || req.body?.leaderId === ""
      ? null
      : parseId(req.body?.leaderId);

  if (
    (hasMemberIds || hasLeaderId) &&
    !hasPermission(req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS, orgId)
  ) {
    res.status(403);
    throw new Error("Missing required permission");
  }

  await validateTeamAssignmentInputs({
    req,
    res,
    orgId,
    memberIds: hasMemberIds ? memberIds : [],
    leaderId: hasLeaderId ? leaderId : null,
  });

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if (payload.name) {
        await reclaimSoftDeletedTeamName({
          tx,
          orgId,
          name: payload.name,
          excludeTeamId: teamId,
        });
      }

      await tx.team.update({
        where: { id: teamId },
        data: {
          ...payload,
          ...(hasLeaderId ? { leaderId } : {}),
        },
      });

      if (hasMemberIds) {
        await tx.teamMember.deleteMany({
          where: {
            teamId,
          },
        });
        if (memberIds.length > 0) {
          await tx.teamMember.createMany({
            data: memberIds.map((userId) => ({
              teamId,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.team.findUnique({
        where: { id: teamId },
        select: teamListSelect,
      });
    });
  } catch (error) {
    if (payload.name && isTeamNameUniqueConstraintError(error)) {
      res.status(409);
      throw new Error("Another team with this name already exists");
    }
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Team updated successfully",
    item: mapTeamRecord(updated),
  });
});

exports.deleteTeamLeaderTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_DELETE, orgId);
  const teamId = parseId(req.params.teamId);
  if (!teamId) {
    res.status(400);
    throw new Error("Invalid team id");
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      leaderId: true,
      createdById: true,
    },
  });
  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  assertTeamMutationAccess({ req, res, team, orgId });

  await prisma.$transaction(async (tx) => {
    await softDeleteTeamRecord({
      tx,
      teamId,
    });
  });

  res.status(200).json({
    success: true,
    message: "Team deleted successfully",
  });
});

exports.getTeamLeaderAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW, orgId);
  const limit = parseLimit(req.query.limit, 500, 2500);

  const accessibleTeams = await getAccessibleTeams({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });
  const accessibleTeamIds = accessibleTeams.map((team) => team.id);

  if (accessibleTeamIds.length === 0) {
    return res.status(200).json({
      success: true,
      items: [],
      summary: buildAttendanceSummary([]),
      meta: {
        teamName: null,
        total: 0,
      },
    });
  }

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
    teamIds: accessibleTeamIds,
  });

  const records = await prisma.attendance.findMany({
    where,
    select: attendanceRecordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const items = records.map(mapAttendanceRecord);
  res.status(200).json({
    success: true,
    items,
    summary: buildAttendanceSummary(items),
    meta: {
      teamName: accessibleTeams[0]?.name || null,
      total: items.length,
      limit,
    },
  });
});

exports.getTeamLeaderReports = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.REPORTS_VIEW, orgId);

  const to = todayKey();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 29);
  const from = dateKey(fromDate);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  if (accessibleTeamIds.length === 0) {
    return res.status(200).json({
      success: true,
      summary: [
        toSummaryItem("Members", 0),
        toSummaryItem("Present Days", 0),
        toSummaryItem("Absent Days", 0),
        toSummaryItem("Worked Hrs", 0),
      ],
      items: [],
      meta: {
        from,
        to,
      },
    });
  }

  const rangeFrom = String(req.query.from || from);
  const rangeTo = String(req.query.to || to);
  const { items, summary } = await buildAttendanceReport({
    orgId,
    rangeFrom,
    rangeTo,
    teamIds: accessibleTeamIds,
  });

  res.status(200).json({
    success: true,
    summary,
    items,
    meta: {
      from: rangeFrom,
      to: rangeTo,
      teamCount: accessibleTeamIds.length,
    },
  });
});

const getReportAccessMeta = (organization = null) => {
  const plan = organization?.plan || null;
  const restricted = isFreePlan({
    plan,
    subscriptionStatus: organization?.subscriptionStatus || "",
  });

  return {
    planName: plan?.name || "TRIAL",
    planCode: plan?.code || "",
    canDownload: !restricted,
    downloadRestrictedReason: restricted
      ? "Report downloads are available only on paid plans."
      : "",
  };
};

const assertReportDownloadAccess = ({ organization, res }) => {
  const accessMeta = getReportAccessMeta(organization);
  if (accessMeta.canDownload) return accessMeta;

  res.status(403);
  throw new Error(accessMeta.downloadRestrictedReason);
};

const resolveTeamLeaderReportRange = (req) => {
  const to = todayKey();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 29);
  const from = dateKey(fromDate);

  const rangeFrom = String(req.query.from || from);
  const rangeTo = String(req.query.to || to);
  const period = String(req.query.period || "custom").toLowerCase();

  let periodLabel = "Custom";
  if (period === "daily") periodLabel = "Daily";
  else if (period === "weekly") periodLabel = "Weekly";
  else if (period === "monthly") periodLabel = "Monthly";

  return {
    from: rangeFrom,
    to: rangeTo,
    period,
    periodLabel,
  };
};

const buildTeamLeaderPdfReportData = async ({ orgId, rangeFrom, rangeTo, teamIds }) => {
  const records = await prisma.attendance.findMany({
    where: {
      orgId,
      deletedAt: null,
      teamId: {
        in: teamIds,
      },
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
        select: {
          id: true,
          name: true,
          email: true,
          mobileCountryCode: true,
          mobile: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let presentEntries = 0;
  let absentEntries = 0;
  let totalWorkedMinutes = 0;
  let totalPresentMinutes = 0;

  const compareNames = (left, right) =>
    String(left || "").trim().toLowerCase().localeCompare(String(right || "").trim().toLowerCase());

  const toPdfContact = (user) => {
    const code = String(user?.mobileCountryCode || "").trim();
    const mobile = String(user?.mobile || "").trim();
    if (!code && !mobile) return "-";
    return `${code}${mobile}`;
  };

  const toPdfTime = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const sortedRecords = [...records].sort((left, right) => {
    if (String(left.date || "") !== String(right.date || "")) {
      return String(left.date || "").localeCompare(String(right.date || ""));
    }

    const nameComparison = compareNames(left.user?.name, right.user?.name);
    if (nameComparison !== 0) return nameComparison;

    return Number(left.userId || 0) - Number(right.userId || 0);
  });

  const rows = sortedRecords.map((record, index) => {
    const totalMinutesWorked = Number(record.totalMinutesWorked || 0);
    const isAbsent = String(record.status || "").toUpperCase() === "ABSENT";
    const presentMinutes = isAbsent ? 0 : totalMinutesWorked;

    if (isAbsent) absentEntries += 1;
    else presentEntries += 1;

    totalWorkedMinutes += totalMinutesWorked;
    totalPresentMinutes += presentMinutes;

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
    };
  });

  return {
    rows,
    summary: {
      totalRecords: records.length,
      presentEntries,
      absentEntries,
      totalWorkedMinutes,
      totalPresentMinutes,
    },
  };
};

const buildAttendanceExcelBuffer = ({
  organization,
  periodLabel,
  rangeFrom,
  rangeTo,
  summary,
  rows,
}) => {
  const columns = [
    { key: "entryNo", label: "No.", width: 42 },
    { key: "date", label: "Date", width: 80 },
    { key: "userId", label: "Member ID", width: 68 },
    { key: "userName", label: "Member Name", width: 120 },
    { key: "contact", label: "Contact", width: 92 },
    { key: "email", label: "Email", width: 132 },
    { key: "punchIn", label: "Punch In", width: 70 },
    { key: "punchOut", label: "Punch Out", width: 70 },
    { key: "totalHours", label: "Worked Hrs", width: 88 },
    { key: "presentHours", label: "Present Hrs", width: 96 },
    { key: "absent", label: "Is Absent", width: 64 },
  ];

  const infoLines = [
    `Organization: ${organization?.name || "Organization"} | Code: ${organization?.organizationCode || "-"}`,
    `Period: ${String(periodLabel || "Report").toUpperCase()} | Range: ${rangeFrom} to ${rangeTo}`,
    `Records: ${Number(summary?.totalRecords || 0)} | Present Entries: ${Number(summary?.presentEntries || 0)} | Absent Entries: ${Number(summary?.absentEntries || 0)}`,
    `Worked Hrs: ${formatHoursValue(summary?.totalWorkedMinutes || 0, { fromMinutes: true })} | Present Hrs: ${formatHoursValue(summary?.totalPresentMinutes || 0, { fromMinutes: true })}`,
  ];

  const sheetData = [
    ["ATTENDANCE REPORT"],
    ...infoLines.map((line) => [line]),
    [],
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => row?.[column.key] ?? "-")),
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
  const lastColumnIndex = Math.max(columns.length - 1, 0);
  const lastColumnLabel = xlsx.utils.encode_col(lastColumnIndex);
  const headerRowNumber = infoLines.length + 3;

  worksheet["!cols"] = columns.map((column) => ({
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
  xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
};

exports.downloadTeamLeaderReportsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.REPORTS_DOWNLOAD, orgId);
  const range = resolveTeamLeaderReportRange(req);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  if (accessibleTeamIds.length === 0) {
    res.status(400);
    throw new Error("No teams assigned to this account.");
  }

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildTeamLeaderPdfReportData({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
      teamIds: accessibleTeamIds,
    }),
  ]);

  assertReportDownloadAccess({ organization, res });

  const pdfBuffer = await buildAttendanceDetailedPdf({
    organizationName: organization?.name || "Organization",
    organizationCode: organization?.organizationCode || "",
    periodLabel: String(range.periodLabel || "Report").toUpperCase(),
    rangeFrom: range.from,
    rangeTo: range.to,
    summary: reportData.summary,
    rows: reportData.rows,
  });

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-report-${safePeriod}-${range.from}-to-${range.to}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadTeamLeaderReportsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.REPORTS_DOWNLOAD, orgId);
  const range = resolveTeamLeaderReportRange(req);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  if (accessibleTeamIds.length === 0) {
    res.status(400);
    throw new Error("No teams assigned to this account.");
  }

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildTeamLeaderPdfReportData({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
      teamIds: accessibleTeamIds,
    }),
  ]);

  assertReportDownloadAccess({ organization, res });

  const excelBuffer = buildAttendanceExcelBuffer({
    organization,
    periodLabel: range.periodLabel,
    rangeFrom: range.from,
    rangeTo: range.to,
    summary: reportData.summary,
    rows: reportData.rows,
  });

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-report-${safePeriod}-${range.from}-to-${range.to}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.status(200).send(excelBuffer);
});
