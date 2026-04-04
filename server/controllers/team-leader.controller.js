const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { PERMISSION_KEYS, hasPermission } = require("../constants/permissions");
const { resolveUserRole } = require("../utils/membership");
const {
  ensureOrganizationId,
  parseId,
  parseLimit,
  toSummaryItem,
  uniqueNumberList,
  todayKey,
  truncateText,
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
} = require("../services/prisma-selects.service");
const { assertWithinPlanTeamLimit } = require("../services/organization-plan.service");

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

exports.getTeamLeaderUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW, orgId);
  const limit = parseLimit(req.query.limit, 500, 2000);

  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          orgId,
          isActive: true,
        },
      },
      deletedAt: null,
      isActive: true,
    },
    select: userManagementSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const items = users
    .map((user) => mapUserForManagement(user, orgId))
    .filter((user) => user.role !== "SUPER_ADMIN");
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
    payload.isActive = Boolean(req.body.isActive);
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
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().split("T")[0];

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
        toSummaryItem("Worked Hours", 0),
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
