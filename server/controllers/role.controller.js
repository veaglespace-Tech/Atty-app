const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { updateRoleCache } = require("../constants/rbac");

exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
  });
  roles.forEach(role => updateRoleCache(role.code, role.dashboardPath));
  res.status(200).json({ success: true, data: roles });
});

exports.createRole = asyncHandler(async (req, res) => {
  const { code, name, description, dashboardPath } = req.body;

  if (!code || !name) {
    res.status(400);
    throw new Error("Code and Name are required");
  }

  const existingRole = await prisma.role.findUnique({
    where: { code },
  });

  if (existingRole) {
    res.status(400);
    throw new Error("Role with this code already exists");
  }

  const newRole = await prisma.role.create({
    data: {
      code: code.toUpperCase().replace(/\s+/g, '_'),
      name,
      description: description || "",
      dashboardPath: dashboardPath || "/member/dashboard",
      isSystem: false,
    },
  });

  updateRoleCache(newRole.code, newRole.dashboardPath);
  res.status(201).json({ success: true, data: newRole });
});

exports.updateRole = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { name, description, dashboardPath } = req.body;

  const role = await prisma.role.findUnique({ where: { code } });
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }

  if (role.isSystem) {
    res.status(400);
    throw new Error("System roles cannot be modified");
  }

  const updatedRole = await prisma.role.update({
    where: { code },
    data: {
      name: name || role.name,
      description: description !== undefined ? description : role.description,
      dashboardPath: dashboardPath || role.dashboardPath,
    },
  });

  updateRoleCache(updatedRole.code, updatedRole.dashboardPath);
  res.status(200).json({ success: true, data: updatedRole });
});

exports.deleteRole = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const role = await prisma.role.findUnique({ where: { code } });
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }

  if (role.isSystem) {
    res.status(400);
    throw new Error("System roles cannot be deleted");
  }

  // Check if role is in use
  const userCount = await prisma.user.count({ where: { role: code } });
  const orgMemberCount = await prisma.organizationMember.count({ where: { role: code } });

  if (userCount > 0 || orgMemberCount > 0) {
    res.status(400);
    throw new Error("Role is currently assigned to users and cannot be deleted");
  }

  await prisma.role.delete({ where: { code } });
  res.status(200).json({ success: true, message: "Role deleted successfully" });
});
