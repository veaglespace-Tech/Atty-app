const xlsx = require("xlsx");
const { normalizeQueryValue } = require("../services/common.service");

exports.buildExportWorkbookBuffer = ({
  title,
  subtitleLines = [],
  sheetName,
  columns = [],
  rows = [],
}) => {
  const normalizedColumns = Array.isArray(columns) ? columns.filter((column) => column?.label) : [];
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const infoLines = subtitleLines.map((line) => normalizeQueryValue(line)).filter(Boolean);
  const sheetData = [
    [normalizeQueryValue(title) || "Records"],
    ...infoLines.map((line) => [line]),
    [],
    normalizedColumns.map((column) => column.label),
    ...normalizedRows.map((row) =>
      normalizedColumns.map((column) => {
        const value = row?.[column.key];
        return value === null || value === undefined || value === "" ? "-" : String(value);
      })
    ),
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
  const lastColumnIndex = Math.max(normalizedColumns.length - 1, 0);
  const lastColumnLabel = xlsx.utils.encode_col(lastColumnIndex);
  const headerRowNumber = infoLines.length + 3;

  worksheet["!cols"] = normalizedColumns.map((column) => ({
    wch: Math.max(12, Math.round(Number(column.width || 84) / 4.5)),
  }));
  worksheet["!merges"] = Array.from({ length: infoLines.length + 1 }, (_, index) => ({
    s: { r: index, c: 0 },
    e: { r: index, c: lastColumnIndex },
  }));
  worksheet["!autofilter"] = {
    ref: `A${headerRowNumber}:${lastColumnLabel}${headerRowNumber}`,
  };

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, String(sheetName || "Data").slice(0, 31));

  return xlsx.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
};
