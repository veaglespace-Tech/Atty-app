"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import {
  useDeleteSuperAdminPaymentMutation,
  useGetSuperAdminPaymentByIdQuery,
  useUpdateSuperAdminPaymentMutation,
} from "@/services/api/superAdminApi";
import { formatCalendarDate, getDateKey } from "@/utils/date";
import { getErrorMessage, normalizeTextInput } from "@/utils/formValidation";

const PAYMENT_STATUS_OPTIONS = ["CREATED", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"];
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
  return parsed.toLocaleString("en-IN");
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

function DetailTile({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value}
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

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminPaymentByIdQuery(paymentId, {
    skip: !Number.isFinite(paymentId) || paymentId <= 0,
  });
  const [updatePaymentMutation] = useUpdateSuperAdminPaymentMutation();
  const [deletePaymentMutation] = useDeleteSuperAdminPaymentMutation();

  const item = data?.item || null;

  useEffect(() => {
    setForm(getFormDefaults(item));
  }, [item]);

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
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid payment id.
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">
          Loading payment record...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-40 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900">PAYMENT NOT FOUND</h2>
        <p className="mt-2 font-medium text-slate-500">
          This purchase record may have been removed or is no longer available.
        </p>
        <button
          onClick={() => router.push("/super-admin/payments")}
          className="brand-btn brand-btn-primary brand-btn-md mt-8"
        >
          <ArrowLeft size={18} /> Back to Payments
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/super-admin/payments")}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="brand-btn brand-btn-danger brand-btn-sm"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isFetching}
            className="brand-btn brand-btn-primary brand-btn-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="brand-entity-card rounded-[2rem] p-7 sm:p-8">
          <div className="brand-metric-glow" />
          <p className="relative text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-blue-100/80">
            Purchase Detail
          </p>
          <h1 className="relative mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-white">
            {item.organization?.name}
          </h1>
          <p className="relative mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {item.organization?.code || "-"}
          </p>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
            <DetailTile label="Plan" value={item.planName || item.planCode || "-"} />
            <DetailTile label="Amount" value={formatMoney(item.amount, item.currency)} />
            <DetailTile label="Status" value={item.status || "-"} />
            <DetailTile label="Subscription End" value={formatCalendarDate(item.subscription?.endDate, "-")} />
          </div>
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Linked Data
          </h3>
          <div className="mt-4 grid gap-3">
            <DetailTile label="User" value={item.user?.name || "-"} />
            <DetailTile label="User Email" value={item.user?.email || "-"} />
            <DetailTile label="Organization Status" value={item.organization?.subscriptionStatus || "-"} />
            <DetailTile
              label="Payment Count On Subscription"
              value={Number(item.subscription?.paymentCount || 0)}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <div className="mb-5 flex items-center gap-3">
            <CreditCard size={18} className="text-slate-500" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Payment Record
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Edit the actual transaction details stored for this purchase.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Status">
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
                className="dashboard-field-control min-h-[110px] w-full py-3"
              />
            </FormField>
          </div>
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <div className="mb-5">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Subscription Record
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              If you change the window here, the organization subscription data will sync to the
              updated start and end dates.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Status">
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

            <FormField label="Plan Code">
              <input
                name="subscriptionPlanCode"
                value={form.subscriptionPlanCode}
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

            <FormField label="Signature" fullWidth>
              <input
                name="subscriptionSignature"
                value={form.subscriptionSignature}
                onChange={onChange}
                className="dashboard-field-control w-full"
              />
            </FormField>

            <FormField label="Notes" fullWidth>
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows={4}
                className="dashboard-field-control min-h-[120px] w-full py-3"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Read-only Timeline
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailTile label="Payment Created" value={formatDateTime(item.createdAt)} />
            <DetailTile label="Payment Updated" value={formatDateTime(item.updatedAt)} />
            <DetailTile label="Subscription Created" value={formatDateTime(item.subscription?.createdAt)} />
            <DetailTile label="Subscription Updated" value={formatDateTime(item.subscription?.updatedAt)} />
          </div>
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Organization Snapshot
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailTile label="Org Name" value={item.organization?.name || "-"} />
            <DetailTile label="Org Code" value={item.organization?.code || "-"} />
            <DetailTile label="Subscription Status" value={item.organization?.subscriptionStatus || "-"} />
            <DetailTile
              label="Subscription Expiry"
              value={formatCalendarDate(item.organization?.subscriptionExpiry, "-")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FormField({ label, children, fullWidth = false }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
