const { PrismaClient } = require('@prisma/client');
const { initializeRolePermissions } = require('../services/permission.service');

const prisma = new PrismaClient();

async function fixPermissions() {
  console.log("Deleting old role permissions...");
  await prisma.rolePermission.deleteMany({});
  
  console.log("Deleting old permissions...");
  await prisma.permission.deleteMany({});
  
  console.log("Re-initializing permissions...");
  await initializeRolePermissions();
  
  console.log("Done!");
}

fixPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
