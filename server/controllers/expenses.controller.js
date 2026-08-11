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
      const org = await tx.organization.findUnique({
        where: { id: parseInt(orgId) },
        select: { fundBalance: true },
      });

      if (org.fundBalance < parseFloat(totalAmount)) {
        throw new Error("Insufficient fund balance");
      }

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
    if (error.message === "Insufficient fund balance") {
      return res.status(400).json({ success: false, message: error.message });
    }
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
      const org = await tx.organization.findUnique({
        where: { id: parseInt(orgId) },
        select: { fundBalance: true },
      });

      if (org.fundBalance < parseFloat(amountPaid)) {
        throw new Error("Insufficient fund balance to settle this claim");
      }

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
    if (error.message === "Insufficient fund balance to settle this claim") {
      return res.status(400).json({ success: false, message: error.message });
    }
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
      select: { fundBalance: true, name: true }
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount), 0);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Statement");

    // Title & Meta
    worksheet.mergeCells('A1', 'D1');
    worksheet.getCell('A1').value = `${org?.name || 'Organization'} - Funds & Expenses Statement`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2', 'D2');
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    
    worksheet.addRow([]);

    // Summary
    worksheet.addRow(['Current Fund Balance:', org?.fundBalance || 0]);
    worksheet.getCell(`A${worksheet.rowCount}`).font = { bold: true };
    worksheet.getCell(`B${worksheet.rowCount}`).numFmt = '"Rs "#,##0.00';
    
    worksheet.addRow(['Total Transactions (Filtered):', totalAmount]);
    worksheet.getCell(`A${worksheet.rowCount}`).font = { bold: true };
    worksheet.getCell(`B${worksheet.rowCount}`).numFmt = '"Rs "#,##0.00;[Red]\-"Rs "#,##0.00';

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow(["Date", "Type", "Title", "Amount"]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' } // A nice blue header
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Define columns width
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 25;
    worksheet.getColumn(3).width = 45;
    worksheet.getColumn(4).width = 20;

    transactions.forEach(t => {
      const row = worksheet.addRow([
        new Date(t.createdAt).toLocaleDateString(),
        t.type,
        t.title,
        (t.type === "DEPOSIT" ? t.amount : -t.amount)
      ]);
      row.getCell(4).numFmt = '"Rs "#,##0.00;[Red]\-"Rs "#,##0.00';
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Funds_Expenses_Statement.xlsx"');

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
      select: { fundBalance: true, name: true }
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'DEPOSIT' ? t.amount : -t.amount), 0);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Funds_Expenses_Statement.pdf"');
    doc.pipe(res);

    // Header section
    doc.fontSize(22).font('Helvetica-Bold').text(org?.name || "Organization", { align: "center" });
    doc.fontSize(16).font('Helvetica').text("Funds & Expenses Statement", { align: "center" });
    doc.fontSize(10).fillColor('gray').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown(2);

    // Summary section
    doc.fillColor('black');
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Current Fund Balance: Rs ${org?.fundBalance || 0}`);
    doc.text(`Total Transactions (Filtered): Rs ${totalAmount}`);
    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text("Date", 50, tableTop);
    doc.text("Type", 130, tableTop);
    doc.text("Title", 280, tableTop);
    doc.text("Amount", 450, tableTop, { width: 90, align: "right" });
    doc.moveDown(0.5);
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#000000').stroke();
    doc.moveDown(0.5);

    // Table Rows
    doc.font('Helvetica').fontSize(10);
    transactions.forEach(t => {
      const startY = doc.y;
      
      // Page break check
      if (startY > 750) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text("Date", 50, doc.y);
        doc.text("Type", 130, doc.y);
        doc.text("Title", 280, doc.y);
        doc.text("Amount", 450, doc.y, { width: 90, align: "right" });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#000000').stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
      }
      
      const currentY = doc.y;
      const amountStr = (t.type === "DEPOSIT" ? "+" : "-") + " Rs " + t.amount;
      
      doc.text(new Date(t.createdAt).toLocaleDateString(), 50, currentY, { lineBreak: false });
      doc.text(t.type, 130, currentY, { lineBreak: false });
      doc.text(t.title.substring(0, 35) + (t.title.length > 35 ? '...' : ''), 280, currentY, { lineBreak: false });
      
      // We use lineBreak: false for the first few columns, 
      // but for the last one we don't, so it automatically moves the cursor down.
      if (t.type === "DEPOSIT") doc.fillColor('green');
      else doc.fillColor('red');
      
      doc.text(amountStr, 450, currentY, { width: 90, align: "right" });
      
      doc.fillColor('black');
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.5);
    });

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
