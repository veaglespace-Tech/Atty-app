const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { ensureOrganizationId } = require("../services/common.service");
const { assertPermission } = require("../services/access.service");
const { PERMISSIONS, hasPermission } = require("../constants/permissions");

exports.getOrgInstruments = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  // Ideally, check permission to view instruments here if needed

  const instruments = await prisma.instrument.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  res.status(200).json({
    success: true,
    items: instruments,
  });
});

exports.createOrgInstrument = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  // Optional: check permissions
  // assertPermission(res, req.user, PERMISSIONS.ORGANIZATION.UPDATE, orgId);

  const { name, description } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Instrument name is required");
  }

  const existing = await prisma.instrument.findFirst({
    where: { orgId, name },
  });

  if (existing) {
    res.status(400);
    throw new Error("Instrument with this name already exists in this organization");
  }

  const instrument = await prisma.instrument.create({
    data: {
      orgId,
      name,
      description: description || "",
    },
  });

  res.status(201).json({
    success: true,
    message: "Instrument created successfully",
    item: instrument,
  });
});

exports.patchOrgInstrument = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;
  const { name, description } = req.body;

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  if (name) {
    const existing = await prisma.instrument.findFirst({
      where: {
        orgId,
        name,
        id: { not: Number(id) },
      },
    });
    if (existing) {
      res.status(400);
      throw new Error("Another instrument with this name already exists");
    }
  }

  const updatedInstrument = await prisma.instrument.update({
    where: { id: Number(id) },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  res.status(200).json({
    success: true,
    message: "Instrument updated successfully",
    item: updatedInstrument,
  });
});

exports.deleteOrgInstrument = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params;

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  await prisma.instrument.delete({
    where: { id: Number(id) },
  });

  res.status(200).json({
    success: true,
    message: "Instrument deleted successfully",
  });
});

exports.assignInstrumentToUsers = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { instrumentId, userIds, assetId, assignments } = req.body;

  if (!instrumentId) {
    res.status(400);
    throw new Error("Instrument ID is required");
  }

  const hasValidUserIds = Array.isArray(userIds) && userIds.length > 0;
  const hasValidAssignments = Array.isArray(assignments) && assignments.length > 0;

  if (!hasValidUserIds && !hasValidAssignments) {
    res.status(400);
    throw new Error("User IDs or assignments array is required and must not be empty");
  }

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(instrumentId), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  let dataToInsert = [];
  if (assignments && assignments.length > 0) {
    dataToInsert = assignments.map(a => ({
      userId: Number(a.userId),
      instrumentId: Number(instrumentId),
      assetId: a.assetId || null,
    }));
  } else {
    dataToInsert = userIds.map(userId => ({
      userId: Number(userId),
      instrumentId: Number(instrumentId),
      assetId: assetId || null,
    }));
  }

  await prisma.userInstrument.createMany({
    data: dataToInsert,
    skipDuplicates: true,
  });

  res.status(200).json({
    success: true,
    message: "Instrument assigned successfully",
  });
});

exports.unassignInstrumentFromUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { instrumentId, userId } = req.params;

  // Optional: verify instrument belongs to org
  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(instrumentId), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  await prisma.userInstrument.delete({
    where: {
      userId_instrumentId: {
        userId: Number(userId),
        instrumentId: Number(instrumentId),
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Instrument unassigned successfully",
  });
});

exports.updateInstrumentAssignment = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { instrumentId, userId } = req.params;
  const { assetId } = req.body;

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(instrumentId), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  await prisma.userInstrument.update({
    where: {
      userId_instrumentId: {
        userId: Number(userId),
        instrumentId: Number(instrumentId),
      },
    },
    data: {
      assetId: assetId || null,
    },
  });

  res.status(200).json({
    success: true,
    message: "Instrument assignment updated successfully",
  });
});

