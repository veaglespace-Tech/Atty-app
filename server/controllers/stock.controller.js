const prisma = require("../lib/prisma");

exports.addStock = async (req, res, next) => {
  try {
    const { name, type, quantity } = req.body;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!name || !type || quantity === undefined) {
      return res.status(400).json({ success: false, message: "Please provide all required fields (name, type, quantity)" });
    }

    const stock = await prisma.stock.create({
      data: {
        orgId: parseInt(orgId),
        name,
        type,
        quantity: parseInt(quantity),
      },
    });

    res.status(201).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStock = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;

    const stock = await prisma.stock.findMany({
      where: { orgId: parseInt(orgId) },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    next(error);
  }
};
