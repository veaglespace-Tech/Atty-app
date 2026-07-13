const prisma = require("../lib/prisma");
const { 
  ALL_PERMISSIONS, 
  ROLE_DEFAULT_PERMISSIONS, 
  updateRolePermissionsCache 
} = require("../constants/permissions");

const toPermissionName = (key) =>
  String(key || "")
    .split(/[:_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");

const DEFAULT_PERMISSION_DEFINITIONS = ALL_PERMISSIONS.map((key) => ({
  key,
  name: toPermissionName(key),
  description: `Permission to ${String(key).toLowerCase().replace(/[:_]/g, " ")}`,
}));

const initializeRolePermissions = async () => {
  try {
    // 1. Ensure all default permissions exist in the database
    for (const def of DEFAULT_PERMISSION_DEFINITIONS) {
      await prisma.permission.upsert({
        where: { key: def.key },
        update: {},
        create: def,
      });
    }

    // 2. Fetch all role permissions from DB
    const rolePermissions = await prisma.rolePermission.findMany({
      include: { permission: true },
    });

    // 3. Group by role
    const grouped = {};
    for (const rp of rolePermissions) {
      if (!grouped[rp.role]) {
        grouped[rp.role] = [];
      }
      grouped[rp.role].push(rp.permission.key);
    }

    // 4. Update cache
    for (const [role, permissions] of Object.entries(grouped)) {
      updateRolePermissionsCache(role, permissions);
    }

    // 5. Check if default roles are in DB. If not, auto-seed them
    const defaultRoles = ["SUPER_ADMIN", "ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER", "MEMBER"];
    for (const role of defaultRoles) {
      if (!grouped[role]) {
        const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
        if (defaults.length > 0) {
          console.log(`[Permissions] Auto-seeding default permissions for role: ${role}`);
          const dbPermissions = await prisma.permission.findMany({
            where: { key: { in: defaults } }
          });
          
          await prisma.rolePermission.createMany({
            data: dbPermissions.map(p => ({
              role,
              permissionId: p.id
            })),
            skipDuplicates: true
          });
          
          updateRolePermissionsCache(role, defaults);
        }
      }
    }

    console.log("[Permissions] Successfully loaded role permissions into cache.");
  } catch (error) {
    console.error("[Permissions] Failed to initialize role permissions:", error);
  }
};

module.exports = {
  initializeRolePermissions,
  DEFAULT_PERMISSION_DEFINITIONS
};
