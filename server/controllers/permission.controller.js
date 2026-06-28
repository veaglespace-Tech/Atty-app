const asyncHandler = require("express-async-handler");
const { PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS } = require("../constants/permissions");

const toPermissionName = (key) =>
  String(key || "")
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");

const DEFAULT_PERMISSION_DEFINITIONS = Object.values(PERMISSION_KEYS).map((key) => ({
  id: key,
  key,
  name: toPermissionName(key),
  description: `Permission to ${String(key).toLowerCase().replace(/_/g, " ")}`,
}));

// @desc    Get all permissions
// @route   GET /api/super-admin/permissions
// @access  SuperAdmin
exports.getPermissions = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    items: DEFAULT_PERMISSION_DEFINITIONS,
  });
});

// @desc    Create new permission
// @route   POST /api/super-admin/permissions
// @access  SuperAdmin
exports.createPermission = asyncHandler(async (req, res) => {
  res.status(400);
  throw new Error("Permissions are statically defined and cannot be modified.");
});

// @desc    Update permission
// @route   PATCH /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.updatePermission = asyncHandler(async (req, res) => {
  res.status(400);
  throw new Error("Permissions are statically defined and cannot be modified.");
});

// @desc    Delete permission
// @route   DELETE /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.deletePermission = asyncHandler(async (req, res) => {
  res.status(400);
  throw new Error("Permissions are statically defined and cannot be modified.");
});

// @desc    Get all role permissions
// @route   GET /api/super-admin/roles/permissions
// @access  SuperAdmin
exports.getRolePermissions = asyncHandler(async (req, res) => {
  const roles = ["SUPER_ADMIN", "ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER", "MEMBER"];
  const mapping = roles.map((role) => ({
    role,
    permissions: (ROLE_DEFAULT_PERMISSIONS[role] || []).map(key => 
      DEFAULT_PERMISSION_DEFINITIONS.find(p => p.key === key)
    ).filter(Boolean),
  }));

  res.status(200).json({
    success: true,
    items: mapping,
  });
});

// @desc    Update role permissions
// @route   POST /api/super-admin/roles/permissions
// @access  SuperAdmin
exports.updateRolePermissions = asyncHandler(async (req, res) => {
  res.status(400);
  throw new Error("Role permissions are statically defined and cannot be modified.");
});
