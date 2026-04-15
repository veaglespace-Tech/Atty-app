const prisma = require("../lib/prisma");

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      orgId: true,
      memberships: { select: { orgId: true, role: true, isActive: true } },
    },
    take: 5,
    orderBy: { id: "asc" },
  });
  
  console.log("Available users:");
  for (const u of users) {
    const membership = u.memberships[0];
    console.log(`  ID:${u.id} | ${u.email} | role:${u.role} | orgId:${u.orgId} | membership:${membership ? membership.role : "none"}`);
  }
  
  // Also find org codes
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, organizationCode: true },
    take: 3,
  });
  console.log("\nOrganizations:");
  for (const o of orgs) {
    console.log(`  ID:${o.id} | ${o.name} | code:${o.organizationCode}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
