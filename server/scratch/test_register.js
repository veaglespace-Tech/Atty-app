const prisma = require("../lib/prisma");
const { verifyAndRegister } = require("../controllers/payment.controller");

async function runTest() {
  const req = {
    body: {
      organization: {
        name: "Test Trial Org " + Date.now(),
        email: "test-trial-org-" + Date.now() + "@example.com",
        phone: "9876543210",
        phoneCountryCode: "+91",
        address: "123 Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India"
      },
      admin: {
        name: "Trial Admin",
        email: "trial-admin-" + Date.now() + "@example.com",
        mobile: "9876543210",
        mobileCountryCode: "+91",
        password: "Password123"
      },
      plan: {
        code: "FREE_7D_TRIAL"
      }
    }
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log("SUCCESS RESPONSE:", data);
    }
  };

  try {
    console.log("Calling verifyAndRegister...");
    await verifyAndRegister(req, res);
  } catch (err) {
    console.error("FAIL:", err.message);
    console.error(err.stack);
  } finally {
    // cleanup
    try {
      await prisma.freeTrialClaim.deleteMany({
        where: {
          orgEmail: req.body.organization.email
        }
      });
      console.log("Cleanup claim done.");
    } catch {}
    try {
      const org = await prisma.organization.findUnique({
        where: {
          email: req.body.organization.email
        }
      });
      if (org) {
        await prisma.organizationMember.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.payment.deleteMany({ where: { orgId: org.id } });
        await prisma.subscription.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
        console.log("Cleanup organization/user/subscription done.");
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
    await prisma.$disconnect();
  }
}

runTest();
