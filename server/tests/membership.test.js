const { resolveMembership, resolveUserRole } = require("../utils/membership");

describe("membership compatibility", () => {
  it("prefers the legacy organization role when membership was backfilled as MEMBER", () => {
    const user = {
      id: 10,
      orgId: 7,
      role: "ORG_ADMIN",
      isActive: true,
      memberships: [
        {
          orgId: 7,
          role: "MEMBER",
          isActive: true,
        },
      ],
    };

    expect(resolveUserRole(user, 7)).toBe("ORG_ADMIN");
    expect(resolveMembership(user, 7)).toMatchObject({
      orgId: 7,
      role: "ORG_ADMIN",
      isActive: true,
    });
  });

  it("keeps the membership role when it is already more specific than MEMBER", () => {
    const user = {
      id: 11,
      orgId: 7,
      role: "MEMBER",
      isActive: true,
      memberships: [
        {
          orgId: 7,
          role: "TEAM_LEADER",
          isActive: true,
        },
      ],
    };

    expect(resolveUserRole(user, 7)).toBe("TEAM_LEADER");
    expect(resolveMembership(user, 7)).toMatchObject({
      orgId: 7,
      role: "TEAM_LEADER",
      isActive: true,
    });
  });
});
