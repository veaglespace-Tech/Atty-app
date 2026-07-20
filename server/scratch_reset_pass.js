const bcrypt = require("bcryptjs");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("12345678", 10);
  await prisma.user.update({
    where: { email: "ganesh@gmail.com" },
    data: { password: hashedPassword }
  });
  console.log("Password updated successfully");
}
main().finally(() => prisma.$disconnect());
