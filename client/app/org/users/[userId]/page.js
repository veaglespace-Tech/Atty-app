"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Loader2,
  Save,
  ShieldAlert,
  UserCog,
  UserRound,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import {
  useGetOrgUserByIdQuery,
  usePatchOrgUserMutation,
} from "@/services/api/orgApi";
import {
  ORG_MANAGED_ROLE_OPTIONS,
  PERMISSION_GROUPS,
  PERMISSIONS,
  formatPermissionLabel,
  formatRoleLabel,
  getAssignablePermissionsByRole,
  hasPermission,
  normalizeRole,
} from "@/utils/roles";
import { getLocalPhoneNumber } from "@/utils/phone";
import {
  getErrorMessage,
  normalizeTextInput,
  toDigitsOnly,
  validateManagedUserForm,
} from "@/utils/formValidation";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED"];

export default function OrgUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);
  const userId = Number(params?.userId);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobileCountryCode: "+91",
    mobile: "",
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
  } = useGetOrgUserByIdQuery(userId, { skip: !Number.isFinite(userId) || userId <= 0 });

  const [patchUserMutation] = usePatchOrgUserMutation();

  const user = userData?.item || null;
  const actorRole = normalizeRole(authUser?.role);
  const assignablePermissions = useMemo(
    () => getAssignablePermissionsByRole(actorRole),
    [actorRole]
  );

  const permissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((permission) => assignablePermissions.includes(permission)),
      })).filter((group) => group.items.length > 0),
    [assignablePermissions]
  );

  const canUpdateStatus = hasPermission(authUser, PERMISSIONS.USERS_STATUS_UPDATE);
  const canToggleAccess = hasPermission(authUser, PERMISSIONS.USERS_ACTIVE_TOGGLE);
  const canEditUser = hasPermission(authUser, PERMISSIONS.USERS_CREATE);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      mobileCountryCode: user.mobileCountryCode || "+91",
      mobile: getLocalPhoneNumber(user.mobile, user.mobileCountryCode),
      role: normalizeRole(user.role),
      approvalStatus: user.approvalStatus || "APPROVED",
      active: Boolean(user.active),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
  }, [user]);

  const saveProfile = async () => {
    const validationError = validateManagedUserForm({
      name: form.name,
      email: user?.email,
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
        mobileCountryCode: form.mobileCountryCode,
        mobile: toDigitsOnly(form.mobile),
        role: form.role,
        ...(canUpdateStatus ? { status: form.approvalStatus } : {}),
      }).unwrap();

      setMessage("User profile updated");
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

      setMessage("Permissions updated");
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

      setMessage(!form.active ? "User unblocked" : "User blocked");
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update user access"));
    } finally {
      setTogglingAccess(false);
    }
  };

  const onPermissionToggle = (permission) => {
    if (!canEditUser) return;
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
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
          onClick={() => router.push("/org/users")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to Users
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
          <div>
            <button
              type="button"
              onClick={() => router.push("/org/users")}
              className="brand-btn brand-btn-secondary brand-btn-sm"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{form.name}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={toggleAccess}
            disabled={!canToggleAccess || togglingAccess}
            className={`brand-btn brand-btn-sm w-full sm:w-auto disabled:opacity-60 ${
              form.active ? "brand-btn-danger" : "brand-btn-soft"
            }`}
          >
            {togglingAccess ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
            {form.active ? "Block User" : "Unblock User"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Profile & Access</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={!canEditUser}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
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
              disabled={!canEditUser}
              containerClassName="space-y-2 sm:col-span-2"
              labelClassName="text-xs font-black uppercase tracking-wide text-slate-500"
              groupClassName="rounded-lg shadow-none"
              selectClassName="py-2"
              inputClassName="py-2 text-sm font-medium text-slate-800"
            />

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Role</label>
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                disabled={!canEditUser}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
              >
                {ORG_MANAGED_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={form.approvalStatus}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, approvalStatus: event.target.value }))
                }
                disabled={!canUpdateStatus}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Current Role</span>
                <span className="text-xs font-bold text-slate-800">{formatRoleLabel(user.role)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Current Access</span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${form.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                  {form.active ? "Active" : "Blocked"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={saveProfile}
            disabled={!canEditUser || savingProfile || isFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
            Update Profile
          </button>
        </div>

        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Permissions</h3>

          <div className="grid gap-3 md:grid-cols-2">
            {permissionGroups.map((group) => (
              <div key={group.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{group.label}</p>
                <div className="mt-2 space-y-2">
                  {group.items.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={form.permissions.includes(permission)}
                        onChange={() => onPermissionToggle(permission)}
                        disabled={!canEditUser}
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
            disabled={!canEditUser || savingPermissions || isFetching}
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
