const prisma = require("../lib/prisma");
const { uploadImageDataUrl } = require("../services/image-upload.service");

exports.getBalanceAndTransactions = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;

    const { search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const org = await prisma.organization.findUnique({
      where: { id: parseInt(orgId) },
      select: { fundBalance: true },
    });

    const where = { orgId: parseInt(orgId) };
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const orderBy = {};
    if (['createdAt', 'amount', 'type'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy,
    });

    res.status(200).json({
      success: true,
      data: {
        fundBalance: org ? org.fundBalance : 0,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

  exports.addDeposit = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Please provide a valid deposit amount" });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const newTransaction = await tx.expenseTransaction.create({
        data: {
          orgId: parseInt(orgId),
          type: "DEPOSIT",
          amount: parseFloat(amount),
          title: description || "Fund Deposit",
        },
      });

      // 2. Update Org Balance
      await tx.organization.update({
        where: { id: parseInt(orgId) },
        data: {
          fundBalance: { increment: parseFloat(amount) },
        },
      });

      return newTransaction;
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

  exports.addWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalType, totalAmount } = req.body;
    let { items } = req.body;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!withdrawalType || !items || !totalAmount) {
      return res.status(400).json({ success: false, message: "Please provide withdrawalType, items, and totalAmount" });
    }

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid items format" });
      }
    }

    let receiptUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadResult = await uploadImageDataUrl({
        dataUrl,
        folder: "veagle-attendee/expense-receipts",
        publicId: `org-${orgId}-withdrawal-receipt-${Date.now()}`,
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

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const newTransaction = await tx.expenseTransaction.create({
        data: {
          orgId: parseInt(orgId),
          type: "WITHDRAWAL",
          amount: parseFloat(totalAmount),
          title: withdrawalType,
          items: items, // JSON
          receiptUrl,
          receiptPublicId,
        },
      });

      // 2. Update Org Balance
      await tx.organization.update({
        where: { id: parseInt(orgId) },
        data: {
          fundBalance: { decrement: parseFloat(totalAmount) },
        },
      });

      return newTransaction;
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

exports.settleClaim = async (req, res, next) => {
  try {
    const { claimNo, amountPaid } = req.body;
    const orgId = req.user.organizationId || req.user.orgId;

    if (!claimNo || !amountPaid) {
      return res.status(400).json({ success: false, message: "Please provide claimNo and amountPaid" });
    }

    const claim = await prisma.expenseClaim.findUnique({
      where: { claimNo },
    });

    if (!claim || claim.orgId !== parseInt(orgId)) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    if (claim.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Claim is already processed" });
    }

    let receiptUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadResult = await uploadImageDataUrl({
        dataUrl,
        folder: "veagle-attendee/expense-receipts",
        publicId: `org-${orgId}-settlement-receipt-${Date.now()}`,
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

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const newTransaction = await tx.expenseTransaction.create({
        data: {
          orgId: parseInt(orgId),
          type: "CLAIM_SETTLEMENT",
          amount: parseFloat(amountPaid),
          title: `Claim Settlement: ${claim.expenseType} (${claimNo})`,
          items: [{ name: claim.expenseType, amount: amountPaid }],
          receiptUrl,
          receiptPublicId,
        },
      });

      // 2. Link transaction to claim & approve
      const updatedClaim = await tx.expenseClaim.update({
        where: { id: claim.id },
        data: { 
          status: "APPROVED",
          transactionId: newTransaction.id
        },
      });

      // 3. Update Org Balance
      await tx.organization.update({
        where: { id: parseInt(orgId) },
        data: {
          fundBalance: { decrement: parseFloat(amountPaid) },
        },
      });

      return updatedClaim;
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

const ExcelJS = require("exceljs");
exports.exportTransactionsExcel = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;
    const { search, type } = req.query;

    const where = { orgId: parseInt(orgId) };
    if (type && type !== "ALL") where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const org = await prisma.organization.findUnique({
      where: { id: parseInt(orgId) },
      select: { fundBalance: true }
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount), 0);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");

    worksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Type", key: "type", width: 20 },
      { header: "Title", key: "title", width: 30 },
      { header: "Amount", key: "amount", width: 15 },
    ];

    transactions.forEach(t => {
      worksheet.addRow({
        date: new Date(t.createdAt).toLocaleDateString(),
        type: t.type,
        title: t.title,
        amount: (t.type === "DEPOSIT" ? "+" : "-") + t.amount
      });
    });

    worksheet.addRow({});
    worksheet.addRow({ title: "Total Filtered Transactions", amount: totalAmount });
    worksheet.addRow({ title: "Total Organization Balance", amount: org?.fundBalance || 0 });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="transactions.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

const PDFDocument = require("pdfkit");
exports.exportTransactionsPdf = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;
    const { search, type } = req.query;

    const where = { orgId: parseInt(orgId) };
    if (type && type !== "ALL") where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const org = await prisma.organization.findUnique({
      where: { id: parseInt(orgId) },
      select: { fundBalance: true }
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount), 0);

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="transactions.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text("Expense Transactions Report", { align: "center" });
    doc.moveDown();

    transactions.forEach(t => {
      doc.fontSize(12).text(`Date: ${new Date(t.createdAt).toLocaleDateString()}`);
      doc.text(`Type: ${t.type}`);
      doc.text(`Title: ${t.title}`);
      doc.text(`Amount: ${t.type === "DEPOSIT" ? "+" : "-"}Rs ${t.amount}`);
      doc.moveDown();
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total Filtered Transactions: Rs ${totalAmount}`);
    doc.text(`Total Organization Balance: Rs ${org?.fundBalance || 0}`);

    doc.end();
  } catch (error) {
    next(error);
  }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId || req.user.orgId;
    const { id } = req.params;

    const transaction = await prisma.expenseTransaction.findFirst({
      where: {
        id: parseInt(id),
        orgId: parseInt(orgId),
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Attempt to fetch related claim if it's a claim settlement
    let claimDetails = null;
    if (transaction.type === "CLAIM_SETTLEMENT") {
      claimDetails = await prisma.expenseClaim.findFirst({
        where: { transactionId: transaction.id },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        claimDetails
      }
    });
  } catch (error) {
    next(error);
  }
};
