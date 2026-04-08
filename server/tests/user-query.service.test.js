const { inferManagedUserRole, mapUserForManagement } = require("../services/user-query.service");

describe("user management role mapping", () => {
  it("infers sub admin from admin permissions even when stored role resolves to member", () => {
    const user = {
      id: 21,
      name: "Ops User",
      email: "ops@example.com",
      mobile: "+919999999999",
      status: "APPROVED",
      isActive: true,
      role: "MEMBER",
      permissions: [
        "TEAM_VIEW",
        "ATTENDANCE_VIEW",
        "ATTENDANCE_MANAGE",
        "REPORTS_VIEW",
        "USERS_CREATE",
        "USERS_STATUS_UPDATE",
        "USERS_ACTIVE_TOGGLE",
      ],
      memberships: [
        {
          orgId: 9,
          role: "MEMBER",
          isActive: true,
        },
      ],
    };

    expect(inferManagedUserRole(user, "MEMBER", user.permissions)).toBe("SUB_ADMIN");
    expect(mapUserForManagement(user, 9).role).toBe("SUB_ADMIN");
  });

  it("infers team leader from team-leader permission set when membership role is member", () => {
    const user = {
      id: 22,
      name: "Lead User",
      email: "lead@example.com",
      mobile: "+919888888888",
      status: "APPROVED",
      isActive: true,
      role: "MEMBER",
      permissions: ["TEAM_VIEW", "ATTENDANCE_VIEW", "REPORTS_VIEW"],
      memberships: [
        {
          orgId: 9,
          role: "MEMBER",
          isActive: true,
        },
      ],
    };

    expect(inferManagedUserRole(user, "MEMBER", user.permissions)).toBe("TEAM_LEADER");
    expect(mapUserForManagement(user, 9).role).toBe("TEAM_LEADER");
  });
});
