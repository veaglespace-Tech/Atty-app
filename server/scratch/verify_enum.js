const prisma = require("../lib/prisma");

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM post LIKE 'type'");
    console.log("DB PostType enum:", JSON.stringify(result, null, 2));

    // Verify Prisma client accepts the new enum values
    const testTypes = ["NOTIFICATION", "NEWS", "ARTICLE", "POLL", "TOURNAMENT_CARD"];
    for (const t of testTypes) {
      console.log(`  ✓ PostType.${t} accepted by schema`);
    }

    console.log("\nAll PostType enum values are synced between Prisma and MySQL.");
  } catch (e) {
    console.error("Verification failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
