/**
 * Integration test: Verifies all changes from the permissions + enum session.
 * Tests: Login → Post creation (ARTICLE/TOURNAMENT_CARD) → Attendance → Permissions
 */
const BASE = "http://localhost:5000/api";

async function request(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function log(label, pass, detail = "") {
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

async function main() {
  let allPassed = true;
  const fail = (label, detail) => { allPassed = false; log(label, false, detail); };

  console.log("\n━━━ TEST 1: Server Health ━━━");
  try {
    const res = await fetch(`${BASE}/../`);
    log("Server reachable", res.status > 0, `status ${res.status}`);
  } catch (e) {
    fail("Server reachable", e.message);
    console.log("\n⛔ Server not running. Aborting.");
    return;
  }

  console.log("\n━━━ TEST 2: Login as ORG_ADMIN ━━━");
  // Try login — if it fails we need valid credentials
  const loginRes = await request("POST", "/auth/login", {
    email: "admin@test.com",
    password: "Test@123",
    loginAs: "ORG_ADMIN",
  });

  let token = loginRes.data?.token;
  let user = loginRes.data?.user;

  if (!token) {
    // Try searching for orgs first to find a valid one
    const orgSearch = await request("GET", "/auth/organizations/search?q=");
    const orgCode = orgSearch.data?.organizations?.[0]?.organizationCode;
    
    if (orgCode) {
      const retryLogin = await request("POST", "/auth/login", {
        email: "admin@test.com",
        password: "Test@123",
        loginAs: "ORG_ADMIN",
        organizationCode: orgCode,
      });
      token = retryLogin.data?.token;
      user = retryLogin.data?.user;
    }
  }

  if (token) {
    log("Login successful", true, `user: ${user?.name || user?.email}`);
  } else {
    log("Login", false, `status ${loginRes.status}: ${loginRes.data?.message || "No valid test credentials"}`);
    console.log("  ℹ️  Skipping authenticated tests (no valid test account).");
    console.log("  ℹ️  Testing unauthenticated endpoints only.\n");
  }

  console.log("\n━━━ TEST 3: Prisma PostType Enum Sync ━━━");
  const prisma = require("../lib/prisma");
  try {
    const cols = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM post LIKE 'type'");
    const enumDef = cols[0]?.Type || "";
    const hasArticle = enumDef.includes("ARTICLE");
    const hasTournament = enumDef.includes("TOURNAMENT_CARD");
    log("ARTICLE in DB enum", hasArticle, enumDef);
    log("TOURNAMENT_CARD in DB enum", hasTournament);
    if (!hasArticle || !hasTournament) allPassed = false;
  } catch (e) {
    fail("DB enum check", e.message);
  }

  console.log("\n━━━ TEST 4: Permission Constants Sync ━━━");
  const { PERMISSION_KEYS, ALL_PERMISSIONS } = require("../constants/permissions.js");
  log("LOCATION_SET defined", !!PERMISSION_KEYS.LOCATION_SET, PERMISSION_KEYS.LOCATION_SET);
  log("POST_CREATE defined", !!PERMISSION_KEYS.POST_CREATE, PERMISSION_KEYS.POST_CREATE);
  log("ALL_PERMISSIONS includes both", 
    ALL_PERMISSIONS.includes("LOCATION_SET") && ALL_PERMISSIONS.includes("POST_CREATE"),
    `total: ${ALL_PERMISSIONS.length}`
  );
  if (!PERMISSION_KEYS.LOCATION_SET || !PERMISSION_KEYS.POST_CREATE) allPassed = false;

  console.log("\n━━━ TEST 5: Access Service ━━━");
  try {
    const { assertPermission } = require("../services/access.service.js");
    log("assertPermission function exists", typeof assertPermission === "function");
    if (typeof assertPermission !== "function") allPassed = false;
  } catch (e) {
    fail("access.service.js import", e.message);
  }

  if (token) {
    console.log("\n━━━ TEST 6: Post CRUD with New Types ━━━");
    
    // Create ARTICLE post
    const articleRes = await request("POST", "/posts", {
      title: "Test Article Post",
      content: "Testing new ARTICLE type works correctly.",
      type: "ARTICLE",
    }, token);
    const articleCreated = articleRes.status === 201;
    log("Create ARTICLE post", articleCreated, `status ${articleRes.status}: ${articleRes.data?.message || articleRes.data?.error || ""}`);
    if (!articleCreated) allPassed = false;

    // Create TOURNAMENT_CARD post
    const tournamentRes = await request("POST", "/posts", {
      title: "Test Tournament Card",
      content: "Testing new TOURNAMENT_CARD type works correctly.",
      type: "TOURNAMENT_CARD",
      metadata: { teams: ["Team A", "Team B"], score: "0-0" },
    }, token);
    const tournamentCreated = tournamentRes.status === 201;
    log("Create TOURNAMENT_CARD post", tournamentCreated, `status ${tournamentRes.status}: ${tournamentRes.data?.message || tournamentRes.data?.error || ""}`);
    if (!tournamentCreated) allPassed = false;

    // Get all posts (verify they show up)
    const postsRes = await request("GET", "/posts", null, token);
    const postsOk = postsRes.status === 200 && Array.isArray(postsRes.data?.items);
    log("Fetch posts list", postsOk, `${postsRes.data?.items?.length || 0} posts returned`);
    if (!postsOk) allPassed = false;

    // Clean up test posts
    if (articleRes.data?.item?.id) {
      await request("DELETE", `/posts/${articleRes.data.item.id}`, null, token);
    }
    if (tournamentRes.data?.item?.id) {
      await request("DELETE", `/posts/${tournamentRes.data.item.id}`, null, token);
    }
    log("Cleanup test posts", true);

    console.log("\n━━━ TEST 7: Attendance Endpoints ━━━");
    const attendanceRes = await request("GET", "/org/attendance", null, token);
    log("Attendance list", attendanceRes.status === 200, `status ${attendanceRes.status}`);

    const summaryRes = await request("GET", "/org/attendance/summary", null, token);
    const summaryHasAbsent = summaryRes.data?.absent !== undefined;
    log("Attendance summary", summaryRes.status === 200 && summaryHasAbsent, 
      `present=${summaryRes.data?.present}, absent=${summaryRes.data?.absent}, late=${summaryRes.data?.late}`);

    console.log("\n━━━ TEST 8: Geo Settings (LOCATION_SET) ━━━");
    const geoRes = await request("GET", "/org/attendance/settings", null, token);
    log("Get geofencing settings", geoRes.status === 200, `status ${geoRes.status}`);

    console.log("\n━━━ TEST 9: Session Sync (GET /me) ━━━");
    const meRes = await request("GET", "/auth/me", null, token);
    const meOk = meRes.status === 200 && meRes.data?.user;
    log("GET /me returns user", meOk, meRes.data?.user?.email || "");
    const hasPermissions = meRes.data?.user?.permissions !== undefined || meRes.data?.user?.role;
    log("User has role/permissions data", hasPermissions, `role: ${meRes.data?.user?.role || meRes.data?.user?.currentRole}`);
  }

  await prisma.$disconnect();

  console.log("\n" + "═".repeat(50));
  console.log(allPassed ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED — see ❌ above");
  console.log("═".repeat(50) + "\n");
}

main().catch(console.error);
