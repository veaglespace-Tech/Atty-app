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
  validateEmail,
  validatePersonName,
  validatePasswordComplexity,
} = require("../utils/validation");
const {
  assertAnyPermission,
  assertPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
} = require("../services/access.service");
const { mapUserForManagement, buildUserSummary } = require("../services/user-query.service");
const {
  userManagementSelect,
  userProfileSelect,
} = require("../services/prisma-selects.service");
const { archiveUser, restoreUserFromArchive } = require("../services/archive.service");
const { createOrganizationMembership } = require("../services/organization-member.service");
const { assertWithinPlanUserLimit } = require("../services/organization-plan.service");
const { buildUserHallTicketPdf } = require("../utils/user-profile-pdf");
const { buildGenericTablePdf } = require("../utils/pdf-report");

// ── Poll helpers (mirrors post.controller.js logic) ──
const _toSafeObj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

const _normalizePollOptions = (opts = []) =>
  (Array.isArray(opts) ? opts : [])
    .map((o) => (typeof o === "string" ? o.trim() : o == null ? "" : String(o).trim()))
    .filter(Boolean);

const _normalizePollVotes = (votes = {}, count = 0) => {
  const safe = _toSafeObj(votes);
  return Object.entries(safe).reduce((acc, [uid, idx]) => {
    const i = Number(idx);
    if (Number.isInteger(i) && i >= 0 && i < count) acc[String(uid)] = i;
    return acc;
  }, {});
};

const _serializePollForNotification = (post, currentUserId) => {
  if (!post || post.type !== "POLL") return post;

  const meta = _toSafeObj(post.metadata);
  const options = _normalizePollOptions(meta.options);
  const votes = _normalizePollVotes(meta.votes, options.length);
  const totalVotes = Object.keys(votes).length;
  const voteCounts = Object.values(votes).reduce((acc, idx) => {
    acc[idx] = (acc[idx] || 0) + 1;
    return acc;
  }, {});

  return {
    ...post,
    metadata: { ...meta, options, votes },
    poll: {
      totalVotes,
      selectedOptionIndex: Object.prototype.hasOwnProperty.call(votes, String(currentUserId))
        ? votes[String(currentUserId)]
        : null,
      results: options.map((option, index) => {
        const count = voteCounts[index] || 0;
        return {
          index,
          option,
          votes: count,
          percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0,
        };
      }),
    },
  };
};

const USER_STATUS = new Set(["APPROVED", "PENDING", "REJECTED"]);
const ORG_PROFILE_SELECT = {
  id: true,
  name: true,
  organizationCode: true,
  phone: true,
  phoneCountryCode: true,
  address: true,
  city: true,
  state: true,
  country: true,
};

const randomPassword = () => crypto.randomBytes(6).toString("base64url");

const ensureOrgTargetUser = async ({
  req,
  res,
  targetUserId,
  allowSelf = false,
  checkRoleScope = true,
  select = userManagementSelect,
}) => {
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
    select,
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
  const targetRole = resolveUserRole(user, orgId) || membership?.role;

  if (!membership || !targetRole) {
    res.status(404);
    throw new Error("User membership not found in this organization");
  }

  if (checkRoleScope) {
    assertRoleScope(res, req.user, targetRole, orgId);
  }
  return { orgId, user, membership, targetRole };
};

const getUserAttendanceSummary = async ({ orgId, userId }) => {
  const where = {
    orgId,
    userId: Number(userId),
    deletedAt: null,
  };

  const [statusGroups, aggregates] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["status"],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.attendance.aggregate({
      where,
      _count: {
        _all: true,
      },
      _sum: {
        totalMinutesWorked: true,
      },
    }),
  ]);

  const counts = statusGroups.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [String(item.status || "").toUpperCase()]: Number(item?._count?._all || 0),
    }),
    {}
  );

  return {
    totalEntries: Number(aggregates?._count?._all || 0),
    presentDays: Number(counts.PRESENT || 0),
    halfDays: Number(counts.HALF_DAY || 0),
    absentDays: Number(counts.ABSENT || 0),
    totalWorkedMinutes: Number(aggregates?._sum?.totalMinutesWorked || 0),
  };
};

const mapOrgUserDetail = ({ user, orgId, organization, attendanceSummary }) => {
  const base = mapUserForManagement(user, orgId);
  const membership = resolveMembership(user, orgId);

  const teamNames = (Array.isArray(user.teamMemberships) ? user.teamMemberships : [])
    .map((entry) => entry?.team)
    .filter((team) => team && team.deletedAt === null && team.isActive !== false)
    .map((team) => team.name)
    .filter(Boolean);

  const ledTeamNames = (Array.isArray(user.teamsLed) ? user.teamsLed : [])
    .filter((team) => team && team.deletedAt === null && team.isActive !== false)
    .map((team) => team.name)
    .filter(Boolean);

  return {
    ...base,
    organization: {
      id: organization?.id || null,
      name: organization?.name || null,
      organizationCode: organization?.organizationCode || null,
      phone: organization?.phone || null,
      phoneCountryCode: organization?.phoneCountryCode || null,
      address: organization?.address || null,
      city: organization?.city || null,
      state: organization?.state || null,
      country: organization?.country || null,
    },
    membership: {
      joinedAt: membership?.joinedAt || null,
      role: membership?.role || base.role,
      isActive: membership?.isActive !== false,
    },
    createdBy: user?.createdBy
      ? {
          id: user.createdBy.id,
          name: user.createdBy.name,
          email: user.createdBy.email,
        }
      : null,
    teamNames,
    ledTeamNames,
    totalTeams: teamNames.length,
    totalLedTeams: ledTeamNames.length,
    updatedAt: user?.updatedAt || null,
    lastLoginAt: user?.lastLoginAt || null,
    attendanceSummary,
  };
};

const toHallTicketFilename = ({ userName, userId }) => {
  const safeName = String(userName || "user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeName || "user"}-profile-${Number(userId || 0)}-hall-ticket.pdf`;
};

exports.getOrgUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertAnyPermission(
    res,
    req.user,
    [
      PERMISSION_KEYS.USERS_CREATE,
      PERMISSION_KEYS.TEAM_CREATE,
      PERMISSION_KEYS.TEAM_UPDATE,
      PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS,
    ],
    orgId
  );
  const limit = parseLimit(req.query.limit, 500, 2000);
  const currentUserId = Number(req.user.id);

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

  const requesterRole = resolveUserRole(req.user, orgId);

  const items = users
    .map((user) => mapUserForManagement(user, orgId))
    .filter((user) => {
      if (user.role === "SUPER_ADMIN") return false;
      if (requesterRole === "SUB_ADMIN") {
        return user.role === "MEMBER" || user.role === "TEAM_LEADER";
      }
      return true;
    });

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
    checkRoleScope: false,
    select: userProfileSelect,
  });

  const [organization, attendanceSummary] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: ORG_PROFILE_SELECT,
    }),
    getUserAttendanceSummary({
      orgId,
      userId: user.id,
    }),
  ]);

  res.status(200).json({
    success: true,
    item: mapOrgUserDetail({
      user,
      orgId,
      organization,
      attendanceSummary,
    }),
  });
});

exports.downloadOrgUserProfilePdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.TEAM_VIEW, orgId);

  const { user } = await ensureOrgTargetUser({
    req,
    res,
    targetUserId: req.params.userId,
    allowSelf: true,
    checkRoleScope: false,
    select: userProfileSelect,
  });

  const [organization, attendanceSummary] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: ORG_PROFILE_SELECT,
    }),
    getUserAttendanceSummary({
      orgId,
      userId: user.id,
    }),
  ]);

  const detailedUser = mapOrgUserDetail({
    user,
    orgId,
    organization,
    attendanceSummary,
  });

  const pdfBuffer = await buildUserHallTicketPdf({
    organization: detailedUser.organization,
    user: {
      id: detailedUser.id,
      name: detailedUser.name,
      role: detailedUser.role,
      approvalStatus: detailedUser.approvalStatus,
      active: detailedUser.active,
      email: detailedUser.email,
      mobile: detailedUser.mobile,
      mobileCountryCode: detailedUser.mobileCountryCode,
      emergencyContact: detailedUser.emergencyContact,
      currentAddress: detailedUser.currentAddress,
      permanentAddress: detailedUser.permanentAddress,
      profileImageUrl: detailedUser.profileImageUrl,
      joinedAt: detailedUser.membership?.joinedAt || detailedUser.joinedAt,
      lastLoginAt: detailedUser.lastLoginAt,
      teamNames: detailedUser.teamNames,
      ledTeamNames: detailedUser.ledTeamNames,
    },
    attendanceSummary: detailedUser.attendanceSummary,
    generatedByName: req.user?.name || req.user?.email || "Admin",
  });

  const filename = toHallTicketFilename({
    userName: detailedUser.name,
    userId: detailedUser.id,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.status(200).send(pdfBuffer);
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
    if (!validatePersonName(name)) {
      res.status(400);
      throw new Error("Full name can only include letters, spaces, dots, or hyphens");
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

  if (!validatePersonName(name)) {
    res.status(400);
    throw new Error("Full name can only include letters, spaces, dots, or hyphens");
  }

  if (!validateEmail(email)) {
    res.status(400);
    throw new Error("Invalid email address");
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
    if (!validatePasswordComplexity(plainPassword)) {
      res.status(400);
      throw new Error(
        "Password must be 8-64 characters and include uppercase, lowercase, number, and special character",
      );
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
  const userId = Number(req.user.id);
  const limit = parseLimit(req.query.limit, 100, 500);

  const where = {
    OR: [{ orgId }, { orgId: null }],
    isActive: true,
    deletedAt: null,
  };

  const [posts, total, unreadCount] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        metadata: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            role: true,
          },
        },
        reads: {
          where: { userId },
          select: { id: true }
        }
      },
    }),
    prisma.post.count({ where }),
    prisma.post.count({ 
      where: {
        ...where,
        reads: { none: { userId } }
      }
    })
  ]);

  const items = posts.map((post) => {
    const serialized = _serializePollForNotification(post, userId);
    return {
      id: String(post.id),
      title: post.title,
      message: post.content,
      type: post.type,
      metadata: serialized.metadata,
      poll: serialized.poll || undefined,
      createdAt: post.createdAt,
      authorName: post.author?.name || "Admin",
      source: "POST",
      isRead: post.reads && post.reads.length > 0,
    };
  });

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Total Notifications", total),
      toSummaryItem("Unread Notifications", unreadCount),
    ],
    items,
    meta: {
      limit,
      total,
      unreadCount
    },
  });
});

exports.getOrgNotificationById = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;

  const post = await prisma.post.findFirst({
    where: {
      id: Number(id),
      orgId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      metadata: true,
      createdAt: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!post) {
    res.status(404);
    throw new Error("Notification not found");
  }

  const userId = Number(req.user.id);
  const serialized = _serializePollForNotification(post, userId);

  res.status(200).json({
    success: true,
    data: {
      id: String(post.id),
      title: post.title,
      message: post.content,
      type: post.type,
      metadata: serialized.metadata,
      poll: serialized.poll || undefined,
      createdAt: post.createdAt,
      authorName: post.author?.name || "Admin",
    },
  });
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;
  const userId = Number(req.user.id);

  const post = await prisma.post.findFirst({
    where: {
      id: Number(id),
      orgId,
    }
  });

  if (!post) {
    res.status(404);
    throw new Error("Notification not found");
  }

  await prisma.userNotificationRead.upsert({
    where: {
      userId_notificationId: {
        userId,
        notificationId: Number(id)
      }
    },
    update: {
      readAt: new Date()
    },
    create: {
      userId,
      notificationId: Number(id)
    }
  });

  res.status(200).json({
    success: true,
    message: "Marked as read",
  });
});

exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);

  const unreadPosts = await prisma.post.findMany({
    where: {
      OR: [{ orgId }, { orgId: null }],
      isActive: true,
      deletedAt: null,
      reads: { none: { userId } }
    },
    select: { id: true }
  });

  if (unreadPosts.length > 0) {
    await prisma.userNotificationRead.createMany({
      data: unreadPosts.map(post => ({
        userId,
        notificationId: post.id,
        readAt: new Date()
      })),
      skipDuplicates: true,
    });
  }

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

exports.downloadOrgUsersPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertAnyPermission(
    res,
    req.user,
    [PERMISSION_KEYS.USERS_CREATE, PERMISSION_KEYS.TEAM_VIEW],
    orgId
  );

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const users = await prisma.user.findMany({
    where: {
      memberships: { some: { orgId } },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      mobileCountryCode: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ name: "asc" }],
    take: 5000,
  });

  const orgName = organization?.name || "Organization";
  const safeName = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const columns = [
    { key: "index", label: "No.", width: 30, align: "center" },
    { key: "name", label: "Name", width: 120 },
    { key: "email", label: "Email", width: 140 },
    { key: "mobile", label: "Contact No.", width: 90 },
    { key: "role", label: "Role", width: 70 },
    { key: "status", label: "Status", width: 60, align: "center" },
    { key: "active", label: "Active", width: 50, align: "center" },
    { key: "joinedAt", label: "Joined At", width: 70, align: "center" },
  ];

  const rows = users.map((user, index) => ({
    index: index + 1,
    name: user.name || "-",
    email: user.email || "-",
    mobile: user.mobile || "-",
    role: user.role || "-",
    status: user.status || "-",
    active: user.isActive ? "Yes" : "No",
    joinedAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
  }));

  const pdfBuffer = await buildGenericTablePdf({
    title: `${orgName} — User Directory`,
    subtitleLines: [`Organization Code: ${organization?.organizationCode || "-"}`],
    columns,
    rows,
    summaryCards: [
      { label: "Total Users", value: users.length },
      { label: "Active Users", value: users.filter((u) => u.isActive).length },
    ],
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}-users.pdf"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadOrgUsersExcel = asyncHandler(async (req, res) => {
  const xlsx = require("xlsx");
  const orgId = ensureOrganizationId(req, res);
  assertAnyPermission(
    res,
    req.user,
    [PERMISSION_KEYS.USERS_CREATE, PERMISSION_KEYS.TEAM_VIEW],
    orgId
  );

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const users = await prisma.user.findMany({
    where: {
      memberships: { some: { orgId } },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      mobileCountryCode: true,
      emergencyContact: true,
      currentAddress: true,
      permanentAddress: true,
      profileImageUrl: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ name: "asc" }],
    take: 5000,
  });

  const orgName = organization?.name || "Organization";
  const safeName = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const headers = [
    "Sr. No.",
    "Name",
    "Email",
    "Contact No.",
    "Emergency Contact",
    "Current Address",
    "Permanent Address",
    "Profile Photo URL",
    "Role",
    "Status",
    "Active",
    "Joined At",
  ];

  const sheetData = [
    [`${orgName} — User Directory`],
    [`Exported on: ${new Date().toLocaleString("en-IN")}`],
    [],
    headers,
    ...users.map((user, index) => [
      index + 1,
      user.name || "-",
      user.email || "-",
      user.mobile || "-",
      user.emergencyContact || "-",
      user.currentAddress || "-",
      user.permanentAddress || "-",
      user.profileImageUrl || "-",
      user.role || "-",
      user.status || "-",
      user.isActive ? "Active" : "Blocked",
      user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
    ]),
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = headers.map((h, i) => ({ wch: i === 0 ? 8 : i >= 5 && i <= 7 ? 40 : 25 }));
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Users");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}-users.xlsx"`);
  res.status(200).send(buffer);
});
