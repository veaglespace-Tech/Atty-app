const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixIPs() {
  const oldIp = 'http://10.25.234.174:5001';
  const newIp = 'http://10.199.45.182:5001';

  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    if (org.logoUrl && org.logoUrl.includes(oldIp)) {
      console.log(`Fixing org logo: ${org.name}`);
      await prisma.organization.update({
        where: { id: org.id },
        data: { logoUrl: org.logoUrl.replace(oldIp, newIp) }
      });
    }
  }

  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.profileImageUrl && user.profileImageUrl.includes(oldIp)) {
      console.log(`Fixing user profile image: ${user.email}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { profileImageUrl: user.profileImageUrl.replace(oldIp, newIp) }
      });
    }
  }

  console.log('Database IP fix complete.');
  process.exit(0);
}

fixIPs().catch(console.error);
