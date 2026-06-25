"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  Pencil,
  Power,
  Save,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import PaginationControls from "@/components/dashboard/PaginationControls";
import {
  useExtendSuperAdminOrganizationPlanMutation,
  useExportSuperAdminOrganizationUsersExcelMutation,
  useGetSuperAdminOrganizationByIdQuery,
  useGetSuperAdminOrganizationTeamsQuery,
  useGetSuperAdminOrganizationUsersQuery,
  useGetSuperAdminPlansQuery,
  usePatchSuperAdminOrganizationMutation,
  useUpdateOrganizationAccessMutation,
} from "@/services/api/superAdminApi";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { formatCalendarDate } from "@/utils/date";
import { getErrorMessage, normalizeTextInput } from "@/utils/formValidation";
import { getLocalPhoneNumber } from "@/utils/phone";

const tabs = [
  { id: "overview", label: "Overview", Icon: Building2 },
  { id: "profile", label: "Profile", Icon: MapPin },
  { id: "billing", label: "Billing", Icon: CreditCard },
  { id: "users", label: "Users", Icon: Users },
  { id: "teams", label: "Teams", Icon: UsersRound },
];

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

const formatPhone = (countryCode, phone) => {
  const localPhone = getLocalPhoneNumber(phone, countryCode);
  if (!localPhone) return "-";
  return `${countryCode || "+91"} ${localPhone}`;
};

const getFormDefaults = (item) => ({
  name: item?.name || "",
  email: item?.email || "",
  phoneCountryCode: item?.phoneCountryCode || "+91",
  phone: getLocalPhoneNumber(item?.phone, item?.phoneCountryCode),
  address: item?.address || "",
  city: item?.city || "",
  state: item?.state || "",
  country: item?.country || "India",
  latitude: item?.latitude === null || item?.latitude === undefined ? "" : String(item.latitude),
  longitude: item?.longitude === null || item?.longitude === undefined ? "" : String(item.longitude),
  attendanceRadius:
    item?.attendanceRadius === null || item?.attendanceRadius === undefined
      ? "25"
      : String(item.attendanceRadius),
});

const getStatusTone = (value) => {
  switch (String(value || "").toUpperCase()) {
    case "ACTIVE":
    case "SUCCESS":
    case "UNBLOCKED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "BLOCKED":
    case "EXPIRED":
    case "FAILED":
    case "INACTIVE":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    case "CREATED":
    case "PENDING":
    case "PAYMENT_PENDING":
    case "TRIAL":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
};

function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusTone(value)}`}
    >
      <span className="truncate">{value || "-"}</span>
    </span>
  );
}

function DetailTile({ label, value, accent }) {
  return (
    <div className="dashboard-detail-tile min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-semibold ${
          accent ? "text-slate-950 dark:text-white" : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="light-glow-card-static rounded-[1.9rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
      {children}
    </p>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = Number(params?.organizationId);

  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(getFormDefaults(null));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminOrganizationByIdQuery(
    organizationId,
    {
      skip: !Number.isFinite(organizationId) || organizationId <= 0,
    }
  );

  const { data: usersData, isLoading: isLoadingUsers } =
    useGetSuperAdminOrganizationUsersQuery(organizationId, {
      skip: !Number.isFinite(organizationId) || organizationId <= 0,
    });

  const { data: teamsData, isLoading: isLoadingTeams } =
    useGetSuperAdminOrganizationTeamsQuery(organizationId, {
      skip: !Number.isFinite(organizationId) || organizationId <= 0,
    });

  const [patchOrganizationMutation] = usePatchSuperAdminOrganizationMutation();
  const [updateOrganizationAccessMutation] = useUpdateOrganizationAccessMutation();

  const item = data?.item || null;
  const users = Array.isArray(usersData?.items) ? usersData.items : [];
  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];

  useEffect(() => {
    setForm(getFormDefaults(item));
  }, [item]);

  const onChange = (event) => {
    let value = event.target.value;
    if (event.target.name === "attendanceRadius") {
      value = value.replace(/^0+(?=\d)/, "");
    }
    setForm((prev) => ({ ...prev, [event.target.name]: value }));
  };

  const onCancelEdit = () => {
    setForm(getFormDefaults(item));
    setEditMode(false);
    setError("");
    setMessage("");
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      await patchOrganizationMutation({
        organizationId,
        name: normalizeTextInput(form.name),
        email: normalizeTextInput(form.email),
        phoneCountryCode: form.phoneCountryCode,
        phone: form.phone,
        address: normalizeTextInput(form.address),
        city: normalizeTextInput(form.city),
        state: normalizeTextInput(form.state),
        country: normalizeTextInput(form.country || "India"),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        attendanceRadius: Number(form.attendanceRadius || 25),
      }).unwrap();

      setMessage("Organization details updated successfully.");
      setEditMode(false);
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update organization"));
    } finally {
      setSaving(false);
    }
  };

  const onAccessUpdate = async (payload, successMessage) => {
    try {
      setUpdatingAccess(true);
      setError("");
      setMessage("");
      await updateOrganizationAccessMutation({
        organizationId,
        ...payload,
      }).unwrap();
      setMessage(successMessage);
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update organization access"));
    } finally {
      setUpdatingAccess(false);
    }
  };

  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid organization id.
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">
          Loading organization record...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-40 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900">ORGANIZATION NOT FOUND</h2>
        <p className="mt-2 font-medium text-slate-500">
          The organization record you are looking for is unavailable.
        </p>
        <button
          onClick={() => router.push("/super-admin/organizations")}
          className="brand-btn brand-btn-primary brand-btn-md mt-8"
        >
          <ArrowLeft size={18} /> Back to Organizations
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/super-admin/organizations")}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className="brand-btn brand-btn-primary brand-btn-sm"
        >
          <Pencil size={14} /> Profile
        </button>
      </div>

      <div className="brand-entity-card overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="brand-metric-glow" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-blue-100/80">
              Organization Detail
            </p>
            <h1 className="mt-3 break-words text-3xl font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
              {item.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge value={item.code || "ORG"} />
              <StatusBadge value={item.subscriptionStatus || "TRIAL"} />
              <StatusBadge value={item.active ? "ACTIVE" : "INACTIVE"} />
              <StatusBadge value={item.blocked ? "BLOCKED" : "UNBLOCKED"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label="Plan" value={item.plan?.name || "TRIAL"} accent />
            <DetailTile label="Revenue" value={formatMoney(item.paymentSummary?.totalRevenue || 0)} accent />
            <DetailTile label="Users" value={Number(item.counts?.users || 0)} />
            <DetailTile label="Teams" value={Number(item.counts?.teams || 0)} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      <div className="light-glow-card-static rounded-[1.7rem] p-2">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`brand-btn brand-btn-md justify-center rounded-[1.25rem] ${
                  isActive ? "brand-btn-primary" : "brand-btn-secondary"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" ? (
        <OverviewTab
          item={item}
          updatingAccess={updatingAccess}
          onAccessUpdate={onAccessUpdate}
        />
      ) : null}

      {activeTab === "profile" ? (
        <ProfileTab
          editMode={editMode}
          form={form}
          item={item}
          isSaving={saving || isFetching}
          onCancelEdit={onCancelEdit}
          onChange={onChange}
          onEdit={() => setEditMode(true)}
          onSave={onSave}
          setForm={setForm}
        />
      ) : null}

      {activeTab === "billing" ? (
        <BillingTab
          item={item}
          organizationId={organizationId}
          onExtend={() => setShowExtendModal(true)}
        />
      ) : null}

      <ExtendPlanModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        organizationId={organizationId}
        organization={item}
        onExtended={async () => { await refetch(); setMessage("Plan extended successfully."); }}
      />

      {activeTab === "users" ? (
        <UsersTab users={users} isLoading={isLoadingUsers} organizationId={organizationId} />
      ) : null}

      {activeTab === "teams" ? (
        <TeamsTab teams={teams} isLoading={isLoadingTeams} />
      ) : null}
    </section>
  );
}

function OverviewTab({ item, updatingAccess, onAccessUpdate }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <SectionCard
          title="At A Glance"
          subtitle="Important account, subscription, usage, and admin details in one place."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailTile label="Email" value={item.email || "-"} />
            <DetailTile label="Phone" value={formatPhone(item.phoneCountryCode, item.phone)} />
            <DetailTile label="Location" value={[item.city, item.state, item.country].filter(Boolean).join(", ") || "-"} />
            <DetailTile label="Subscription Expiry" value={formatCalendarDate(item.subscriptionExpiry, "-")} />
            <DetailTile label="Successful Payments" value={Number(item.paymentSummary?.successfulPayments || 0)} />
            <DetailTile label="Last Payment" value={formatDateTime(item.paymentSummary?.lastPaymentAt)} />
          </div>
        </SectionCard>

        <SectionCard title="Admin & Limits">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailTile label="Admin Name" value={item.admin?.name || "-"} />
            <DetailTile label="Admin Email" value={item.admin?.email || "-"} />
            <DetailTile label="Member Limit" value={Number(item.plan?.memberLimit || 0) || "-"} />
            <DetailTile label="Max Teams" value={Number(item.plan?.maxTeams || 0) || "-"} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Access & Risk"
        subtitle="Use these controls only when the organization should be restricted or restored."
      >
        <div className="grid gap-3">
          <DetailTile label="Access" value={<StatusBadge value={item.active ? "ACTIVE" : "INACTIVE"} />} />
          <DetailTile label="Block State" value={<StatusBadge value={item.blocked ? "BLOCKED" : "UNBLOCKED"} />} />
          <DetailTile label="Updated At" value={formatDateTime(item.updatedAt)} />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            onClick={() =>
              onAccessUpdate(
                { isBlocked: !item.blocked },
                `${item.name} ${item.blocked ? "unblocked" : "blocked"} successfully.`
              )
            }
            disabled={updatingAccess}
            className={`brand-btn brand-btn-md justify-center ${item.blocked ? "brand-btn-soft" : "brand-btn-danger"}`}
          >
            {updatingAccess ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            {item.blocked ? "Unblock Organization" : "Block Organization"}
          </button>
          <button
            type="button"
            onClick={() =>
              onAccessUpdate(
                { isActive: !item.active },
                `${item.name} ${item.active ? "deactivated" : "activated"} successfully.`
              )
            }
            disabled={updatingAccess}
            className="brand-btn brand-btn-secondary brand-btn-md justify-center"
          >
            {updatingAccess ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {item.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileTab({
  editMode,
  form,
  item,
  isSaving,
  onCancelEdit,
  onChange,
  onEdit,
  onSave,
  setForm,
}) {
  const action = editMode ? (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onCancelEdit}
        disabled={isSaving}
        className="brand-btn brand-btn-secondary brand-btn-sm justify-center"
      >
        <X size={14} /> Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="brand-btn brand-btn-primary brand-btn-sm justify-center"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save
      </button>
    </div>
  ) : (
    <button type="button" onClick={onEdit} className="brand-btn brand-btn-primary brand-btn-sm">
      <Pencil size={14} /> Edit Profile
    </button>
  );

  return (
    <SectionCard
      title="Organization Profile"
      subtitle={editMode ? "Update core organization and location fields." : "Read-only profile view. Switch to edit mode when a field needs correction."}
      action={action}
    >
      {editMode ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Organization Name">
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="Email">
            <input
              name="email"
              value={form.email}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <CountryPhoneField
            label="Phone"
            countryCode={form.phoneCountryCode}
            phone={form.phone}
            onCountryCodeChange={(event) =>
              setForm((prev) => ({ ...prev, phoneCountryCode: event.target.value }))
            }
            onPhoneChange={(event) =>
              setForm((prev) => ({
                ...prev,
                phone: event.target.value.replace(/[^\d]/g, ""),
              }))
            }
            containerClassName="md:col-span-2"
            labelClassName="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            groupClassName="rounded-[1rem] shadow-none"
            selectClassName="py-3"
            inputClassName="py-3"
          />

          <FormField label="Address" fullWidth>
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              rows={3}
              className="dashboard-field-control min-h-[110px] w-full py-3"
            />
          </FormField>

          <FormField label="City">
            <input
              name="city"
              value={form.city}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="State">
            <input
              name="state"
              value={form.state}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="Country">
            <input
              name="country"
              value={form.country}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="Attendance Radius">
            <input
              name="attendanceRadius"
              type="number"
              min="5"
              value={form.attendanceRadius}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="Latitude">
            <input
              name="latitude"
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>

          <FormField label="Longitude">
            <input
              name="longitude"
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={onChange}
              className="dashboard-field-control w-full"
            />
          </FormField>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailTile label="Name" value={item.name || "-"} />
          <DetailTile label="Email" value={item.email || "-"} />
          <DetailTile label="Phone" value={formatPhone(item.phoneCountryCode, item.phone)} />
          <DetailTile label="Address" value={item.address || "-"} />
          <DetailTile label="City" value={item.city || "-"} />
          <DetailTile label="State" value={item.state || "-"} />
          <DetailTile label="Country" value={item.country || "-"} />
          <DetailTile label="Attendance Radius" value={`${item.attendanceRadius || 25} m`} />
          <DetailTile
            label="Coordinates"
            value={
              item.latitude || item.longitude
                ? `${item.latitude || "-"}, ${item.longitude || "-"}`
                : "-"
            }
          />
        </div>
      )}
    </SectionCard>
  );
}

function BillingTab({ item, onExtend }) {
  const recentPayments = Array.isArray(item.recentPayments) ? item.recentPayments : [];
  const recentSubscriptions = Array.isArray(item.recentSubscriptions) ? item.recentSubscriptions : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <SectionCard
          title="Subscription Snapshot"
          action={
            <button
              type="button"
              onClick={onExtend}
              className="brand-btn brand-btn-primary brand-btn-sm"
            >
              <CalendarClock size={14} />
              Extend Plan
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label="Current Plan" value={item.plan?.name || "TRIAL"} />
            <DetailTile label="Plan Code" value={item.plan?.code || "-"} />
            <DetailTile
              label="Plan Price"
              value={formatMoney(item.plan?.price || 0, item.plan?.currency || "INR")}
            />
            <DetailTile
              label="Duration"
              value={item.plan?.durationInDays ? `${item.plan.durationInDays} days` : "-"}
            />
            <DetailTile
              label="Start Date"
              value={formatCalendarDate(item.activeSubscription?.startDate, "-")}
            />
            <DetailTile
              label="End Date"
              value={formatCalendarDate(item.activeSubscription?.endDate, "-")}
            />
          </div>
        </SectionCard>

        <SectionCard title="Revenue">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label="Successful Payments" value={Number(item.paymentSummary?.successfulPayments || 0)} />
            <DetailTile label="Total Revenue" value={formatMoney(item.paymentSummary?.totalRevenue || 0)} />
            <DetailTile label="Payments Count" value={Number(item.counts?.payments || 0)} />
            <DetailTile label="Subscriptions Count" value={Number(item.counts?.subscriptions || 0)} />
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Recent Payments">
          {recentPayments.length ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {payment.planName || payment.planCode || "Plan"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {payment.orderId || payment.paymentId || "No gateway id"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <StatusBadge value={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No recent payments found.</EmptyState>
          )}
        </SectionCard>

        <SectionCard title="Recent Subscriptions">
          {recentSubscriptions.length ? (
            <div className="space-y-3">
              {recentSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {subscription.planName || subscription.planCode || "Subscription"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatCalendarDate(subscription.startDate, "-")} to{" "}
                        {formatCalendarDate(subscription.endDate, "-")}
                      </p>
                    </div>
                    <StatusBadge value={subscription.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No subscription history found.</EmptyState>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function UsersTab({ users, isLoading, organizationId }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [exportOrgUsersExcel] = useExportSuperAdminOrganizationUsersExcelMutation();

  const handleExcelDownload = async () => {
    try {
      setDownloading(true);
      const blob = await exportOrgUsersExcel(organizationId).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-${organizationId}-users.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore; toast handled by middleware
    } finally {
      setDownloading(false);
    }
  };
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(users, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.USERS[0],
    dependencies: [users.length],
  });

  return (
    <SectionCard
      title="Organization Users"
      subtitle="Compact user list with role and status context."
      action={
        <button
          type="button"
          id="btn-export-org-users-excel"
          onClick={handleExcelDownload}
          disabled={downloading || isLoading || users.length === 0}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export Excel
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : users.length ? (
        <>
          <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
            {paginatedItems.map((user) => (
              <div
                key={user.id}
                onClick={() => router.push(`/super-admin/organizations/${organizationId}/users/${user.id}`)}
                className="grid cursor-pointer gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900/50 md:grid-cols-[minmax(0,1fr)_auto] transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {user.name || "Unnamed User"}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {user.email || user.mobile || "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <StatusBadge value={user.role} />
                  <StatusBadge value={user.status || (user.isActive ? "ACTIVE" : "INACTIVE")} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={users.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS}
              label="users"
            />
          </div>
        </>
      ) : (
        <EmptyState>No users found.</EmptyState>
      )}
    </SectionCard>
  );
}

function TeamsTab({ teams, isLoading }) {
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(teams, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.TEAMS[0],
    dependencies: [teams.length],
  });

  return (
    <SectionCard title="Organization Teams" subtitle="Team structure, assigned leader, and member count.">
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : teams.length ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {paginatedItems.map((team) => (
              <div
                key={team.id}
                className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                      {team.name || "Unnamed Team"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                      {team.description || "No description"}
                    </p>
                  </div>
                  <StatusBadge value={team.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailTile
                    label="Members"
                    value={`${team.memberCount || 0} Member${team.memberCount === 1 ? "" : "s"}`}
                  />
                  <DetailTile label="Leader" value={team.leader?.name || "-"} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={teams.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.TEAMS}
              label="teams"
            />
          </div>
        </>
      ) : (
        <EmptyState>No teams found.</EmptyState>
      )}
    </SectionCard>
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

function ExtendPlanModal({ isOpen, onClose, organizationId, organization, onExtended }) {
  const [extendPlan, { isLoading }] = useExtendSuperAdminOrganizationPlanMutation();
  const { data: plansData } = useGetSuperAdminPlansQuery();
  const plans = Array.isArray(plansData?.items) ? plansData.items : [];

  const [additionalDays, setAdditionalDays] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [error, setError] = useState("");

  const quickDays = [7, 14, 30, 60, 90, 180, 365];

  const onSubmit = async () => {
    if (!additionalDays || Number(additionalDays) < 1) {
      setError("Please enter a valid number of days (minimum 1)");
      return;
    }
    try {
      setError("");
      await extendPlan({
        organizationId,
        additionalDays: Number(additionalDays),
        ...(planCode ? { planCode } : {}),
      }).unwrap();
      await onExtended();
      onClose();
      setAdditionalDays("");
      setPlanCode("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to extend plan"));
    }
  };

  if (!isOpen) return null;

  const currentExpiry = organization?.subscriptionExpiry;
  const baseDate = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  const previewExpiry = additionalDays && Number(additionalDays) > 0
    ? new Date(baseDate.getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="brand-metric-glow" />
        <div className="relative flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-6 dark:border-slate-800/60">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Extend Plan</h3>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {organization?.name || "Organization"}
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800/50">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-6 px-8 py-6">
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            )}

            {/* Current state info */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Current Plan</p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{organization?.plan?.name || "TRIAL"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Current Expiry</p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {currentExpiry ? new Date(currentExpiry).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
            </div>

            {/* Quick day presets */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Quick Select Days</p>
              <div className="flex flex-wrap gap-2">
                {quickDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setAdditionalDays(String(d))}
                    className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                      String(additionalDays) === String(d)
                        ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_14px_rgba(59,130,246,0.4)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {d >= 365 ? `${d / 365}yr` : `${d}d`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom days input */}
            <FormField label="Custom Days">
              <input
                type="number"
                min="1"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(e.target.value)}
                placeholder="e.g. 45"
                className="dashboard-field-control w-full"
              />
            </FormField>

            {/* Preview */}
            {previewExpiry && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">New Expiry Preview</p>
                <p className="mt-1 text-base font-black text-emerald-700 dark:text-emerald-300">
                  {previewExpiry.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}

            {/* Optional plan override */}
            {plans.length > 0 && (
              <FormField label="Switch Plan (Optional)">
                <select
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  className="dashboard-field-control dashboard-select-control w-full"
                >
                  <option value="">Keep current plan ({organization?.plan?.name || "TRIAL"})</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} — ₹{p.price} / {p.durationInDays}d
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200/60 bg-slate-50/50 px-8 py-5 dark:border-slate-800/60 dark:bg-slate-900/50">
            <button type="button" onClick={onClose} className="brand-btn brand-btn-secondary brand-btn-md px-8">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !additionalDays || Number(additionalDays) < 1}
              className="brand-btn brand-btn-primary brand-btn-md px-10"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
              Extend Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
