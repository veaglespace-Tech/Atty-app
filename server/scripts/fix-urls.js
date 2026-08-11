const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_URLS = ["http://localhost:5001", "http://localhost:5000"];
const NEW_URL = "http://localhost:5002";

async function fixUrls() {
  console.log("Fixing URLs in database...");

  // Fix Users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { profileImageUrl: { contains: "http://localhost:" } },
        { documentUrl: { contains: "http://localhost:" } }
      ]
    }
  });

  for (const user of users) {
    let changed = false;
    let data = {};

    if (user.profileImageUrl) {
      for (const old of OLD_URLS) {
        if (user.profileImageUrl.startsWith(old)) {
          data.profileImageUrl = user.profileImageUrl.replace(old, NEW_URL);
          changed = true;
          break;
        }
      }
    }

    if (user.documentUrl) {
      for (const old of OLD_URLS) {
        if (user.documentUrl.startsWith(old)) {
          data.documentUrl = user.documentUrl.replace(old, NEW_URL);
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      await prisma.user.update({
        where: { id: user.id },
        data
      });
      console.log(`Updated user ${user.id}`);
    }
  }

  // Fix Organizations
  const orgs = await prisma.organization.findMany({
    where: {
      logoUrl: { contains: "http://localhost:" }
    }
  });

  for (const org of orgs) {
    let changed = false;
    let data = {};

    if (org.logoUrl) {
      for (const old of OLD_URLS) {
        if (org.logoUrl.startsWith(old)) {
          data.logoUrl = org.logoUrl.replace(old, NEW_URL);
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      await prisma.organization.update({
        where: { id: org.id },
        data
      });
      console.log(`Updated organization ${org.id}`);
    }
  }

  console.log("Done fixing URLs.");
}

fixUrls()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
