const prisma = require("../lib/prisma");
const { PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS } = require("../constants/permissions");

const toPermissionName = (key) =>
  String(key || "")
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");

const DEFAULT_PERMISSION_DEFINITIONS = Object.values(PERMISSION_KEYS).map((key) => ({
  key,
  name: toPermissionName(key),
  description: `Permission to ${String(key).toLowerCase().replace(/_/g, " ")}`,
}));

const ensurePermissionCatalogSeeded = async (tx) => {
  for (const permission of DEFAULT_PERMISSION_DEFINITIONS) {
    await tx.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
      },
      create: permission,
    });
  }
};

const ensureDefaultRoleMappingsSeeded = async (tx) => {
  const existingRoleMappingCount = await tx.rolePermission.count();
  if (existingRoleMappingCount > 0) {
    return;
  }

  const permissions = await tx.permission.findMany({
    select: {
      id: true,
      key: true,
    },
  });

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
  const mappingRows = [];

  for (const [role, permissionKeys] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    permissionKeys.forEach((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) return;

      mappingRows.push({
        role,
        permissionId,
      });
    });
  }

  if (mappingRows.length === 0) {
    return;
  }

  await tx.rolePermission.createMany({
    data: mappingRows,
    skipDuplicates: true,
  });
};

const ensureRbacCatalogReady = async () => {
  await prisma.$transaction(async (tx) => {
    await ensurePermissionCatalogSeeded(tx);
    await ensureDefaultRoleMappingsSeeded(tx);
  });
};

module.exports = {
  ensureRbacCatalogReady,
};
