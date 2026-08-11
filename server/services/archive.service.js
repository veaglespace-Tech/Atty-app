const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");

/**
 * Helper to strip "__deleted_<timestamp>" suffix from strings
 */
const stripDeletedSuffix = (val) => {
  if (!val || typeof val !== "string") return val;
  return val.replace(/__deleted_\d+$/, "");
};

/**
 * Archive a user (admin or member)
 * @param {Object} params
 * @param {number} params.userId - ID of the user to archive
 * @param {number} [params.orgId] - Optional org ID filter
 * @param {string} [params.reason] - Reason for archiving
 * @param {number} [params.archivedById] - ID of the user who performed the archive
 * @param {Object} [params.metadata] - Additional metadata
 */
const archiveUser = async ({ userId, orgId, reason = "", archivedById = null, metadata = {} }) => {
  try {
    const targetId = Number(userId);
    const user = await prisma.user.findFirst({
      where: {
        id: targetId,
        ...(orgId ? { orgId: Number(orgId) } : {}),
        deletedAt: null,
      },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      console.warn(`User ${userId} not found or already archived`);
      return null;
    }

    const cleanEmail = stripDeletedSuffix(user.email);
    const cleanMobile = stripDeletedSuffix(user.mobile);
    const timestamp = Date.now();

    return await prisma.$transaction(async (tx) => {
      // 1. Create ArchiveUser snapshot with pristine original data
      const archived = await tx.archiveUser.create({
        data: {
          userId: user.id,
          orgId: user.orgId,
          name: user.name,
          email: cleanEmail,
          mobile: cleanMobile,
          mobileCountryCode: user.mobileCountryCode,
          password: user.password,
          role: resolveUserRole(user, orgId || user.orgId) || user.role,
          status: user.status,
          isActive: false,
          lastLoginAt: user.lastLoginAt,
          gender: user.gender,
          dob: user.dob,
          referenceBy: user.referenceBy,
          existingMember: user.existingMember,
          createdById: user.createdById,
          deletedAt: new Date(),
          archivedById: archivedById ? Number(archivedById) : null,
          archiveReason: reason || "User archived from system",
          archivedAt: new Date(),
          originalCreatedAt: user.createdAt,
          originalUpdatedAt: user.updatedAt,
          metadata: metadata,
        },
      });

      // 2. Relinquish unique constraints on email and mobile in main User table
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          status: "REJECTED",
          email: `${cleanEmail}__deleted_${timestamp}`,
          mobile: cleanMobile ? `${cleanMobile}__deleted_${timestamp}` : user.mobile,
        },
      });

      // 3. Clean up active relations and historical registration requests
      await tx.teamMember.deleteMany({
        where: { userId: user.id },
      });

      await tx.team.updateMany({
        where: { leaderId: user.id },
        data: { leaderId: null },
      });

      await tx.organization.updateMany({
        where: { orgAdminId: user.id },
        data: { orgAdminId: null },
      });

      if (cleanEmail) {
        await tx.registrationRequest.deleteMany({
          where: {
            OR: [
              { email: cleanEmail },
              { email: user.email },
              ...(cleanMobile ? [{ mobile: cleanMobile }] : []),
            ],
          },
        });
      }

      return archived;
    });
  } catch (error) {
    console.error("Archive User Error:", error);
    throw error;
  }
};

/**
 * Archive a failed registration (Organization + Admin)
 */
const archiveFailedRegistration = async ({ organization, admin, reason = "", metadata = {} }) => {
  try {
    const cleanOrgEmail = stripDeletedSuffix(organization.email);
    const cleanAdminEmail = stripDeletedSuffix(admin.email);
    const cleanAdminMobile = stripDeletedSuffix(admin.mobile);

    const archivedOrg = await prisma.archiveOrg.create({
      data: {
        name: organization.name,
        email: cleanOrgEmail,
        phone: organization.phone,
        phoneCountryCode: organization.phoneCountryCode || organization.countryCode,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        country: organization.country || "India",
        latitude: organization.latitude || 0,
        longitude: organization.longitude || 0,
        attendanceRadius: organization.attendanceRadius || 25,
        archiveReason: reason || "Failed or abandoned registration",
        archivedAt: new Date(),
        metadata: metadata,
      },
    });

    const archivedAdmin = await prisma.archiveUser.create({
      data: {
        name: admin.name,
        email: cleanAdminEmail,
        mobile: cleanAdminMobile,
        mobileCountryCode: admin.mobileCountryCode || admin.countryCode,
        password: admin.password,
        role: "ORG_ADMIN",
        status: "REJECTED",
        archiveReason: reason || "Failed registration admin",
        archivedAt: new Date(),
        metadata: {
          ...metadata,
          isOrgAdmin: true,
          archivedOrgId: archivedOrg.id,
        },
      },
    });

    return { archivedOrg, archivedAdmin };
  } catch (error) {
    console.error("Archive Failed Registration Error:", error);
    return null;
  }
};

/**
 * Archive an existing organization (from DB)
 */
const archiveOrganization = async ({ orgId, reason = "", archivedById = null }) => {
  try {
    const targetOrgId = Number(orgId);
    const org = await prisma.organization.findUnique({
      where: { id: targetOrgId },
      include: {
        users: {
          where: { deletedAt: null },
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!org) return null;

    const cleanOrgEmail = stripDeletedSuffix(org.email);
    const cleanOrgCode = stripDeletedSuffix(org.organizationCode);
    const cleanReferralCode = stripDeletedSuffix(org.referralCode);
    const timestamp = Date.now();

    return await prisma.$transaction(async (tx) => {
      // 1. Archive Organization Master Record
      const archivedOrg = await tx.archiveOrg.create({
        data: {
          orgId: org.id,
          name: org.name,
          organizationCode: cleanOrgCode,
          email: cleanOrgEmail,
          phone: org.phone,
          phoneCountryCode: org.phoneCountryCode,
          address: org.address,
          city: org.city,
          state: org.state,
          country: org.country,
          latitude: org.latitude,
          longitude: org.longitude,
          attendanceRadius: org.attendanceRadius,
          subscriptionStatus: org.subscriptionStatus,
          subscriptionExpiry: org.subscriptionExpiry,
          planId: org.planId,
          subscriptionId: org.subscriptionId,
          isActive: false,
          isBlocked: org.isBlocked,
          deletedAt: new Date(),
          archivedById: archivedById ? Number(archivedById) : null,
          archiveReason: reason || "Organization archived from database",
          archivedAt: new Date(),
          originalCreatedAt: org.createdAt,
          originalUpdatedAt: org.updatedAt,
        },
      });

      // 2. Archive all active users of this org
      for (const user of org.users) {
        const cleanUserEmail = stripDeletedSuffix(user.email);
        const cleanUserMobile = stripDeletedSuffix(user.mobile);

        await tx.archiveUser.create({
          data: {
            userId: user.id,
            orgId: org.id,
            name: user.name,
            email: cleanUserEmail,
            mobile: cleanUserMobile,
            mobileCountryCode: user.mobileCountryCode,
            password: user.password,
            role: resolveUserRole(user, org.id) || user.role,
            status: user.status,
            isActive: false,
            lastLoginAt: user.lastLoginAt,
            createdById: user.createdById,
            deletedAt: new Date(),
            archivedById: archivedById ? Number(archivedById) : null,
            archiveReason: reason || `Organization #${org.id} archived`,
            archivedAt: new Date(),
            originalCreatedAt: user.createdAt,
            originalUpdatedAt: user.updatedAt,
          },
        });

        // Relinquish unique constraints on users
        await tx.user.update({
          where: { id: user.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            email: `${cleanUserEmail}__deleted_${timestamp}_${user.id}`,
            mobile: cleanUserMobile ? `${cleanUserMobile}__deleted_${timestamp}_${user.id}` : user.mobile,
          },
        });
      }

      // 3. Relinquish unique constraints on Organization and soft-delete
      await tx.organization.update({
        where: { id: org.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          organizationCode: `${cleanOrgCode}__deleted_${timestamp}`,
          email: `${cleanOrgEmail}__deleted_${timestamp}`,
          referralCode: cleanReferralCode ? `${cleanReferralCode}__deleted_${timestamp}` : org.referralCode,
          orgAdminId: null,
        },
      });

      // 4. Soft-delete related records
      await tx.team.updateMany({
        where: { orgId: org.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await tx.post.updateMany({
        where: { orgId: org.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      return archivedOrg;
    });
  } catch (error) {
    console.error("Archive Organization Error:", error);
    throw error;
  }
};

/**
 * Restore a user from archive (back to active state)
 */
const restoreUserFromArchive = async ({ userId, archiveId = null }) => {
  try {
    const targetUserId = Number(userId);

    // Find archive record
    const archiveRecord = await prisma.archiveUser.findFirst({
      where: archiveId
        ? { id: Number(archiveId) }
        : { userId: targetUserId },
      orderBy: { archivedAt: "desc" },
    });

    if (!archiveRecord) {
      throw new Error("No archive record found for this user");
    }

    const cleanEmail = stripDeletedSuffix(archiveRecord.email);
    const cleanMobile = stripDeletedSuffix(archiveRecord.mobile);

    // Check if an active user already has this email
    const existingActive = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        deletedAt: null,
        NOT: { id: archiveRecord.userId || 0 },
      },
    });

    if (existingActive) {
      throw new Error(`Cannot restore user. Another active user (${cleanEmail}) already exists.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update main User record
      const updated = await tx.user.update({
        where: { id: archiveRecord.userId },
        data: {
          email: cleanEmail,
          mobile: cleanMobile,
          status: "APPROVED",
          isActive: true,
          deletedAt: null,
        },
      });

      // 2. If organization membership exists, ensure membership isActive is true
      if (archiveRecord.orgId) {
        await tx.organizationMember.upsert({
          where: {
            userId_orgId: {
              userId: archiveRecord.userId,
              orgId: archiveRecord.orgId,
            },
          },
          update: { isActive: true },
          create: {
            userId: archiveRecord.userId,
            orgId: archiveRecord.orgId,
            role: archiveRecord.role || "MEMBER",
            isActive: true,
          },
        });
      }

      // 3. Remove archive entries for this user
      await tx.archiveUser.deleteMany({
        where: {
          OR: [
            { id: archiveRecord.id },
            { userId: archiveRecord.userId },
            { email: cleanEmail },
          ],
        },
      });

      return updated;
    });
  } catch (error) {
    console.error("Restore User Error:", error);
    throw error;
  }
};

/**
 * Restore an organization from archive
 */
const restoreOrganizationFromArchive = async ({ orgId }) => {
  try {
    const targetOrgId = Number(orgId);
    const archived = await prisma.archiveOrg.findFirst({
      where: { orgId: targetOrgId },
      orderBy: { archivedAt: "desc" },
    });

    if (!archived) {
      throw new Error("No archive record found for this organization");
    }

    const cleanOrgCode = stripDeletedSuffix(archived.organizationCode);
    const cleanOrgEmail = stripDeletedSuffix(archived.email);

    // Check if active code or email conflicts
    const codeConflict = await prisma.organization.findFirst({
      where: {
        organizationCode: cleanOrgCode,
        deletedAt: null,
        NOT: { id: targetOrgId },
      },
    });

    if (codeConflict) {
      throw new Error(`Cannot restore organization. Code '${cleanOrgCode}' is currently used by another active organization.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Restore Org record
      const restoredOrg = await tx.organization.update({
        where: { id: targetOrgId },
        data: {
          organizationCode: cleanOrgCode,
          email: cleanOrgEmail,
          deletedAt: null,
          isActive: true,
          isBlocked: false,
        },
      });

      // 2. Find archived users for this org
      const archivedUsers = await tx.archiveUser.findMany({
        where: { orgId: targetOrgId },
      });

      for (const aUser of archivedUsers) {
        if (!aUser.userId) continue;
        const cleanUEmail = stripDeletedSuffix(aUser.email);
        const cleanUMobile = stripDeletedSuffix(aUser.mobile);

        await tx.user.update({
          where: { id: aUser.userId },
          data: {
            email: cleanUEmail,
            mobile: cleanUMobile,
            status: "APPROVED",
            isActive: true,
            deletedAt: null,
          },
        });
      }

      // 3. Restore teams and posts
      await tx.team.updateMany({
        where: { orgId: targetOrgId },
        data: { deletedAt: null, isActive: true },
      });

      await tx.post.updateMany({
        where: { orgId: targetOrgId },
        data: { deletedAt: null, isActive: true },
      });

      // 4. Delete Archive records
      await tx.archiveUser.deleteMany({
        where: { orgId: targetOrgId },
      });

      await tx.archiveOrg.deleteMany({
        where: { orgId: targetOrgId },
      });

      return restoredOrg;
    });
  } catch (error) {
    console.error("Restore Organization Error:", error);
    throw error;
  }
};

module.exports = {
  archiveUser,
  archiveFailedRegistration,
  archiveOrganization,
  restoreUserFromArchive,
  restoreOrganizationFromArchive,
};
