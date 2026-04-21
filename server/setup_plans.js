require("./config/load-env")();
const prisma = require("./lib/prisma");

const buildPlanFeatures = (userLimit) => [
  `Up to ${userLimit} Users`,
  "Manual Attendance",
  "Face Recognition",
  "Advanced PDF Reports",
  "Excel Reports",
  "Chatbot Support",
];

const buildFreeTrialFeatures = (userLimit) => [
  `Up to ${userLimit} Users`,
  "Manual Attendance",
  "Face Recognition",
  "Chatbot Support",
];

const plans = [
  // FREE TRIAL: 1-500 Users
  {
    name: "Free Trial - 7 Days",
    code: "FREE_7D_TRIAL",
    description: "Up to 500 users free for 7 days (one-time trial)",
    price: 0,
    durationInDays: 7,
    features: buildFreeTrialFeatures(500),
    memberLimit: 500,
    maxUsers: 500,
    maxTeams: 10,
    maxLocations: 5,
    isDefault: false,
  },

  // PLAN 1: 1-500 Users
  {
    name: "Plan 1 - 3 Months",
    code: "PLAN1_3M",
    description: "Up to 500 users for 3 months",
    price: 3000,
    durationInDays: 90,
    features: buildPlanFeatures(500),
    memberLimit: 500,
    maxUsers: 500,
    maxTeams: 10,
    maxLocations: 5,
    isDefault: false,
  },
  {
    name: "Plan 1 - 6 Months",
    code: "PLAN1_6M",
    description: "Up to 500 users for 6 months",
    price: 5000,
    durationInDays: 180,
    features: buildPlanFeatures(500),
    memberLimit: 500,
    maxUsers: 500,
    maxTeams: 10,
    maxLocations: 5,
    isDefault: false,
  },
  {
    name: "Plan 1 - 12 Months",
    code: "PLAN1_12M",
    description: "Up to 500 users for 12 months",
    price: 10500,
    durationInDays: 365,
    features: buildPlanFeatures(500),
    memberLimit: 500,
    maxUsers: 500,
    maxTeams: 10,
    maxLocations: 5,
    isDefault: false,
  },

  // PLAN 2: 1-1000 Users
  {
    name: "Plan 2 - 3 Months",
    code: "PLAN2_3M",
    description: "Up to 1000 users for 3 months",
    price: 4500,
    durationInDays: 90,
    features: buildPlanFeatures(1000),
    memberLimit: 1000,
    maxUsers: 1000,
    maxTeams: 20,
    maxLocations: 10,
    isDefault: false,
  },
  {
    name: "Plan 2 - 6 Months",
    code: "PLAN2_6M",
    description: "Up to 1000 users for 6 months",
    price: 8000,
    durationInDays: 180,
    features: buildPlanFeatures(1000),
    memberLimit: 1000,
    maxUsers: 1000,
    maxTeams: 20,
    maxLocations: 10,
    isDefault: false,
  },
  {
    name: "Plan 2 - 12 Months",
    code: "PLAN2_12M",
    description: "Up to 1000 users for 12 months",
    price: 14500,
    durationInDays: 365,
    features: buildPlanFeatures(1000),
    memberLimit: 1000,
    maxUsers: 1000,
    maxTeams: 20,
    maxLocations: 10,
    isDefault: false,
  },

  // PLAN 3: 1-1500 Users
  {
    name: "Plan 3 - 3 Months",
    code: "PLAN3_3M",
    description: "Up to 1500 users for 3 months",
    price: 6000,
    durationInDays: 90,
    features: buildPlanFeatures(1500),
    memberLimit: 1500,
    maxUsers: 1500,
    maxTeams: 50,
    maxLocations: 20,
    isDefault: false,
  },
  {
    name: "Plan 3 - 6 Months",
    code: "PLAN3_6M",
    description: "Up to 1500 users for 6 months",
    price: 10500,
    durationInDays: 180,
    features: buildPlanFeatures(1500),
    memberLimit: 1500,
    maxUsers: 1500,
    maxTeams: 50,
    maxLocations: 20,
    isDefault: false,
  },
  {
    name: "Plan 3 - 12 Months",
    code: "PLAN3_12M",
    description: "Up to 1500 users for 12 months",
    price: 18500,
    durationInDays: 365,
    features: buildPlanFeatures(1500),
    memberLimit: 1500,
    maxUsers: 1500,
    maxTeams: 50,
    maxLocations: 20,
    isDefault: false,
  },
];

const escapeSqlString = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

const buildJsonArraySql = (items = []) =>
  `JSON_ARRAY(${(Array.isArray(items) ? items : [])
    .map((item) => `'${escapeSqlString(item)}'`)
    .join(", ")})`;

const upsertPlan = async (plan) => {
  const sql = `
    INSERT INTO \`plan\` (
      \`name\`,
      \`code\`,
      \`description\`,
      \`price\`,
      \`currency\`,
      \`durationInDays\`,
      \`features\`,
      \`memberLimit\`,
      \`maxUsers\`,
      \`maxTeams\`,
      \`maxLocations\`,
      \`isActive\`,
      \`isDefault\`,
      \`updatedAt\`
    )
    VALUES (
      '${escapeSqlString(plan.name)}',
      '${escapeSqlString(plan.code)}',
      '${escapeSqlString(plan.description)}',
      ${Number(plan.price || 0)},
      'INR',
      ${Number(plan.durationInDays || 0)},
      ${buildJsonArraySql(plan.features)},
      ${Number(plan.memberLimit || 0)},
      ${Number(plan.maxUsers || 0)},
      ${Number(plan.maxTeams || 0)},
      ${Number(plan.maxLocations || 0)},
      1,
      ${plan.isDefault ? 1 : 0},
      CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      \`name\` = VALUES(\`name\`),
      \`description\` = VALUES(\`description\`),
      \`price\` = VALUES(\`price\`),
      \`currency\` = VALUES(\`currency\`),
      \`durationInDays\` = VALUES(\`durationInDays\`),
      \`features\` = ${buildJsonArraySql(plan.features)},
      \`memberLimit\` = VALUES(\`memberLimit\`),
      \`maxUsers\` = VALUES(\`maxUsers\`),
      \`maxTeams\` = VALUES(\`maxTeams\`),
      \`maxLocations\` = VALUES(\`maxLocations\`),
      \`isActive\` = VALUES(\`isActive\`),
      \`isDefault\` = VALUES(\`isDefault\`),
      \`updatedAt\` = CURRENT_TIMESTAMP(3)
  `;

  await prisma.$executeRawUnsafe(sql);
};

async function seedPlans() {
  try {
    await prisma.$connect();
    console.log("Connected to MySQL via Prisma for seeding...");
    console.log("Upserting pricing plans without clearing existing relations...");

    for (const plan of plans) {
      await upsertPlan(plan);
    }

    console.log(`Subscription plans seeded successfully. Total seeded plans: ${plans.length}`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding plans:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

seedPlans();
