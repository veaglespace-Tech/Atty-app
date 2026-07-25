const { getOrgUserById } = require('./controllers/org-user.controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const member = await prisma.organizationMember.findFirst({
    where: { orgId: 1, role: 'MEMBER' },
    select: { userId: true }
  });

  const req = {
    user: { id: 2, role: 'ORG_ADMIN' },
    params: { userId: String(member.userId) }, 
    headers: { 'x-organization-id': '1' },
    get: () => "localhost",
    query: {}
  };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => { console.log('JSON:', JSON.stringify(data, null, 2)); return res; },
    setHeader: () => {},
    locals: { organization: { id: 1 } }
  };

  try {
    await getOrgUserById(req, res);
  } catch (err) {
    console.error("Error:", err);
  }
}
run().finally(() => prisma.$disconnect());
