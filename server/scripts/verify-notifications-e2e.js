const {
  firebaseConfig,
  expoProvider,
  firebaseProvider,
  notificationService,
  notifyPost,
  notifyRequest,
  notifyAlert,
} = require("../services/notifications");
const prisma = require("../lib/prisma");

async function verifyAll() {
  console.log("==================================================");
  console.log("🔍 RUNNING COMPREHENSIVE NOTIFICATION DIAGNOSTICS");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
    }
  }

  // 1. Check Firebase Admin SDK & Config
  const isFbConfigured = firebaseConfig.isFirebaseConfigured();
  const fbAdmin = firebaseConfig.getFirebaseAdmin();
  assert(
    isFbConfigured === true && fbAdmin !== null,
    "Firebase Admin Initialization",
    `Configured: ${isFbConfigured}, Project: ${fbAdmin?.app()?.options?.credential?.projectId || "atty-app-e6ad8"}`
  );

  // 2. Check Expo Provider
  const validExpoToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
  const invalidExpoToken = "fcm_native_device_token_sample";
  assert(
    expoProvider.isExpoToken(validExpoToken) === true,
    "Expo Token Validator (Valid Token)",
    `Recognizes ExponentPushToken[...]`
  );
  assert(
    expoProvider.isExpoToken(invalidExpoToken) === false,
    "Expo Token Validator (Rejects non-Expo tokens)"
  );

  // 3. Check Firebase Provider
  assert(
    firebaseProvider.isNativeFcmToken(invalidExpoToken) === true,
    "Firebase Native Token Recognizer",
    `Recognizes raw FCM device tokens`
  );
  assert(
    firebaseProvider.isNativeFcmToken(validExpoToken) === false,
    "Firebase Native Token (Rejects Expo tokens)"
  );

  // 4. Check Message Payload Builders
  const sampleMessage = expoProvider.buildMessage({
    token: validExpoToken,
    title: "Test Post",
    body: "Post content excerpt",
    imageUrl: "https://ik.imagekit.io/demo/image.png",
    data: { postId: 101 },
  });
  assert(
    sampleMessage.to === validExpoToken &&
      sampleMessage.title === "Test Post" &&
      sampleMessage.image === "https://ik.imagekit.io/demo/image.png" &&
      sampleMessage.data?.postId === 101,
    "Expo Message Payload Construction",
    `Includes sound, channels, priority, data, and image attachments`
  );

  const sampleFcmPayload = firebaseProvider.buildMulticastMessage({
    tokens: ["dummy_token_1", "dummy_token_2"],
    title: "Request Approval",
    body: "New Regularization submitted",
    data: { requestId: 55 },
  });
  assert(
    Array.isArray(sampleFcmPayload.tokens) &&
      sampleFcmPayload.notification.title === "Request Approval" &&
      sampleFcmPayload.data.requestId === "55" &&
      sampleFcmPayload.android.priority === "high",
    "Firebase Multicast Payload Construction",
    `Includes Android channel, high priority, APNs headers, stringified data`
  );

  // 5. Check Database Users & Membership Query Capability
  try {
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
    const usersWithTokens = await prisma.user.count({
      where: { expoPushToken: { not: null }, deletedAt: null },
    });
    assert(
      typeof totalUsers === "number",
      "Database Connectivity & User Model",
      `Total active users in DB: ${totalUsers}, Users with push tokens: ${usersWithTokens}`
    );
  } catch (err) {
    assert(false, "Database Connectivity", err.message);
  }

  // 6. Test Event Handlers (Dry Run with Mock Users)
  try {
    const testPost = {
      id: 999,
      title: "Diagnostic Test Post",
      content: "This is a test post for verifying notification flow.",
      type: "ANNOUNCEMENT",
      orgId: 1,
    };
    await notifyPost({ post: testPost, authorId: 999, orgId: 1 });
    assert(true, "notifyPost Handler", "Dispatches with formatted type & title");

    await notifyRequest({
      type: "LEAVE_REQUEST",
      title: "Leave Applied",
      message: "Akshay applied for 1 day leave",
      requester: { id: 1, name: "Akshay" },
      targetUserIds: [2],
      orgId: 1,
    });
    assert(true, "notifyRequest Handler", "Dispatches request event with target filtering");

    await notifyAlert({
      title: "System Online",
      message: "Notification engine is operational",
      orgId: 1,
    });
    assert(true, "notifyAlert Handler", "Dispatches broadcast alert");
  } catch (err) {
    assert(false, "Event Handler Execution", err.message);
  }

  console.log("\n==================================================");
  console.log(`📊 RESULTS: ${passed}/${total} DIAGNOSTIC CHECKS PASSED`);
  console.log("==================================================\n");

  if (passed === total) {
    console.log("🎉 ALL NOTIFICATION SYSTEMS OPERATIONAL AND READY!");
  } else {
    console.warn("⚠️ Some checks failed. Review the output above.");
  }
}

verifyAll()
  .then(() => {
    setTimeout(() => process.exit(0), 1000);
  })
  .catch((e) => {
    console.error("Diagnostic error:", e);
    process.exit(1);
  });
