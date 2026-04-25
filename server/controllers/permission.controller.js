const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

// @desc    Get all permissions
// @route   GET /api/super-admin/permissions
// @access  SuperAdmin
exports.getPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: { key: "asc" },
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
    throw new Error("Key and Name are required");
  }

  const normalizedKey = String(key).toUpperCase().trim().replace(/[\s-]+/g, "_");

  const existing = await prisma.permission.findUnique({
    where: { key: normalizedKey },
  });

  if (existing) {
    res.status(400);
    throw new Error("Permission key already exists");
  }

  const permission = await prisma.permission.create({
    data: {
      key: normalizedKey,
      name: name.trim(),
      description: description || "",
    },
  });

  res.status(201).json({
    success: true,
    message: "Permission created successfully",
    item: permission,
  });
});

// @desc    Update permission
// @route   PATCH /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.updatePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const permission = await prisma.permission.update({
    where: { id: Number(id) },
    data: {
      name: name?.trim(),
      description: description?.trim(),
    },
  });

  res.status(200).json({
    success: true,
    message: "Permission updated successfully",
    item: permission,
  });
});

// @desc    Delete permission
// @route   DELETE /api/super-admin/permissions/:id
// @access  SuperAdmin
exports.deletePermission = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.permission.delete({
    where: { id: Number(id) },
  });

  res.status(200).json({
    success: true,
    message: "Permission deleted successfully",
  });
});

// @desc    Get all role permissions
// @route   GET /api/super-admin/roles/permissions
// @access  SuperAdmin
exports.getRolePermissions = asyncHandler(async (req, res) => {
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      permission: true,
    },
  });

  // Group by role
  const roles = ["SUPER_ADMIN", "ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER", "MEMBER"];
  const mapping = roles.map((role) => ({
    role,
    permissions: rolePermissions
      .filter((rp) => rp.role === role)
      .map((rp) => rp.permission),
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
  const { role, permissionIds } = req.body;

  if (!role || !Array.isArray(permissionIds)) {
    res.status(400);
    throw new Error("Role and permissionIds array are required");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete existing mappings for this role
    await tx.rolePermission.deleteMany({
      where: { role },
    });

    // 2. Create new mappings
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((pId) => ({
          role,
          permissionId: Number(pId),
        })),
      });
    }
  });

  res.status(200).json({
    success: true,
    message: `Permissions updated for ${role}`,
  });
});
