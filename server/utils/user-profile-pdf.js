const axios = require("axios");
const PDFDocument = require("pdfkit");
const { formatHoursValue } = require("../services/common.service");

const COLORS = {
  pageBg: "#F8FAFC",
  cardBg: "#FFFFFF",
  cardBorder: "#DCE6F5",
  headerBg: "#0B3A53",
  headerAccent: "#1D4ED8",
  heading: "#0F172A",
  text: "#1E293B",
  muted: "#64748B",
  white: "#FFFFFF",
};

const normalizeText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toDateTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toDateLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const joinNonEmpty = (items = [], fallback = "-") => {
  const values = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return values.length ? values.join(", ") : fallback;
};

const toPhoneLabel = (countryCode, number) => {
  const code = String(countryCode || "").trim();
  const mobile = String(number || "").trim();
  if (!code && !mobile) return "-";
  return `${code}${mobile}`;
};

const toAddressLabel = (organization = {}) => {
  const parts = [
    organization.address,
    organization.city,
    organization.state,
    organization.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
};

const fetchImageBuffer = async (imageUrl) => {
  const normalizedUrl = String(imageUrl || "").trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) return null;

  try {
    const response = await axios.get(normalizedUrl, {
      responseType: "arraybuffer",
      timeout: 7000,
      maxRedirects: 2,
    });

    if (!response?.data) return null;
    return Buffer.from(response.data);
  } catch (_) {
    return null;
  }
};

const drawLabelValue = ({ doc, x, y, width, label, value }) => {
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(label, x, y, { width });
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10).text(value, x, y + 11, { width });
};

const drawSectionTitle = ({ doc, x, y, title }) => {
  doc.fillColor(COLORS.heading).font("Helvetica-Bold").fontSize(11).text(title, x, y);
};

const drawPhotoFrame = ({ doc, imageBuffer, x, y, width, height, userName }) => {
  doc.save();
  doc.roundedRect(x, y, width, height, 10).fillAndStroke("#F1F5F9", COLORS.cardBorder);
  doc.restore();

  if (imageBuffer) {
    try {
      doc.image(imageBuffer, x + 4, y + 4, {
        cover: [width - 8, height - 8],
        align: "center",
        valign: "center",
      });
      return;
    } catch (_) {
      // Ignore broken image data and render fallback.
    }
  }

  const initial = normalizeText(userName, "U").charAt(0).toUpperCase();
  doc.fillColor(COLORS.headerAccent).font("Helvetica-Bold").fontSize(30).text(initial, x, y + 36, {
    width,
    align: "center",
  });
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text("PHOTO", x, y + height - 16, {
    width,
    align: "center",
  });
};

const buildUserHallTicketPdf = async ({
  organization = {},
  user = {},
  attendanceSummary = {},
  generatedByName = "",
}) => {
  const imageBuffer = await fetchImageBuffer(user.profileImageUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 28,
        right: 28,
        bottom: 28,
        left: 28,
      },
      compress: true,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.pageBg);

    const headerY = doc.page.margins.top;
    doc.save();
    doc.roundedRect(startX, headerY, pageWidth, 92, 14).fill(COLORS.headerBg);
    doc.roundedRect(startX + pageWidth - 104, headerY, 104, 92, 14).fill(COLORS.headerAccent);
    doc.restore();

    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(20).text(`${normalizeText(user.name, "USER").toUpperCase()} - PROFILE`, startX + 16, headerY + 16);
    doc.font("Helvetica").fontSize(9).text(
      `Organization: ${normalizeText(organization.name)} | Code: ${normalizeText(organization.organizationCode)}`,
      startX + 16,
      headerY + 46,
      { width: pageWidth - 132 }
    );

    const profileId = `ATTY-${normalizeText(organization.organizationCode, "ORG")}-${normalizeText(user.id, "0")}`;
    doc.font("Helvetica-Bold").fontSize(10).text(`User Details ID`, startX + pageWidth - 94, headerY + 14, {
      width: 84,
      align: "center",
    });
    doc.font("Helvetica").fontSize(9).text(profileId, startX + pageWidth - 96, headerY + 34, {
      width: 88,
      align: "center",
    });

    const topCardY = headerY + 108;
    const topCardHeight = 206;
    doc.save();
    doc.roundedRect(startX, topCardY, pageWidth, topCardHeight, 12).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
    doc.restore();

    drawSectionTitle({ doc, x: startX + 14, y: topCardY + 12, title: "Candidate Profile" });

    drawPhotoFrame({
      doc,
      imageBuffer,
      x: startX + 14,
      y: topCardY + 36,
      width: 118,
      height: 150,
      userName: user.name,
    });

    const detailsX = startX + 146;
    const detailsWidth = pageWidth - 160;

    drawLabelValue({
      doc,
      x: detailsX,
      y: topCardY + 38,
      width: detailsWidth * 0.55,
      label: "Full Name",
      value: normalizeText(user.name),
    });
    drawLabelValue({
      doc,
      x: detailsX + detailsWidth * 0.58,
      y: topCardY + 38,
      width: detailsWidth * 0.42,
      label: "User ID",
      value: normalizeText(user.id),
    });

    drawLabelValue({
      doc,
      x: detailsX,
      y: topCardY + 74,
      width: detailsWidth * 0.55,
      label: "Role",
      value: normalizeText(user.role),
    });
    drawLabelValue({
      doc,
      x: detailsX + detailsWidth * 0.58,
      y: topCardY + 74,
      width: detailsWidth * 0.42,
      label: "Status",
      value: normalizeText(user.approvalStatus),
    });

    drawLabelValue({
      doc,
      x: detailsX,
      y: topCardY + 110,
      width: detailsWidth * 0.55,
      label: "Joined On",
      value: toDateLabel(user.joinedAt),
    });
    drawLabelValue({
      doc,
      x: detailsX + detailsWidth * 0.58,
      y: topCardY + 110,
      width: detailsWidth * 0.42,
      label: "Access",
      value: user.active ? "ACTIVE" : "BLOCKED",
    });

    drawLabelValue({
      doc,
      x: detailsX,
      y: topCardY + 146,
      width: detailsWidth * 0.55,
      label: "Email",
      value: normalizeText(user.email),
    });
    drawLabelValue({
      doc,
      x: detailsX + detailsWidth * 0.58,
      y: topCardY + 146,
      width: detailsWidth * 0.42,
      label: "Mobile",
      value: toPhoneLabel(user.mobileCountryCode, user.mobile),
    });

    const lowerCardY = topCardY + topCardHeight + 14;
    const leftWidth = (pageWidth - 10) * 0.57;
    const rightWidth = pageWidth - leftWidth - 10;

    doc.save();
    doc.roundedRect(startX, lowerCardY, leftWidth, 186, 12).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
    doc.roundedRect(startX + leftWidth + 10, lowerCardY, rightWidth, 186, 12).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
    doc.restore();

    drawSectionTitle({ doc, x: startX + 14, y: lowerCardY + 12, title: "Contact & Address" });
    drawLabelValue({
      doc,
      x: startX + 14,
      y: lowerCardY + 34,
      width: leftWidth - 28,
      label: "Emergency Contact",
      value: normalizeText(user.emergencyContact),
    });
    drawLabelValue({
      doc,
      x: startX + 14,
      y: lowerCardY + 68,
      width: leftWidth - 28,
      label: "Current Address",
      value: normalizeText(user.currentAddress),
    });
    drawLabelValue({
      doc,
      x: startX + 14,
      y: lowerCardY + 112,
      width: leftWidth - 28,
      label: "Permanent Address",
      value: normalizeText(user.permanentAddress),
    });
    drawLabelValue({
      doc,
      x: startX + 14,
      y: lowerCardY + 156,
      width: leftWidth - 28,
      label: "Organization Address",
      value: toAddressLabel(organization),
    });

    const rightX = startX + leftWidth + 24;
    drawSectionTitle({ doc, x: rightX, y: lowerCardY + 12, title: "Team & Attendance" });
    drawLabelValue({
      doc,
      x: rightX,
      y: lowerCardY + 34,
      width: rightWidth - 28,
      label: "Teams",
      value: joinNonEmpty(user.teamNames),
    });
    drawLabelValue({
      doc,
      x: rightX,
      y: lowerCardY + 72,
      width: rightWidth - 28,
      label: "Leads Teams",
      value: joinNonEmpty(user.ledTeamNames),
    });
    drawLabelValue({
      doc,
      x: rightX,
      y: lowerCardY + 110,
      width: rightWidth - 28,
      label: "Attendance Summary",
      value: `P:${Number(attendanceSummary.presentDays || 0)} | H:${Number(attendanceSummary.halfDays || 0)} | A:${Number(attendanceSummary.absentDays || 0)}`,
    });
    drawLabelValue({
      doc,
      x: rightX,
      y: lowerCardY + 148,
      width: rightWidth - 28,
      label: "Worked Hours",
      value: formatHoursValue(attendanceSummary.totalWorkedMinutes || 0, { fromMinutes: true }),
    });

    const footerY = doc.page.height - doc.page.margins.bottom - 54;
    doc.save();
    doc.roundedRect(startX, footerY, pageWidth, 54, 10).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
    doc.restore();

    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(
      `Generated At: ${toDateTimeLabel(new Date())} | Generated By: ${normalizeText(generatedByName, "Admin")}`,
      startX + 12,
      footerY + 12,
      { width: pageWidth - 24 }
    );
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(9).text("Authorized Signature", startX + 12, footerY + 30);
    doc.text("User Signature", startX + pageWidth - 112, footerY + 30, { width: 100, align: "right" });

    doc.end();
  });
};

module.exports = {
  buildUserHallTicketPdf,
};
