const {
  assertPermission,
  assertAnyPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
} = require("../services/access.service");

// Mock dependencies
jest.mock("../constants/permissions", () => ({
  hasPermission: jest.fn(),
  resolveUserPermissions: jest.fn(),
}));
const { hasPermission, resolveUserPermissions } = require("../constants/permissions");

jest.mock("../utils/membership", () => ({
  resolveUserRole: jest.fn(),
}));
const { resolveUserRole } = require("../utils/membership");

describe("access.service", () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
    };
  });

  describe("assertPermission", () => {
    it("should throw error if user lacks permission", () => {
      hasPermission.mockReturnValue(false);
      expect(() => assertPermission(mockRes, {}, "SOME_PERM")).toThrow("Missing required permission");
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it("should not throw if user has permission", () => {
      hasPermission.mockReturnValue(true);
      expect(() => assertPermission(mockRes, {}, "SOME_PERM")).not.toThrow();
    });
  });

  describe("assertAnyPermission", () => {
    it("should throw error if user lacks all permissions", () => {
      hasPermission.mockReturnValue(false);
      expect(() => assertAnyPermission(mockRes, {}, ["PERM1", "PERM2"])).toThrow("Missing required permission");
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it("should not throw if user has at least one permission", () => {
      hasPermission.mockImplementation((user, perm) => perm === "PERM2");
      expect(() => assertAnyPermission(mockRes, {}, ["PERM1", "PERM2"])).not.toThrow();
    });
  });

  describe("assertRoleScope", () => {
    it("should throw if membership is missing", () => {
      resolveUserRole.mockReturnValue(null);
      expect(() => assertRoleScope(mockRes, {}, "MEMBER")).toThrow("Membership is required for this action");
    });

    it("should allow SUPER_ADMIN to manage anyone", () => {
      resolveUserRole.mockReturnValue("SUPER_ADMIN");
      expect(() => assertRoleScope(mockRes, {}, "ORG_ADMIN")).not.toThrow();
    });

    it("should allow ORG_ADMIN to manage anyone", () => {
      resolveUserRole.mockReturnValue("ORG_ADMIN");
      expect(() => assertRoleScope(mockRes, {}, "SUPER_ADMIN")).not.toThrow();
    });

    it("should allow SUB_ADMIN to manage MEMBER", () => {
      resolveUserRole.mockReturnValue("SUB_ADMIN");
      expect(() => assertRoleScope(mockRes, {}, "MEMBER")).not.toThrow();
    });

    it("should allow SUB_ADMIN to manage TEAM_LEADER", () => {
      resolveUserRole.mockReturnValue("SUB_ADMIN");
      expect(() => assertRoleScope(mockRes, {}, "TEAM_LEADER")).not.toThrow();
    });

    it("should throw if SUB_ADMIN tries to manage ORG_ADMIN", () => {
      resolveUserRole.mockReturnValue("SUB_ADMIN");
      expect(() => assertRoleScope(mockRes, {}, "ORG_ADMIN")).toThrow("Sub admin can only manage members and team leaders");
    });

    it("should allow TEAM_LEADER to manage MEMBER", () => {
      resolveUserRole.mockReturnValue("TEAM_LEADER");
      expect(() => assertRoleScope(mockRes, {}, "MEMBER")).not.toThrow();
    });

    it("should throw if TEAM_LEADER tries to manage TEAM_LEADER", () => {
      resolveUserRole.mockReturnValue("TEAM_LEADER");
      expect(() => assertRoleScope(mockRes, {}, "TEAM_LEADER")).toThrow("Team leader can only manage member accounts");
    });
  });

  describe("sanitizePermissionsByAssigner", () => {
    it("should return full permissions for SUPER_ADMIN", () => {
      resolveUserRole.mockReturnValue("SUPER_ADMIN");
      const result = sanitizePermissionsByAssigner({}, ["PERM1", "PERM2"]);
      expect(result).toEqual(["PERM1", "PERM2"]);
    });

    it("should return full permissions for ORG_ADMIN", () => {
      resolveUserRole.mockReturnValue("ORG_ADMIN");
      const result = sanitizePermissionsByAssigner({}, ["PERM1", "PERM2"]);
      expect(result).toEqual(["PERM1", "PERM2"]);
    });

    it("should filter permissions for SUB_ADMIN based on their own permissions", () => {
      resolveUserRole.mockReturnValue("SUB_ADMIN");
      resolveUserPermissions.mockReturnValue(["PERM1"]); // actor has PERM1
      const result = sanitizePermissionsByAssigner({}, ["PERM1", "PERM2"]);
      expect(result).toEqual(["PERM1"]); // PERM2 stripped out
    });

    it("should return full fallback permissions for lower roles (BUGGY BEHAVIOR)", () => {
      resolveUserRole.mockReturnValue("TEAM_LEADER");
      // Current behavior in code doesn't filter for TEAM_LEADER/MEMBER
      const result = sanitizePermissionsByAssigner({}, ["PERM1", "PERM2"]);
      expect(result).toEqual(["PERM1", "PERM2"]);
    });
  });
});
