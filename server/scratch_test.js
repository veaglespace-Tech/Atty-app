const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log(keys);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
