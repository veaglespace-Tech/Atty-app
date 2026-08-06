const prisma = require("../lib/prisma");
const { sendPushToUsers, notifyPost } = require("../services/notifications");

async function main() {
  const targetEmail = process.argv[2];

  console.log("=== PUSH NOTIFICATION TEST SCRIPT ===");

  if (targetEmail) {
    const user = await prisma.user.findFirst({
      where: { email: targetEmail },
      select: { id: true, email: true, expoPushToken: true, name: true },
    });

    if (!user) {
      console.error(`User with email "${targetEmail}" not found.`);
      process.exit(1);
    }

    console.log(`Found User: ${user.name} (${user.email})`);
    console.log(`Push Token: ${user.expoPushToken || "NONE (User has not logged in on device yet)"}`);

    if (!user.expoPushToken) {
      console.log("\n⚠️ To receive push notifications, please log into the mobile app with this account first.");
      process.exit(0);
    }

    console.log("\nSending test notification...");
    await sendPushToUsers({
      userIds: [user.id],
      title: "🔔 Test Notification from ATTY",
      body: `Hello ${user.name || "there"}! Your push notifications are working perfectly.`,
      data: { test: true, timestamp: new Date().toISOString() },
    });
  } else {
    // List all users with registered push tokens
    const users = await prisma.user.findMany({
      where: { expoPushToken: { not: null }, deletedAt: null },
      select: { id: true, email: true, name: true, expoPushToken: true },
      take: 10,
    });

    console.log(`Total users with push tokens: ${users.length}`);
    users.forEach((u) => {
      console.log(`- [ID: ${u.id}] ${u.name} (${u.email}) -> Token: ${u.expoPushToken?.substring(0, 30)}...`);
    });

    if (users.length === 0) {
      console.log("\nNo users have registered push tokens yet.");
      console.log("👉 Log in on a physical device in your mobile app to register a token.");
    } else {
      console.log("\n👉 Run with an email to send a test push: node scripts/test-push.js your-email@example.com");
    }
  }

  // Wait 3 seconds for background dispatch to finish
  setTimeout(() => {
    console.log("\nDone!");
    process.exit(0);
  }, 3000);
}

main().catch((err) => {
  console.error("Test script failed:", err);
  process.exit(1);
});
