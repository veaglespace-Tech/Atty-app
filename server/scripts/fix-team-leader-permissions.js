const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTeamLeaderPermissions() {
  console.log("Starting to fix existing Team Leader permissions...");
  
  try {
    // Find all users who have the TEAM_LEADER role
    const teamLeaders = await prisma.user.findMany({
      where: {
        role: 'TEAM_LEADER'
      }
    });

    console.log(`Found ${teamLeaders.length} Team Leaders.`);

    let updatedCount = 0;

    for (const user of teamLeaders) {
      // The permissions field is stored as JSON/Array
      let currentPermissions = [];
      if (Array.isArray(user.permissions)) {
        currentPermissions = [...user.permissions];
      } else if (typeof user.permissions === 'string') {
        try {
          currentPermissions = JSON.parse(user.permissions);
        } catch (e) {
          currentPermissions = [];
        }
      }

      const missingPermissions = [];
      if (!currentPermissions.includes('TEAM_VIEW')) missingPermissions.push('TEAM_VIEW');
      if (!currentPermissions.includes('USERS_VIEW')) missingPermissions.push('USERS_VIEW');

      if (missingPermissions.length > 0) {
        const newPermissions = [...currentPermissions, ...missingPermissions];
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: newPermissions
          }
        });
        
        console.log(`Updated User ID ${user.id} (${user.email}) - Added: ${missingPermissions.join(', ')}`);
        updatedCount++;
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} Team Leaders!`);
  } catch (error) {
    console.error("Error fixing permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTeamLeaderPermissions();
