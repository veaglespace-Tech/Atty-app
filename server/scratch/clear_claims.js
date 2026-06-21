const prisma = require("../lib/prisma");

async function main() {
  try {
    console.log("Cleaning up all existing records from free_trial_claim table...");
    const result = await prisma.freeTrialClaim.deleteMany({});
    console.log(`Successfully cleared ${result.count} trial claim records from the database!`);
  } catch (err) {
    console.error("Failed to clear free trial claims:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
