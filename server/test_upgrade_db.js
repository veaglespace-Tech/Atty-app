const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { extendSuperAdminOrganizationPlan } = require('./controllers/super-admin.controller');

async function run() {
  const org = await prisma.organization.findFirst({ include: { plan: true } });
  if (!org) return console.log("No org");
  
  const plans = await prisma.plan.findMany();
  const otherPlan = plans.find(p => p.code !== org.plan.code);
  
  const req = {
    params: { organizationId: org.id.toString() },
    body: { additionalDays: 30, planCode: otherPlan.code },
    user: { id: 1 }
  };
  
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => console.log('Response:', JSON.stringify(data, null, 2))
  };
  
  try {
    await extendSuperAdminOrganizationPlan(req, res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
