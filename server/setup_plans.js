const prisma = require("./lib/prisma");
require("dotenv").config();

const plans = [
  // FREE TRIAL: 1-500 Users
  {
    name: "Free Trial - 7 Days",
    code: "FREE_7D_TRIAL",
    description: "Up to 500 users free for 7 days (one-time trial)",
    price: 0,
    durationInDays: 7,
    features: ["Up to 500 Users", "Manual Attendance", "WhatsApp Exports", "Basic Support"],
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
    features: ["Up to 500 Users", "Manual Attendance", "WhatsApp Exports", "Basic Support"],
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
    features: ["Up to 500 Users", "Manual Attendance", "WhatsApp Exports", "Basic Support"],
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
    features: ["Up to 500 Users", "Manual Attendance", "WhatsApp Exports", "Basic Support"],
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
    features: ["Up to 1000 Users", "Face Recognition", "Advanced PDF Reports", "Priority Sync"],
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
    features: ["Up to 1000 Users", "Face Recognition", "Advanced PDF Reports", "Priority Sync"],
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
    features: ["Up to 1000 Users", "Face Recognition", "Advanced PDF Reports", "Priority Sync"],
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
    features: ["Up to 1500 Users", "AI Analytics", "API Integration", "24/7 Dedicated Support"],
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
    features: ["Up to 1500 Users", "AI Analytics", "API Integration", "24/7 Dedicated Support"],
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
    features: ["Up to 1500 Users", "AI Analytics", "API Integration", "24/7 Dedicated Support"],
    memberLimit: 1500,
    maxUsers: 1500,
    maxTeams: 50,
    maxLocations: 20,
    isDefault: false,
  },
];

async function seedPlans() {
  try {
    await prisma.$connect();
    console.log("Connected to MySQL via Prisma for seeding...");
    console.log("Upserting pricing plans without clearing existing relations...");

    for (const plan of plans) {
      await prisma.plan.upsert({
        where: { code: plan.code },
        update: plan,
        create: plan,
      });
    }

    console.log(`Subscription plans seeded successfully. Total seeded plans: ${plans.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding plans:", error);
    process.exit(1);
  }
}

seedPlans();
