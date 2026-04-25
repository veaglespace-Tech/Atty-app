"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  Loader2,
  Power,
  Save,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import {
  useGetSuperAdminOrganizationByIdQuery,
  useGetSuperAdminOrganizationUsersQuery,
  useGetSuperAdminOrganizationTeamsQuery,
  usePatchSuperAdminOrganizationMutation,
  useUpdateOrganizationAccessMutation,
} from "@/services/api/superAdminApi";
import { formatCalendarDate } from "@/utils/date";
import { getErrorMessage, normalizeTextInput } from "@/utils/formValidation";
import { getLocalPhoneNumber } from "@/utils/phone";

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

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = Number(params?.organizationId);

  const [form, setForm] = useState(getFormDefaults(null));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminOrganizationByIdQuery(organizationId, {
    skip: !Number.isFinite(organizationId) || organizationId <= 0,
  });

  const { data: usersData, isLoading: isLoadingUsers } = useGetSuperAdminOrganizationUsersQuery(organizationId, {
    skip: !Number.isFinite(organizationId) || organizationId <= 0,
  });

  const { data: teamsData, isLoading: isLoadingTeams } = useGetSuperAdminOrganizationTeamsQuery(organizationId, {
    skip: !Number.isFinite(organizationId) || organizationId <= 0,
  });

  const [patchOrganizationMutation] = usePatchSuperAdminOrganizationMutation();
  const [updateOrganizationAccessMutation] = useUpdateOrganizationAccessMutation();

  const item = data?.item || null;

  useEffect(() => {
    setForm(getFormDefaults(item));
  }, [item]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    <section className="mx-auto max-w-6xl space-y-6">
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
          onClick={onSave}
          disabled={saving || isFetching}
          className="brand-btn brand-btn-primary brand-btn-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="brand-entity-card rounded-[2rem] p-7 sm:p-8">
          <div className="brand-metric-glow" />
          <p className="relative text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-blue-100/80">
            Organization Detail
          </p>
          <h1 className="relative mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-white">
            {item.name}
          </h1>
          <p className="relative mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {item.code}
          </p>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
            <DetailTile label="Plan" value={item.plan?.name || "TRIAL"} />
            <DetailTile label="Subscription" value={item.subscriptionStatus || "TRIAL"} />
            <DetailTile label="Users" value={Number(item.counts?.users || 0)} />
            <DetailTile label="Teams" value={Number(item.counts?.teams || 0)} />
          </div>
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Building2 size={18} className="text-slate-500" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Access Control
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Manage active state and block or unblock directly from here.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <DetailTile label="Current Access" value={item.active ? "ACTIVE" : "INACTIVE"} />
            <DetailTile label="Block State" value={item.blocked ? "BLOCKED" : "UNBLOCKED"} />
            <DetailTile
              label="Subscription Expiry"
              value={formatCalendarDate(item.subscriptionExpiry, "-")}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onAccessUpdate(
                  { isBlocked: !item.blocked },
                  `${item.name} ${item.blocked ? "unblocked" : "blocked"} successfully.`
                )
              }
              disabled={updatingAccess}
              className={`brand-btn brand-btn-sm ${item.blocked ? "brand-btn-soft" : "brand-btn-danger"}`}
            >
              {updatingAccess ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              {item.blocked ? "Unblock" : "Block"}
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
              className="brand-btn brand-btn-secondary brand-btn-sm"
            >
              {updatingAccess ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {item.active ? "Deactivate" : "Activate"}
            </button>
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
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Organization Profile
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="space-y-6">
          <div className="light-glow-card-static rounded-[1.9rem] p-6">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Subscription Snapshot
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          </div>

          <div className="light-glow-card-static rounded-[1.9rem] p-6">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Admin & Revenue
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailTile label="Admin Name" value={item.admin?.name || "-"} />
              <DetailTile label="Admin Email" value={item.admin?.email || "-"} />
              <DetailTile label="Payments" value={Number(item.paymentSummary?.successfulPayments || 0)} />
              <DetailTile
                label="Revenue"
                value={formatMoney(item.paymentSummary?.totalRevenue || 0)}
              />
              <DetailTile
                label="Created At"
                value={formatDateTime(item.createdAt)}
              />
              <DetailTile
                label="Updated At"
                value={formatDateTime(item.updatedAt)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mt-6">
        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mb-4">
            Organization Users
          </h3>
          {isLoadingUsers ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : usersData?.items?.length > 0 ? (
            <div className="space-y-3">
              {usersData.items.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email || user.mobile}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-left sm:text-right">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {user.role}
                    </span>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {user.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No users found.</p>
          )}
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mb-4">
            Organization Teams
          </h3>
          {isLoadingTeams ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : teamsData?.items?.length > 0 ? (
            <div className="space-y-3">
              {teamsData.items.map((team) => (
                <div key={team.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{team.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{team.description || "No description"}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-left sm:text-right">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {team.memberCount} Member{team.memberCount !== 1 ? 's' : ''}
                    </p>
                    {team.leader && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Lead: {team.leader.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No teams found.</p>
          )}
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
