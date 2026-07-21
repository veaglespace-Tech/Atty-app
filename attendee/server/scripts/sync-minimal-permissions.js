const prisma = require("../lib/prisma");

async function syncMinimalPermissions() {
  console.log("Syncing minimal permissions (Dashboard, Attendance, Notifications) for existing users...");
  
  try {
    const rolesToUpdate = ["SUB_ADMIN", "TEAM_LEADER", "MEMBER"];
    const minimalPermissions = ["ATTENDANCE_VIEW"]; // Only View Attendance is required for the minimal UI

    for (const role of rolesToUpdate) {
      const users = await prisma.user.findMany({
        where: { role: role }
      });
      
      let updatedCount = 0;
      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: minimalPermissions
          }
        });
        updatedCount++;
      }
      console.log(`Updated permissions for ${updatedCount} users with role ${role}.`);
    }
    console.log("Sync complete.");
  } catch (err) {
    console.error("Failed to sync minimal user permissions:", err);
  } finally {
    await prisma.$disconnect();
  }
}

syncMinimalPermissions();
