const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const {
  PERMISSION_KEYS,
  getDefaultPermissionsForRole,
  normalizePermissionList,
} = require("../constants/permissions");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { resolveMembership, resolveUserRole } = require("../utils/membership");
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
const { createOrganizationMembership } = require("../services/organization-member.service");
const { assertWithinPlanUserLimit } = require("../services/organization-plan.service");

const USER_STATUS = new Set(["APPROVED", "PENDING", "REJECTED"]);

const randomPassword = () => crypto.randomBytes(6).toString("base64url");

const ensureOrgTargetUser = async ({ req, res, targetUserId, allowSelf = false }) => {
  const orgId = ensureOrganizationId(req, res);
  const user = await prisma.user.findFirst({
    where: {
      id: Number(targetUserId),
      memberships: {
        some: {
          orgId,
        },
      },
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

  const membership = resolveMembership(user, orgId);
  const targetRole = resolveUserRole(user, orgId);

  if (!membership || !targetRole) {
    res.status(404);
    throw new Error("User membership not found in this organization");
  }

  assertRoleScope(res, req.user, targetRole, orgId);
  return { orgId, user, membership, targetRole };
};

exports.getOrgUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const limit = parseLimit(req.query.limit, 500, 2000);

  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          orgId,
        },
      },
      deletedAt: null,
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
    summary: buildUserSummary(items),
    meta: {
      limit,
      total: items.length,
    },
  });
});

exports.getOrgUserById = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW, orgId);
  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
    allowSelf: true,
  });

  res.status(200).json({
    success: true,
    item: mapUserForManagement(user, orgId),
  });
});

exports.patchOrgUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE, orgId);
  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
  });

  const userPayload = {};
  const membershipPayload = {};

  if (typeof req.body?.name === "string") {
    const name = truncateText(req.body.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("name cannot be empty");
    }
    userPayload.name = name;
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
    userPayload.mobile = normalizedPhone.e164;
    userPayload.mobileCountryCode = normalizedPhone.countryCode;
  }

  const hasRole = Object.prototype.hasOwnProperty.call(req.body || {}, "role");
  const currentRole = resolveUserRole(user, orgId) || "MEMBER";
  const nextRole = hasRole ? normalizeRole(req.body?.role || currentRole) : currentRole;
  const roleChanged = hasRole && nextRole !== currentRole;
  if (hasRole) {
    if (nextRole === "SUPER_ADMIN") {
      res.status(400);
      throw new Error("SUPER_ADMIN role is not allowed in organization scope");
    }
    assertRoleScope(res, req.user, nextRole, orgId);
    userPayload.role = nextRole;
    membershipPayload.role = nextRole;
  }

  if (req.body?.status !== undefined) {
    const status = normalizeStatus(req.body.status);
    if (!USER_STATUS.has(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }
    userPayload.status = status;
    if (status === "REJECTED") {
      userPayload.isActive = false;
      membershipPayload.isActive = false;
    }
  }

  if (req.body?.isActive !== undefined) {
    const isActive = parseBoolean(req.body.isActive, null);
    if (isActive === null) {
      res.status(400);
      throw new Error("isActive must be boolean");
    }
    membershipPayload.isActive = isActive;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "permissions")) {
    if (!Array.isArray(req.body.permissions)) {
      res.status(400);
      throw new Error("permissions must be an array");
    }
    userPayload.permissions = sanitizePermissionsByAssigner(
      req.user,
      normalizePermissionList(req.body.permissions),
      orgId
    );
  } else if (roleChanged) {
    userPayload.permissions = sanitizePermissionsByAssigner(
      req.user,
      getDefaultPermissionsForRole(nextRole),
      orgId
    );
  }

  if (Object.keys(userPayload).length === 0 && Object.keys(membershipPayload).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update");
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userPayload).length > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: userPayload,
      });
    }

    if (Object.keys(membershipPayload).length > 0) {
      await tx.organizationMember.update({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId,
          },
        },
        data: membershipPayload,
      });
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: userManagementSelect,
  });

  if (userPayload.status === "REJECTED") {
    await archiveUser({
      userId: user.id,
      orgId,
      reason: "Status updated to REJECTED via profile edit",
      archivedById: Number(req.user.id),
    });
  } else if (userPayload.status === "APPROVED" && user.status === "REJECTED") {
    await restoreUserFromArchive({
      userId: user.id,
    });
  }

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    item: mapUserForManagement(updated, orgId),
  });
});

exports.createOrgUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE, orgId);
  await assertWithinPlanUserLimit({ orgId, res });

  const name = truncateText(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const role = normalizeRole(req.body?.role || "MEMBER");
  const status = normalizeStatus(req.body?.status || "APPROVED");
  const hasPermissions = Object.prototype.hasOwnProperty.call(req.body || {}, "permissions");

  if (!name || !email || !req.body?.mobile) {
    res.status(400);
    throw new Error("name, email and mobile are required");
  }

  if (!USER_STATUS.has(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  assertRoleScope(res, req.user, role, orgId);

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

  if (hasPermissions && !Array.isArray(req.body.permissions)) {
    res.status(400);
    throw new Error("permissions must be an array");
  }

  const normalizedPermissions = hasPermissions
    ? sanitizePermissionsByAssigner(req.user, normalizePermissionList(req.body.permissions), orgId)
    : sanitizePermissionsByAssigner(req.user, getDefaultPermissionsForRole(role), orgId);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true,
    },
  });

  let tempPassword;
  let user;

  if (existingUser) {
    const duplicateMembership = resolveMembership(existingUser, orgId);
    if (duplicateMembership) {
      res.status(409);
      throw new Error("User is already a member of this organization");
    }

    await prisma.$transaction(async (tx) => {
      await createOrganizationMembership(tx, {
        userId: existingUser.id,
        orgId,
        role,
        isActive: status !== "REJECTED",
      });

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          orgId: existingUser.orgId || orgId,
          role,
          status,
          isActive: status === "REJECTED" ? false : existingUser.isActive !== false,
          permissions: normalizedPermissions,
        },
      });
    });

    user = await prisma.user.findUnique({
      where: { id: existingUser.id },
      select: userManagementSelect,
    });
  } else {
    const plainPassword = req.body?.password ? String(req.body.password) : randomPassword();
    if (plainPassword.length < 8) {
      res.status(400);
      throw new Error("Password must be at least 8 characters");
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    tempPassword = req.body?.password ? undefined : plainPassword;

    user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          orgId,
          name,
          email,
          mobile: normalizedPhone.e164,
          mobileCountryCode: normalizedPhone.countryCode,
          password: hashedPassword,
          role,
          status,
          isActive: status !== "REJECTED",
          permissions: normalizedPermissions,
          createdById: Number(req.user.id),
        },
      });

      await createOrganizationMembership(tx, {
        userId: createdUser.id,
        orgId,
        role,
        isActive: status !== "REJECTED",
      });

      return tx.user.findUnique({
        where: { id: createdUser.id },
        select: userManagementSelect,
      });
    });
  }

  res.status(201).json({
    success: true,
    message: existingUser ? "User added to organization successfully" : "User created successfully",
    tempPassword,
    item: mapUserForManagement(user, orgId),
  });
});

exports.updateOrgUserStatus = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_STATUS_UPDATE, orgId);
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        status,
        ...(status === "REJECTED" ? { isActive: false } : {}),
      },
    });

    await tx.organizationMember.update({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId,
        },
      },
      data: {
        isActive: status !== "REJECTED",
      },
    });
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: userManagementSelect,
  });

  if (status === "REJECTED") {
    await archiveUser({
      userId: user.id,
      orgId,
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
    item: mapUserForManagement(updated, orgId),
  });
});

exports.toggleOrgUserActive = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_ACTIVE_TOGGLE, orgId);
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

  await prisma.organizationMember.update({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId,
      },
    },
    data: {
      isActive,
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: userManagementSelect,
  });

  res.status(200).json({
    success: true,
    message: "User access updated",
    item: mapUserForManagement(updated, orgId),
  });
});

exports.deleteOrgUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_DELETE, orgId);
  const { user } = await ensureOrgTargetUser({
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
      memberships: {
        some: {
          orgId,
        },
      },
      status: "PENDING",
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      memberships: {
        select: {
          orgId: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  const items = pendingUsers.map((user) => ({
    id: String(user.id),
    title: `New registration request: ${user.name}`,
    message: `${user.name} (${user.email}) requested access as ${normalizeRole(
      resolveUserRole(user, orgId)
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
