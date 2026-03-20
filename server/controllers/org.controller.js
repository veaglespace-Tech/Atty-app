const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const {
  PERMISSION_KEYS,
  getDefaultPermissionsForRole,
} = require("../constants/permissions");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { generateUniqueOrgCode } = require("../utils/org-code");
const {
  ensureOrganizationId,
  parseBoolean,
  parseId,
  parseLimit,
  toSummaryItem,
  uniqueNumberList,
  truncateText,
  normalizeStatus,
} = require("../services/common.service");
const {
  assertPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
} = require("../services/access.service");
const { normalizeCoordinatesInput } = require("../services/location.service");
const { mapUserForManagement, buildUserSummary } = require("../services/user-query.service");
const { mapTeamRecord, buildTeamSummary } = require("../services/team-query.service");
const {
  buildAttendanceWhere,
  buildAttendanceSummary,
  mapAttendanceRecord,
} = require("../services/attendance-query.service");
const {
  userManagementSelect,
  attendanceRecordSelect,
  teamListSelect,
  teamDetailSelect,
} = require("../services/prisma-selects.service");

const USER_STATUS = new Set(["APPROVED", "PENDING", "REJECTED"]);

const ensureOrgTargetUser = async ({ req, res, targetUserId, allowSelf = false }) => {
  const orgId = ensureOrganizationId(req, res);
  const user = await prisma.user.findFirst({
    where: {
      id: Number(targetUserId),
      orgId,
      deletedAt: null,
    },
    select: userManagementSelect,
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found in this organization");
  }

  if (!allowSelf && String(user.id) === String(req.user.id)) {
    res.status(400);
    throw new Error("You cannot perform this action on your own account");
  }

  assertRoleScope(res, req.user, user.role);
  return { orgId, user };
};

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

const randomPassword = () => crypto.randomBytes(6).toString("base64url");

exports.onboardOrganization = asyncHandler(async (req, res) => {
  const {
    orgName,
    orgEmail,
    orgPhone,
    orgLocation,
    adminName,
    adminEmail,
    adminMobile,
    adminPassword,
  } = req.body;

  if (
    !orgName ||
    !orgEmail ||
    !orgPhone ||
    !orgLocation ||
    !adminName ||
    !adminEmail ||
    !adminMobile ||
    !adminPassword
  ) {
    res.status(400);
    throw new Error("All fields for organization and admin are required");
  }

  const normalizedOrgEmail = normalizeEmail(orgEmail);
  const normalizedAdminEmail = normalizeEmail(adminEmail);

  let normalizedOrgPhone = null;
  let normalizedAdminPhone = null;
  try {
    normalizedOrgPhone = normalizePhoneNumber({
      phone: orgPhone,
      countryCode: req.body?.orgPhoneCountryCode || req.body?.countryCode,
      requireCountryCode: true,
    });
    normalizedAdminPhone = normalizePhoneNumber({
      phone: adminMobile,
      countryCode: req.body?.adminMobileCountryCode || req.body?.countryCode,
      requireCountryCode: true,
    });
  } catch (phoneError) {
    res.status(400);
    throw new Error(phoneError.message || "Invalid phone number format");
  }

  const [userExists, organizationExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedAdminEmail } }),
    prisma.organization.findUnique({ where: { email: normalizedOrgEmail } }),
  ]);

  if (userExists) {
    res.status(400);
    throw new Error("Admin email already registered");
  }

  if (organizationExists) {
    res.status(400);
    throw new Error("Organization email already registered");
  }

  const longitude = Number(orgLocation[0]);
  const latitude = Number(orgLocation[1]);
  const organizationCode = await generateUniqueOrgCode(prisma);

  const organization = await prisma.organization.create({
    data: {
      name: truncateText(orgName, 120),
      organizationCode,
      email: normalizedOrgEmail,
      phone: normalizedOrgPhone.e164,
      phoneCountryCode: normalizedOrgPhone.countryCode,
      longitude: Number.isFinite(longitude) ? longitude : 0,
      latitude: Number.isFinite(latitude) ? latitude : 0,
      isActive: true,
    },
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminRole = normalizeRole("ORG_ADMIN");

  const adminUser = await prisma.user.create({
    data: {
      name: truncateText(adminName, 120),
      email: normalizedAdminEmail,
      mobile: normalizedAdminPhone.e164,
      mobileCountryCode: normalizedAdminPhone.countryCode,
      password: hashedPassword,
      role: adminRole,
      permissions: getDefaultPermissionsForRole(adminRole),
      orgId: organization.id,
      status: "APPROVED",
      isActive: true,
    },
  });

  await prisma.organization.update({
    where: { id: organization.id },
    data: { orgAdminId: adminUser.id },
  });

  res.status(201).json({
    success: true,
    message: "Organization and Admin created successfully",
    data: {
      organization,
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    },
  });
});

exports.getOrgUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const limit = parseLimit(req.query.limit, 250, 1000);

  const users = await prisma.user.findMany({
    where: {
      orgId,
      deletedAt: null,
      role: {
        not: "SUPER_ADMIN",
      },
    },
    select: userManagementSelect,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  const items = users.map(mapUserForManagement);

  res.status(200).json({
    success: true,
    items,
    summary: buildUserSummary(items),
    meta: {
      limit,
      total: items.length,
    },
  });
});

exports.getOrgUserById = asyncHandler(async (req, res) => {
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW);
  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
    allowSelf: true,
  });

  res.status(200).json({
    success: true,
    item: mapUserForManagement(user),
  });
});

exports.patchOrgUser = asyncHandler(async (req, res) => {
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE);
  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
  });

  const payload = {};

  if (typeof req.body?.name === "string") {
    const name = truncateText(req.body.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("name cannot be empty");
    }
    payload.name = name;
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
    payload.mobile = normalizedPhone.e164;
    payload.mobileCountryCode = normalizedPhone.countryCode;
  }

  const hasRole = Object.prototype.hasOwnProperty.call(req.body || {}, "role");
  const hasPermissions = Object.prototype.hasOwnProperty.call(req.body || {}, "permissions");

  const nextRole = hasRole ? normalizeRole(req.body?.role || user.role) : normalizeRole(user.role);
  if (hasRole) {
    if (nextRole === "SUPER_ADMIN") {
      res.status(400);
      throw new Error("SUPER_ADMIN role is not allowed in organization scope");
    }
    assertRoleScope(res, req.user, nextRole);
    payload.role = nextRole;
  }

  if (hasPermissions || hasRole) {
    const defaultPermissions = getDefaultPermissionsForRole(nextRole);
    payload.permissions = sanitizePermissionsByAssigner(
      req.user,
      hasPermissions ? req.body?.permissions : undefined,
      defaultPermissions
    );
  }

  if (req.body?.status !== undefined) {
    const status = normalizeStatus(req.body.status);
    if (!USER_STATUS.has(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    payload.status = status;
    if (status === "REJECTED") {
      payload.isActive = false;
    }
  }

  if (req.body?.isActive !== undefined) {
    const isActive = parseBoolean(req.body.isActive, null);
    if (isActive === null) {
      res.status(400);
      throw new Error("isActive must be boolean");
    }
    payload.isActive = isActive;
  }

  if (Object.keys(payload).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: payload,
  });

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    item: mapUserForManagement(updated),
  });
});

exports.createOrgUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE);

  const name = truncateText(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const role = normalizeRole(req.body?.role || "MEMBER");
  const status = normalizeStatus(req.body?.status || "APPROVED");

  if (!name || !email || !req.body?.mobile) {
    res.status(400);
    throw new Error("name, email and mobile are required");
  }

  if (!USER_STATUS.has(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  assertRoleScope(res, req.user, role);

  if (role === "SUPER_ADMIN") {
    res.status(400);
    throw new Error("SUPER_ADMIN cannot be created from organization scope");
  }

  let normalizedPhone = null;
  try {
    normalizedPhone = normalizePhoneNumber({
      phone: req.body.mobile,
      countryCode: req.body.mobileCountryCode || req.body.countryCode,
      requireCountryCode: false,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Invalid mobile number");
  }

  const userExists = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (userExists) {
    res.status(409);
    throw new Error("User with this email already exists");
  }

  const plainPassword = req.body?.password ? String(req.body.password) : randomPassword();
  if (plainPassword.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const defaultPermissions = getDefaultPermissionsForRole(role);
  const permissions = sanitizePermissionsByAssigner(
    req.user,
    req.body?.permissions,
    defaultPermissions
  );

  const user = await prisma.user.create({
    data: {
      orgId,
      name,
      email,
      mobile: normalizedPhone.e164,
      mobileCountryCode: normalizedPhone.countryCode,
      password: hashedPassword,
      role,
      permissions,
      status,
      isActive: true,
      createdById: Number(req.user.id),
    },
  });

  res.status(201).json({
    success: true,
    message: "User created successfully",
    tempPassword: req.body?.password ? undefined : plainPassword,
    item: mapUserForManagement(user),
  });
});

exports.updateOrgUserStatus = asyncHandler(async (req, res) => {
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_STATUS_UPDATE);
  const status = normalizeStatus(req.body?.status || "");
  if (!USER_STATUS.has(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      status,
      ...(status === "REJECTED" ? { isActive: false } : {}),
    },
  });

  res.status(200).json({
    success: true,
    message: "User status updated",
    item: mapUserForManagement(updated),
  });
});

exports.toggleOrgUserActive = asyncHandler(async (req, res) => {
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_ACTIVE_TOGGLE);
  const isActive = parseBoolean(req.body?.isActive, null);
  if (isActive === null) {
    res.status(400);
    throw new Error("isActive must be boolean");
  }

  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive,
    },
  });

  res.status(200).json({
    success: true,
    message: "User access updated",
    item: mapUserForManagement(updated),
  });
});

exports.deleteOrgUser = asyncHandler(async (req, res) => {
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_DELETE);
  const { orgId, user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    }),
    prisma.teamMember.deleteMany({
      where: { userId: user.id },
    }),
    prisma.team.updateMany({
      where: {
        orgId,
        leaderId: user.id,
      },
      data: {
        leaderId: null,
      },
    }),
    prisma.organization.updateMany({
      where: {
        id: orgId,
        orgAdminId: user.id,
      },
      data: {
        orgAdminId: null,
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

exports.getOrgNotifications = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const limit = parseLimit(req.query.limit, 100, 500);

  const pendingUsers = await prisma.user.findMany({
    where: {
      orgId,
      status: "PENDING",
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const items = pendingUsers.map((user) => ({
    id: String(user.id),
    title: `New registration request: ${user.name}`,
    message: `${user.name} (${user.email}) requested access as ${normalizeRole(
      user.role
    )}`,
    createdAt: user.createdAt,
    action: {
      approveEndpoint: `/org/users/${user.id}/status`,
    },
  }));

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Pending Approval Requests", pendingUsers.length),
      toSummaryItem("Unread Notifications", pendingUsers.length),
    ],
    items,
    meta: {
      limit,
    },
  });
});

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

  if (leaderId) {
    const leader = await prisma.user.findFirst({
      where: {
        id: leaderId,
        orgId,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!leader) {
      res.status(404);
      throw new Error("Selected leader not found in organization");
    }
    assertRoleScope(res, req.user, leader.role);
  }

  if (memberIds.length > 0) {
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        orgId,
        deletedAt: null,
      },
      select: { id: true, role: true },
    });
    if (members.length !== memberIds.length) {
      res.status(400);
      throw new Error("Some selected members do not belong to this organization");
    }
    members.forEach((member) => assertRoleScope(res, req.user, member.role));
  }

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: payload,
      select: {
        id: true,
      },
    });

    if (memberIds.length > 0) {
      await tx.teamMember.createMany({
        data: memberIds.map((userId) => ({
          teamId: created.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    const finalTeam = await tx.team.findUnique({
      where: { id: created.id },
      select: teamDetailSelect,
    });

    return finalTeam;
  });

  res.status(201).json({
    success: true,
    message: "Team created successfully",
    item: mapTeamRecord(team),
  });
});

exports.patchOrgTeam = asyncHandler(async (req, res) => {
  const { orgId, team } = await ensureOrgTeam({
    req,
    res,
    teamId: req.params.teamId,
  });
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_UPDATE);

  const canAssignMembers = (() => {
    try {
      assertPermission(res, req.user, PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS);
      return true;
    } catch (_) {
      return false;
    }
  })();

  const { payload, memberIds, hasMemberIds, hasLeaderId, leaderId } = normalizeTeamPayload({
    req,
    res,
    allowMemberEdits: canAssignMembers,
  });

  if (hasLeaderId) {
    payload.leaderId = leaderId;
    if (leaderId) {
      const leader = await prisma.user.findFirst({
        where: {
          id: leaderId,
          orgId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });
      if (!leader) {
        res.status(404);
        throw new Error("Selected leader not found in organization");
      }
      assertRoleScope(res, req.user, leader.role);
    }
  }

  if (hasMemberIds) {
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (members.length !== memberIds.length) {
      res.status(400);
      throw new Error("Some selected members do not belong to this organization");
    }
    members.forEach((member) => assertRoleScope(res, req.user, member.role));
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(payload).length > 0) {
      await tx.team.update({
        where: { id: team.id },
        data: payload,
      });
    }

    if (hasMemberIds) {
      await tx.teamMember.deleteMany({
        where: { teamId: team.id },
      });

      if (memberIds.length > 0) {
        await tx.teamMember.createMany({
          data: memberIds.map((userId) => ({ teamId: team.id, userId })),
          skipDuplicates: true,
        });
      }
    }

    return tx.team.findUnique({
      where: { id: team.id },
      select: teamDetailSelect,
    });
  });

  res.status(200).json({
    success: true,
    message: "Team updated successfully",
    item: mapTeamRecord(updated),
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

exports.getOrgAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);
  const limit = parseLimit(req.query.limit, 200, 800);

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
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
      limit,
      total: items.length,
    },
  });
});

exports.getOrgAttendanceSettings = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      attendanceRadius: true,
      longitude: true,
      latitude: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    settings: {
      attendanceRadius: org?.attendanceRadius || 25,
      location:
        Number.isFinite(org?.longitude) && Number.isFinite(org?.latitude)
          ? [org.longitude, org.latitude]
          : null,
      updatedAt: org?.updatedAt || null,
    },
  });
});

exports.updateOrgAttendanceSettings = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_MANAGE);

  const attendanceRadius = Number(req.body?.attendanceRadius || 25);
  if (!Number.isFinite(attendanceRadius) || attendanceRadius < 5 || attendanceRadius > 1000) {
    res.status(400);
    throw new Error("attendanceRadius must be between 5 and 1000");
  }

  const coordinates = normalizeCoordinatesInput(req.body || {});
  if (!coordinates) {
    res.status(400);
    throw new Error("Valid coordinates are required");
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      attendanceRadius: Math.round(attendanceRadius),
      longitude: coordinates[0],
      latitude: coordinates[1],
    },
  });

  res.status(200).json({
    success: true,
    message: "Attendance settings updated successfully",
  });
});
