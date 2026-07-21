const prisma = require("../lib/prisma");
const { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } = require("../constants/permissions");

async function seedRBAC() {
  console.log("Seeding RBAC data...");

  const permissions = ALL_PERMISSIONS.map((key) => ({
    key: key,
    name: key.split(":").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" "),
    description: `Permission to ${key.toLowerCase().replace(/:/g, " ")}`,
  }));

  try {
    // 1. Seed Permissions
    for (const p of permissions) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: p,
      });
    }
    console.log(`Seeded ${permissions.length} permissions.`);

    // 2. Seed Role-Permission Mappings
    const allPermissionsInDb = await prisma.permission.findMany();
    const permissionMap = new Map(allPermissionsInDb.map((p) => [p.key, p.id]));

    for (const [role, rolePermissions] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      console.log(`Mapping permissions for role: ${role}`);
      for (const pKey of rolePermissions) {
        const pId = permissionMap.get(pKey);
        if (pId) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role,
                permissionId: pId,
              },
            },
            update: {},
            create: {
              role: role,
              permissionId: pId,
            },
          });
        }
      }
    }
    console.log("Role-Permission mappings seeded successfully.");

  } catch (error) {
    console.error("Error seeding RBAC:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRBAC();
