const crypto = require("crypto");

const createOrgCode = () => `ORG-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const generateUniqueOrgCode = async (db) => {
  let maxSeq = 0;

  const orgs = await db.organization.findMany({
    where: {
      organizationCode: {
        startsWith: "ORG-",
      },
    },
    select: { organizationCode: true },
  });

  for (const org of orgs) {
    const match = org.organizationCode.match(/^ORG-(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const candidate = `ORG-${String(maxSeq + attempt).padStart(3, "0")}`;
    const existing = await db.organization.findUnique({
      where: {
        organizationCode: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate unique organization code");
};

module.exports = {
  createOrgCode,
  generateUniqueOrgCode,
};
