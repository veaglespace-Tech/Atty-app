const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking free_trial_claim schema and insert query...");
    const organizationEmail = "test-org-" + Date.now() + "@example.com";
    const adminEmail = "test-admin-" + Date.now() + "@example.com";
    const adminPhone = "+919999999999";
    const normalizedPlanCode = "FREE_7D_TRIAL";
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const orgName = "Test Org";
    const adminName = "Test Admin";

    console.log("Attempting raw insert into free_trial_claim...");
    await prisma.$executeRaw`INSERT INTO free_trial_claim (orgEmail,adminEmail,adminPhone,planCode,startDate,endDate,orgName,adminName) VALUES (${organizationEmail},${adminEmail},${adminPhone},${normalizedPlanCode},${new Date()},${expiryDate},${orgName},${adminName})`;
    
    console.log("Raw insert succeeded!");
    
    // clean up
    await prisma.freeTrialClaim.deleteMany({
      where: {
        orgEmail: organizationEmail
      }
    });
    console.log("Cleanup succeeded.");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
