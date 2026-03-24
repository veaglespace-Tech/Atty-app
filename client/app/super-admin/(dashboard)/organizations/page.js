"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Loader2,
  Power,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import {
  useDownloadSuperAdminOrganizationsExcelMutation,
  useDownloadSuperAdminOrganizationsPdfMutation,
  useGetSuperAdminOrganizationsQuery,
  useUpdateOrganizationAccessMutation,
} from "@/services/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import { getErrorMessage } from "@/utils/formValidation";

const SUBSCRIPTION_OPTIONS = ["TRIAL", "ACTIVE", "EXPIRED", "PAYMENT_PENDING"];
const ACCESS_FILTER_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];
const BLOCK_FILTER_OPTIONS = ["ALL", "BLOCKED", "UNBLOCKED"];
const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";
const secondaryButtonClassName =
  "brand-btn brand-btn-secondary brand-btn-md";
const inputClassName =
  "rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-[0_10px_24px_rgba(59,130,246,0.08)] outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/80 dark:border-white/80 dark:bg-white dark:text-slate-950 dark:shadow-[0_16px_30px_rgba(2,6,23,0.30)] dark:focus:ring-blue-500/20";
const filterShellClassName =
  "rounded-[1.45rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70";
const tableSelectClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400";
const actionButtonBaseClassName =
  "brand-btn brand-btn-sm justify-center whitespace-nowrap px-3 py-2 text-[11px]";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatPhone = (organization) => {
  const countryCode = String(organization?.phoneCountryCode || "").trim();
  const phone = String(organization?.phone || "").trim();
  return [countryCode, phone].filter(Boolean).join(" ");
};

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const toSummaryMap = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const getSubscriptionTone = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "EXPIRED":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    case "PAYMENT_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
  }
};

export default function SuperAdminOrganizationsPage() {
  const [actionId, setActionId] = useState("");
  const [subscriptionDraft, setSubscriptionDraft] = useState({});
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("ALL");
  const [accessFilter, setAccessFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminOrganizationsQuery(500);
  const [downloadOrganizationsPdf, { isLoading: downloadingPdf }] =
    useDownloadSuperAdminOrganizationsPdfMutation();
  const [downloadOrganizationsExcel, { isLoading: downloadingExcel }] =
    useDownloadSuperAdminOrganizationsExcelMutation();
  const [updateOrganizationAccess] = useUpdateOrganizationAccessMutation();

  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const organizations = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);
  const loading = isLoading || isFetching;

  useEffect(() => {
    const nextDraft = {};
    for (const organization of organizations) {
      nextDraft[organization.id] = organization.subscriptionStatus || "TRIAL";
    }
    setSubscriptionDraft(nextDraft);
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return organizations.filter((organization) => {
      const subscriptionStatus = String(organization.subscriptionStatus || "TRIAL").toUpperCase();

      if (subscriptionFilter !== "ALL" && subscriptionStatus !== subscriptionFilter) return false;
      if (accessFilter === "ACTIVE" && !organization.active) return false;
      if (accessFilter === "INACTIVE" && organization.active) return false;
      if (blockFilter === "BLOCKED" && !organization.blocked) return false;
      if (blockFilter === "UNBLOCKED" && organization.blocked) return false;
      if (!query) return true;

      const haystack = [
        organization.name,
        organization.code,
        organization.email,
        organization.phone,
        organization.phoneCountryCode,
        formatPhone(organization),
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [organizations, searchTerm, subscriptionFilter, accessFilter, blockFilter]);

  const buildDownloadQueryString = () => {
    const params = new URLSearchParams();
    params.set("limit", "2000");

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    if (subscriptionFilter !== "ALL") {
      params.set("subscriptionStatus", subscriptionFilter);
    }

    if (accessFilter !== "ALL") {
      params.set("access", accessFilter);
    }

    if (blockFilter !== "ALL") {
      params.set("block", blockFilter);
    }

    return params.toString();
  };

  const applyUpdate = async (organizationId, payload, successMessage) => {
    try {
      setActionId(organizationId);
      setError("");
      setMessage("");
      await updateOrganizationAccess({
        organizationId,
        ...payload,
      }).unwrap();
      setMessage(successMessage);
      await refetch();
    } catch (mutationError) {
      setError(mutationError?.data?.message || mutationError?.error || "Failed to update organization");
    } finally {
      setActionId("");
    }
  };

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrganizationsPdf(buildDownloadQueryString()).unwrap();
      downloadBlobFile(blob, "super-admin-organizations-records.pdf");
    } catch (downloadMutationError) {
      setDownloadError(
        getErrorMessage(downloadMutationError, "Failed to download organizations PDF")
      );
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrganizationsExcel(buildDownloadQueryString()).unwrap();
      downloadBlobFile(blob, "super-admin-organizations-records.xlsx");
    } catch (downloadMutationError) {
      setDownloadError(
        getErrorMessage(downloadMutationError, "Failed to download organizations Excel")
      );
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${panelClassName} relative z-20 overflow-visible`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <ShieldCheck size={12} />
              Access Control Room
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Organizations
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Organization records now stay in a compact table so search, filters, and access
              actions are easier to manage without oversized cards.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-[300px]">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_44px_rgba(59,130,246,0.12)] dark:border-slate-800 dark:bg-slate-950/75">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Live View
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredOrganizations.length} of {organizations.length} organizations visible.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={refetch}
                disabled={loading}
                className={secondaryButtonClassName}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Refresh
              </button>

              <div className="sm:col-span-2">
                <DownloadMenuButton
                  label="Download"
                  onDownloadPdf={onDownloadPdf}
                  onDownloadExcel={onDownloadExcel}
                  downloadingPdf={downloadingPdf}
                  downloadingExcel={downloadingExcel}
                  className={`${secondaryButtonClassName} w-full`}
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="relative mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        {downloadError ? (
          <p className="relative mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {downloadError}
          </p>
        ) : null}

        {message ? (
          <p className="relative mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <MetricCard
          label="Organizations"
          value={summaryMap.get("Organizations") || 0}
        />
        <MetricCard
          label="Active"
          value={summaryMap.get("Active") || 0}
        />
        <MetricCard
          label="Blocked"
          value={summaryMap.get("Blocked") || 0}
        />
        <MetricCard
          label="Users"
          value={organizations.reduce((sum, organization) => sum + Number(organization.users || 0), 0)}
        />
        <MetricCard
          label="Payments"
          value={summaryMap.get("Successful Payments") || 0}
        />
      </div>

      <div className={panelClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Organization Directory
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Search by name, code, email, or phone, then manage subscription and access from a compact table.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {filteredOrganizations.length} rows
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading organizations...</span>
          </div>
        ) : organizations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
            No organizations found.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className={`${filterShellClassName} grid gap-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]`}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, code, phone, email"
                  className={`${inputClassName} w-full py-3 pl-9 pr-3 text-sm`}
                />
              </div>

              <select
                value={subscriptionFilter}
                onChange={(event) => setSubscriptionFilter(event.target.value)}
                className={`${inputClassName} py-3 text-sm`}
              >
                <option value="ALL">All Subscription</option>
                {SUBSCRIPTION_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value)}
                className={`${inputClassName} py-3 text-sm`}
              >
                {ACCESS_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All Access" : status}
                  </option>
                ))}
              </select>

              <select
                value={blockFilter}
                onChange={(event) => setBlockFilter(event.target.value)}
                className={`${inputClassName} py-3 text-sm`}
              >
                {BLOCK_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All Block States" : status}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredOrganizations.length} of {organizations.length} organizations
            </p>

            {filteredOrganizations.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                No organizations match current filters.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
                <table className="min-w-[1260px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Primary Admin
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Plan & Usage
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Payments
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Subscription
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Access Control
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrganizations.map((organization) => {
                      const busy = actionId === organization.id;
                      const phone = formatPhone(organization);

                      return (
                        <tr
                          key={organization.id}
                          className="align-top transition hover:bg-blue-50/55 dark:hover:bg-slate-900/55"
                        >
                          <td className="px-4 py-4">
                            <p className="font-black text-slate-900 dark:text-white">
                              {organization.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {organization.code}
                            </p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              Created {formatDate(organization.createdAt)}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {organization.adminName || "-"}
                            </p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {organization.adminEmail || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {organization.email || "-"}
                            </p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {phone || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {organization.planName || "TRIAL"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                                Users {Number(organization.users || 0)}
                              </span>
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                                Teams {Number(organization.teams || 0)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="max-w-[220px] space-y-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-100">
                                {Number(organization.successfulPayments || 0)} successful
                              </p>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {formatMoney(organization.totalRevenue || 0)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Last payment {formatDate(organization.lastPaymentAt)}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="max-w-[220px] space-y-3">
                              <StatusChip
                                label={organization.subscriptionStatus || "TRIAL"}
                                tone={getSubscriptionTone(organization.subscriptionStatus)}
                              />
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Expires {formatDate(organization.subscriptionExpiry)}
                              </p>
                              <select
                                value={subscriptionDraft[organization.id] || "TRIAL"}
                                onChange={(event) =>
                                  setSubscriptionDraft((prev) => ({
                                    ...prev,
                                    [organization.id]: event.target.value,
                                  }))
                                }
                                className={tableSelectClassName}
                              >
                                {SUBSCRIPTION_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <ActionButton
                                icon={Save}
                                disabled={busy}
                                onClick={() =>
                                  applyUpdate(
                                    organization.id,
                                    {
                                      subscriptionStatus:
                                        subscriptionDraft[organization.id] || "TRIAL",
                                    },
                                    `Subscription status updated for ${organization.name}`
                                  )
                                }
                                label={busy ? "Saving..." : "Save"}
                                tone="brand-btn-soft"
                              />
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="max-w-[240px] space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <StatusChip
                                  label={organization.active ? "Active" : "Inactive"}
                                  tone={
                                    organization.active
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                      : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  }
                                />
                                <StatusChip
                                  label={organization.blocked ? "Blocked" : "Unblocked"}
                                  tone={
                                    organization.blocked
                                      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                                      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                                  }
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <ActionButton
                                  icon={Ban}
                                  disabled={busy}
                                  onClick={() =>
                                    applyUpdate(
                                      organization.id,
                                      { isBlocked: !organization.blocked },
                                      `${organization.name} ${organization.blocked ? "unblocked" : "blocked"} successfully`
                                    )
                                  }
                                  label={organization.blocked ? "Unblock" : "Block"}
                                  tone="brand-btn-danger"
                                />

                                <ActionButton
                                  icon={Power}
                                  disabled={busy}
                                  onClick={() =>
                                    applyUpdate(
                                      organization.id,
                                      { isActive: !organization.active },
                                      `${organization.name} ${organization.active ? "deactivated" : "activated"} successfully`
                                    )
                                  }
                                  label={organization.active ? "Deactivate" : "Activate"}
                                  tone="brand-btn-soft"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.2),transparent_38%),linear-gradient(145deg,rgba(248,251,255,0.98),rgba(221,234,254,0.92))] px-5 py-5 shadow-[0_26px_64px_rgba(59,130,246,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_38%),linear-gradient(145deg,rgba(8,16,38,0.98),rgba(18,31,58,0.96))] dark:shadow-[0_28px_72px_rgba(2,6,23,0.34)]">
      <div className="relative min-h-[5.9rem]">
        <p className="text-[0.72rem] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-blue-100/80">
          {label}
        </p>
        <p className="mt-4 text-[2.35rem] font-black leading-none tracking-[-0.05em] text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusChip({ label, tone }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${tone}`}
    >
      {label}
    </span>
  );
}

function ActionButton({ icon: Icon, label, tone, ...props }) {
  return (
    <button type="button" className={`${actionButtonBaseClassName} ${tone}`} {...props}>
      <Icon size={14} />
      {label}
    </button>
  );
}
