const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");

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
    const user = await prisma.user.findFirst({
      where: {
        id: Number(userId),
        ...(orgId ? { orgId: Number(orgId) } : {}),
        deletedAt: null,
      },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      console.warn(`User ${userId} not found for archiving`);
      return null;
    }

    // Create Archive record
    const archived = await prisma.archiveUser.create({
      data: {
        userId: user.id,
        orgId: user.orgId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        mobileCountryCode: user.mobileCountryCode,
        password: user.password,
        role: resolveUserRole(user, orgId || user.orgId),
        status: user.status,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdById: user.createdById,
        deletedAt: user.deletedAt,
        archivedById: archivedById,
        archiveReason: reason || "User archived from system",
        archivedAt: new Date(),
        originalCreatedAt: user.createdAt,
        originalUpdatedAt: user.updatedAt,
        metadata: metadata,
      },
    });

    return archived;
  } catch (error) {
    console.error("Archive User Error:", error);
    return null;
  }
};

/**
 * Archive a failed registration (Organization + Admin)
 * @param {Object} params
 * @param {Object} params.organization - Organization details from form
 * @param {Object} params.admin - Admin user details from form
 * @param {string} [params.reason] - Reason for archiving
 * @param {Object} [params.metadata] - Additional metadata
 */
const archiveFailedRegistration = async ({ organization, admin, reason = "", metadata = {} }) => {
  try {
    // 1. Archive Organization details
    const archivedOrg = await prisma.archiveOrg.create({
      data: {
        name: organization.name,
        email: organization.email,
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

    // 2. Archive Admin details
    const archivedAdmin = await prisma.archiveUser.create({
      data: {
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
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
 * @param {Object} params
 * @param {number} params.orgId - ID of the organization to archive
 * @param {string} [params.reason] - Reason for archiving
 * @param {number} [params.archivedById] - ID of the super-admin who performed the archive
 */
const archiveOrganization = async ({ orgId, reason = "", archivedById = null }) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: Number(orgId) },
      include: {
        users: {
          where: { deletedAt: null },
          include: {
            memberships: true,
          },
        },
      }
    });

    if (!org) return null;

    return await prisma.$transaction(async (tx) => {
      // 1. Archive Organization
      const archivedOrg = await tx.archiveOrg.create({
        data: {
          orgId: org.id,
          name: org.name,
          organizationCode: org.organizationCode,
          email: org.email,
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
          archivedById: archivedById,
          archiveReason: reason || "Organization archived from database",
          archivedAt: new Date(),
          originalCreatedAt: org.createdAt,
          originalUpdatedAt: org.updatedAt,
        }
      });

      // 2. Archive all active users of this org
      for (const user of org.users) {
        await tx.archiveUser.create({
          data: {
            userId: user.id,
            orgId: org.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            mobileCountryCode: user.mobileCountryCode,
            password: user.password,
            role: resolveUserRole(user, org.id),
            status: user.status,
            isActive: false,
            lastLoginAt: user.lastLoginAt,
            createdById: user.createdById,
            deletedAt: new Date(),
            archivedById: archivedById,
            archiveReason: reason || "Organization archived",
            archivedAt: new Date(),
            originalCreatedAt: user.createdAt,
            originalUpdatedAt: user.updatedAt,
          }
        });
      }

      // 3. Delete (soft) the organization and users
      await tx.user.updateMany({
        where: { orgId: org.id },
        data: { deletedAt: new Date(), isActive: false }
      });

      await tx.organization.update({
        where: { id: org.id },
        data: { deletedAt: new Date(), isActive: false }
      });

      return archivedOrg;
    });
  } catch (error) {
    console.error("Archive Organization Error:", error);
    return null;
  }
};

/**
 * Restore a user from archive (back to active state)
 * @param {Object} params
 * @param {number} params.userId - Original User ID
 */
const restoreUserFromArchive = async ({ userId }) => {
  try {
    // Find all archive entries for this user
    // We search by userId OR email to be extra safe
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { email: true }
    });

    const entries = await prisma.archiveUser.findMany({
      where: {
        OR: [
          { userId: Number(userId) },
          { email: user?.email || "" }
        ]
      }
    });

    if (entries.length === 0) return null;

    return await prisma.$transaction(async (tx) => {
      // 1. Update main User record (if not already active)
      const updated = await tx.user.update({
        where: { id: Number(userId) },
        data: {
          status: "APPROVED",
          isActive: true,
          deletedAt: null
        }
      });

      // 2. Remove ALL matching entries from Archive
      await tx.archiveUser.deleteMany({
        where: {
          id: { in: entries.map(e => e.id) }
        }
      });

      return updated;
    });
  } catch (error) {
    console.error("Restore User Error:", error);
    return null;
  }
};

/**
 * Restore an organization from archive
 * @param {Object} params
 * @param {number} params.orgId - ID of the organization to restore
 */
const restoreOrganizationFromArchive = async ({ orgId }) => {
  try {
    // Find the latest archive entry for this organization
    const archived = await prisma.archiveOrg.findFirst({
      where: { orgId: Number(orgId) },
      orderBy: { archivedAt: "desc" }
    });

    if (!archived) return null;

    return await prisma.$transaction(async (tx) => {
      // Restore Org
      const restoredOrg = await tx.organization.update({
        where: { id: Number(orgId) },
        data: {
          deletedAt: null,
          isActive: true,
          isBlocked: false
        }
      });

      // Restore all users that were archived with this org
      const archivedUsers = await tx.archiveUser.findMany({
        where: { orgId: Number(orgId) }
      });

      const userEmails = archivedUsers.map(u => u.email).filter(Boolean);

      // Update main users
      await tx.user.updateMany({
        where: {
          OR: [
            { orgId: Number(orgId) },
            { email: { in: userEmails } }
          ]
        },
        data: {
          deletedAt: null,
          isActive: true
        }
      });

      // Clean up archive records
      await tx.archiveUser.deleteMany({
        where: {
          OR: [
            { orgId: Number(orgId) },
            { email: { in: userEmails } }
          ]
        }
      });

      await tx.archiveOrg.deleteMany({
        where: { orgId: Number(orgId) }
      });

      return restoredOrg;
    });
  } catch (error) {
    console.error("Restore Organization Error:", error);
    return null;
  }
};

module.exports = {
  archiveUser,
  archiveFailedRegistration,
  archiveOrganization,
  restoreUserFromArchive,
  restoreOrganizationFromArchive,
};
