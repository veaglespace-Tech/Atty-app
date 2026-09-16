const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");

const {
  ensureOrganizationId,
  parseId,
  parseLimit,
  parseBoolean,
  uniqueNumberList,
  truncateText,
} = require("../services/common.service");
const {
  assertPermission,
} = require("../services/access.service");
const { getTeamViewCondition, canViewTeam } = require("../policies");
const { normalizeCoordinatesInput } = require("../services/location.service");
const { mapTeamRecord, buildTeamSummary } = require("../services/team-query.service");
const {
  reclaimSoftDeletedTeamName,
  softDeleteTeamRecord,
  isTeamNameUniqueConstraintError,
} = require("../services/team-name.service");
const {
  teamDetailSelect,
  teamListSelect,
  organizationSubscriptionSelect,
} = require("../services/prisma-selects.service");
const { PERMISSIONS, hasPermission } = require("../constants/permissions");
const { assertWithinPlanTeamLimit } = require("../services/organization-plan.service");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const { buildExportWorkbookBuffer } = require("../utils/excel-report");
const { todayKey } = require("../services/common.service");

const ensureOrgTeam = async ({ req, res, teamId }) => {
  const orgId = ensureOrganizationId(req, res);
  const team = await prisma.team.findFirst({
    where: {
      id: Number(teamId),
      orgId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  return { orgId, team };
};

const normalizeTeamPayload = ({ req, res, allowMemberEdits = false }) => {
  const payload = {};
  const hasMemberIds = Object.prototype.hasOwnProperty.call(req.body || {}, "memberIds");
  const hasLeaderId = Object.prototype.hasOwnProperty.call(req.body || {}, "leaderId");
  const hasSubLeaderId = Object.prototype.hasOwnProperty.call(req.body || {}, "subLeaderId");

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
      throw new Error("Attendance radius must be between 5 and 1000");
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

  if (!allowMemberEdits && (hasMemberIds || hasLeaderId || hasSubLeaderId)) {
    res.status(403);
    throw new Error("You do not have permission to assign leaders/members");
  }

  return {
    payload,
    hasMemberIds,
    hasLeaderId,
    memberIds: uniqueNumberList(req.body?.memberIds || []),
    leaderId:
      req.body?.leaderId === null || req.body?.leaderId === ""
        ? null
        : parseId(req.body?.leaderId),
    subLeaderId:
      req.body?.subLeaderId === null || req.body?.subLeaderId === ""
        ? null
        : parseId(req.body?.subLeaderId),
    hasSubLeaderId,
  };
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

  return {
    canUpdateTeam,
    canManageAttendance,
    hasMemberIds,
    hasLeaderId,
    hasBasicTeamFields,
    hasAttendanceFields,
    canPatchAttendanceOnly:
      !canUpdateTeam &&
      canManageAttendance &&
      hasAttendanceFields &&
      !hasBasicTeamFields &&
      !hasMemberIds &&
      !hasLeaderId,
  };
};

exports.getOrgTeams = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  
  const abacCondition = getTeamViewCondition(req.user, orgId);
  if (!abacCondition) {
    res.status(403);
    throw new Error("Missing required permission to view teams");
  }

  const limit = parseLimit(req.query.limit, 300, 2000);

  const teams = await prisma.team.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...abacCondition,
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

exports.getOrgTeamById = asyncHandler(async (req, res) => {
  const { team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  
  const orgId = team.orgId || ensureOrganizationId(req, res);
  if (!(await canViewTeam(req.user, team.id, orgId))) {
    res.status(403);
    throw new Error("Missing required permission to view this team");
  }

  const fullTeam = await prisma.team.findUnique({
    where: { id: team.id },
    select: teamDetailSelect,
  });

  res.status(200).json({
    success: true,
    item: mapTeamRecord(fullTeam),
  });
});

exports.getOrgTeamMembers = asyncHandler(async (req, res) => {
  const { orgId, team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  
  if (!(await canViewTeam(req.user, team.id, orgId))) {
    res.status(403);
    throw new Error("Missing required permission to view members of this team");
  }

  const members = await prisma.teamMember.findMany({
    where: {
      teamId: team.id,
      user: {
        deletedAt: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          memberships: {
            select: {
              orgId: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const items = members
    .map((entry) => ({
      teamMemberId: entry.id,
      userId: entry.userId,
      name: entry.user?.name || "",
      email: entry.user?.email || "",
      role: resolveUserRole(entry.user, orgId) || "",
      isActive: Boolean(entry.user?.isActive),
      addedAt: entry.createdAt,
    }))
    .sort((left, right) => {
      const leftName = String(left.name || "").trim().toLowerCase();
      const rightName = String(right.name || "").trim().toLowerCase();
      if (leftName !== rightName) return leftName.localeCompare(rightName);
      return Number(left.userId || 0) - Number(right.userId || 0);
    });

  res.status(200).json({
    success: true,
    items,
  });
});

exports.createOrgTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSIONS.TEAM.CREATE, orgId);
  await assertWithinPlanTeamLimit({ orgId, res });

  const canAssignMembers = (() => {
    try {
      assertPermission(res, req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId);
      return true;
    } catch (_) {
      return false;
    }
  })();

  const { payload, memberIds, leaderId } = normalizeTeamPayload({
    req,
    res,
    allowMemberEdits: canAssignMembers,
  });

  if (!payload.name) {
    res.status(400);
    throw new Error("Team name is required");
  }

  payload.orgId = orgId;
  payload.createdById = Number(req.user.id);
  if (leaderId) {
    payload.leaderId = leaderId;
  }
  if (req.body.subLeaderId) {
    payload.subLeaderId = parseId(req.body.subLeaderId);
  }

  if (payload.name) {
    const conflict = await prisma.team.findFirst({
      where: {
        orgId,
        name: payload.name,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (conflict) {
      res.status(409);
      throw new Error("Team with this name already exists");
    }
  }

  // Final check for leader existence and org membership (if provided)
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
       select: { id: true }
     });
     if (!leader) {
       res.status(400);
       throw new Error("Invalid leader selected");
     }
  }

  if (payload.subLeaderId) {
     const subLeader = await prisma.user.findFirst({
       where: {
         id: payload.subLeaderId,
         deletedAt: null,
         memberships: {
           some: {
             orgId,
             isActive: true,
           },
         },
       },
       select: { id: true }
     });
     if (!subLeader) {
       res.status(400);
       throw new Error("Invalid sub-leader selected");
     }
  }

  let team;
  try {
    team = await prisma.$transaction(async (tx) => {
      await reclaimSoftDeletedTeamName({
        tx,
        orgId,
        name: payload.name,
      });

      const createdTeam = await tx.team.create({
        data: payload,
      });

      if (canAssignMembers && memberIds.length > 0) {
        await tx.teamMember.createMany({
          data: memberIds.map((uid) => ({
            teamId: createdTeam.id,
            userId: uid,
          })),
          skipDuplicates: true,
        });
      }

      return createdTeam;
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
    item: {
        id: team.id,
        name: team.name
    }
  });
});

exports.patchOrgTeam = asyncHandler(async (req, res) => {
  const { orgId, team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  const patchPermissionState = getTeamPatchPermissionState(req, orgId);

  if (!patchPermissionState.canUpdateTeam && !patchPermissionState.canPatchAttendanceOnly) {
    res.status(403);
    throw new Error("Missing required permission");
  }

  const canAssignMembers =
    patchPermissionState.canUpdateTeam &&
    hasPermission(req.user, PERMISSIONS.TEAM.ASSIGN_MEMBERS, orgId);

  const { payload, memberIds, leaderId, subLeaderId, hasMemberIds, hasLeaderId, hasSubLeaderId } =
    normalizeTeamPayload({
      req,
      res,
      allowMemberEdits: canAssignMembers,
    });

  if (payload.name) {
    const conflict = await prisma.team.findFirst({
      where: {
        orgId,
        name: payload.name,
        id: { not: team.id },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (conflict) {
      res.status(409);
      throw new Error("Another team with this name already exists");
    }
  }

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
      select: { id: true }
    });
    if (!leader) {
      res.status(400);
      throw new Error("Invalid leader selected");
    }
    payload.leaderId = leaderId;
  } else if (hasLeaderId && leaderId === null) {
    payload.leaderId = null;
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
      select: { id: true }
    });
    if (!subLeader) {
      res.status(400);
      throw new Error("Invalid sub-leader selected");
    }
    payload.subLeaderId = subLeaderId;
  } else if (hasSubLeaderId && subLeaderId === null) {
    payload.subLeaderId = null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (payload.name) {
        await reclaimSoftDeletedTeamName({
          tx,
          orgId,
          name: payload.name,
          excludeTeamId: team.id,
        });
      }

      if (Object.keys(payload).length > 0) {
        await tx.team.update({
          where: { id: team.id },
          data: payload,
        });
      }

      if (hasMemberIds && canAssignMembers) {
        await tx.teamMember.deleteMany({
          where: { teamId: team.id },
        });

        if (memberIds.length > 0) {
          await tx.teamMember.createMany({
            data: memberIds.map((uid) => ({
              teamId: team.id,
              userId: uid,
            })),
          });
        }
      }
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
  });
});

exports.deleteOrgTeam = asyncHandler(async (req, res) => {
  const { team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  assertPermission(res, req.user, PERMISSIONS.TEAM.DELETE, ensureOrganizationId(req, res));

  await prisma.$transaction(async (tx) => {
    await softDeleteTeamRecord({
      tx,
      teamId: team.id,
    });
  });

  res.status(200).json({
    success: true,
    message: "Team deleted successfully",
  });
});

const getOrgTeamsPayload = async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const abacCondition = getTeamViewCondition(req.user, orgId);
  if (!abacCondition) {
    res.status(403);
    throw new Error("Missing required permission to view teams");
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const whereClause = {
    orgId,
    deletedAt: null,
    ...abacCondition,
  };

  if (req.query.teamId) {
    whereClause.id = Number(req.query.teamId);
  }

  const teams = await prisma.team.findMany({
    where: whereClause,
    select: teamDetailSelect,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: 10000,
  });

  const items = teams.map(mapTeamRecord);
  const summary = buildTeamSummary(items);
  const summaryCards = summary.map((s) => ({ label: s.label, value: s.value }));

  return { orgId, org, items, summaryCards };
};

exports.downloadOrgTeamsPdf = asyncHandler(async (req, res) => {
  const payload = await getOrgTeamsPayload(req, res);

  const subtitleLines = [
    `Organization: ${payload.org?.name || "Org"} (${payload.org?.organizationCode || "ORG"})`,
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

  const safeName = String(payload.org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-details-${safeName}-${todayKey()}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadOrgTeamsExcel = asyncHandler(async (req, res) => {
  const payload = await getOrgTeamsPayload(req, res);

  const subtitleLines = [
    `Organization: ${payload.org?.name || "Org"} (${payload.org?.organizationCode || "ORG"})`,
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

  const safeName = String(payload.org?.name || "org").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `team-details-${safeName}-${todayKey()}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});
