const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { ensureOrganizationId } = require("../services/common.service");

exports.getOrgInstruments = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);

  const instruments = await prisma.instrument.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    items: instruments,
  });
});

exports.createOrgInstrument = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);

  const { name, type, serialNumber, description, status } = req.body;
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
      type: type || "IT",
      serialNumber: serialNumber || null,
      status: status || "ACTIVE",
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
  const { name, type, serialNumber, description, status } = req.body;

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  if (name && name !== instrument.name) {
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
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(serialNumber !== undefined ? { serialNumber } : {}),
      ...(status !== undefined ? { status } : {}),
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
  const { id } = req.params; // instrument id
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  await prisma.instrument.update({
    where: { id: Number(id) },
    data: {
      assignedUserId: Number(userId),
    },
  });

  res.status(200).json({
    success: true,
    message: "Instrument assigned successfully",
  });
});

exports.unassignInstrumentFromUser = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { id } = req.params; // instrument id

  const instrument = await prisma.instrument.findFirst({
    where: { id: Number(id), orgId },
  });

  if (!instrument) {
    res.status(404);
    throw new Error("Instrument not found");
  }

  await prisma.instrument.update({
    where: { id: Number(id) },
    data: {
      assignedUserId: null,
    },
  });

  res.status(200).json({
    success: true,
    message: "Instrument unassigned successfully",
  });
});

