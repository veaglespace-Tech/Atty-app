"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  FileBox,
  FileText,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useSelector } from "react-redux";
import SectionEyebrow from "@/components/SectionEyebrow";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetUtilityEndpointQuery } from "@/services/api/utilityApi";
import { formatHoursValue } from "@/utils/time";

const RECORD_THEMES = [
  {
    shell:
      "border-[rgb(var(--brand-line)/0.8)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_40%),linear-gradient(145deg,rgba(245,249,255,0.98),rgba(228,238,255,0.95),rgba(216,228,252,0.93))] dark:border-[rgb(var(--brand-line)/0.84)] dark:bg-[radial-gradient(circle_at_top_right,rgba(92,209,229,0.20),transparent_40%),linear-gradient(145deg,rgba(7,18,44,0.98),rgba(11,26,58,0.96),rgba(15,33,67,0.94))]",
    glow: "bg-blue-300/35 dark:bg-cyan-400/18",
    chip:
      "border-blue-200/80 bg-white/88 text-slate-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100",
  },
  {
    shell:
      "border-[rgb(var(--brand-line)/0.8)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_40%),linear-gradient(145deg,rgba(245,249,255,0.98),rgba(228,238,255,0.95),rgba(216,228,252,0.93))] dark:border-[rgb(var(--brand-line)/0.84)] dark:bg-[radial-gradient(circle_at_top_right,rgba(92,209,229,0.20),transparent_40%),linear-gradient(145deg,rgba(7,18,44,0.98),rgba(11,26,58,0.96),rgba(15,33,67,0.94))]",
    glow: "bg-blue-300/35 dark:bg-cyan-400/18",
    chip:
      "border-blue-200/80 bg-white/88 text-slate-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100",
  },
  {
    shell:
      "border-[rgb(var(--brand-line)/0.8)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_40%),linear-gradient(145deg,rgba(245,249,255,0.98),rgba(228,238,255,0.95),rgba(216,228,252,0.93))] dark:border-[rgb(var(--brand-line)/0.84)] dark:bg-[radial-gradient(circle_at_top_right,rgba(92,209,229,0.20),transparent_40%),linear-gradient(145deg,rgba(7,18,44,0.98),rgba(11,26,58,0.96),rgba(15,33,67,0.94))]",
    glow: "bg-blue-300/35 dark:bg-cyan-400/18",
    chip:
      "border-blue-200/80 bg-white/88 text-slate-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100",
  },
];

const TITLE_KEY_PRIORITY = [
  "name",
  "organization",
  "planname",
  "plan",
  "month",
  "user",
  "member",
  "team",
  "status",
];

const SUPPORTING_KEY_PRIORITY = [
  "code",
  "organizationcode",
  "plancode",
  "useremail",
  "subscriptionstatus",
  "currency",
  "gateway",
  "createdat",
];

const normalizeKey = (key) => String(key || "").replace(/[_-\s]/g, "").toLowerCase();

const DISPLAY_LABEL_OVERRIDES = {
  activeorganizations: "Active Orgs",
  absentdays: "Absent",
  absententries: "Absent",
  blockedorganizations: "Blocked Orgs",
  createdat: "Created",
  date: "Date",
  enabledmodules: "Modules",
  halfday: "Half Day",
  halfdays: "Half Day",
  lateminutes: "Late Min",
  memberid: "Member ID",
  organizationcode: "Org Code",
  pendingpunchout: "Pending Out",
  planname: "Plan",
  plancode: "Plan Code",
  presentdays: "Present",
  presentduration: "Present Hrs",
  presenthours: "Present Hrs",
  presententries: "Present",
  presenttoday: "Present Today",
  punchinat: "Check-In",
  punchincoordinates: "Check-In Coordinates",
  punchindistancemeters: "Check-In Distance",
  punchinvalid: "Check-In Valid",
  punchinlocationmeta: "Check-In Location",
  punchoutat: "Check-Out",
  punchoutcoordinates: "Check-Out Coordinates",
  punchoutdistancemeters: "Check-Out Distance",
  punchoutvalid: "Check-Out Valid",
  punchoutlocationmeta: "Check-Out Location",
  subscriptionstatus: "Subscription",
  successfulpayments: "Payments",
  teamname: "Team",
  totalrecords: "Records",
  totalteams: "Teams",
  totalusers: "Users",
  totalduration: "Worked Hrs",
  totalhours: "Worked Hrs",
  useremail: "Email",
  userid: "User ID",
  username: "Member",
  workedhours: "Worked Hrs",
  workedhrs: "Worked Hrs",
  workedhoursthismonth: "Worked Hrs This Month",
  workedhrsthismonth: "Worked Hrs This Month",
  workedminutes: "Worked Hrs",
};

const COLUMN_PRESETS = {
  amount: { type: "currency", align: "right", minWidth: 132, wrap: "nowrap" },
  createdat: { type: "datetime", minWidth: 168, wrap: "nowrap" },
  date: { type: "date", minWidth: 132, wrap: "nowrap" },
  gateway: { minWidth: 120, wrap: "nowrap" },
  lateminutes: { minWidth: 88, wrap: "nowrap" },
  member: { minWidth: 152 },
  memberid: { align: "center", minWidth: 92, wrap: "nowrap" },
  orderid: { minWidth: 156, wrap: "nowrap" },
  paymentid: { minWidth: 156, wrap: "nowrap" },
  plan: { minWidth: 136, wrap: "wrap" },
  planname: { minWidth: 136, wrap: "wrap" },
  plancode: { minWidth: 112, wrap: "nowrap" },
  punchinat: { type: "datetime", minWidth: 168, wrap: "nowrap" },
  punchincoordinates: { type: "coordinates", minWidth: 176, wrap: "nowrap" },
  punchindistancemeters: { align: "center", minWidth: 132, wrap: "nowrap" },
  punchinvalid: { align: "center", minWidth: 132, wrap: "nowrap" },
  punchinlocationmeta: { type: "location", minWidth: 300, wrap: "wrap" },
  punchoutat: { type: "datetime", minWidth: 168, wrap: "nowrap" },
  punchoutcoordinates: { type: "coordinates", minWidth: 176, wrap: "nowrap" },
  punchoutdistancemeters: { align: "center", minWidth: 140, wrap: "nowrap" },
  punchoutvalid: { align: "center", minWidth: 140, wrap: "nowrap" },
  punchoutlocationmeta: { type: "location", minWidth: 300, wrap: "wrap" },
  revenue: { type: "currency", align: "right", minWidth: 148, wrap: "nowrap" },
  role: { align: "center", minWidth: 116, wrap: "nowrap" },
  status: { type: "badge", align: "center", minWidth: 116, wrap: "nowrap" },
  subscriptionstatus: { type: "badge", align: "center", minWidth: 144, wrap: "nowrap" },
  teamid: { align: "center", minWidth: 88, wrap: "nowrap" },
  teamname: { minWidth: 124 },
  useremail: { minWidth: 220, wrap: "nowrap" },
  userid: { align: "center", minWidth: 88, wrap: "nowrap" },
  username: { minWidth: 152 },
  presenthours: { type: "hours", align: "center", minWidth: 104, wrap: "nowrap" },
  presentduration: { type: "hours", align: "center", minWidth: 104, wrap: "nowrap" },
  totalhours: { type: "hours", align: "center", minWidth: 104, wrap: "nowrap" },
  totalduration: { type: "hours", align: "center", minWidth: 104, wrap: "nowrap" },
  workedhours: { type: "hours", align: "center", minWidth: 96, wrap: "nowrap" },
  workedhrs: { type: "hours", align: "center", minWidth: 96, wrap: "nowrap" },
  workedhoursthismonth: { type: "hours", align: "center", minWidth: 132, wrap: "nowrap" },
  workedhrsthismonth: { type: "hours", align: "center", minWidth: 132, wrap: "nowrap" },
  workedminutes: { type: "hours", fromMinutes: true, align: "center", minWidth: 104, wrap: "nowrap" },
};

const ENUM_LIKE_KEYS = new Set([
  "gateway",
  "inputformat",
  "mode",
  "role",
  "source",
  "status",
  "subscriptionstatus",
]);

const ALWAYS_UPPERCASE_TOKENS = new Set(["GPS", "HR", "ID", "INR", "PDF", "UPI"]);
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DATETIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const CENTER_ALIGNED_KEYS = new Set([
  "absent",
  "absentdays",
  "active",
  "blocked",
  "createdat",
  "currency",
  "date",
  "gateway",
  "halfday",
  "halfdays",
  "lateminutes",
  "memberid",
  "paymentid",
  "punchinat",
  "punchoutat",
  "present",
  "presentdays",
  "role",
  "status",
  "subscriptionstatus",
  "teamid",
  "userid",
  "presenthours",
  "totalhours",
  "workedhrs",
  "workedhoursthismonth",
  "workedhrsthismonth",
  "workedhours",
  "workedminutes",
]);

const RIGHT_ALIGNED_KEYS = new Set(["amount", "revenue"]);
const MOBILE_RECORD_PREVIEW_COUNT = 8;
const DEFAULT_TABLE_COLUMN_MIN_WIDTH = 112;
const getColumnPreset = (keyHint = "") => COLUMN_PRESETS[normalizeKey(keyHint)] || null;

const toReadableLabel = (key) =>
  DISPLAY_LABEL_OVERRIDES[normalizeKey(key)] ||
  String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());

const toPlainTokenText = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      const normalizedToken = token.toUpperCase();
      if (ALWAYS_UPPERCASE_TOKENS.has(normalizedToken)) return normalizedToken;
      if (/^\d+(\.\d+)?$/.test(token)) return token;
      if (/^[A-Z0-9]{1,4}$/.test(token) && /\d/.test(token)) return normalizedToken;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");

const formatPlanCodeValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const shouldHumanizeString = (value, keyHint = "") => {
  const text = String(value || "").trim();
  const normalizedKey = normalizeKey(keyHint);

  if (!text || text.includes("@") || text.includes("://")) return false;
  if (ENUM_LIKE_KEYS.has(normalizedKey)) return true;
  if (text.includes("_")) return true;
  return /^[A-Z][A-Z0-9\s-]+$/.test(text) && text.length <= 32 && !/\d{5,}/.test(text);
};

const formatDateOnlyValue = (value) => {
  if (!value) return "-";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return DATE_ONLY_FORMATTER.format(value);
  }

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return DATE_ONLY_FORMATTER.format(date);
    }
  }

  return String(value);
};

const formatDateTimeValue = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return DATETIME_FORMATTER.format(date);
};

const isCoordinatePair = (value) =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((entry) => Number.isFinite(Number(entry)));

const formatCoordinatesValue = (value) => {
  if (!isCoordinatePair(value)) return "-";
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatLocationValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "string") {
    return shouldHumanizeString(value, "location") ? toPlainTokenText(value) : value;
  }

  if (Array.isArray(value)) {
    return formatCoordinatesValue(value);
  }

  if (typeof value === "object") {
    const displayText =
      value.displayText || value.areaLabel || value.address || value.name || value.label;
    if (displayText) return String(displayText);

    if (value.coordinates) {
      return formatCoordinatesValue(value.coordinates);
    }

    const firstString = Object.values(value).find(
      (entry) => typeof entry === "string" && entry.trim()
    );
    if (firstString) {
      return shouldHumanizeString(firstString, "location")
        ? toPlainTokenText(firstString)
        : firstString;
    }
  }

  return "-";
};

const buildStructuredEntries = (value, keyHint = "") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const normalizedKey = normalizeKey(keyHint);
  const locationMetaPriority =
    normalizedKey === "punchinlocationmeta" || normalizedKey === "punchoutlocationmeta"
      ? ["displayText", "areaLabel", "source", "mode", "inputFormat", "coordinates"]
      : [];

  const sourceEntries = Object.entries(value).filter(([, entryValue]) => {
    if (entryValue === null || entryValue === undefined || entryValue === "") return false;
    if (Array.isArray(entryValue) && entryValue.length === 0) return false;
    return true;
  });

  const orderedEntries =
    locationMetaPriority.length > 0
      ? [
          ...locationMetaPriority
            .map((priorityKey) =>
              sourceEntries.find(([entryKey]) => normalizeKey(entryKey) === normalizeKey(priorityKey))
            )
            .filter(Boolean),
          ...sourceEntries.filter(
            ([entryKey]) =>
              !locationMetaPriority.some(
                (priorityKey) => normalizeKey(priorityKey) === normalizeKey(entryKey)
              )
          ),
        ]
      : sourceEntries;

  return orderedEntries.map(([entryKey, entryValue]) => ({
    key: entryKey,
    label:
      normalizeKey(entryKey) === "displaytext"
        ? "Location"
        : normalizeKey(entryKey) === "inputformat"
          ? "Format"
          : toReadableLabel(entryKey),
    value:
      normalizeKey(entryKey) === "coordinates"
        ? formatCoordinatesValue(entryValue)
        : formatValue(entryValue, entryKey),
  }));
};

const renderStructuredEntries = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return <span className="block">-</span>;
  }

  return (
    <div className="space-y-1.5 text-left">
      {entries.map((entry) => (
        <div key={entry.key} className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {entry.label}
          </p>
          <p className="break-words text-sm font-medium text-slate-700 dark:text-slate-100">
            {entry.value}
          </p>
        </div>
      ))}
    </div>
  );
};

const getPriorityKey = (keys, priorities) => {
  for (const priority of priorities) {
    const matchedKey = keys.find((key) => normalizeKey(key) === priority);
    if (matchedKey) return matchedKey;
  }
  return keys[0] || null;
};

const formatValue = (value, keyHint = "") => {
  if (value === null || value === undefined || value === "") return "-";

  const preset = getColumnPreset(keyHint);
  if (preset?.type === "hours") {
    return formatHoursValue(value, { fromMinutes: Boolean(preset?.fromMinutes) });
  }
  if (preset?.type === "date") return formatDateOnlyValue(value);
  if (preset?.type === "datetime") return formatDateTimeValue(value);
  if (preset?.type === "coordinates") return formatCoordinatesValue(value);
  if (preset?.type === "location") return formatLocationValue(value);

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toFixed(2);
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "string") {
    if (normalizeKey(keyHint) === "plancode") return formatPlanCodeValue(value);
    if (DATETIME_PATTERN.test(value)) return formatDateTimeValue(value);
    if (DATE_ONLY_PATTERN.test(value)) return formatDateOnlyValue(value);
    if (shouldHumanizeString(value, keyHint)) return toPlainTokenText(value);
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "-";

    const hasComplexEntries = value.some((item) => item && typeof item === "object");
    if (hasComplexEntries) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (_) {
        return String(value);
      }
    }

    return value.map((item) => formatValue(item, keyHint)).join(", ");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
};

const formatCurrencyValue = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return formatValue(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const getSummaryDisplay = (card) => {
  const formattedValue = formatValue(card?.value, card?.key || card?.label);
  const normalizedLabel = normalizeKey(card?.label);
  const normalizedValue = normalizeKey(formattedValue);

  if (normalizedLabel === "todaystatus" && normalizedValue === "norecord") {
    return {
      value: "No Record",
      valueClassName: "text-[1.7rem] leading-tight",
    };
  }

  return {
    value: formattedValue,
    valueClassName: "text-3xl",
  };
};

const resolveTableColumns = (items, tableColumns) => {
  if (Array.isArray(tableColumns) && tableColumns.length > 0) {
    return tableColumns.map((column) => {
      const normalizedColumn = typeof column === "string" ? { key: column } : column;
      const preset = getColumnPreset(normalizedColumn?.key);

      return {
        ...preset,
        ...normalizedColumn,
        label: normalizedColumn?.label || toReadableLabel(normalizedColumn?.key),
      };
    });
  }

  const firstRow = Array.isArray(items) && items.length > 0 ? items[0] : null;
  if (!firstRow || typeof firstRow !== "object") return [];

  return Object.keys(firstRow)
    .filter((key) => key !== "id" && key !== "_id")
    .map((key) => {
      const preset = getColumnPreset(key);

      return {
        ...preset,
        key,
        label: toReadableLabel(key),
      };
    });
};

const buildHiddenColumnSet = (columns = []) =>
  new Set(
    (Array.isArray(columns) ? columns : [])
      .map((column) => normalizeKey(column))
      .filter(Boolean)
  );

const shouldHideColumn = (column = {}, hiddenColumnSet) => {
  if (!(hiddenColumnSet instanceof Set) || hiddenColumnSet.size === 0) return false;
  return (
    hiddenColumnSet.has(normalizeKey(column?.key)) ||
    hiddenColumnSet.has(normalizeKey(column?.label))
  );
};

const getTableBadgeTone = (value) => {
  const normalized = String(value || "").trim().toUpperCase();

  if (["SUCCESS", "ACTIVE", "APPROVED", "OPEN", "UNBLOCKED", "PRESENT"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (["FAILED", "BLOCKED", "EXPIRED", "REJECTED", "INACTIVE", "ABSENT"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
  }

  if (["PENDING", "TRIAL", "PAYMENT_PENDING", "HALF_DAY", "LATE"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const formatCompactTableValue = (value, column = {}) => {
  if (value === null || value === undefined || value === "") return "-";

  if (column.type === "currency") {
    return formatCurrencyValue(value, column.currency || "INR");
  }

  if (column.type === "hours") {
    return formatHoursValue(value, { fromMinutes: Boolean(column.fromMinutes) });
  }

  if (column.type === "date") return formatDateOnlyValue(value);
  if (column.type === "datetime") return formatDateTimeValue(value);
  if (column.type === "coordinates") return formatCoordinatesValue(value);
  if (column.type === "location") return formatLocationValue(value);

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toFixed(2);

  if (typeof value === "string") {
    if (normalizeKey(column.key) === "plancode") return formatPlanCodeValue(value);
    if (DATETIME_PATTERN.test(value)) return formatDateTimeValue(value);
    if (DATE_ONLY_PATTERN.test(value)) return formatDateOnlyValue(value);
    if (shouldHumanizeString(value, column.key)) return toPlainTokenText(value);
    return value;
  }

  if (Array.isArray(value)) {
    if (isCoordinatePair(value)) return formatCoordinatesValue(value);
    return value
      .slice(0, 3)
      .map((entry) => formatCompactTableValue(entry, column))
      .join(", ");
  }

  if (typeof value === "object") {
    const structuredEntries = buildStructuredEntries(value, column.key);
    if (structuredEntries.length > 0) {
      return structuredEntries[0]?.value || "-";
    }

    const firstPrimitive = Object.values(value).find(
      (entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean"
    );

    if (firstPrimitive !== undefined) {
      return formatCompactTableValue(firstPrimitive, column);
    }

    return `${Object.keys(value).length} fields`;
  }

  return String(value);
};

const renderTableCell = (column, row, options = {}) => {
  const { compact = false } = options;
  let value = row?.[column.key];

  if (column.badgeMap) {
    const mappedValue = column.badgeMap[String(value)];
    if (mappedValue !== undefined) {
      value = mappedValue;
    }
  }

  if (column.type === "currency") {
    return (
      <span className="block max-w-full break-all whitespace-pre-wrap">
        {formatCurrencyValue(value, column.currency || row?.[column.currencyKey] || "INR")}
      </span>
    );
  }

  if (column.type === "badge") {
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${getTableBadgeTone(
          value
        )}`}
      >
        {formatValue(value, column.key)}
      </span>
    );
  }

  if (column.type === "date") {
    return (
      <span className="block max-w-full break-all whitespace-pre-wrap">
        {formatDateOnlyValue(value)}
      </span>
    );
  }

  if (column.type === "datetime") {
    return (
      <span className="block max-w-full break-all whitespace-pre-wrap">
        {formatDateTimeValue(value)}
      </span>
    );
  }

  if (column.type === "coordinates") {
    return (
      <span className="block max-w-full break-all whitespace-pre-wrap">
        {formatCoordinatesValue(value)}
      </span>
    );
  }

  if (column.type === "location") {
    if (compact) {
      return (
        <span className="block max-w-full truncate">
          {formatCompactTableValue(value, column)}
        </span>
      );
    }

    return renderStructuredEntries(buildStructuredEntries(value, column.key));
  }

  if (compact && value && typeof value === "object") {
    return (
      <span className="block max-w-full truncate">
        {formatCompactTableValue(value, column)}
      </span>
    );
  }

  return (
    <span className="block max-w-full break-words whitespace-pre-wrap">
      {formatValue(value, column.key)}
    </span>
  );
};

const getColumnAlignment = (column = {}) => {
  if (column.align) return column.align;
  if (column.type === "currency") return "right";
  if (column.type === "badge") return "center";
  if (column.type === "datetime") return "center";

  const normalizedKey = normalizeKey(column.key);
  if (RIGHT_ALIGNED_KEYS.has(normalizedKey)) return "right";
  if (CENTER_ALIGNED_KEYS.has(normalizedKey)) return "center";
  return "left";
};

const getAlignmentClasses = (alignment) => {
  if (alignment === "right") return "text-right";
  if (alignment === "center") return "text-center";
  return "text-left";
};

const getCellWrapClass = (column = {}, alignment) => {
  if (column.wrap === "nowrap") return "whitespace-nowrap";
  if (column.wrap === "wrap") return "break-words whitespace-normal";
  return alignment === "left" ? "break-words whitespace-normal" : "whitespace-nowrap";
};

const getColumnMinWidth = (column = {}) => {
  if (Number.isFinite(column.minWidth)) return column.minWidth;

  const labelLength = String(column.label || column.key || "").trim().length;
  return Math.min(Math.max(labelLength * 10, DEFAULT_TABLE_COLUMN_MIN_WIDTH), 208);
};

const getColumnStyle = (column = {}) => {
  const minWidth = getColumnMinWidth(column);
  const style = {
    minWidth: `${minWidth}px`,
    width: `${minWidth}px`,
  };

  if (Number.isFinite(column.maxWidth)) {
    style.maxWidth = `${column.maxWidth}px`;
  }

  return style;
};

const getDesktopTableMinWidth = (columns = []) =>
  columns.reduce((total, column) => total + getColumnMinWidth(column), 0);

const getRecordPresentation = (row, index, hiddenColumnSet) => {
  const entries = Object.entries(row || {}).filter(
    ([key]) =>
      key !== "id" &&
      key !== "_id" &&
      !hiddenColumnSet?.has(normalizeKey(key))
  );
  const keys = entries.map(([key]) => key);
  const titleKey = getPriorityKey(keys, TITLE_KEY_PRIORITY);
  const supportingKeys = SUPPORTING_KEY_PRIORITY.map((priority) =>
    keys.find((key) => normalizeKey(key) === priority)
  ).filter(Boolean);
  const heroKeys = supportingKeys.filter((key) => key !== titleKey).slice(0, 2);
  const hiddenKeys = new Set([titleKey, ...heroKeys]);

  let visibleEntries = entries.filter(([key]) => !hiddenKeys.has(key)).slice(0, 6);
  if (visibleEntries.length === 0) {
    visibleEntries = entries.filter(([key]) => key !== titleKey).slice(0, 6);
  }

  return {
    theme: RECORD_THEMES[index % RECORD_THEMES.length],
    title: titleKey ? formatValue(row?.[titleKey], titleKey) : `Record ${index + 1}`,
    heroEntries: heroKeys.map((key) => ({
      key,
      label: toReadableLabel(key),
      value: formatValue(row?.[key], key),
    })),
    visibleEntries,
  };
};

const getHeroKicker = ({ isDashboardEndpoint, isSuperAdminEndpoint }) => {
  if (isSuperAdminEndpoint) return "Platform Overview";
  if (isDashboardEndpoint) return "Dashboard Overview";
  return "Section Overview";
};

const getHeroDescription = ({ description, isDashboardEndpoint, isSuperAdminEndpoint }) => {
  if (description) return description;
  if (isSuperAdminEndpoint) {
    return "Review platform metrics, key records, and the current operational status in one place.";
  }
  if (isDashboardEndpoint) {
    return "Review key metrics, recent activity, and the current status for this dashboard.";
  }
  return "Review section records, summary metrics, and the current operational status.";
};

const TeamLeaderLiveLocationButton = dynamic(() => import("@/components/saas/TeamLeaderLiveLocationButton"));

export function DashboardRecordsSection({
  items = [],
  loading = false,
  emptyMessage = "No records found.",
  recordsView = "table",
  tableColumns = [],
  hiddenRecordColumns = [],
  endpoint = "records",
  title = "Records",
  description = null,
}) {
  const [expandedMobileRows, setExpandedMobileRows] = useState({});
  const hiddenColumnSet = useMemo(
    () => buildHiddenColumnSet(hiddenRecordColumns),
    [hiddenRecordColumns]
  );
  const resolvedTableColumns = useMemo(
    () =>
      resolveTableColumns(items, tableColumns).filter(
        (column) => !shouldHideColumn(column, hiddenColumnSet)
      ),
    [hiddenColumnSet, items, tableColumns]
  );
  const toggleMobileRow = useCallback((rowKey) => {
    setExpandedMobileRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  }, []);
  const sectionDescription =
    description ||
    (recordsView === "table"
      ? "Detailed entries arranged in a roomy table for easier scanning."
      : "Detailed entries presented as quick-scan cards.");

  return (
    <div className="light-glow-card-static rounded-[1.9rem] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {title}
          </h3>
          <p className="mobile-hide-copy mt-2 text-sm text-slate-500 dark:text-slate-300">
            {sectionDescription}
          </p>
        </div>
        <div className="mobile-hide-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {items.length} entries
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">Loading data...</span>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">{emptyMessage}</p>
      ) : recordsView === "table" ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:hidden">
            {items.map((row, rowIndex) => {
              const mobileRowKey = row.id || row._id || `${endpoint}-${rowIndex}`;
              const isExpanded = Boolean(expandedMobileRows[mobileRowKey]);
              const hiddenCount = Math.max(resolvedTableColumns.length - MOBILE_RECORD_PREVIEW_COUNT, 0);
              const visibleColumns = isExpanded
                ? resolvedTableColumns
                : resolvedTableColumns.slice(0, MOBILE_RECORD_PREVIEW_COUNT);

              return (
                <article
                  key={mobileRowKey}
                  className="dashboard-mobile-record-card min-w-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Record {rowIndex + 1}
                      </p>
                      <div className="mt-2 text-base font-black text-slate-900 dark:text-white">
                        <span className="block max-w-full break-all whitespace-pre-wrap">
                          {(() => {
                            const titleKey =
                              resolvedTableColumns[0]?.key ||
                              getPriorityKey(Object.keys(row || {}), TITLE_KEY_PRIORITY);
                            return formatValue(row?.[titleKey], titleKey);
                          })()}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      #{rowIndex + 1}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {visibleColumns.map((column) => (
                      <div
                        key={`${mobileRowKey}-${column.key}-mobile`}
                        className="dashboard-detail-tile min-w-0 overflow-hidden"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {column.label}
                        </p>
                        <div className="mt-2 min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {renderTableCell(column, row)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleMobileRow(mobileRowKey)}
                      className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:text-blue-200"
                    >
                      {isExpanded ? "Show Less" : `Show ${hiddenCount} More`}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table
              className="min-w-full table-auto divide-y divide-slate-200 text-sm dark:divide-slate-800"
              style={{ minWidth: `${Math.max(getDesktopTableMinWidth(resolvedTableColumns), 720)}px` }}
            >
              <colgroup>
                {resolvedTableColumns.map((column) => (
                  <col key={`col-${column.key}`} style={getColumnStyle(column)} />
                ))}
              </colgroup>

              <thead>
                <tr>
                  {resolvedTableColumns.map((column) => {
                    const alignment = getColumnAlignment(column);

                    return (
                      <th
                        key={column.key}
                        className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ${getAlignmentClasses(
                          alignment
                        )} whitespace-nowrap`}
                      >
                        {column.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((row, rowIndex) => (
                  <tr
                    key={row.id || row._id || `${endpoint}-${rowIndex}`}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/70"
                  >
                    {resolvedTableColumns.map((column, columnIndex) => {
                      const alignment = getColumnAlignment(column);

                      return (
                        <td
                          key={`${row.id || row._id || rowIndex}-${column.key}`}
                          className={`px-3 py-2 align-top ${getCellWrapClass(
                            column,
                            alignment
                          )} ${getAlignmentClasses(alignment)} ${
                            columnIndex === 0
                              ? "font-semibold text-slate-900 dark:text-white"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {renderTableCell(column, row, { compact: true })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((row, rowIndex) => {
            const { theme, title: cardTitle, heroEntries, visibleEntries } = getRecordPresentation(
              row,
              rowIndex,
              hiddenColumnSet
            );

            return (
              <article
                key={row.id || row._id || `${endpoint}-${rowIndex}`}
                className={`group light-glow-soft relative overflow-hidden rounded-[1.7rem] border p-5 ${theme.shell}`}
              >
                <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${theme.glow}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${theme.chip}`}
                      >
                        Record {rowIndex + 1}
                      </div>
                      <h4 className="mt-4 truncate text-xl font-black text-slate-900 dark:text-white">
                        {cardTitle}
                      </h4>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-[0_14px_32px_rgba(59,130,246,0.12)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300 dark:group-hover:text-white">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  {heroEntries.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {heroEntries.map((entry) => (
                        <div
                          key={`${rowIndex}-${entry.key}`}
                          className={`inline-flex flex-col rounded-2xl border px-3 py-2 text-left ${theme.chip}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                            {entry.label}
                          </span>
                          <span className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {visibleEntries.map(([key, value]) => (
                      <div
                        key={`${rowIndex}-${key}`}
                        className="rounded-[1.2rem] border border-white/70 bg-white/78 px-3 py-3 shadow-[0_12px_30px_rgba(59,130,246,0.08)] dark:border-slate-800 dark:bg-slate-950/72"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {toReadableLabel(key)}
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                          {formatValue(value, key)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DataPanelPage({
  title,
  description,
  endpoint,
  emptyMessage = "No records found.",
  recordsView = "table",
  tableColumns = [],
  downloadSection = null,
  hiddenSummaryLabels = [],
  hiddenRecordColumns = [],
}) {
  const user = useSelector((state) => state.auth.user);
  const { token, hydrated } = useAuthSession();
  const currentRole = user?.currentRole;
  const [error, setError] = useState("");
  const shouldSkipEndpointQuery = !endpoint || !hydrated || !token;
  const {
    data,
    isLoading: endpointLoading,
    isFetching: endpointFetching,
    refetch,
  } = useGetUtilityEndpointQuery(endpoint, { skip: shouldSkipEndpointQuery });
  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";
  const payload = data || {};
  const loading = endpointLoading || endpointFetching;
  const [expandedMobileRows, setExpandedMobileRows] = useState({});
  const isDashboardEndpoint = String(endpoint || "").endsWith("/dashboard");
  const isSuperAdminEndpoint = String(endpoint || "").startsWith("/super-admin/");
  const effectiveTitle = isDashboardEndpoint ? `${firstName} Dashboard` : title;
  const heroKicker = getHeroKicker({ isDashboardEndpoint, isSuperAdminEndpoint });
  const heroDescription = getHeroDescription({
    description,
    isDashboardEndpoint,
    isSuperAdminEndpoint,
  });
  const [locMessage, setLocMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setError("");
      await refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to fetch data");
    }
  }, [refetch]);

  const summary = useMemo(() => {
    const items = Array.isArray(payload.summary) ? payload.summary : [];
    if (!hiddenSummaryLabels.length) return items;

    const hiddenSet = new Set(
      hiddenSummaryLabels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean)
    );

    return items.filter(
      (item) => !hiddenSet.has(String(item?.label || "").trim().toLowerCase())
    );
  }, [hiddenSummaryLabels, payload.summary]);
  const items = useMemo(() => (Array.isArray(payload.items) ? payload.items : []), [payload.items]);
  const hiddenColumnSet = useMemo(
    () => buildHiddenColumnSet(hiddenRecordColumns),
    [hiddenRecordColumns]
  );
  const resolvedTableColumns = useMemo(
    () =>
      resolveTableColumns(items, tableColumns).filter(
        (column) => !shouldHideColumn(column, hiddenColumnSet)
      ),
    [hiddenColumnSet, items, tableColumns]
  );

  const toggleMobileRow = useCallback((rowKey) => {
    setExpandedMobileRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  }, []);

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel relative overflow-hidden rounded-[2rem] p-6 lg:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative">
          <div className="max-w-3xl">
            <SectionEyebrow className="mobile-hide-chip border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              {heroKicker}
            </SectionEyebrow>
            <h2 className="mobile-compact-hero-title mt-3 sm:mt-4 text-3xl font-black text-slate-900 dark:text-white">
              {effectiveTitle}
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {heroDescription}
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          {isDashboardEndpoint && currentRole === "TEAM_LEADER" ? (
            <TeamLeaderLiveLocationButton
              teamId={payload.meta?.teamId}
              disabled={loading}
              onStart={() => {
                setError("");
                setLocMessage("");
              }}
              onError={(message) => {
                setLocMessage("");
                setError(message);
              }}
              onSuccess={() => {
                setLocMessage("Today's live location has been set successfully!");
                refetch();
              }}
            />
          ) : null}

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-md"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {locMessage ? (
          <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{locMessage}</span>
          </div>
        ) : null}
      </div>

      {downloadSection ? (
        <div className="light-glow-card-static mobile-compact-panel relative z-20 overflow-visible rounded-[1.85rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {downloadSection.title || "Records Download"}
              </h3>
              <p className="mobile-hide-copy mt-2 text-sm text-slate-500 dark:text-slate-300">
                {downloadSection.description || "Download the visible records in PDF or Excel format."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {downloadSection.mode === "menu" ? (
                <DownloadMenuButton
                  label={downloadSection.buttonLabel || "Download"}
                  onDownloadPdf={downloadSection.onDownloadPdf}
                  onDownloadExcel={downloadSection.onDownloadExcel}
                  downloadingPdf={downloadSection.downloadingPdf}
                  downloadingExcel={downloadSection.downloadingExcel}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={downloadSection.onDownloadPdf}
                    disabled={downloadSection.downloadingPdf || downloadSection.downloadingExcel}
                    className="brand-btn brand-btn-secondary brand-btn-md"
                  >
                    {downloadSection.downloadingPdf ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <FileText size={16} />
                    )}
                    {downloadSection.pdfLabel || "Download PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={downloadSection.onDownloadExcel}
                    disabled={downloadSection.downloadingPdf || downloadSection.downloadingExcel}
                    className="brand-btn brand-btn-secondary brand-btn-md"
                  >
                    {downloadSection.downloadingExcel ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <FileBox size={16} />
                    )}
                    {downloadSection.excelLabel || "Download Excel"}
                  </button>
                </>
              )}
            </div>
          </div>

          {downloadSection.error ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{downloadSection.error}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {summary.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((card, index) => {
            const theme = RECORD_THEMES[index % RECORD_THEMES.length];
            const { value, valueClassName } = getSummaryDisplay(card);

            return (
              <div
                key={`${card.label || "summary"}-${index}`}
                className={`light-glow-soft relative overflow-hidden rounded-[1.6rem] border p-5 ${theme.shell}`}
              >
                <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${theme.glow}`} />
                <div className="relative">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    {toReadableLabel(card.label || `Metric ${index + 1}`)}
                  </p>
                  <p className={`mt-3 font-black text-slate-900 dark:text-white ${valueClassName}`}>
                    {value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Records
            </h3>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-500 dark:text-slate-300">
              {recordsView === "table"
                ? "Detailed entries arranged in a roomy table for easier scanning."
                : "Detailed entries presented as quick-scan cards."}
            </p>
          </div>
          <div className="mobile-hide-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {items.length} entries
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading data...</span>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">{emptyMessage}</p>
        ) : recordsView === "table" ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:hidden">
              {items.map((row, rowIndex) => {
                const mobileRowKey = row.id || row._id || `${endpoint}-${rowIndex}`;
                const isExpanded = Boolean(expandedMobileRows[mobileRowKey]);
                const hiddenCount = Math.max(
                  resolvedTableColumns.length - MOBILE_RECORD_PREVIEW_COUNT,
                  0
                );
                const visibleColumns = isExpanded
                  ? resolvedTableColumns
                  : resolvedTableColumns.slice(0, MOBILE_RECORD_PREVIEW_COUNT);

                return (
                  <article
                    key={mobileRowKey}
                    className="dashboard-mobile-record-card min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Record {rowIndex + 1}
                        </p>
                        <div className="mt-2 text-base font-black text-slate-900 dark:text-white">
                          <span className="block max-w-full break-all whitespace-pre-wrap">
                            {(() => {
                              const titleKey =
                                resolvedTableColumns[0]?.key ||
                                getPriorityKey(Object.keys(row || {}), TITLE_KEY_PRIORITY);
                              return formatValue(row?.[titleKey], titleKey);
                            })()}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        #{rowIndex + 1}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {visibleColumns.map((column) => (
                        <div
                          key={`${mobileRowKey}-${column.key}-mobile`}
                          className="dashboard-detail-tile min-w-0 overflow-hidden"
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                            {column.label}
                          </p>
                          <div className="mt-2 min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {renderTableCell(column, row)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {hiddenCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleMobileRow(mobileRowKey)}
                        className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:text-blue-200"
                      >
                        {isExpanded ? "Show Less" : `Show ${hiddenCount} More`}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table
                className="min-w-full table-auto divide-y divide-slate-200 text-sm dark:divide-slate-800"
                style={{ minWidth: `${Math.max(getDesktopTableMinWidth(resolvedTableColumns), 720)}px` }}
              >
                <colgroup>
                  {resolvedTableColumns.map((column) => (
                    <col key={`col-${column.key}`} style={getColumnStyle(column)} />
                  ))}
                </colgroup>

                <thead>
                  <tr>
                    {resolvedTableColumns.map((column) => {
                      const alignment = getColumnAlignment(column);

                      return (
                        <th
                          key={column.key}
                          className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ${getAlignmentClasses(
                            alignment
                          )} whitespace-nowrap`}
                        >
                          {column.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((row, rowIndex) => (
                    <tr
                      key={row.id || row._id || `${endpoint}-${rowIndex}`}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/70"
                    >
                      {resolvedTableColumns.map((column, columnIndex) => {
                        const alignment = getColumnAlignment(column);

                        return (
                          <td
                            key={`${row.id || row._id || rowIndex}-${column.key}`}
                            className={`px-3 py-2 align-top ${getCellWrapClass(
                              column,
                              alignment
                            )} ${getAlignmentClasses(alignment)} ${
                              columnIndex === 0
                                ? "font-semibold text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {renderTableCell(column, row, { compact: true })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((row, rowIndex) => {
              const { theme, title: cardTitle, heroEntries, visibleEntries } = getRecordPresentation(
                row,
                rowIndex,
                hiddenColumnSet
              );

              return (
                <article
                  key={row.id || row._id || `${endpoint}-${rowIndex}`}
                  className={`group light-glow-soft relative overflow-hidden rounded-[1.7rem] border p-5 ${theme.shell}`}
                >
                  <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${theme.glow}`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${theme.chip}`}
                        >
                          Record {rowIndex + 1}
                        </div>
                        <h4 className="mt-4 truncate text-xl font-black text-slate-900 dark:text-white">
                          {cardTitle}
                        </h4>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-[0_14px_32px_rgba(59,130,246,0.12)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300 dark:group-hover:text-white">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>

                    {heroEntries.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {heroEntries.map((entry) => (
                          <div
                            key={`${rowIndex}-${entry.key}`}
                            className={`inline-flex flex-col rounded-2xl border px-3 py-2 text-left ${theme.chip}`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                              {entry.label}
                            </span>
                            <span className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {visibleEntries.map(([key, value]) => (
                        <div
                          key={`${rowIndex}-${key}`}
                          className="rounded-[1.2rem] border border-white/70 bg-white/78 px-3 py-3 shadow-[0_12px_30px_rgba(59,130,246,0.08)] dark:border-slate-800 dark:bg-slate-950/72"
                        >
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                            {toReadableLabel(key)}
                          </p>
                          <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                            {formatValue(value, key)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
