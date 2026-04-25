"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCcw, Search } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import SectionEyebrow from "@/components/SectionEyebrow";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import useLocalPagination from "@/hooks/useLocalPagination";
import {
  useDownloadSuperAdminOrganizationsExcelMutation,
  useDownloadSuperAdminOrganizationsPdfMutation,
  useGetSuperAdminOrganizationsQuery,
} from "@/services/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";

const SUBSCRIPTION_OPTIONS = ["ALL", "TRIAL", "ACTIVE", "EXPIRED", "PAYMENT_PENDING"];
const ACCESS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];
const BLOCK_OPTIONS = ["ALL", "BLOCKED", "UNBLOCKED"];
const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

const toSummaryMap = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const getAccessLabel = (organization) =>
  organization?.blocked ? "BLOCKED" : organization?.active ? "ACTIVE" : "INACTIVE";

const getTone = (value) => {
  switch (String(value || "").toUpperCase()) {
    case "ACTIVE":
    case "UNBLOCKED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "BLOCKED":
    case "EXPIRED":
    case "INACTIVE":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    case "PAYMENT_PENDING":
    case "TRIAL":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
};

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card rounded-[1.75rem] px-5 py-5">
      <p className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-blue-100/80">
        {label}
      </p>
      <p className="mt-4 text-[2.2rem] font-black leading-none tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default function SuperAdminOrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("ALL");
  const [accessFilter, setAccessFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");
  const [downloadError, setDownloadError] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminOrganizationsQuery(
    DASHBOARD_FETCH_LIMITS.SUPER_ADMIN_ORGANIZATIONS
  );
  const [downloadOrganizationsPdf, { isLoading: downloadingPdf }] =
    useDownloadSuperAdminOrganizationsPdfMutation();
  const [downloadOrganizationsExcel, { isLoading: downloadingExcel }] =
    useDownloadSuperAdminOrganizationsExcelMutation();

  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const organizations = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);
  const loading = isLoading || isFetching;

  const filteredOrganizations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return organizations.filter((organization) => {
      const subscription = String(organization.subscriptionStatus || "TRIAL").toUpperCase();
      const access = organization.active ? "ACTIVE" : "INACTIVE";
      const blockState = organization.blocked ? "BLOCKED" : "UNBLOCKED";

      if (subscriptionFilter !== "ALL" && subscription !== subscriptionFilter) return false;
      if (accessFilter !== "ALL" && access !== accessFilter) return false;
      if (blockFilter !== "ALL" && blockState !== blockFilter) return false;
      if (!query) return true;

      return [
        organization.name,
        organization.code,
        organization.email,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(query);
    });
  }, [organizations, searchTerm, subscriptionFilter, accessFilter, blockFilter]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredOrganizations, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.ORGANIZATIONS[0],
    dependencies: [searchTerm, subscriptionFilter, accessFilter, blockFilter],
  });

  const buildDownloadQueryString = () => {
    const params = new URLSearchParams();
    params.set("limit", "2000");

    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (subscriptionFilter !== "ALL") params.set("subscriptionStatus", subscriptionFilter);
    if (accessFilter !== "ALL") params.set("access", accessFilter);
    if (blockFilter !== "ALL") params.set("block", blockFilter);

    return params.toString();
  };

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrganizationsPdf(buildDownloadQueryString()).unwrap();
      downloadBlobFile(blob, "super-admin-organizations-records.pdf");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download organizations PDF"));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrganizationsExcel(buildDownloadQueryString()).unwrap();
      downloadBlobFile(blob, "super-admin-organizations-records.xlsx");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download organizations Excel"));
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${panelClassName} mobile-compact-panel relative z-20`}>
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="mobile-hide-chip border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              Workspace Directory
            </SectionEyebrow>
            <h2 className="mobile-compact-hero-title mt-3 sm:mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Organizations
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              This page stays focused on list data only. Open any organization to view full details,
              edit fields, and manage block or unblock actions from the detail screen.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-[240px]">
            <div className="dashboard-summary-card">
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
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Refresh
              </button>

              <div className="min-w-0">
                <DownloadMenuButton
                  label="Download"
                  onDownloadPdf={onDownloadPdf}
                  onDownloadExcel={onDownloadExcel}
                  downloadingPdf={downloadingPdf}
                  downloadingExcel={downloadingExcel}
                  className="brand-btn brand-btn-secondary brand-btn-md w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {downloadError ? (
          <p className="relative mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {downloadError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Organizations" value={summaryMap.get("Organizations") || 0} />
        <MetricCard label="Active" value={summaryMap.get("Active") || 0} />
        <MetricCard label="Blocked" value={summaryMap.get("Blocked") || 0} />
        <MetricCard label="Payments" value={summaryMap.get("Successful Payments") || 0} />
      </div>

      <div className={`${panelClassName} mobile-compact-panel`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Organization List
            </h3>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-500 dark:text-slate-300">
              Minimal list view here. Full profile, subscription, usage, and control actions move to
              the detail page.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.85fr))]">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Search
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name, code, email"
                className="dashboard-field-control w-full pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          <FilterSelect
            label="Subscription"
            value={subscriptionFilter}
            onChange={setSubscriptionFilter}
            options={SUBSCRIPTION_OPTIONS}
          />
          <FilterSelect
            label="Access"
            value={accessFilter}
            onChange={setAccessFilter}
            options={ACCESS_OPTIONS}
          />
          <FilterSelect
            label="Block"
            value={blockFilter}
            onChange={setBlockFilter}
            options={BLOCK_OPTIONS}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading organizations...</span>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No organizations found.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-300">
              Showing {startIndex}-{endIndex} of {filteredOrganizations.length} organizations
            </p>

            <div className="grid gap-4 md:hidden">
              {paginatedItems.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/super-admin/organizations/${organization.id}`}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {organization.code}
                      </p>
                      <h4 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                        {organization.name}
                      </h4>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-400" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CompactInfo label="Plan" value={organization.planName || "TRIAL"} />
                    <CompactInfo label="Subscription" value={organization.subscriptionStatus || "TRIAL"} />
                    <CompactInfo label="Access" value={getAccessLabel(organization)} />
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 md:block dark:border-slate-800 dark:bg-slate-950/70">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Org Code
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Subscription
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Access
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((organization) => (
                    <tr
                      key={organization.id}
                      className="transition hover:bg-blue-50/55 dark:hover:bg-slate-900/55"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                        {organization.name}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {organization.code}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {organization.planName || "TRIAL"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getTone(organization.subscriptionStatus)}`}
                        >
                          {organization.subscriptionStatus || "TRIAL"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getTone(getAccessLabel(organization))}`}
                        >
                          {getAccessLabel(organization)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/super-admin/organizations/${organization.id}`}
                          className="brand-btn brand-btn-soft brand-btn-sm"
                        >
                          Open Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredOrganizations.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.ORGANIZATIONS}
              label="organizations"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="dashboard-field-control dashboard-select-control w-full"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function CompactInfo({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
