"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  FileBox,
  FileText,
  Loader2,
  MapPin,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useGetUtilityEndpointQuery } from "@/store/api/utilityApi";
import { usePatchTeamLeaderTeamMutation } from "@/store/api/teamLeaderApi";
import { getCurrentCoordinates } from "@/utils/location";

const RECORD_THEMES = [
  {
    shell:
      "border-white/80 bg-gradient-to-br from-white via-blue-50/90 to-indigo-50/70 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    glow: "bg-blue-300/35 dark:bg-blue-500/18",
    chip:
      "border-blue-200/80 bg-white/85 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  },
  {
    shell:
      "border-white/80 bg-gradient-to-br from-white via-emerald-50/90 to-cyan-50/70 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    glow: "bg-emerald-300/35 dark:bg-emerald-500/18",
    chip:
      "border-emerald-200/80 bg-white/85 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  {
    shell:
      "border-white/80 bg-gradient-to-br from-white via-amber-50/90 to-rose-50/65 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    glow: "bg-amber-300/35 dark:bg-amber-500/18",
    chip:
      "border-amber-200/80 bg-white/85 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
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

const toReadableLabel = (key) =>
  String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());

const normalizeKey = (key) => String(key || "").replace(/[_-\s]/g, "").toLowerCase();

const getPriorityKey = (keys, priorities) => {
  for (const priority of priorities) {
    const matchedKey = keys.find((key) => normalizeKey(key) === priority);
    if (matchedKey) return matchedKey;
  }
  return keys[0] || null;
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toFixed(2);
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
    return value;
  }

  if (Array.isArray(value)) return value.join(", ");

  try {
    return JSON.stringify(value);
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

const resolveTableColumns = (items, tableColumns) => {
  if (Array.isArray(tableColumns) && tableColumns.length > 0) {
    return tableColumns.map((column) =>
      typeof column === "string"
        ? { key: column, label: toReadableLabel(column) }
        : {
            label: toReadableLabel(column.key),
            ...column,
          }
    );
  }

  const firstRow = Array.isArray(items) && items.length > 0 ? items[0] : null;
  if (!firstRow || typeof firstRow !== "object") return [];

  return Object.keys(firstRow)
    .filter((key) => key !== "id" && key !== "_id")
    .map((key) => ({
      key,
      label: toReadableLabel(key),
    }));
};

const getTableBadgeTone = (value) => {
  const normalized = String(value || "").trim().toUpperCase();

  if (["SUCCESS", "ACTIVE", "APPROVED", "OPEN", "UNBLOCKED"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (["FAILED", "BLOCKED", "EXPIRED", "REJECTED", "INACTIVE"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
  }

  if (["PENDING", "TRIAL", "PAYMENT_PENDING"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const renderTableCell = (column, row) => {
  let value = row?.[column.key];

  if (column.badgeMap) {
    const mappedValue = column.badgeMap[String(value)];
    if (mappedValue !== undefined) {
      value = mappedValue;
    }
  }

  if (column.type === "currency") {
    return formatCurrencyValue(value, column.currency || row?.[column.currencyKey] || "INR");
  }

  if (column.type === "badge") {
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${getTableBadgeTone(
          value
        )}`}
      >
        {formatValue(value)}
      </span>
    );
  }

  if (column.type === "datetime") {
    return formatValue(value);
  }

  return formatValue(value);
};

const getRecordPresentation = (row, index) => {
  const entries = Object.entries(row || {}).filter(([key]) => key !== "id" && key !== "_id");
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
    title: titleKey ? formatValue(row?.[titleKey]) : `Record ${index + 1}`,
    heroEntries: heroKeys.map((key) => ({
      key,
      label: toReadableLabel(key),
      value: formatValue(row?.[key]),
    })),
    visibleEntries,
  };
};

export default function DataPanelPage({
  title,
  description,
  endpoint,
  emptyMessage = "No records found.",
  recordsView = "cards",
  tableColumns = [],
  downloadSection = null,
}) {
  const { user } = useSelector((state) => state.auth);
  const [error, setError] = useState("");
  const {
    data,
    isLoading: endpointLoading,
    isFetching: endpointFetching,
    refetch,
  } = useGetUtilityEndpointQuery(endpoint, { skip: !endpoint });
  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";
  const payload = data || {};
  const loading = endpointLoading || endpointFetching;
  const isDashboardEndpoint = String(endpoint || "").endsWith("/dashboard");
  const isSuperAdminEndpoint = String(endpoint || "").startsWith("/super-admin/");
  const effectiveTitle = isDashboardEndpoint ? `${firstName}'s Dashboard` : title;

  const [updateTeamLoc] = usePatchTeamLeaderTeamMutation();
  const [locLoading, setLocLoading] = useState(false);
  const [locMessage, setLocMessage] = useState("");

  const handleSetLiveLocation = async () => {
    try {
      setLocLoading(true);
      setError("");
      setLocMessage("");

      const coords = await getCurrentCoordinates();
      if (user.role === "TEAM_LEADER") {
        const teamId = payload.meta?.teamId;
        if (!teamId) throw new Error("Team context not found in dashboard.");
        await updateTeamLoc({
          teamId,
          longitude: coords[0],
          latitude: coords[1],
        }).unwrap();
      } else {
        throw new Error("Only team leaders can set live location from dashboard.");
      }
      setLocMessage("Today's live location has been set successfully!");
      refetch();
    } catch (err) {
      setError(err?.message || "Failed to set live location.");
    } finally {
      setLocLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setError("");
      await refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to fetch data");
    }
  }, [refetch]);

  const summary = useMemo(
    () => (Array.isArray(payload.summary) ? payload.summary : []),
    [payload.summary]
  );
  const items = useMemo(() => (Array.isArray(payload.items) ? payload.items : []), [payload.items]);
  const resolvedTableColumns = useMemo(
    () => resolveTableColumns(items, tableColumns),
    [items, tableColumns]
  );
  const meta = useMemo(
    () =>
      payload.meta && typeof payload.meta === "object" && !Array.isArray(payload.meta)
        ? payload.meta
        : null,
    [payload.meta]
  );

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static relative overflow-hidden rounded-[2rem] p-6 lg:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <Sparkles size={12} />
              {isSuperAdminEndpoint ? "Control Snapshot" : "Workspace Snapshot"}
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
              {effectiveTitle}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[330px]">
            {summary.slice(0, 2).map((card, index) => (
              <div
                key={`${card.label || "glance"}-${index}`}
                className="rounded-[1.45rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_52px_rgba(59,130,246,0.12)] dark:border-slate-800 dark:bg-slate-950/75"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {card.label || `Metric ${index + 1}`}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {formatValue(card.value)}
                </p>
              </div>
            ))}
            {summary.length === 0 ? (
              <div className="rounded-[1.45rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_52px_rgba(59,130,246,0.12)] dark:border-slate-800 dark:bg-slate-950/75">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {loading ? "Fetching latest data" : "Ready for review"}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          {isDashboardEndpoint && user.role === "TEAM_LEADER" ? (
            <button
              type="button"
              onClick={handleSetLiveLocation}
              disabled={locLoading || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.24)] transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500 hover:shadow-[0_24px_56px_rgba(16,185,129,0.32)] disabled:opacity-70"
            >
              {locLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              Set Today&apos;s Live Location
            </button>
          ) : null}

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-[0_20px_44px_rgba(59,130,246,0.16)] disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:shadow-black/20 dark:hover:border-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-blue-200"
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
        <div className="light-glow-card-static rounded-[1.85rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {downloadSection.title || "Records Download"}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                {downloadSection.description || "Download the visible records in PDF or Excel format."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadSection.onDownloadPdf}
                disabled={downloadSection.downloadingPdf || downloadSection.downloadingExcel}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] transition-all duration-300 hover:-translate-y-1 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
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
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-[0_14px_34px_rgba(16,185,129,0.10)] transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                {downloadSection.downloadingExcel ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileBox size={16} />
                )}
                {downloadSection.excelLabel || "Download Excel"}
              </button>
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

            return (
              <div
                key={`${card.label || "summary"}-${index}`}
                className={`light-glow-soft relative overflow-hidden rounded-[1.6rem] border p-5 ${theme.shell}`}
              >
                <div className={`absolute -right-10 top-0 h-28 w-28 rounded-full blur-3xl ${theme.glow}`} />
                <div className="relative">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    {card.label || `Metric ${index + 1}`}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {formatValue(card.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {meta ? (
        <div className="light-glow-card-static rounded-[1.85rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Operational Signals
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Important context attached to this section.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {Object.keys(meta).length} fields
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(meta).map(([key, value], index) => {
              const theme = RECORD_THEMES[index % RECORD_THEMES.length];

              return (
                <div
                  key={key}
                  className={`rounded-[1.35rem] border p-4 shadow-[0_18px_42px_rgba(59,130,246,0.10)] ${theme.shell}`}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {toReadableLabel(key)}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                    {formatValue(value)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Records
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              {recordsView === "table"
                ? "Detailed entries presented in a compact table."
                : "Detailed entries presented as quick-scan cards."}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
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
          <div className="mt-5 overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
            <table className="min-w-[900px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                <tr>
                  {resolvedTableColumns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((row, rowIndex) => (
                  <tr
                    key={row.id || row._id || `${endpoint}-${rowIndex}`}
                    className="align-top transition hover:bg-slate-50/80 dark:hover:bg-slate-900/55"
                  >
                    {resolvedTableColumns.map((column, columnIndex) => (
                      <td
                        key={`${row.id || row._id || rowIndex}-${column.key}`}
                        className={`px-4 py-3 ${columnIndex === 0 ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        {renderTableCell(column, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((row, rowIndex) => {
              const { theme, title: cardTitle, heroEntries, visibleEntries } = getRecordPresentation(
                row,
                rowIndex
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
                          <Sparkles size={12} />
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
                            {formatValue(value)}
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
