const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { ensureOrganizationId } = require("../services/common.service");

exports.getOrgDepartments = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);

  const departments = await prisma.department.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { users: true },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profileImageUrl: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  res.status(200).json({
    success: true,
    items: departments,
  });
});

exports.createOrgDepartment = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Department name is required");
  }

  const trimmedName = name.trim();

  const existing = await prisma.department.findFirst({
    where: { orgId, name: trimmedName },
  });

  if (existing) {
    res.status(400);
    throw new Error("Department with this name already exists in this organization");
  }

  const department = await prisma.department.create({
    data: {
      orgId,
      name: trimmedName,
      description: (description || "").trim(),
    },
    include: {
      _count: {
        select: { users: true },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    item: department,
  });
});

exports.patchOrgDepartment = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;
  const { name, description } = req.body;

  const department = await prisma.department.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  if (name && name.trim()) {
    const trimmedName = name.trim();
    const existing = await prisma.department.findFirst({
      where: {
        orgId,
        name: trimmedName,
        id: { not: Number(id) },
      },
    });
    if (existing) {
      res.status(400);
      throw new Error("Another department with this name already exists");
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: Number(id) },
    data: {
      ...(name && name.trim() ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
    },
    include: {
      _count: {
        select: { users: true },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Department updated successfully",
    item: updatedDepartment,
  });
});

exports.deleteOrgDepartment = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;

  const department = await prisma.department.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  await prisma.department.delete({
    where: { id: Number(id) },
  });

  res.status(200).json({
    success: true,
    message: "Department deleted successfully",
  });
});

exports.assignDepartmentToUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { departmentId, userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error("userIds array is required and must not be empty");
  }

  const numericDeptId = departmentId ? Number(departmentId) : null;

  if (numericDeptId) {
    const department = await prisma.department.findFirst({
      where: { id: numericDeptId, orgId },
    });

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }
  }

  const numericUserIds = userIds.map(id => Number(id));

  await prisma.user.updateMany({
    where: {
      id: { in: numericUserIds },
      OR: [
        { orgId },
        { memberships: { some: { orgId } } },
      ],
    },
    data: {
      departmentId: numericDeptId,
    },
  });

  res.status(200).json({
    success: true,
    message: numericDeptId ? "Users assigned to department successfully" : "Users unassigned from department successfully",
  });
});

exports.unassignDepartmentFromUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { departmentId, userId } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      id: Number(userId),
      OR: [
        { orgId },
        { memberships: { some: { orgId } } },
      ],
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found in this organization");
  }

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { departmentId: null },
  });

  res.status(200).json({
    success: true,
    message: "User unassigned from department successfully",
  });
});
