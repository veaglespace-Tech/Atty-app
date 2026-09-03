const prisma = require("../lib/prisma");
const { uploadImageDataUrl } = require("../services/image-upload.service");

exports.getMyClaims = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organizationId || req.user.orgId;

    const claims = await prisma.expenseClaim.findMany({
      where: { orgId: parseInt(orgId), userId: parseInt(userId) },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: claims,
    });
  } catch (error) {
    next(error);
  }
};

exports.raiseClaim = async (req, res, next) => {
  try {
    const { expenseType, amount, description } = req.body;
    const userId = req.user.id;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!expenseType || !amount) {
      return res.status(400).json({ success: false, message: "Please provide expenseType and amount" });
    }

    let receiptUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadResult = await uploadImageDataUrl({
        dataUrl,
        folder: "veagle-attendee/expense-receipts",
        publicId: `org-${orgId}-user-${userId}-receipt-${Date.now()}`,
        maxBytes: 5 * 1024 * 1024,
        missingConfigMessage: "Image uploads are not configured on the server.",
        invalidMessage: "Upload a valid JPG, PNG, WEBP, or GIF image.",
        unsupportedMessage: "Only JPG, PNG, WEBP, or GIF images are supported.",
        emptyMessage: "Selected receipt image is empty.",
        tooLargeMessage: "Receipt image must be 5 MB or smaller.",
      });

      receiptUrl = uploadResult.url;
      receiptPublicId = uploadResult.publicId;
    }

      const claimNo = `CLM-${Date.now()}`;

      const claim = await prisma.expenseClaim.create({
        data: {
          orgId: parseInt(orgId),
          userId: parseInt(userId),
          claimNo,
          expenseType,
          description,
          amount: parseFloat(amount),
          receiptUrl,
          receiptPublicId,
          status: "PENDING",
        },
      });

    res.status(201).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllClaims = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;
    const { search, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const where = { orgId: parseInt(orgId) };
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { expenseType: { contains: search } },
        { claimNo: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const orderBy = {};
    if (["createdAt", "amount", "status"].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const claims = await prisma.expenseClaim.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy,
    });

    res.status(200).json({
      success: true,
      data: claims,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateClaimStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const claim = await prisma.expenseClaim.findUnique({
      where: { id: parseInt(id) },
    });

    if (!claim || claim.orgId !== parseInt(orgId)) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    if (claim.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Claim is already processed" });
    }

    if (status === "APPROVED") {
      const transaction = await prisma.$transaction(async (tx) => {
        // 1. Update Claim Status
        const updatedClaim = await tx.expenseClaim.update({
          where: { id: parseInt(id) },
          data: { status: "APPROVED" },
        });

        // 2. Create Expense Transaction
        const newTransaction = await tx.expenseTransaction.create({
          data: {
            orgId: parseInt(orgId),
            type: "CLAIM_SETTLEMENT",
            amount: parseFloat(claim.amount),
            title: `Claim Payment: ${claim.expenseType}`,
            items: [{ name: claim.expenseType, amount: claim.amount }],
          },
        });

        // 3. Link transaction to claim
        await tx.expenseClaim.update({
          where: { id: parseInt(id) },
          data: { transactionId: newTransaction.id },
        });

        // 4. Update Org Balance
        await tx.organization.update({
          where: { id: parseInt(orgId) },
          data: { fundBalance: { decrement: parseFloat(claim.amount) } },
        });

        return updatedClaim;
      });

      return res.status(200).json({ success: true, data: transaction });
    } else {
      const updatedClaim = await prisma.expenseClaim.update({
        where: { id: parseInt(id) },
        data: { status: "REJECTED" },
      });

      return res.status(200).json({ success: true, data: updatedClaim });
    }
  } catch (error) {
    next(error);
  }
};

exports.getClaimByNo = async (req, res, next) => {
  try {
    const { claimNo } = req.params;
    const orgId = req.user.organizationId || req.user.orgId;

    const claim = await prisma.expenseClaim.findUnique({
      where: { claimNo },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!claim || claim.orgId !== parseInt(orgId)) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    next(error);
  }
};
