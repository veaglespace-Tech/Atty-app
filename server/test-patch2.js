const { patchOrgUser } = require('./controllers/org-user.controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const req = {
    user: { id: 2, role: 'ORG_ADMIN' },
    params: { userId: '17' }, 
    body: { isActive: true },
    headers: { 'x-organization-id': '1' },
    get: () => "localhost",
  };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => { console.log('JSON:', JSON.stringify(data.item.active, null, 2)); return res; },
    setHeader: () => {},
    locals: { organization: { id: 1 } }
  };

  try {
    await patchOrgUser(req, res);
  } catch (err) {
    console.error("Error:", err);
  }
}
run().finally(() => prisma.$disconnect());
