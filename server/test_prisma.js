const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const POST_INCLUDE = { author: { select: { name: true, role: true, memberships: { select: { orgId: true, role: true, isActive: true } } } } };
async function main() {
  try {
    const where = { authorId: 1, OR: [{ orgId: 1 }, { orgId: null }], isActive: true, deletedAt: null };
    await prisma.post.findMany({ where, include: POST_INCLUDE });
    console.log('success');
  } catch(e) {
    console.error('ERROR_CAUGHT:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
