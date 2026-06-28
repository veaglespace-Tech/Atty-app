"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  UserCog,
  UserRound,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import UserAvatar from "@/components/UserAvatar";
import {
  useGetSuperAdminUserByIdQuery,
  usePatchSuperAdminUserMutation,
} from "@/services/api/superAdminApi";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  formatPermissionLabel,
  formatRoleLabel,
  getDefaultPermissionsForRole,
  ROLES,
} from "@/utils/roles";
import { getLocalPhoneNumber } from "@/utils/phone";
import {
  getErrorMessage,
  normalizeTextInput,
  toDigitsOnly,
  validateManagedUserForm,
} from "@/utils/formValidation";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED", "BLOCKED"];
const ROLE_OPTIONS = [
  { value: "MEMBER", label: "Member" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "SUB_ADMIN", label: "Sub Admin" },
  { value: "ORG_ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const toDisplayText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toDateLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toPhoneLabel = (countryCode, number) => {
  const code = String(countryCode || "").trim();
  const mobile = String(number || "").trim();
  if (!code && !mobile) return "-";
  return `${code} ${mobile}`;
};

const toListLabel = (items = []) => {
  const values = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return values.length ? values.join(", ") : "-";
};

export default function SuperAdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const organizationId = Number(params?.organizationId);
  const userId = Number(params?.userId);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileCountryCode: "+91",
    mobile: "",
    emergencyContact: "",
    currentAddress: "",
    permanentAddress: "",
    role: "MEMBER",
    approvalStatus: "APPROVED",
    active: true,
    permissions: [],
  });

  const {
    data: userData,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminUserByIdQuery(userId, { skip: !Number.isFinite(userId) || userId <= 0 });

  const [patchUserMutation] = usePatchSuperAdminUserMutation();

  const user = userData?.item || null;
  const organization = user?.organization || null;
  const attendanceSummary = user?.attendanceSummary || {};
  const userMobileLabel = toPhoneLabel(user?.mobileCountryCode, user?.mobile);
  
  const organizationPhoneLabel = toPhoneLabel(
    organization?.phoneCountryCode,
    organization?.phone
  );
  
  const organizationAddress = [
    organization?.address,
    organization?.city,
    organization?.state,
    organization?.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobileCountryCode: user.mobileCountryCode || "+91",
      mobile: getLocalPhoneNumber(user.mobile, user.mobileCountryCode) || "",
      emergencyContact: user.emergencyContact || "",
      currentAddress: user.currentAddress || "",
      permanentAddress: user.permanentAddress || "",
      role: user.role || "MEMBER",
      approvalStatus: user.approvalStatus || "APPROVED",
      active: Boolean(user.active),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
  }, [user]);

  const saveProfile = async () => {
    const validationError = validateManagedUserForm({
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      password: "",
      passwordRequired: false,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSavingProfile(true);
      setError("");
      setMessage("");

      await patchUserMutation({
        userId,
        name: normalizeTextInput(form.name),
        email: normalizeTextInput(form.email),
        mobileCountryCode: form.mobileCountryCode,
        mobile: toDigitsOnly(form.mobile),
        role: form.role,
        status: form.approvalStatus,
        emergencyContact: normalizeTextInput(form.emergencyContact),
        currentAddress: normalizeTextInput(form.currentAddress),
        permanentAddress: normalizeTextInput(form.permanentAddress),
      }).unwrap();

      setMessage("User profile updated successfully");
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update user profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePermissions = async () => {
    try {
      setSavingPermissions(true);
      setError("");
      setMessage("");

      await patchUserMutation({
        userId,
        permissions: form.permissions,
      }).unwrap();

      setMessage("User permissions updated successfully");
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update permissions"));
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleAccess = async () => {
    try {
      setTogglingAccess(true);
      setError("");
      setMessage("");

      await patchUserMutation({
        userId,
        isActive: !form.active,
      }).unwrap();

      setMessage(!form.active ? "User unblocked successfully" : "User blocked successfully");
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update user access"));
    } finally {
      setTogglingAccess(false);
    }
  };

  const onPermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const onRoleChange = (event) => {
    const nextRole = event.target.value;
    setForm((prev) => ({
      ...prev,
      role: nextRole,
      permissions: getDefaultPermissionsForRole(nextRole),
    }));
  };

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid user id.
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="flex items-center justify-center gap-2 py-20 text-slate-600">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-semibold">Loading user details...</span>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/super-admin/organizations/${organizationId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to Organization
        </button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-700">
          User not found.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={user.profileImageUrl}
              name={form.name}
              className="h-16 w-16 rounded-[1.5rem] text-2xl"
              sizes="64px"
            />

            <div>
              <button
                type="button"
                onClick={() => router.push(`/super-admin/organizations/${organizationId}`)}
                className="brand-btn brand-btn-secondary brand-btn-sm"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{form.name}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{user.email}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={toggleAccess}
              disabled={togglingAccess}
              className={`brand-btn brand-btn-sm w-full sm:w-auto disabled:opacity-60 ${
                form.active ? "brand-btn-danger" : "brand-btn-soft"
              }`}
            >
              {togglingAccess ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
              {form.active ? "Block User" : "Unblock User"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>
        ) : null}
      </div>

      <div className="light-glow-card-static space-y-5 rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Complete User Details</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            User ID: {`ATTY-${toDisplayText(organization?.organizationCode, "ORG")}-${user.id}`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailTile label="User Database ID" value={toDisplayText(user.id)} />
          <DetailTile label="Role" value={formatRoleLabel(user.role)} />
          <DetailTile label="Approval Status" value={toDisplayText(user.approvalStatus)} />
          <DetailTile label="Access" value={user.active ? "Active" : "Blocked"} />
          <DetailTile label="Email" value={toDisplayText(user.email)} />
          <DetailTile label="Mobile" value={userMobileLabel} />
          {!(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN) && (
            <DetailTile label="Emergency Contact" value={toDisplayText(user.emergencyContact)} />
          )}
          <DetailTile label="Current Address" value={toDisplayText(user.currentAddress)} />
          <DetailTile label="Permanent Address" value={toDisplayText(user.permanentAddress)} />
          <DetailTile label="Joined On" value={toDateLabel(user.createdAt)} />
          <DetailTile label="Last Login" value={toDateTimeLabel(user.lastLoginAt)} />
          <DetailTile label="Last Updated" value={toDateTimeLabel(user.updatedAt)} />
          <DetailTile label="Organization" value={toDisplayText(organization?.name)} />
          <DetailTile label="Org Code" value={toDisplayText(organization?.organizationCode)} />
          <DetailTile label="Org Phone" value={organizationPhoneLabel} />
          <DetailTile label="Org Address" value={toDisplayText(organizationAddress)} />
          <DetailTile label="Teams" value={toListLabel(user.teamNames)} />
          <DetailTile label="Leads Teams" value={toListLabel(user.ledTeamNames)} />
          <DetailTile
            label="Attendance Entries"
            value={toDisplayText(Number(attendanceSummary.totalEntries || 0))}
          />
          <DetailTile
            label="Present / Half / Absent"
            value={`${Number(attendanceSummary.presentDays || 0)} / ${Number(attendanceSummary.halfDays || 0)} / ${Number(attendanceSummary.absentDays || 0)}`}
          />
          <DetailTile
            label="Total Worked Minutes"
            value={toDisplayText(Number(attendanceSummary.totalWorkedMinutes || 0))}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile & Access</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Full Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Email Address</label>
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <CountryPhoneField
              label="Mobile Number"
              countryCode={form.mobileCountryCode}
              phone={form.mobile}
              onCountryCodeChange={(event) =>
                setForm((prev) => ({ ...prev, mobileCountryCode: event.target.value }))
              }
              onPhoneChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  mobile: event.target.value.replace(/[^\d]/g, ""),
                }))
              }
              containerClassName="space-y-2 sm:col-span-2"
              labelClassName="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"
              groupClassName="rounded-lg shadow-none border dark:border-slate-700 dark:bg-slate-900"
              selectClassName="py-2 dark:bg-slate-900 dark:text-white"
              inputClassName="py-2 text-sm font-medium text-slate-800 dark:bg-slate-900 dark:text-white"
            />

            {!(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN) && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency Contact</label>
                <input
                  value={form.emergencyContact}
                  onChange={(event) => setForm((prev) => ({ ...prev, emergencyContact: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Address</label>
              <textarea
                value={form.currentAddress}
                onChange={(event) => setForm((prev) => ({ ...prev, currentAddress: event.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Permanent Address</label>
              <textarea
                value={form.permanentAddress}
                onChange={(event) => setForm((prev) => ({ ...prev, permanentAddress: event.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</label>
              <select
                value={form.role}
                onChange={onRoleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
              <select
                value={form.approvalStatus}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, approvalStatus: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile || isFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
            Update Profile
          </button>
        </div>

        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Permissions</h3>

          <div className="grid gap-3 md:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{group.label}</p>
                <div className="mt-2 space-y-2">
                  {group.items.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                        checked={form.permissions.includes(permission)}
                        onChange={() => onPermissionToggle(permission)}
                      />
                      <span>{formatPermissionLabel(permission)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={savePermissions}
            disabled={savingPermissions || isFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingPermissions ? <Loader2 size={16} className="animate-spin" /> : <UserCog size={16} />}
            Update Permissions
          </button>
        </div>
      </div>
    </section>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
