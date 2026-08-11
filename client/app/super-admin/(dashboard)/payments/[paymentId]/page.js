"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import {
  useDeleteSuperAdminPaymentMutation,
  useGetSuperAdminPaymentByIdQuery,
  useUpdateSuperAdminPaymentMutation,
} from "@/services/api/superAdminApi";
import { formatCalendarDate, getDateKey } from "@/utils/date";
import { getErrorMessage, normalizeTextInput } from "@/utils/formValidation";

const PAYMENT_STATUS_OPTIONS = ["CREATED", "SUCCESS", "FAILED", "REFUNDED"];
const SUBSCRIPTION_STATUS_OPTIONS = ["ACTIVE", "EXPIRED", "PAYMENT_PENDING", "CANCELLED"];

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toInputDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return getDateKey(parsed);
};

const shiftDateByDays = (dateString, days) => {
  if (!dateString) return "";
  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  const shifted = new Date(parsed.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000);
  return shifted.toISOString().split("T")[0];
};

const getFormDefaults = (item) => ({
  paymentStatus: item?.status || "CREATED",
  paymentAmount: String(item?.amount ?? 0),
  paymentCurrency: item?.currency || "INR",
  gateway: item?.gateway || "PAYU",
  paymentPlanName: item?.planName || "",
  paymentPlanCode: item?.planCode || "",
  orderId: item?.orderId || "",
  paymentIdValue: item?.paymentId || "",
  signature: item?.signature || "",
  failureReason: item?.failureReason || "",
  subscriptionStatus: item?.subscription?.status || "ACTIVE",
  subscriptionAmount: String(item?.subscription?.amount ?? 0),
  subscriptionCurrency: item?.subscription?.currency || item?.currency || "INR",
  subscriptionPlanName: item?.subscription?.planName || item?.planName || "",
  subscriptionPlanCode: item?.subscription?.planCode || item?.planCode || "",
  subscriptionOrderId: item?.subscription?.orderId || "",
  subscriptionPaymentId: item?.subscription?.paymentId || "",
  subscriptionSignature: item?.subscription?.signature || "",
  startDate: toInputDate(item?.subscription?.startDate),
  endDate: toInputDate(item?.subscription?.endDate),
  notes: item?.subscription?.notes || "",
});

const getStatusBadgeStyle = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "SUCCESS":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
        dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
        label: "SUCCESSFUL",
      };
    case "FAILED":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
        dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
        label: "FAILED",
      };
    case "REFUNDED":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
        dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
        label: "REFUNDED",
      };
    default:
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
        dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
        label: "PENDING / CREATED",
      };
  }
};

function DetailTile({ label, value, icon: Icon, highlight = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        highlight
          ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/10"
          : "border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60"
      }`}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={14} className="text-slate-400 dark:text-slate-500" /> : null}
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 break-words text-sm font-bold text-slate-800 dark:text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = Number(params?.paymentId);

  const [form, setForm] = useState(getFormDefaults(null));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("receipt"); // "receipt" | "edit"
  const [copiedField, setCopiedField] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPaymentByIdQuery(paymentId, {
    skip: !Number.isFinite(paymentId) || paymentId <= 0,
  });
  const [updatePaymentMutation] = useUpdateSuperAdminPaymentMutation();
  const [deletePaymentMutation] = useDeleteSuperAdminPaymentMutation();

  const item = data?.item || null;

  useEffect(() => {
    setForm(getFormDefaults(item));
  }, [item]);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "startDate" && item?.subscription?.plan?.durationInDays) {
        const recalculated = shiftDateByDays(value, item.subscription.plan.durationInDays);
        return {
          ...prev,
          [name]: value,
          endDate: recalculated || prev.endDate,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const currentSubscriptionStartDate = toInputDate(item?.subscription?.startDate);
      const currentSubscriptionEndDate = toInputDate(item?.subscription?.endDate);
      const subscriptionPayload = {
        status: form.subscriptionStatus,
        amount: Number(form.subscriptionAmount || 0),
        currency: normalizeTextInput(form.subscriptionCurrency || "INR"),
        planName: normalizeTextInput(form.subscriptionPlanName),
        planCode: normalizeTextInput(form.subscriptionPlanCode).toUpperCase(),
        orderId: normalizeTextInput(form.subscriptionOrderId),
        paymentId: normalizeTextInput(form.subscriptionPaymentId),
        signature: normalizeTextInput(form.subscriptionSignature),
        notes: normalizeTextInput(form.notes),
      };

      if (form.startDate !== currentSubscriptionStartDate) {
        subscriptionPayload.startDate = form.startDate || null;
      }

      if (form.endDate !== currentSubscriptionEndDate) {
        subscriptionPayload.endDate = form.endDate || null;
      }

      await updatePaymentMutation({
        paymentId,
        payment: {
          status: form.paymentStatus,
          amount: Number(form.paymentAmount || 0),
          currency: normalizeTextInput(form.paymentCurrency || "INR"),
          gateway: normalizeTextInput(form.gateway || "PAYU"),
          planName: normalizeTextInput(form.paymentPlanName),
          planCode: normalizeTextInput(form.paymentPlanCode).toUpperCase(),
          orderId: normalizeTextInput(form.orderId),
          paymentId: normalizeTextInput(form.paymentIdValue),
          signature: normalizeTextInput(form.signature),
          failureReason: normalizeTextInput(form.failureReason),
        },
        subscription: {
          ...subscriptionPayload,
        },
      }).unwrap();

      setMessage("Payment record updated successfully.");
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update payment record"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!item) return;
    const confirmed = window.confirm(
      `Delete purchase record for ${item.organization?.name || "this organization"}?`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");
      await deletePaymentMutation(paymentId).unwrap();
      router.push("/super-admin/payments");
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to delete payment record"));
    } finally {
      setDeleting(false);
    }
  };

  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    return (
      <section className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid payment ID.
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-36">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">
          Fetching Receipt Details...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-36 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">PAYMENT NOT FOUND</h2>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          This purchase record may have been removed or is no longer available.
        </p>
        <button
          type="button"
          onClick={() => router.push("/super-admin/payments")}
          className="brand-btn brand-btn-primary brand-btn-md mt-6"
        >
          <ArrowLeft size={16} /> Back to Payments
        </button>
      </div>
    );
  }

  const statusStyle = getStatusBadgeStyle(item.status);

  return (
    <section className={activeTab === "receipt" ? "fixed inset-0 z-[99999] overflow-auto bg-slate-50/95 backdrop-blur-md dark:bg-slate-950/95 p-4 sm:p-8 flex flex-col items-center print:static print:block print:bg-transparent print:p-0 print:h-auto print:overflow-visible" : "mx-auto max-w-5xl space-y-6"}>
      <div className={`w-full max-w-5xl space-y-6 ${activeTab === "receipt" ? "pb-24" : ""}`}>
      {/* Screen Controls Header */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/super-admin/payments")}
            className="brand-btn brand-btn-secondary brand-btn-sm"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Receipt #{item.orderId || item.id}
          </span>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Switchers */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("receipt")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "receipt"
                  ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Eye size={14} /> Receipt View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "edit"
                  ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Edit3 size={14} /> Edit & Sync
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="brand-btn brand-btn-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
          >
            <Printer size={14} /> Print / Save PDF
          </button>

          {activeTab === "edit" && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || isFetching}
              className="brand-btn brand-btn-primary brand-btn-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="brand-btn brand-btn-danger brand-btn-sm"
            title="Delete Record"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {/* Error & Message Alerts */}
      {error ? (
        <div className="print:hidden rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="print:hidden rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {/* Screen View Container */}
      <div className="print:hidden">
        {activeTab === "receipt" ? (
          /* DIGITAL RECEIPT CARD (DISPLAY VIEW) */
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:border-slate-800 dark:bg-slate-950 print:shadow-none print:border-none print:bg-transparent print:p-0 print:!shadow-none">
            {/* Top Glowing Color Accent Bar */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

            {/* Header Section */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-8 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/25">
                  <CreditCard size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
                      Official Receipt
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    VeagleSpace Tech
                  </h1>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-black tracking-wider uppercase ${statusStyle.bg}`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                  {statusStyle.label}
                </div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Billed To */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Billed To
                </p>
                <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                  {item.organization?.name || "Organization"}
                </h3>

                <div className="mt-4 space-y-2.5 text-sm">
                  {item.organization?.code && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building2 size={15} className="text-slate-400 shrink-0" />
                      <span className="font-semibold">Code:</span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {item.organization.code}
                      </span>
                    </div>
                  )}
                  {item.user?.name && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <User size={15} className="text-slate-400 shrink-0" />
                      <span className="font-semibold">{item.user.name}</span>
                    </div>
                  )}
                  {item.user?.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail size={15} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {item.user.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Meta */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Payment Reference
                </p>

                <div className="mt-3 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                      Order ID:
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded-lg bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                        {item.orderId || item.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.orderId || String(item.id), "orderId")}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                        title="Copy Order ID"
                      >
                        {copiedField === "orderId" ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {item.paymentId && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        Payment Txn ID:
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="rounded-lg bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 break-all">
                          {item.paymentId}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.paymentId, "paymentId")}
                          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                          title="Copy Payment ID"
                        >
                          {copiedField === "paymentId" ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                      Payment Method:
                    </span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-black uppercase text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                      {item.gateway || "PAYU"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Description / Subscription Plan
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">
                            {item.planName || item.planCode || "Subscription Plan"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Subscription Validity:{" "}
                            {item.subscription?.endDate
                              ? formatCalendarDate(item.subscription.endDate, "-")
                              : "Lifetime / Unlimited"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white text-base">
                      {formatMoney(item.amount, item.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total Row Banner */}
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
                <span className="text-sm font-black uppercase tracking-wider">Total Paid</span>
                <span className="text-2xl font-black tracking-tight text-emerald-400">
                  {formatMoney(item.amount, item.currency)}
                </span>
              </div>
            </div>

            {/* Digital Stamp Footer */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/70 pt-6 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>This is an official computer-generated receipt issued by VeagleSpace Tech.</span>
              </div>
              <span className="font-semibold text-slate-400">Support: info@veaglespace.com</span>
            </div>
          </div>
        ) : (
          /* EDIT & ADMINISTRATIVE FORM VIEW */
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Payment Record Form */}
              <div className="light-glow-card-static rounded-[1.9rem] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                      Payment Transaction Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Modify gateway records and payment status.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Payment Status">
                    <select
                      name="paymentStatus"
                      value={form.paymentStatus}
                      onChange={onChange}
                      className="dashboard-field-control dashboard-select-control w-full"
                    >
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Amount">
                    <input
                      name="paymentAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paymentAmount}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Currency">
                    <input
                      name="paymentCurrency"
                      value={form.paymentCurrency}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Gateway">
                    <input
                      name="gateway"
                      value={form.gateway}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Plan Name">
                    <input
                      name="paymentPlanName"
                      value={form.paymentPlanName}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Plan Code">
                    <input
                      name="paymentPlanCode"
                      value={form.paymentPlanCode}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Order ID">
                    <input
                      name="orderId"
                      value={form.orderId}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Payment ID">
                    <input
                      name="paymentIdValue"
                      value={form.paymentIdValue}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Signature" fullWidth>
                    <input
                      name="signature"
                      value={form.signature}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Failure Reason" fullWidth>
                    <textarea
                      name="failureReason"
                      value={form.failureReason}
                      onChange={onChange}
                      rows={3}
                      className="dashboard-field-control min-h-[90px] w-full py-2.5"
                    />
                  </FormField>
                </div>
              </div>

              {/* Subscription Record Form */}
              <div className="light-glow-card-static rounded-[1.9rem] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <Zap size={18} className="text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                      Subscription Alignment
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sync date windows and subscription details.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Subscription Status">
                    <select
                      name="subscriptionStatus"
                      value={form.subscriptionStatus}
                      onChange={onChange}
                      className="dashboard-field-control dashboard-select-control w-full"
                    >
                      {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Amount">
                    <input
                      name="subscriptionAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.subscriptionAmount}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Currency">
                    <input
                      name="subscriptionCurrency"
                      value={form.subscriptionCurrency}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Plan Name">
                    <input
                      name="subscriptionPlanName"
                      value={form.subscriptionPlanName}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Start Date">
                    <input
                      name="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="End Date">
                    <input
                      name="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Order ID">
                    <input
                      name="subscriptionOrderId"
                      value={form.subscriptionOrderId}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Payment ID">
                    <input
                      name="subscriptionPaymentId"
                      value={form.subscriptionPaymentId}
                      onChange={onChange}
                      className="dashboard-field-control w-full"
                    />
                  </FormField>

                  <FormField label="Notes" fullWidth>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={onChange}
                      rows={3}
                      className="dashboard-field-control min-h-[90px] w-full py-2.5"
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Read-only Timelines & Snapshot */}
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="light-glow-card-static rounded-[1.9rem] p-6">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  System Audit Timeline
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailTile label="Payment Created" value={formatDateTime(item.createdAt)} icon={Clock} />
                  <DetailTile label="Payment Updated" value={formatDateTime(item.updatedAt)} icon={Clock} />
                  <DetailTile label="Subscription Created" value={formatDateTime(item.subscription?.createdAt)} icon={Calendar} />
                  <DetailTile label="Subscription Updated" value={formatDateTime(item.subscription?.updatedAt)} icon={Calendar} />
                </div>
              </div>

              <div className="light-glow-card-static rounded-[1.9rem] p-6">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Organization Status Snapshot
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailTile label="Org Name" value={item.organization?.name} icon={Building2} />
                  <DetailTile label="Org Code" value={item.organization?.code} icon={Building2} />
                  <DetailTile label="Current Sub Status" value={item.organization?.subscriptionStatus} icon={Zap} highlight />
                  <DetailTile
                    label="Current Sub Expiry"
                    value={formatCalendarDate(item.organization?.subscriptionExpiry, "-")}
                    icon={Calendar}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINTABLE RECEIPT LAYOUT (Only visible when printing or calling window.print()) */}
      <div className="hidden print:block bg-white text-black p-8 min-h-screen">
        {/* Printable Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">PAYMENT RECEIPT</h1>
            <p className="text-xs font-bold text-slate-500 mt-1">Receipt #{item.orderId || item.id}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900">VeagleSpace Tech</h2>
            <p className="text-xs text-slate-600 font-medium">www.veaglespace.com</p>
            <p className="text-xs text-slate-500">Email: info@veaglespace.com</p>
          </div>
        </div>

        {/* Billed To & Payment Details */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
            <h3 className="text-base font-bold text-slate-900">{item.organization?.name || "Organization"}</h3>
            {item.organization?.code && <p className="text-slate-600">Org Code: {item.organization.code}</p>}
            {item.user?.name && <p className="text-slate-600">Contact: {item.user.name}</p>}
            {item.user?.email && <p className="text-slate-600">{item.user.email}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 p-4 text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
            <p className="text-slate-700"><span className="font-semibold">Date:</span> {new Date(item.createdAt).toLocaleDateString("en-IN")}</p>
            <p className="text-slate-700"><span className="font-semibold">Method:</span> {item.gateway || "PAYU"}</p>
            <p className="text-slate-700"><span className="font-semibold">Status:</span> {item.status}</p>
            {item.paymentId && <p className="text-slate-700 text-xs font-mono mt-1">Txn ID: {item.paymentId}</p>}
          </div>
        </div>

        {/* Item Table */}
        <table className="w-full text-left mb-8 border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Description</th>
              <th className="py-3 px-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-4 px-4">
                <p className="font-bold text-slate-900">{item.planName || item.planCode || "Subscription Plan"}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Subscription valid till: {item.subscription?.endDate ? new Date(item.subscription.endDate).toLocaleDateString("en-IN") : "Lifetime / Unlimited"}
                </p>
              </td>
              <td className="py-4 px-4 text-right font-bold text-slate-900">{formatMoney(item.amount, item.currency)}</td>
            </tr>
          </tbody>
        </table>

        {/* Grand Total Box */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2 border border-slate-900 rounded-lg p-4 bg-slate-50 text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Amount Paid</span>
            <span className="font-black text-2xl text-slate-900">{formatMoney(item.amount, item.currency)}</span>
          </div>
        </div>

        {/* Printable Footer */}
        <div className="mt-16 text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <p className="font-semibold">Thank you for choosing VeagleSpace Tech!</p>
          <p className="mt-1">This is a computer-generated digital receipt and does not require a physical signature.</p>
        </div>
      </div>
      </div>
    </section>
  );
}

function FormField({ label, children, fullWidth = false }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
