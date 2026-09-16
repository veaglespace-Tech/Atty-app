const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { PERMISSIONS, hasPermission, resolveUserPermissions } = require("../constants/permissions");
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
  formatReportLocation,
  toPdfTime,
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
const { buildAttendanceDetailedPdf, buildGenericTablePdf } = require("../utils/pdf-report");
const { buildExportWorkbookBuffer } = require("../utils/excel-report");
const xlsx = require("xlsx");

const MODULES = [
  {
    key: "TEAMS",
    label: "Teams",
    path: "/team-leader/teams",
    permission: PERMISSIONS.TEAM.VIEW_OWN,
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    path: "/team-leader/attendance",
    permission: PERMISSIONS.ATTENDANCE.VIEW_TEAM,
  },
  {
    key: "REPORTS",
    label: "Reports",
    path: "/team-leader/reports",
    permission: PERMISSIONS.REPORTS.VIEW,
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
  const canUpdateTeam = hasPermission(req.user, PERMISSIONS.TEAM.UPDATE, orgId);
  const canManageAttendance = hasPermission(req.user, PERMISSIONS.ATTENDANCE.MANAGE, orgId);
  const canSetLocation = hasPermission(req.user, PERMISSIONS.LOCATION.MANAGE, orgId);
  const canAssignMembers = hasPermission(req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId);

  return {
    canUpdateTeam,
    hasMemberIds,
    hasLeaderId,
    canPatchAttendanceOnly:
      !canUpdateTeam &&
      (canManageAttendance || canSetLocation) &&
      hasAttendanceFields &&
      !hasMemberIds &&
      !hasLeaderId &&
      !Object.prototype.hasOwnProperty.call(body, "subLeaderId"),
    canPatchAssignmentOnly:
      !canUpdateTeam &&
      canAssignMembers &&
      (hasMemberIds || hasLeaderId || Object.prototype.hasOwnProperty.call(body, "subLeaderId")) &&
      !hasBasicTeamFields &&
      !hasAttendanceFields,
  };
};

const validateTeamAssignmentInputs = async ({
  req,
  res,
  orgId,
  memberIds,
  leaderId,
  subLeaderId,
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
  }

  if (subLeaderId) {
    const subLeader = await prisma.user.findFirst({
      where: {
        id: subLeaderId,
        deletedAt: null,
        memberships: {
          some: {
            orgId,
            isActive: true,
          },
        },
      },
      select: { id: true },
    });
    if (!subLeader) {
      res.status(404);
      throw new Error("Sub-Leader not found in organization");
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
        toSummaryItem("Granted Permissions", resolveUserPermissions(req.user, orgId).length),
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
      toSummaryItem("Granted Permissions", resolveUserPermissions(req.user, orgId).length),
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
    assertPermission(res, req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId);
  } else {
    assertPermission(res, req.user, PERMISSIONS.USERS.VIEW, orgId);
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

const getTeamLeaderUsersPayload = async (req, res, orgId) => {
  const userId = Number(req.user.id);
  
  let accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId,
    role: resolveUserRole(req.user, orgId),
  });

  if (req.query.teamId) {
    const requestedTeamId = Number(req.query.teamId);
    if (!accessibleTeamIds.includes(requestedTeamId)) {
      return { items: [], summaryCards: [] };
    }
    accessibleTeamIds = [requestedTeamId];
  }

  if (accessibleTeamIds.length === 0) {
    return { items: [], summaryCards: [] };
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      memberships: {
        some: {
          orgId,
          isActive: true,
        },
      },
      OR: [
        { teamMemberships: { some: { teamId: { in: accessibleTeamIds } } } },
        { teamsLed: { some: { id: { in: accessibleTeamIds }, deletedAt: null } } },
      ],
    },
    select: userManagementSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: 10000,
  });

  const items = users
    .map((user) => mapUserForManagement(user, orgId))
    .filter((user) => user.role !== "SUPER_ADMIN")
    .map((item, index) => ({
      entryNo: String(index + 1),
      id: item.id,
      name: item.name || "-",
      email: item.email || "-",
      mobile: item.mobile || "-",
      role: item.role || "MEMBER",
      status: item.active ? "Active" : "Inactive",
      joinDate: item.createdAt ? dateKey(item.createdAt) : "-",
    }));

  const summaryCards = [
    { label: "Total Team Users", value: items.length },
    { label: "Active", value: items.filter(u => u.status === "Active").length },
    { label: "Inactive", value: items.filter(u => u.status === "Inactive").length },
  ];

  return { items, summaryCards };
};

exports.downloadTeamLeaderUsersPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.USERS.VIEW, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const payload = await getTeamLeaderUsersPayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Generated: ${todayKey()}`,
  ];

  const pdfBuffer = await buildGenericTablePdf({
    title: "TEAM MEMBERS DETAILS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 25, align: "left" },
      { key: "name", label: "Name", width: 100 },
      { key: "email", label: "Email", width: 130 },
      { key: "mobile", label: "Mobile", width: 80 },
      { key: "role", label: "Role", width: 70 },
      { key: "status", label: "Status", width: 50, align: "center" },
      { key: "joinDate", label: "Joined", width: 60, align: "center" },
    ],
    rows: payload.items.map(i => ({ ...i, entryNo: i.entryNo.padStart(3, "0") })),
    size: "A4",
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-users-${safeName}-${todayKey()}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadTeamLeaderUsersExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.USERS.VIEW, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const payload = await getTeamLeaderUsersPayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Generated: ${todayKey()}`,
  ];

  const excelBuffer = buildExportWorkbookBuffer({
    title: "TEAM MEMBERS DETAILS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 40 },
      { key: "name", label: "Name", width: 150 },
      { key: "email", label: "Email", width: 200 },
      { key: "mobile", label: "Mobile", width: 120 },
      { key: "role", label: "Role", width: 100 },
      { key: "status", label: "Status", width: 80 },
      { key: "joinDate", label: "Joined Date", width: 100 },
    ],
    rows: payload.items,
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-users-${safeName}-${todayKey()}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});

exports.createTeamLeaderTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.TEAM.CREATE, orgId);
  await assertWithinPlanTeamLimit({ orgId, res });

  const canAssignMembers = hasPermission(req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId);
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
    (resolveUserRole(req.user, orgId) === "TEAM_LEADER" || resolveUserRole(req.user, orgId) === "SUB_TEAM_LEADER" ? Number(req.user.id) : null);

  const subLeaderId =
    req.body?.subLeaderId === null || req.body?.subLeaderId === ""
      ? null
      : parseId(req.body?.subLeaderId);

  await validateTeamAssignmentInputs({
    req,
    res,
    orgId,
    memberIds,
    leaderId,
    subLeaderId,
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
          subLeaderId,
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
  if (
    !patchPermissionState.canUpdateTeam &&
    !patchPermissionState.canPatchAttendanceOnly &&
    !patchPermissionState.canPatchAssignmentOnly
  ) {
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
  const hasSubLeaderId = Object.prototype.hasOwnProperty.call(req.body || {}, "subLeaderId");
  const memberIds = uniqueNumberList(req.body?.memberIds || []);
  const leaderId =
    req.body?.leaderId === null || req.body?.leaderId === ""
      ? null
      : parseId(req.body?.leaderId);
  const subLeaderId =
    req.body?.subLeaderId === null || req.body?.subLeaderId === ""
      ? null
      : parseId(req.body?.subLeaderId);

  if (
    (hasMemberIds || hasLeaderId || hasSubLeaderId) &&
    !hasPermission(req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId)
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
    subLeaderId: hasSubLeaderId ? subLeaderId : null,
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
          ...(hasSubLeaderId ? { subLeaderId } : {}),
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
  assertPermission(res, req.user, PERMISSIONS.TEAM.DELETE, orgId);
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
  assertPermission(res, req.user, PERMISSIONS.ATTENDANCE.VIEW_TEAM, orgId);
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

  const targetTeamId = req.query.teamId ? Number(req.query.teamId) : null;
  const filteredTeamIds = targetTeamId && accessibleTeamIds.includes(targetTeamId) 
    ? [targetTeamId] 
    : accessibleTeamIds;

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
    teamIds: filteredTeamIds,
  });

  const records = await prisma.attendance.findMany({
    where,
    select: attendanceRecordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  let items = records.map(mapAttendanceRecord);
  const statusFilter = String(req.query.status || "").toUpperCase();
  if (statusFilter && statusFilter !== "ALL" && statusFilter !== "ABSENT") {
    items = items.filter((item) => item.status === statusFilter);
  } else if (statusFilter === "ABSENT") {
    items = items.filter((item) => item.status === "ABSENT");
  }

  res.status(200).json({
    success: true,
    items: items.slice(0, limit),
    summary: buildAttendanceSummary(items),
    meta: {
      teamName: accessibleTeams[0]?.name || null,
      total: items.length,
      limit,
    },
  });
});

const getTeamLeaderAttendancePayload = async (req, res, orgId) => {
  const accessibleTeams = await getAccessibleTeams({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });
  const accessibleTeamIds = accessibleTeams.map((team) => team.id);

  if (accessibleTeamIds.length === 0) {
    return { items: [], summary: [], meta: { periodLabel: req.query.period, from: req.query.from, to: req.query.to } };
  }

  const targetTeamId = req.query.teamId ? Number(req.query.teamId) : null;
  const filteredTeamIds = targetTeamId && accessibleTeamIds.includes(targetTeamId) 
    ? [targetTeamId] 
    : accessibleTeamIds;

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
    teamIds: filteredTeamIds,
  });

  const records = await prisma.attendance.findMany({
    where,
    select: attendanceRecordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 10000,
  });

  let items = records.map(mapAttendanceRecord);
  const statusFilter = String(req.query.status || "").toUpperCase();
  if (statusFilter && statusFilter !== "ALL" && statusFilter !== "ABSENT") {
    items = items.filter((item) => item.status === statusFilter);
  } else if (statusFilter === "ABSENT") {
    items = items.filter((item) => item.status === "ABSENT");
  }

  const summary = buildAttendanceSummary(items);
  const summaryCards = summary.map(s => ({ label: s.label, value: s.value }));
  
  let periodLabel = "Monthly";
  if (req.query.period === "daily") periodLabel = "Daily";
  if (req.query.period === "weekly") periodLabel = "Weekly";
  if (req.query.period === "yearly") periodLabel = "Yearly";
  if (req.query.period === "all") periodLabel = "All Time";
  if (req.query.period === "custom") periodLabel = "Custom";

  return {
    items,
    summaryCards,
    meta: {
      periodLabel,
      from: req.query.from || todayKey(),
      to: req.query.to || todayKey(),
    }
  };
};

exports.downloadTeamLeaderAttendancePdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.ATTENDANCE.VIEW_TEAM, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true }
  });

  const payload = await getTeamLeaderAttendancePayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Period: ${payload.meta.periodLabel} (${payload.meta.from} to ${payload.meta.to})`,
  ];

  const pdfBuffer = await buildGenericTablePdf({
    title: "TEAM ATTENDANCE LOGS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 30, align: "left" },
      { key: "user", label: "Member", width: 80 },
      { key: "role", label: "Role", width: 55 },
      { key: "department", label: "Department", width: 65 },
      { key: "existingMember", label: "Type", width: 50 },
      { key: "date", label: "Date", width: 55 },
      { key: "status", label: "Status", width: 55, align: "center" },
      { key: "punchIn", label: "Punch In", width: 50, align: "center" },
      { key: "punchOut", label: "Punch Out", width: 50, align: "center" },
      { key: "overtime", label: "Overtime", width: 60, align: "center" },
      { key: "workedHoursLabel", label: "Worked Hrs", width: 60, align: "center" },
    ],
    rows: payload.items.map((item, index) => {
      const statusUpper = String(item.status || "").toUpperCase();
      return {
        entryNo: String(index + 1).padStart(3, "0"),
        user: item.member || "-",
        role: item.role || "MEMBER",
        department: item.department || "Unassigned",
        existingMember: item.existingMember || "-",
        date: item.date,
        status: item.status,
        punchIn: item.punchInAt ? toPdfTime(item.punchInAt) : "-",
        punchOut: item.punchOutAt ? toPdfTime(item.punchOutAt) : "-",
        overtime: statusUpper === "OVERTIME" ? "YES" : "NO",
        workedHoursLabel: item.workedHours.toFixed(2),
      };
    }),
    size: "A4",
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-logs-${safeName}-${payload.meta.from}-to-${payload.meta.to}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadTeamLeaderAttendanceExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.ATTENDANCE.VIEW_TEAM, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true }
  });

  const payload = await getTeamLeaderAttendancePayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Period: ${payload.meta.periodLabel} (${payload.meta.from} to ${payload.meta.to})`,
  ];

  const excelBuffer = buildExportWorkbookBuffer({
    title: "TEAM ATTENDANCE LOGS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 40 },
      { key: "user", label: "Member", width: 120 },
      { key: "role", label: "Role", width: 90 },
      { key: "department", label: "Department", width: 100 },
      { key: "existingMember", label: "Member Type", width: 90 },
      { key: "date", label: "Date", width: 85 },
      { key: "status", label: "Status", width: 80 },
      { key: "punchIn", label: "Punch In", width: 80 },
      { key: "punchOut", label: "Punch Out", width: 80 },
      { key: "overtime", label: "Overtime", width: 80 },
      { key: "workedHoursLabel", label: "Worked Hrs", width: 80 },
    ],
    rows: payload.items.map((item, index) => {
      const statusUpper = String(item.status || "").toUpperCase();
      return {
        entryNo: String(index + 1),
        user: item.member || "-",
        role: item.role || "MEMBER",
        department: item.department || "Unassigned",
        existingMember: item.existingMember || "-",
        date: item.date,
        status: item.status,
        punchIn: item.punchInAt ? toPdfTime(item.punchInAt) : "-",
        punchOut: item.punchOutAt ? toPdfTime(item.punchOutAt) : "-",
        overtime: statusUpper === "OVERTIME" ? "YES" : "NO",
        workedHoursLabel: item.workedHours.toFixed(2),
      };
    }),
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-logs-${safeName}-${payload.meta.from}-to-${payload.meta.to}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});

exports.getTeamLeaderReports = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.REPORTS.VIEW, orgId);

  const to = todayKey();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 29);
  const from = dateKey(fromDate);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  const targetTeamId = req.query.teamId ? Number(req.query.teamId) : null;
  const filteredTeamIds = targetTeamId && accessibleTeamIds.includes(targetTeamId) 
    ? [targetTeamId] 
    : accessibleTeamIds;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { plan: true },
  });
  const accessMeta = getReportAccessMeta(org);

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
        ...accessMeta,
      },
    });
  }

  const rangeFrom = String(req.query.from || from);
  const rangeTo = String(req.query.to || to);
  const { items, summary } = await buildAttendanceReport({
    orgId,
    rangeFrom,
    rangeTo,
    teamIds: filteredTeamIds,
  });

  res.status(200).json({
    success: true,
    summary,
    items,
    meta: {
      from: rangeFrom,
      to: rangeTo,
      teamCount: filteredTeamIds.length,
      ...accessMeta,
    },
  });
});

function getReportAccessMeta(organization = null) {
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
}

function assertReportDownloadAccess({ organization, res }) {
  const accessMeta = getReportAccessMeta(organization);
  if (accessMeta.canDownload) return accessMeta;

  res.status(403);
  throw new Error(accessMeta.downloadRestrictedReason);
}

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

exports.downloadTeamLeaderReportsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.REPORTS.DOWNLOAD, orgId);
  const range = resolveTeamLeaderReportRange(req);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  const targetTeamId = req.query.teamId ? Number(req.query.teamId) : null;
  const filteredTeamIds = targetTeamId && accessibleTeamIds.includes(targetTeamId) 
    ? [targetTeamId] 
    : accessibleTeamIds;

  if (filteredTeamIds.length === 0) {
    res.status(400);
    throw new Error("No teams assigned to this account.");
  }

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildAttendanceReport({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
      teamIds: filteredTeamIds,
    }),
  ]);

  assertReportDownloadAccess({ organization, res });

  const { buildGenericTablePdf } = require("../utils/pdf-report");

  const pdfBuffer = await buildGenericTablePdf({
    title: "TEAM REPORTS",
    subtitleLines: [
      `Organization: ${organization?.name || "Organization"} | Code: ${organization?.organizationCode || "-"}`,
      `Period: ${String(range.periodLabel || "Report").toUpperCase()} | Range: ${range.from} to ${range.to}`,
    ],
    summaryCards: reportData.summary.map(s => ({ label: s.label, value: s.value })),
    columns: [
      { key: "member", label: "Name", width: 140 },
      { key: "id", label: "ID", width: 60 },
      { key: "department", label: "Department", width: 90 },
      { key: "existingMember", label: "Employee Type", width: 90 },
      { key: "presentDays", label: "Present", width: 60 },
      { key: "regularizedDays", label: "Regularized", width: 60 },
      { key: "halfDays", label: "Half Day", width: 60 },
      { key: "absentDays", label: "Absent", width: 60 },
      { key: "overtimeDays", label: "Overtime", width: 60 },
      { key: "workedHours", label: "Worked Hrs", width: 80 },
    ],
    rows: reportData.items,
  });

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-report-${safePeriod}-${range.from}-to-${range.to}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadTeamLeaderReportsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.REPORTS.DOWNLOAD, orgId);
  const range = resolveTeamLeaderReportRange(req);

  const accessibleTeamIds = await getAccessibleTeamIds({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  const targetTeamId = req.query.teamId ? Number(req.query.teamId) : null;
  const filteredTeamIds = targetTeamId && accessibleTeamIds.includes(targetTeamId) 
    ? [targetTeamId] 
    : accessibleTeamIds;

  if (filteredTeamIds.length === 0) {
    res.status(400);
    throw new Error("No teams assigned to this account.");
  }

  const [organization, reportData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: organizationSubscriptionSelect,
    }),
    buildAttendanceReport({
      orgId,
      rangeFrom: range.from,
      rangeTo: range.to,
      teamIds: filteredTeamIds,
    }),
  ]);

  assertReportDownloadAccess({ organization, res });

  const { buildAttendanceExcelBuffer } = require("./org-dashboard.controller");

  const excelBuffer = buildAttendanceExcelBuffer({
    organization,
    periodLabel: range.periodLabel,
    rangeFrom: range.from,
    rangeTo: range.to,
    summary: reportData.summary,
    rows: reportData.items,
  });

  const safePeriod = String(range.period || "report").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-attendance-report-${safePeriod}-${range.from}-to-${range.to}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.status(200).send(excelBuffer);
});

const getTeamLeaderTeamsPayload = async (req, res, orgId) => {
  const accessibleTeams = await getAccessibleTeams({
    orgId,
    userId: Number(req.user.id),
    role: resolveUserRole(req.user, orgId),
  });

  let teamIds = accessibleTeams.map((team) => team.id);
  
  if (req.query.teamId) {
    const requestedTeamId = Number(req.query.teamId);
    if (!teamIds.includes(requestedTeamId)) {
      return { items: [], summaryCards: [] };
    }
    teamIds = [requestedTeamId];
  }

  if (teamIds.length === 0) {
    return { items: [], summaryCards: [] };
  }

  const teams = await prisma.team.findMany({
    where: {
      id: { in: teamIds },
      orgId,
      deletedAt: null,
    },
    select: teamDetailSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: 10000,
  });

  const items = teams.map(mapTeamRecord);
  const summary = buildTeamSummary(items);
  const summaryCards = summary.map((s) => ({ label: s.label, value: s.value }));

  return { items, summaryCards };
};

exports.downloadTeamLeaderTeamsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.TEAM.VIEW_OWN, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const payload = await getTeamLeaderTeamsPayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Generated: ${todayKey()}`,
  ];

  const pdfBuffer = await buildGenericTablePdf({
    title: "TEAM DETAILS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 25, align: "left" },
      { key: "name", label: "Team Name", width: 90 },
      { key: "leader", label: "Leader", width: 80 },
      { key: "subLeader", label: "Sub Leader", width: 80 },
      { key: "memberCount", label: "Members", width: 45, align: "center" },
      { key: "memberNames", label: "Member Names", width: 130 },
      { key: "status", label: "Status", width: 45, align: "center" },
      { key: "radius", label: "Radius", width: 40, align: "center" },
    ],
    rows: payload.items.map((item, index) => ({
      entryNo: String(index + 1).padStart(3, "0"),
      name: item.name || "-",
      leader: item.leaderName || "-",
      subLeader: item.subLeaderName || "-",
      memberCount: String(item.memberCount || 0),
      memberNames: (item.memberNames || []).join(", ") || "-",
      status: item.isActive ? "Active" : "Inactive",
      radius: String(item.attendanceRadius || 25) + "m",
    })),
    size: "A4",
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-details-${safeName}-${todayKey()}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadTeamLeaderTeamsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.TEAM.VIEW_OWN, orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const payload = await getTeamLeaderTeamsPayload(req, res, orgId);

  const subtitleLines = [
    `Organization: ${org?.name || "Org"} (${org?.organizationCode || "ORG"})`,
    `Generated: ${todayKey()}`,
  ];

  const excelBuffer = buildExportWorkbookBuffer({
    title: "TEAM DETAILS",
    subtitleLines,
    summaryCards: payload.summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 40 },
      { key: "name", label: "Team Name", width: 120 },
      { key: "leader", label: "Leader", width: 100 },
      { key: "subLeader", label: "Sub Leader", width: 100 },
      { key: "memberCount", label: "Members", width: 60 },
      { key: "memberNames", label: "Member Names", width: 200 },
      { key: "status", label: "Status", width: 70 },
      { key: "radius", label: "Radius (m)", width: 70 },
      { key: "description", label: "Description", width: 150 },
    ],
    rows: payload.items.map((item, index) => ({
      entryNo: String(index + 1),
      name: item.name || "-",
      leader: item.leaderName || "-",
      subLeader: item.subLeaderName || "-",
      memberCount: String(item.memberCount || 0),
      memberNames: (item.memberNames || []).join(", ") || "-",
      status: item.isActive ? "Active" : "Inactive",
      radius: String(item.attendanceRadius || 25),
      description: item.description || "-",
    })),
  });

  const safeName = String(org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-details-${safeName}-${todayKey()}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});
