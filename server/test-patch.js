const { patchOrgUser } = require('./controllers/org-user.controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const member = await prisma.organizationMember.findFirst({
    where: { orgId: 1, role: 'MEMBER' },
    select: { userId: true }
  });
  if (!member) { console.log("No member found"); return; }
  
  console.log("Testing with User:", member.userId);
  const req = {
    user: { id: 2, role: 'ORG_ADMIN' },
    params: { userId: String(member.userId) }, 
    body: { permissions: ['users:view', 'reports:view'] },
    headers: { 'x-organization-id': '1' },
    get: () => "localhost",
  };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => { console.log('JSON:', JSON.stringify(data, null, 2)); return res; },
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
