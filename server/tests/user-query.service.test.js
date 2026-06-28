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

});
