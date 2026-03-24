const prisma = require("../lib/prisma");
const asyncHandler = require("express-async-handler");

const toFeatureList = (value) => {
  if (Array.isArray(value)) {
    return value.map((feature) => String(feature).trim()).filter(Boolean);
  }

  return [];
};

const mapPlanForResponse = (plan) => {
  const featureList = Array.isArray(plan.features)
    ? plan.features
    : toFeatureList(plan.features);

  const maxUsers = Number(plan.maxUsers || 0);
  const memberLimit = Number(plan.memberLimit || maxUsers || 0);

  return {
    ...plan,
    features: featureList,
    memberLimit,
    limits: {
      maxUsers: maxUsers || memberLimit,
      maxTeams: Number(plan.maxTeams || 0),
      maxLocations: Number(plan.maxLocations || 0),
    },
  };
};

// @desc    Get all active plans
// @route   GET /api/plans
// @access  Public
exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  res.status(200).json({
    success: true,
    plans: plans.map(mapPlanForResponse),
  });
});

// @desc    Get single plan by ID
// @route   GET /api/plans/:id
// @access  Private/SuperAdmin
exports.getPlanById = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  res.status(200).json({
    success: true,
    plan: mapPlanForResponse(plan),
  });
});

// @desc    Create a new plan
// @route   POST /api/plans
// @access  Private/SuperAdmin
exports.createPlan = asyncHandler(async (req, res) => {
  const { name, code, price, durationInDays, features, limits, memberLimit, isDefault, description } = req.body;

  if (!name || !code || price === undefined || durationInDays === undefined) {
    res.status(400);
    throw new Error("name, code, price and durationInDays are required");
  }

  const normalizedCode = String(code).trim().toUpperCase();
  const normalizedName = String(name).trim();
  const parsedPrice = Number(price);
  const parsedDuration = Number(durationInDays);
  const parsedMemberLimit = memberLimit === undefined || memberLimit === null ? 0 : Number(memberLimit);

  if (!normalizedName || !normalizedCode) {
    res.status(400);
    throw new Error("Invalid name or code");
  }

  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    res.status(400);
    throw new Error("price must be a valid non-negative number");
  }

  if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
    res.status(400);
    throw new Error("durationInDays must be a positive number");
  }

  if (Number.isNaN(parsedMemberLimit) || parsedMemberLimit < 0) {
    res.status(400);
    throw new Error("memberLimit must be a non-negative number");
  }

  const parsedMaxUsers =
    limits && limits.maxUsers !== undefined && limits.maxUsers !== null 
      ? Number(limits.maxUsers)
      : parsedMemberLimit;

  if (Number.isNaN(parsedMaxUsers) || parsedMaxUsers < 0) {
    res.status(400);
    throw new Error("limits.maxUsers must be a non-negative number");
  }

  const parsedMaxTeams =
    limits && limits.maxTeams !== undefined && limits.maxTeams !== null
      ? Number(limits.maxTeams)
      : 0;

  const parsedMaxLocations =
    limits && limits.maxLocations !== undefined && limits.maxLocations !== null
      ? Number(limits.maxLocations)
      : 0;

  if (Number.isNaN(parsedMaxTeams) || parsedMaxTeams < 0) {
    res.status(400);
    throw new Error("limits.maxTeams must be a non-negative number");
  }

  if (Number.isNaN(parsedMaxLocations) || parsedMaxLocations < 0) {
    res.status(400);
    throw new Error("limits.maxLocations must be a non-negative number");
  }

  const planExists = await prisma.plan.findUnique({ where: { code: normalizedCode } });
  if (planExists) {
    res.status(400);
    throw new Error("Plan with this code already exists");
  }

  const plan = await prisma.plan.create({
    data: {
      name: normalizedName,
      code: normalizedCode,
      price: parsedPrice,
      durationInDays: parsedDuration,
      features: toFeatureList(features),
      memberLimit: parsedMemberLimit,
      maxUsers: parsedMaxUsers,
      maxTeams: parsedMaxTeams,
      maxLocations: parsedMaxLocations,
      isDefault: Boolean(isDefault),
      description: description ? String(description).trim() : "",
    },
  });

  res.status(201).json({
    success: true,
    plan: mapPlanForResponse(plan),
  });
});

// @desc    Delete a plan (soft delete or deactivate)
// @route   DELETE /api/plans/:id
// @access  Private/SuperAdmin
exports.deletePlan = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  await prisma.plan.update({
    where: { id: plan.id },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: "Plan deactivated",
  });
});

// @desc    Update a plan
// @route   PUT /api/plans/:id
// @access  Private/SuperAdmin
exports.updatePlan = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const { name, price, durationInDays, features, limits, memberLimit, isDefault, isActive, description } = req.body;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  const updateData = {};
  if (name !== undefined) updateData.name = String(name).trim();
  if (price !== undefined) updateData.price = Number(price);
  if (durationInDays !== undefined) updateData.durationInDays = Number(durationInDays);
  if (features !== undefined) updateData.features = toFeatureList(features);
  if (memberLimit !== undefined) updateData.memberLimit = Number(memberLimit);
  if (limits !== undefined) {
    if (limits.maxUsers !== undefined) updateData.maxUsers = Number(limits.maxUsers);
    if (limits.maxTeams !== undefined) updateData.maxTeams = Number(limits.maxTeams);
    if (limits.maxLocations !== undefined) updateData.maxLocations = Number(limits.maxLocations);
  } else if (memberLimit !== undefined) {
    updateData.maxUsers = Number(memberLimit);
  }
  if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (description !== undefined) updateData.description = String(description).trim();

  const updatedPlan = await prisma.plan.update({
    where: { id: planId },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    plan: mapPlanForResponse(updatedPlan),
  });
});
