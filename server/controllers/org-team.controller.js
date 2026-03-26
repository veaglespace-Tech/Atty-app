const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

const {
  ensureOrganizationId,
  parseId,
  parseLimit,
  uniqueNumberList,
  truncateText,
} = require("../services/common.service");
const {
  assertPermission,
} = require("../services/access.service");
const { normalizeCoordinatesInput } = require("../services/location.service");
const { mapTeamRecord, buildTeamSummary } = require("../services/team-query.service");
const {
  teamListSelect,
  teamDetailSelect,
} = require("../services/prisma-selects.service");
const { PERMISSION_KEYS, hasPermission } = require("../constants/permissions");

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
    payload.isActive = Boolean(req.body.isActive);
  }

  const coordinates = normalizeCoordinatesInput(req.body || {});
  if (coordinates) {
    payload.longitude = coordinates[0];
    payload.latitude = coordinates[1];
  }

  if (!allowMemberEdits && (hasMemberIds || hasLeaderId)) {
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
  };
};

const getTeamPatchPermissionState = (req) => {
  const body = req.body || {};
  const hasMemberIds = Object.prototype.hasOwnProperty.call(body, "memberIds");
  const hasLeaderId = Object.prototype.hasOwnProperty.call(body, "leaderId");
  const hasBasicTeamFields =
    typeof body?.name === "string" ||
    typeof body?.description === "string" ||
    body?.isActive !== undefined;
  const hasAttendanceFields =
    body?.attendanceRadius !== undefined || Boolean(normalizeCoordinatesInput(body));
  const canUpdateTeam = hasPermission(req.user, PERMISSION_KEYS.TEAM_UPDATE);
  const canManageAttendance = hasPermission(req.user, PERMISSION_KEYS.ATTENDANCE_MANAGE);

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
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW);
  const limit = parseLimit(req.query.limit, 200, 500);

  const teams = await prisma.team.findMany({
    where: {
      orgId,
      deletedAt: null,
    },
    select: teamListSelect,
    orderBy: [{ createdAt: "desc" }],
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
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW);

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
  const { team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW);

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
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  res.status(200).json({
    success: true,
    items: members.map((entry) => ({
      teamMemberId: entry.id,
      userId: entry.userId,
      name: entry.user?.name || "",
      email: entry.user?.email || "",
      role: entry.user?.role || "",
      isActive: Boolean(entry.user?.isActive),
      addedAt: entry.createdAt,
    })),
  });
});

exports.createOrgTeam = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_CREATE);

  const canAssignMembers = (() => {
    try {
      assertPermission(res, req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS);
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
       where: { id: leaderId, orgId, deletedAt: null },
       select: { id: true }
     });
     if (!leader) {
       res.status(400);
       throw new Error("Invalid leader selected");
     }
  }

  const team = await prisma.$transaction(async (tx) => {
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
  const patchPermissionState = getTeamPatchPermissionState(req);

  if (!patchPermissionState.canUpdateTeam && !patchPermissionState.canPatchAttendanceOnly) {
    res.status(403);
    throw new Error("Missing required permission");
  }

  const canAssignMembers =
    patchPermissionState.canUpdateTeam &&
    hasPermission(req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS);

  const { payload, memberIds, leaderId, hasMemberIds, hasLeaderId } =
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
      where: { id: leaderId, orgId, deletedAt: null },
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

  await prisma.$transaction(async (tx) => {
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
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_DELETE);

  await prisma.team.update({
    where: { id: team.id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  res.status(200).json({
    success: true,
    message: "Team deleted successfully",
  });
});
