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
const {
  ensureOrganizationId,
  parseBoolean,
  parseLimit,
  toSummaryItem,
  truncateText,
  normalizeStatus,
} = require("../services/common.service");
const {
  assertPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
} = require("../services/access.service");
const { mapUserForManagement, buildUserSummary } = require("../services/user-query.service");
const {
  userManagementSelect,
} = require("../services/prisma-selects.service");
const { archiveUser, restoreUserFromArchive } = require("../services/archive.service");

const USER_STATUS = new Set(["APPROVED", "PENDING", "REJECTED"]);

const randomPassword = () => crypto.randomBytes(6).toString("base64url");

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

  if (payload.status === "REJECTED") {
    await archiveUser({
      userId: user.id,
      orgId: user.orgId,
      reason: "Status updated to REJECTED via profile edit",
      archivedById: Number(req.user.id),
    });
  } else if (payload.status === "APPROVED" && user.status === "REJECTED") {
    await restoreUserFromArchive({
      userId: user.id,
    });
  }

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

  if (status === "REJECTED") {
    await archiveUser({
      userId: user.id,
      orgId: user.orgId,
      reason: "Status updated to REJECTED by admin",
      archivedById: Number(req.user.id),
    });
  } else if (status === "APPROVED" && user.status === "REJECTED") {
    // If they were previously rejected and are now approved, restore/cleanup archive
    await restoreUserFromArchive({
      userId: user.id,
    });
  }

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
