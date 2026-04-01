"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCcw, Search } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import SectionEyebrow from "@/components/SectionEyebrow";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import useLocalPagination from "@/hooks/useLocalPagination";
import {
  useDownloadSuperAdminPaymentsExcelMutation,
  useDownloadSuperAdminPaymentsPdfMutation,
  useGetSuperAdminPaymentsQuery,
} from "@/services/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const getStatusTone = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    case "CREATED":
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
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

export default function SuperAdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPaymentsQuery("limit=2000");
  const [downloadPaymentsPdf, { isLoading: downloadingPdf }] =
    useDownloadSuperAdminPaymentsPdfMutation();
  const [downloadPaymentsExcel, { isLoading: downloadingExcel }] =
    useDownloadSuperAdminPaymentsExcelMutation();

  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const payments = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);
  const loading = isLoading || isFetching;

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) =>
      [
        payment.organization,
        payment.organizationCode,
        payment.planName,
        payment.planCode,
        payment.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(query)
    );
  }, [payments, searchTerm]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredPayments, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.PAYMENTS[0],
    dependencies: [searchTerm],
  });

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadPaymentsPdf("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-payments-records.pdf");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download payments PDF"));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadPaymentsExcel("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-payments-records.xlsx");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download payments Excel"));
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${panelClassName} mobile-compact-panel relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="mobile-hide-chip border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              Purchase Ledger
            </SectionEyebrow>
            <h2 className="mobile-compact-hero-title mt-3 sm:mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Payments
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Keep the list lightweight here, then open any purchase to inspect and update the full
              payment and subscription record on its detail page.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-[300px]">
            <div className="dashboard-summary-card">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Live View
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredPayments.length} of {payments.length} purchases visible.
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

              <div className="sm:col-span-2">
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
        <MetricCard label="Payments" value={summaryMap.get("Payments") || 0} />
        <MetricCard label="Success" value={summaryMap.get("Success") || 0} />
        <MetricCard label="Failed" value={summaryMap.get("Failed") || 0} />
        <MetricCard
          label="Revenue"
          value={formatMoney(summaryMap.get("Revenue") || 0)}
        />
      </div>

      <div className={`${panelClassName} mobile-compact-panel`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Purchased Plans
            </h3>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-500 dark:text-slate-300">
              List view intentionally stays short: organization name, organization code, plan,
              amount, and status.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search organization, code, plan, status"
              className="dashboard-field-control w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading payments...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No payment records found.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-300">
              Showing {startIndex}-{endIndex} of {filteredPayments.length} purchases
            </p>

            <div className="grid gap-4 md:hidden">
              {paginatedItems.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/super-admin/payments/${payment.id}`}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {payment.organizationCode || "ORG"}
                      </p>
                      <h4 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                        {payment.organization}
                      </h4>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-400" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CompactInfo label="Plan" value={payment.planName || payment.planCode || "-"} />
                    <CompactInfo
                      label="Amount"
                      value={formatMoney(payment.amount, payment.currency)}
                    />
                    <div className="dashboard-detail-tile">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Status
                      </p>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </div>
                    </div>
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
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((payment) => (
                    <tr
                      key={payment.id}
                      className="transition hover:bg-blue-50/55 dark:hover:bg-slate-900/55"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                        {payment.organization}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {payment.organizationCode || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {payment.planName || payment.planCode || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/super-admin/payments/${payment.id}`}
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
              totalItems={filteredPayments.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.PAYMENTS}
              label="payments"
            />
          </div>
        )}
      </div>
    </section>
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
