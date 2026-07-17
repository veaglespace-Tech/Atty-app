const prisma = require("../lib/prisma");
const { ROLE_DEFAULT_PERMISSIONS } = require("../constants/permissions");

async function syncUserPermissions() {
  console.log("Syncing existing users' permissions with new defaults...");
  
  try {
    for (const [role, defaultPermissions] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      const users = await prisma.user.findMany({
        where: { role: role }
      });
      
      let updatedCount = 0;
      for (const user of users) {
        // We could just overwrite, or we could merge. Overwriting with default is safest if they are standard.
        // Let's just overwrite with the new defaults.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: defaultPermissions
          }
        });
        updatedCount++;
      }
      console.log(`Updated permissions for ${updatedCount} users with role ${role}.`);
    }
  } catch (err) {
    console.error("Failed to sync user permissions:", err);
  } finally {
    await prisma.$disconnect();
  }
}

syncUserPermissions();
