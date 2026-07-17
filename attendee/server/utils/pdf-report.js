const PDFDocument = require("pdfkit");
const { formatHoursValue } = require("../services/common.service");

const COLORS = {
  ink: "#0F172A",
  muted: "#475569",
  border: "#CBD5E1",
  headerBg: "#0B3A53",
  tableHeaderBg: "#1E293B",
  rowAltBg: "#F8FAFC",
  cardBg: "#EEF4FF",
  white: "#FFFFFF",
};

const TABLE_HEADER_HEIGHT = 24;
const TABLE_ROW_HEIGHT = 22;

const TABLE_COLUMNS = [
  { key: "entryNo", label: "No.", width: 44, align: "center" },
  { key: "userId", label: "ID", width: 44, align: "center" },
  { key: "userName", label: "Member", width: 92, align: "left" },
  { key: "contact", label: "Phone", width: 68, align: "left" },
  { key: "email", label: "Email", width: 114, align: "left" },
  { key: "date", label: "Date", width: 60, align: "center" },
  { key: "punchIn", label: "In", width: 44, align: "center" },
  { key: "punchOut", label: "Out", width: 44, align: "center" },
  { key: "reachedHome", label: "Home", width: 44, align: "center" },
  { key: "reachedHomeLocation", label: "Home Loc", width: 72, align: "left" },
  { key: "totalHours", label: "Tot Hrs", width: 40, align: "center" },
  { key: "presentHours", label: "Prs Hrs", width: 40, align: "center" },
  { key: "absent", label: "Abs", width: 40, align: "center" },
];

const normalizeText = (value) => String(value === null || value === undefined ? "" : value).trim();
const normalizeKey = (value) => String(value || "").replace(/[_-\s]+/g, "").toLowerCase();

const PDF_LABEL_OVERRIDES = {
  activeorganizations: "Active Orgs",
  blockedorganizations: "Blocked Orgs",
  createdat: "Created",
  includedrecords: "Records",
  organizationcode: "Org Code",
  presentduration: "Present Hrs",
  presenthours: "Present Hrs",
  successfultransactions: "Success",
  subscriptionstatus: "Subscription",
  totalduration: "Worked Hrs",
  totalhours: "Worked Hrs",
  useremail: "Email",
  userid: "ID",
  username: "Member",
  workedhours: "Worked Hrs",
  workedminutes: "Worked Hrs",
};

const toPdfLabel = (value, fallback = "") =>
  PDF_LABEL_OVERRIDES[normalizeKey(value)] || normalizeText(value) || fallback;

const formatHoursFromMinutes = (minutes) => formatHoursValue(minutes, { fromMinutes: true });

const clipTextToWidth = (doc, value, width) => {
  const text = normalizeText(value) || "-";
  if (doc.widthOfString(text) <= width) return text;

  const ellipsis = "...";
  const ellipsisWidth = doc.widthOfString(ellipsis);
  let clipped = text;

  while (clipped.length > 0 && doc.widthOfString(clipped) + ellipsisWidth > width) {
    clipped = clipped.slice(0, -1);
  }

  return clipped ? `${clipped}${ellipsis}` : ellipsis;
};

const drawTopBanner = (doc, { organizationName, organizationCode, periodLabel, rangeFrom, rangeTo }) => {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.roundedRect(x, y, width, 64, 8).fill(COLORS.headerBg);

  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(18).text("VEAGLE ATTENDANCE REPORT", x + 16, y + 12);
  doc.font("Helvetica").fontSize(9).text(
    `Organization: ${normalizeText(organizationName) || "-"}  |  Code: ${normalizeText(organizationCode) || "-"}`,
    x + 16,
    y + 38,
    { width: width - 32 }
  );
  doc.text(`Period: ${normalizeText(periodLabel) || "-"}  |  Range: ${rangeFrom} to ${rangeTo}`, x + 16, y + 50, {
    width: width - 32,
  });
  doc.restore();

  return y + 78;
};

const drawSummaryCards = (doc, summary, startY) => {
  const x = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 8;
  const cardCount = 5;
  const cardWidth = (totalWidth - gap * (cardCount - 1)) / cardCount;
  const cardHeight = 48;

  const cards = [
    { label: "Total Records", value: Number(summary.totalRecords || 0) },
    { label: "Present Entries", value: Number(summary.presentEntries || 0) },
    { label: "Absent Entries", value: Number(summary.absentEntries || 0) },
    { label: "Worked Hrs", value: formatHoursFromMinutes(summary.totalWorkedMinutes || 0) },
    { label: "Present Hrs", value: formatHoursFromMinutes(summary.totalPresentMinutes || 0) },
  ];

  cards.forEach((card, index) => {
    const cardX = x + index * (cardWidth + gap);
    doc.save();
    doc.roundedRect(cardX, startY, cardWidth, cardHeight, 6).fillAndStroke(COLORS.cardBg, COLORS.border);
    doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(
      toPdfLabel(card.label, `Metric ${index + 1}`),
      cardX + 8,
      startY + 8,
      {
        width: cardWidth - 16,
      }
    );
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(13).text(String(card.value), cardX + 8, startY + 22, {
      width: cardWidth - 16,
    });
    doc.restore();
  });

  return startY + cardHeight + 12;
};

const drawTableHeader = (doc, startY) => {
  const x = doc.page.margins.left;
  let cursorX = x;
  const tableWidth = TABLE_COLUMNS.reduce((sum, column) => sum + column.width, 0);

  doc.save();
  doc.rect(x, startY, tableWidth, TABLE_HEADER_HEIGHT).fill(COLORS.tableHeaderBg);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8);

  TABLE_COLUMNS.forEach((column) => {
    doc.text(clipTextToWidth(doc, toPdfLabel(column.label, column.key), column.width - 8), cursorX + 4, startY + 8, {
      width: column.width - 8,
      align: column.align,
      lineBreak: false,
    });
    cursorX += column.width;
  });

  doc.restore();
  return startY + TABLE_HEADER_HEIGHT;
};

const drawTableRow = (doc, row, rowIndex, startY) => {
  const x = doc.page.margins.left;
  let cursorX = x;
  const tableWidth = TABLE_COLUMNS.reduce((sum, column) => sum + column.width, 0);

  if (rowIndex % 2 === 0) {
    doc.save();
    doc.rect(x, startY, tableWidth, TABLE_ROW_HEIGHT).fill(COLORS.rowAltBg);
    doc.restore();
  }

  doc.font("Helvetica").fontSize(8).fillColor(COLORS.ink);

  TABLE_COLUMNS.forEach((column) => {
    const value = clipTextToWidth(doc, row[column.key], column.width - 8);
    doc.text(value, cursorX + 4, startY + 7, {
      width: column.width - 8,
      align: column.align,
      lineBreak: false,
    });
    cursorX += column.width;
  });

  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(0.5);
  doc.moveTo(x, startY + TABLE_ROW_HEIGHT).lineTo(x + tableWidth, startY + TABLE_ROW_HEIGHT).stroke();
  doc.restore();

  return startY + TABLE_ROW_HEIGHT;
};

const drawContinuationHeader = (doc, { organizationName, periodLabel, rangeFrom, rangeTo }) => {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(11).text("Attendance Details (Continued)", x, y, {
    width: width * 0.55,
  });
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
    `${normalizeText(organizationName) || "-"} | ${normalizeText(periodLabel) || "-"} | ${rangeFrom} to ${rangeTo}`,
    x,
    y + 1,
    { align: "right", width }
  );

  return y + 20;
};

const buildAttendanceDetailedPdf = ({
  organizationName,
  organizationCode,
  periodLabel,
  rangeFrom,
  rangeTo,
  summary = {},
  rows = [],
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 22,
        left: 24,
        right: 24,
        bottom: 24,
      },
      autoFirstPage: true,
      compress: true,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = drawTopBanner(doc, {
      organizationName,
      organizationCode,
      periodLabel,
      rangeFrom,
      rangeTo,
    });

    const generatedAt = new Date().toLocaleString("en-IN");
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(`Generated At: ${generatedAt}`, doc.page.margins.left, y);
    y += 12;

    y = drawSummaryCards(doc, summary, y);

    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10).text("Attendance Register", doc.page.margins.left, y);
    y += 16;

    y = drawTableHeader(doc, y);

    if (!rows.length) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text(
        "No attendance records found for the selected period.",
        doc.page.margins.left,
        y + 16
      );
      doc.end();
      return;
    }

    rows.forEach((row, index) => {
      const bottomLimit = doc.page.height - doc.page.margins.bottom;
      if (y + TABLE_ROW_HEIGHT > bottomLimit) {
        doc.addPage();
        y = drawContinuationHeader(doc, {
          organizationName,
          periodLabel,
          rangeFrom,
          rangeTo,
        });
        y = drawTableHeader(doc, y);
      }

      y = drawTableRow(doc, row, index, y);
    });

    doc.end();
  });

const drawGenericBanner = (doc, { title, subtitleLines = [] }) => {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const lines = [normalizeText(title), ...subtitleLines.map((line) => normalizeText(line)).filter(Boolean)];
  const boxHeight = Math.max(58, 24 + lines.length * 12);

  doc.save();
  doc.roundedRect(x, y, width, boxHeight, 8).fill(COLORS.headerBg);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(18).text(lines[0] || "REPORT", x + 16, y + 12);

  doc.font("Helvetica").fontSize(9);
  lines.slice(1).forEach((line, index) => {
    doc.text(line, x + 16, y + 34 + index * 11, { width: width - 32 });
  });
  doc.restore();

  return y + boxHeight + 14;
};

const drawGenericSummaryCards = (doc, cards, startY) => {
  const items = Array.isArray(cards) ? cards.filter((card) => card?.label) : [];
  if (!items.length) return startY;

  const x = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = Math.min(items.length, 4);
  const gap = 8;
  const cardWidth = (totalWidth - gap * (columns - 1)) / columns;
  const cardHeight = 48;
  const rows = Math.ceil(items.length / columns);

  items.forEach((card, index) => {
    const rowIndex = Math.floor(index / columns);
    const columnIndex = index % columns;
    const cardX = x + columnIndex * (cardWidth + gap);
    const cardY = startY + rowIndex * (cardHeight + gap);

    doc.save();
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6).fillAndStroke(COLORS.cardBg, COLORS.border);
    doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(
      toPdfLabel(card.label, `Metric ${index + 1}`),
      cardX + 8,
      cardY + 8,
      {
        width: cardWidth - 16,
      }
    );
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(13).text(String(card.value ?? "-"), cardX + 8, cardY + 22, {
      width: cardWidth - 16,
    });
    doc.restore();
  });

  return startY + rows * cardHeight + (rows - 1) * gap + 12;
};

const resolveGenericColumns = (doc, columns = []) => {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const explicitWidth = columns.reduce((sum, column) => sum + Number(column.width || 0), 0);
  const autoCount = columns.filter((column) => !column.width).length;
  const autoWidth = autoCount > 0 ? Math.max(40, (pageWidth - explicitWidth) / autoCount) : 0;

  const normalizedColumns = columns.map((column) => ({
    align: "left",
    ...column,
    width: Number(column.width || autoWidth),
  }));

  const requestedWidth = normalizedColumns.reduce((sum, column) => sum + Number(column.width || 0), 0);
  if (requestedWidth <= 0) {
    return normalizedColumns;
  }

  const scale = pageWidth / requestedWidth;
  let totalCalculatedWidth = 0;
  return normalizedColumns.map((column, index) => {
    let width = Math.max(36, Math.floor(Number(column.width || 0) * scale));
    if (index === normalizedColumns.length - 1) {
      width = Math.max(36, Math.floor(pageWidth - totalCalculatedWidth));
    } else {
      totalCalculatedWidth += width;
    }
    return {
      ...column,
      width,
    };
  });
};

const drawGenericTableHeader = (doc, columns, startY) => {
  const x = doc.page.margins.left;
  let cursorX = x;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  doc.save();
  doc.rect(x, startY, tableWidth, TABLE_HEADER_HEIGHT).fill(COLORS.tableHeaderBg);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8);

  columns.forEach((column) => {
    doc.text(clipTextToWidth(doc, toPdfLabel(column.label || column.key, column.key), column.width - 8), cursorX + 4, startY + 8, {
      width: column.width - 8,
      align: column.align,
      lineBreak: false,
    });
    cursorX += column.width;
  });

  doc.restore();
  return startY + TABLE_HEADER_HEIGHT;
};

const drawGenericTableRow = (doc, columns, row, rowIndex, startY) => {
  const x = doc.page.margins.left;
  let cursorX = x;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  if (rowIndex % 2 === 0) {
    doc.save();
    doc.rect(x, startY, tableWidth, TABLE_ROW_HEIGHT).fill(COLORS.rowAltBg);
    doc.restore();
  }

  doc.font("Helvetica").fontSize(8).fillColor(COLORS.ink);

  columns.forEach((column) => {
    const value = clipTextToWidth(doc, row[column.key], column.width - 8);
    doc.text(value, cursorX + 4, startY + 7, {
      width: column.width - 8,
      align: column.align,
      lineBreak: false,
    });
    cursorX += column.width;
  });

  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(0.5);
  doc.moveTo(x, startY + TABLE_ROW_HEIGHT).lineTo(x + tableWidth, startY + TABLE_ROW_HEIGHT).stroke();
  doc.restore();

  return startY + TABLE_ROW_HEIGHT;
};

const drawGenericContinuationHeader = (doc, { title, subtitleLines = [] }) => {
  const x = doc.page.margins.left;
  const y = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(11).text(`${normalizeText(title) || "Report"} (Continued)`, x, y, {
    width: width * 0.55,
  });
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
    subtitleLines.map((line) => normalizeText(line)).filter(Boolean).join(" | "),
    x,
    y + 1,
    { align: "right", width }
  );

  return y + 20;
};

const buildGenericTablePdf = ({
  title,
  subtitleLines = [],
  summaryCards = [],
  columns = [],
  rows = [],
  size = "A4",
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size,
      layout: "landscape",
      margins: {
        top: 22,
        left: 24,
        right: 24,
        bottom: 24,
      },
      autoFirstPage: true,
      compress: true,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const resolvedColumns = resolveGenericColumns(doc, columns);

    let y = drawGenericBanner(doc, { title, subtitleLines });
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
      `Generated At: ${new Date().toLocaleString("en-IN")}`,
      doc.page.margins.left,
      y
    );
    y += 12;

    y = drawGenericSummaryCards(doc, summaryCards, y);
    y = drawGenericTableHeader(doc, resolvedColumns, y);

    if (!rows.length) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text(
        "No records found for the selected export.",
        doc.page.margins.left,
        y + 16
      );
      doc.end();
      return;
    }

    rows.forEach((row, index) => {
      const bottomLimit = doc.page.height - doc.page.margins.bottom;
      if (y + TABLE_ROW_HEIGHT > bottomLimit) {
        doc.addPage();
        y = drawGenericContinuationHeader(doc, { title, subtitleLines });
        y = drawGenericTableHeader(doc, resolvedColumns, y);
      }

      y = drawGenericTableRow(doc, resolvedColumns, row, index, y);
    });

    doc.end();
  });

module.exports = {
  buildAttendanceDetailedPdf,
  buildGenericTablePdf,
  formatHoursFromMinutes,
};
