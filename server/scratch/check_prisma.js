const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking PostType enum...");
  // We can't easily access the enum values directly from the client object 
  // without a query, but we can try to look at the internal model.
  try {
    const post = await prisma.post.findFirst();
    console.log("Prisma is working.");
  } catch (e) {
    console.log("Prisma trial failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
