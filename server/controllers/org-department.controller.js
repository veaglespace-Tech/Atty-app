const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { ensureOrganizationId } = require("../services/common.service");
const { buildExportWorkbookBuffer } = require("../utils/excel-report");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const xlsx = require("xlsx");

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

exports.downloadOrgDepartmentsExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { departmentId } = req.query;

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const orgName = organization?.name || "Organization";

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: Number(departmentId), orgId },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            mobile: true,
            status: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }

    const columns = [
      { key: "index", label: "No.", width: 25 },
      { key: "name", label: "Member Name", width: 90 },
      { key: "email", label: "Email Address", width: 110 },
      { key: "role", label: "Role", width: 60 },
      { key: "mobile", label: "Contact No.", width: 80 },
      { key: "status", label: "Status", width: 60 },
      { key: "createdAt", label: "Joined Date", width: 60 },
    ];

    const rows = (department.users || []).map((user, index) => ({
      index: index + 1,
      name: user.name || "-",
      email: user.email || "-",
      role: user.role || "-",
      mobile: user.mobile || "-",
      status: user.status || "ACTIVE",
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
    }));

    const safeDeptName = department.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const buffer = buildExportWorkbookBuffer({
      title: `${orgName} — ${department.name} Department Report`,
      subtitleLines: [
        `Department Description: ${department.description || "N/A"}`,
        `Total Members: ${department.users?.length || 0} | Organization Code: ${organization?.organizationCode || "-"}`,
      ],
      sheetName: department.name.slice(0, 31),
      columns,
      rows,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${safeDeptName}-department-report.xlsx"`);
    return res.send(buffer);
  }

  // All Departments report (Multi-Sheet: Overview + Detailed Allocations)
  const departments = await prisma.department.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const allUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { orgId },
        { memberships: { some: { orgId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      mobile: true,
      status: true,
      createdAt: true,
      department: { select: { name: true } },
    },
    orderBy: [{ departmentId: "asc" }, { name: "asc" }],
  });

  // Sheet 1 Data: Departments Overview
  const overviewHeaders = ["No.", "Department Name", "Description", "Total Members", "Created Date"];
  const overviewRows = departments.map((dept, index) => [
    index + 1,
    dept.name || "-",
    dept.description || "-",
    dept._count?.users || 0,
    dept.createdAt ? new Date(dept.createdAt).toLocaleDateString("en-IN") : "-",
  ]);

  const overviewSheetData = [
    [`${orgName} — All Departments Overview`],
    [`Organization Code: ${organization?.organizationCode || "-"}`],
    [],
    overviewHeaders,
    ...overviewRows,
  ];

  const overviewWorksheet = xlsx.utils.aoa_to_sheet(overviewSheetData);
  overviewWorksheet["!cols"] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
  ];

  // Sheet 2 Data: All Member Allocations
  const memberHeaders = ["No.", "Department Name", "Member Name", "Email Address", "Role", "Contact No.", "Status", "Joined Date"];
  const memberRows = allUsers.map((user, index) => [
    index + 1,
    user.department?.name || "Unassigned",
    user.name || "-",
    user.email || "-",
    user.role || "-",
    user.mobile || "-",
    user.status || "ACTIVE",
    user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
  ]);

  const memberSheetData = [
    [`${orgName} — All Member Allocations`],
    [`Organization Code: ${organization?.organizationCode || "-"}`],
    [],
    memberHeaders,
    ...memberRows,
  ];

  const memberWorksheet = xlsx.utils.aoa_to_sheet(memberSheetData);
  memberWorksheet["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, overviewWorksheet, "Departments Overview");
  xlsx.utils.book_append_sheet(workbook, memberWorksheet, "All Member Allocations");

  const buffer = xlsx.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="all-departments-report.xlsx"');
  res.send(buffer);
});

exports.downloadOrgDepartmentsPdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { departmentId } = req.query;

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, organizationCode: true },
  });

  const orgName = organization?.name || "Organization";

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: Number(departmentId), orgId },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            mobile: true,
            status: true,
            createdAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }

    const columns = [
      { key: "index", label: "No.", width: 35, align: "center" },
      { key: "name", label: "Member Name", width: 110, align: "left" },
      { key: "email", label: "Email Address", width: 140, align: "left" },
      { key: "role", label: "Role", width: 70, align: "left" },
      { key: "mobile", label: "Contact No.", width: 85, align: "left" },
      { key: "status", label: "Status", width: 60, align: "center" },
      { key: "createdAt", label: "Joined Date", width: 70, align: "center" },
    ];

    const rows = (department.users || []).map((user, index) => ({
      index: index + 1,
      name: user.name || "-",
      email: user.email || "-",
      role: user.role || "-",
      mobile: user.mobile || "-",
      status: user.status || "ACTIVE",
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
    }));

    const safeDeptName = department.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const pdfBuffer = await buildGenericTablePdf({
      title: `${orgName} — ${department.name} Department Report`,
      subtitleLines: [
        `Department Description: ${department.description || "N/A"}`,
        `Organization Code: ${organization?.organizationCode || "-"}`,
      ],
      summaryCards: [
        { label: "Department", value: department.name },
        { label: "Total Members", value: department.users?.length || 0 },
      ],
      columns,
      rows,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeDeptName}-department-report.pdf"`);
    return res.send(pdfBuffer);
  }

  // All Departments PDF
  const departments = await prisma.department.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const columns = [
    { key: "index", label: "No.", width: 35, align: "center" },
    { key: "name", label: "Department", width: 140, align: "left" },
    { key: "description", label: "Description", width: 220, align: "left" },
    { key: "totalMembers", label: "Total Members", width: 80, align: "center" },
    { key: "createdAt", label: "Created On", width: 80, align: "center" },
  ];

  const rows = departments.map((dept, index) => ({
    index: index + 1,
    name: dept.name || "-",
    description: dept.description || "-",
    totalMembers: dept._count?.users || 0,
    createdAt: dept.createdAt ? new Date(dept.createdAt).toLocaleDateString("en-IN") : "-",
  }));

  const totalAssignedUsers = departments.reduce((acc, d) => acc + (d._count?.users || 0), 0);

  const pdfBuffer = await buildGenericTablePdf({
    title: `${orgName} — All Departments Directory`,
    subtitleLines: [`Organization Code: ${organization?.organizationCode || "-"}`],
    summaryCards: [
      { label: "Total Departments", value: departments.length },
      { label: "Total Assigned Users", value: totalAssignedUsers },
    ],
    columns,
    rows,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="all-departments-report.pdf"');
  res.send(pdfBuffer);
});

