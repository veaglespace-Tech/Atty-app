"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Download,
  Loader2,
  ShieldAlert,
  UserCog,
  UserRound,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import UserAvatar from "@/components/UserAvatar";
import {
  useDownloadOrgUserProfilePdfMutation,
  useGetOrgUserByIdQuery,
  usePatchOrgUserMutation,
  useGetOrgUserAttendanceLogsQuery,
  useDownloadOrgUserAttendancePdfMutation,
  useDownloadOrgUserAttendanceExcelMutation,
} from "@/services/api/orgApi";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLES,
  formatPermissionLabel,
  formatRoleLabel,
  getAssignablePermissionsByRole,
  getDefaultPermissionsForRole,
  getManagedRoleOptions,
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

const toTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toPhoneLabel = (countryCode, number) => {
  const code = String(countryCode || "").trim();
  const mobile = String(number || "").trim();
  if (!code && !mobile) return "-";
  return `${code}${mobile}`;
};

const toListLabel = (items = []) => {
  const values = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return values.length ? values.join(", ") : "-";
};

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

  const [period, setPeriod] = useState("monthly");
  const [customRange, setCustomRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", customRange.from);
      params.set("to", customRange.to);
    }
    return params.toString();
  }, [period, customRange]);

  const {
    data: userData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrgUserByIdQuery(userId, { skip: !Number.isFinite(userId) || userId <= 0 });

  const [patchUserMutation] = usePatchOrgUserMutation();
  const [downloadOrgUserProfilePdf, { isLoading: downloadingProfilePdf }] =
    useDownloadOrgUserProfilePdfMutation();
    
  const { data: logsData, isLoading: loadingLogs, isFetching: fetchingLogs } = useGetOrgUserAttendanceLogsQuery(
    { userId, params: queryString },
    { skip: !Number.isFinite(userId) || userId <= 0 }
  );
  
  const [downloadPdfMutation, { isLoading: downloadingPdf }] = useDownloadOrgUserAttendancePdfMutation();
  const [downloadExcelMutation, { isLoading: downloadingExcel }] = useDownloadOrgUserAttendanceExcelMutation();

  const user = userData?.item || null;
  const organization = user?.organization || null;
  const attendanceSummary = user?.attendanceSummary || {};
  const joiningDate = user?.membership?.joinedAt || user?.joinedAt || null;
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

  const actorRole = normalizeRole(authUser?.currentRole);
  const manageableRoleOptions = useMemo(
    () => getManagedRoleOptions(actorRole),
    [actorRole]
  );
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
  const canDownloadProfilePdf = hasPermission(authUser, PERMISSIONS.TEAM_VIEW);

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

  const downloadProfilePdf = async () => {
    try {
      setError("");
      setMessage("");

      const blob = await downloadOrgUserProfilePdf(userId).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = String(form.name || "user")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      anchor.href = url;
      anchor.download = `${safeName || "user"}-profile-${userId}-user-details.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setMessage("User details PDF downloaded successfully");
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, "Failed to download user details PDF"));
    }
  };

  const handleDownloadLogsPdf = async () => {
    try {
      const blob = await downloadPdfMutation({ userId, params: queryString }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-logs-${userId}-${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download PDF"));
    }
  };

  const handleDownloadLogsExcel = async () => {
    try {
      const blob = await downloadExcelMutation({ userId, params: queryString }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-logs-${userId}-${period}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download Excel"));
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

  const onRoleChange = (event) => {
    const nextRole = normalizeRole(event.target.value);
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
              onClick={() => router.push("/org/users")}
              className="brand-btn brand-btn-secondary brand-btn-sm"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{form.name}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{user.email}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={downloadProfilePdf}
              disabled={!canDownloadProfilePdf || downloadingProfilePdf}
              className="brand-btn brand-btn-primary brand-btn-sm w-full sm:w-auto disabled:opacity-60"
            >
              {downloadingProfilePdf ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Download User Details PDF
            </button>

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
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="light-glow-card-static space-y-5 rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Complete User Details</h3>
          <p className="text-xs font-semibold text-slate-500">
            User Details ID: {`ATTY-${toDisplayText(organization?.organizationCode, "ORG")}-${user.id}`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailTile label="User ID" value={toDisplayText(user.id)} />
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
          <DetailTile label="Joined On" value={toDateLabel(joiningDate)} />
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
          <DetailTile
            label="Created By"
            value={toDisplayText(user?.createdBy?.name || user?.createdBy?.email)}
          />
        </div>
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
                onChange={onRoleChange}
                disabled={!canEditUser}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
              >
                {manageableRoleOptions.map((roleOption) => (
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

      <div className="light-glow-card-static space-y-6 rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Detailed Attendance Logs</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">View and export day-by-day punch records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="dashboard-field-control py-2 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="dashboard-field-control py-2 text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="dashboard-field-control py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleDownloadLogsPdf}
            disabled={downloadingPdf || loadingLogs || fetchingLogs || !logsData?.items?.length}
            className="brand-btn brand-btn-soft brand-btn-sm"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadLogsExcel}
            disabled={downloadingExcel || loadingLogs || fetchingLogs || !logsData?.items?.length}
            className="brand-btn brand-btn-soft brand-btn-sm"
          >
            {downloadingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download Excel
          </button>
        </div>

        {loadingLogs || fetchingLogs ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-semibold">Loading logs...</span>
          </div>
        ) : logsData?.items?.length ? (
          <div className="overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Punch In</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Punch Out</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsData.items.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => router.push(`/org/attendance/${log.id}`)}
                    className="cursor-pointer transition hover:bg-slate-50/50 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{toTimeLabel(log.punchInAt)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{toTimeLabel(log.punchOutAt)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{Number(log.workedHours).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
            No attendance records found for this period.
          </div>
        )}
      </div>
    </section>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
