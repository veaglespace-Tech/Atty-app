const asyncHandler = require("express-async-handler");
const { 
  ALL_PERMISSIONS, 
  ROLE_DEFAULT_PERMISSIONS,
  getRolePermissionsCache,
  updateRolePermissionsCache
} = require("../constants/permissions");
const prisma = require("../lib/prisma");

const toPermissionName = (key) =>
  String(key || "")
    .split(/[:_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");

const DEFAULT_PERMISSION_DEFINITIONS = ALL_PERMISSIONS.map((key) => ({
  id: key,
  key,
  name: toPermissionName(key),
  description: `Permission to ${String(key).toLowerCase().replace(/[:_]/g, " ")}`,
}));

// @desc    Get all permissions
// @route   GET /api/super-admin/permissions
// @access  SuperAdmin
exports.getPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: { key: "asc" }
  });
  res.status(200).json({
    success: true,
    items: permissions,
  });
});

// @desc    Create new permission
// @route   POST /api/super-admin/permissions
// @access  SuperAdmin
exports.createPermission = asyncHandler(async (req, res) => {
  const { key, name, description } = req.body;
  if (!key || !name) {
    res.status(400);
    throw new Error("Permission key and name are required");
  }

  const existing = await prisma.permission.findUnique({ where: { key } });
  if (existing) {
    res.status(400);
    throw new Error("Permission key already exists");
  }

  const permission = await prisma.permission.create({
    data: { key, name, description: description || "" },
  });

  res.status(201).json({ success: true, data: permission });
});

// @desc    Update permission
// @route   PATCH /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.updatePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const permission = await prisma.permission.findUnique({ where: { key: id } });
  if (!permission) {
    res.status(404);
    throw new Error("Permission not found");
  }

  const updated = await prisma.permission.update({
    where: { key: id },
    data: { 
      name: name || permission.name, 
      description: description !== undefined ? description : permission.description 
    },
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Delete permission
// @route   DELETE /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.deletePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const permission = await prisma.permission.findUnique({ where: { key: id } });
  if (!permission) {
    res.status(404);
    throw new Error("Permission not found");
  }

  await prisma.permission.delete({ where: { key: id } });

  res.status(200).json({ success: true, message: "Permission deleted" });
});

// @desc    Get all role permissions
// @route   GET /api/super-admin/roles/permissions
// @access  SuperAdmin
exports.getRolePermissions = asyncHandler(async (req, res) => {
  const dbRoles = await prisma.role.findMany({ select: { code: true } });
  const roles = dbRoles.map(r => r.code);
  const cache = getRolePermissionsCache();
  
  const mapping = roles.map((role) => {
    let rolePermissions = cache.get(role);
    if (!rolePermissions) {
      rolePermissions = ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS["MEMBER"] || [];
    }
    
    return {
      role,
      permissions: rolePermissions.map(key => 
        DEFAULT_PERMISSION_DEFINITIONS.find(p => p.key === key)
      ).filter(Boolean),
    };
  });

  res.status(200).json({
    success: true,
    items: mapping,
  });
});

// @desc    Update role permissions
// @route   POST /api/super-admin/roles/permissions
// @access  SuperAdmin
exports.updateRolePermissions = asyncHandler(async (req, res) => {
  const { role, permissionIds } = req.body;
  const permissions = permissionIds || req.body.permissions;

  if (!role || !Array.isArray(permissions)) {
    res.status(400);
    throw new Error("Role and permissions array are required");
  }

  // Ensure role exists
  const roleExists = await prisma.role.findUnique({ where: { code: role } });
  if (!roleExists) {
    res.status(404);
    throw new Error("Role not found");
  }

  // Verify all permissions exist in DB
  const permissionKeys = permissions.map(p => typeof p === 'string' ? p : p.key);
  const dbPermissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } }
  });

  if (dbPermissions.length !== permissionKeys.length) {
    res.status(400);
    throw new Error("One or more permissions are invalid");
  }

  // Delete existing role permissions
  await prisma.rolePermission.deleteMany({
    where: { role }
  });

  // Insert new role permissions
  if (dbPermissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: dbPermissions.map(p => ({
        role,
        permissionId: p.id
      }))
    });
  }

  // Update in-memory cache
  updateRolePermissionsCache(role, dbPermissions.map(p => p.key));

  res.status(200).json({
    success: true,
    message: "Role permissions updated successfully"
  });
});
