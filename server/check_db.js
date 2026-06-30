import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE organization`);
    console.log(result);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
