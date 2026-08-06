const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let firebaseApp = null;
let isConfigured = false;

function loadServiceAccount() {
  // 1. Check custom path from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const customPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(customPath)) {
      try {
        const content = fs.readFileSync(customPath, "utf8");
        return JSON.parse(content);
      } catch (err) {
        console.error(`[FIREBASE CONFIG] Error parsing service account at ${customPath}:`, err.message);
      }
    } else {
      console.warn(`[FIREBASE CONFIG] File specified in FIREBASE_SERVICE_ACCOUNT_PATH not found: ${customPath}`);
    }
  }

  // 2. Check default server/config/firebase-service-account.json location
  const defaultPath = path.join(__dirname, "../../config/firebase-service-account.json");
  if (fs.existsSync(defaultPath)) {
    try {
      const content = fs.readFileSync(defaultPath, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.error(`[FIREBASE CONFIG] Error parsing default service account JSON at ${defaultPath}:`, err.message);
    }
  }

  // 3. Check inline JSON string in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error("[FIREBASE CONFIG] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON env var:", err.message);
    }
  }

  return null;
}

function initializeFirebase() {
  if (firebaseApp) return firebaseApp;
  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    isConfigured = true;
    return firebaseApp;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.log("[FIREBASE CONFIG] Using Expo Push Notification service (Direct Firebase Admin fallback is disabled).");
    isConfigured = false;
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    isConfigured = true;
    console.log(`[FIREBASE CONFIG] Successfully initialized Firebase Admin for project: ${serviceAccount.project_id || "unknown"}`);
    return firebaseApp;
  } catch (error) {
    console.error("[FIREBASE CONFIG] Failed to initialize Firebase Admin:", error.message);
    isConfigured = false;
    return null;
  }
}

// Attempt initialization on load
initializeFirebase();

module.exports = {
  getFirebaseAdmin: () => {
    if (!firebaseApp && !isConfigured) {
      return initializeFirebase();
    }
    return admin;
  },
  isFirebaseConfigured: () => isConfigured,
  initializeFirebase,
};
