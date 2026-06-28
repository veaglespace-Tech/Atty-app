"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronUp, Download, Loader2, Plus, RefreshCcw, Search, UserPlus, X, LockKeyhole } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import CountryPhoneField from "@/components/CountryPhoneField";
import PasswordInput from "@/components/PasswordInput";
import useLocalPagination from "@/hooks/useLocalPagination";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import {
  useCreateOrgUserMutation,
  useDownloadOrgUsersExcelMutation,
  useDownloadOrgUsersPdfMutation,
  useGetOrgUsersQuery,
} from "@/services/api/orgApi";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import {
  ORG_MANAGED_ROLE_OPTIONS,
  PERMISSION_GROUPS,
  ROLES,
  formatPermissionLabel,
  formatRoleLabel,
  getAssignablePermissionsByRole,
  getDefaultPermissionsForRole,
  getManagedRoleOptions,
  normalizeRole,
} from "@/utils/roles";
import {
  getErrorMessage,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
  validateManagedUserForm,
} from "@/utils/formValidation";

const STATUS_OPTIONS = ["APPROVED", "PENDING"];
const DIRECTORY_STATUS_FILTERS = ["ALL", "APPROVED", "PENDING", "REJECTED"];
const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-4 sm:p-6";
const fieldClassName = "dashboard-field-control";

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) map.set(item.label, item.value);
  }
  return map;
};

export default function OrgUsersPage() {
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);
  const isFreePlan = authUser?.organization?.plan?.code === "FREE_7D_TRIAL" || authUser?.organization?.planCode === "FREE_7D_TRIAL";
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileCountryCode: "+91",
    mobile: "",
    role: ROLES.MEMBER,
    status: "APPROVED",
    password: "",
    permissions: getDefaultPermissionsForRole(ROLES.MEMBER),
  });

  const {
    data: usersData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrgUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS);

  const [
    createUserMutation,
  ] = useCreateOrgUserMutation();
  const [downloadUsersExcelMutation] = useDownloadOrgUsersExcelMutation();
  const [downloadUsersPdfMutation] = useDownloadOrgUsersPdfMutation();
  const manageableRoleOptions = useMemo(
    () => getManagedRoleOptions(authUser?.currentRole),
    [authUser?.currentRole]
  );

  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const summary = useMemo(() => (Array.isArray(usersData?.summary) ? usersData.summary : []), [usersData]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);
  const actorRole = normalizeRole(authUser?.currentRole);

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

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && normalizeRole(user.role) !== roleFilter) return false;
      if (statusFilter !== "ALL" && String(user.approvalStatus) !== statusFilter) return false;
      if (activeFilter === "ACTIVE" && !user.active) return false;
      if (activeFilter === "BLOCKED" && user.active) return false;
      if (!query) return true;

      const haystack = [user.name, user.email, user.mobile]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [users, searchTerm, roleFilter, statusFilter, activeFilter]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedUsers,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredUsers, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.USERS[0],
    dependencies: [searchTerm, roleFilter, statusFilter, activeFilter],
  });

  useEffect(() => {
    const role = normalizeRole(form.role);
    const defaults = getDefaultPermissionsForRole(role).filter((permission) =>
      assignablePermissions.includes(permission)
    );
    setForm((prev) => ({ ...prev, permissions: defaults }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.role]);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onPermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      mobileCountryCode: "+91",
      mobile: "",
      role: ROLES.MEMBER,
      status: "APPROVED",
      password: "",
      permissions: getDefaultPermissionsForRole(ROLES.MEMBER),
    });
  };

  const createUser = async (event) => {
    event.preventDefault();

    const validationError = validateManagedUserForm({
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      password: form.password,
      passwordRequired: false,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const nextName = normalizeTextInput(form.name);
      const nextEmail = normalizeEmailInput(form.email);
      const nextMobile = toDigitsOnly(form.mobile);

      const response = await createUserMutation({
        name: nextName,
        email: nextEmail,
        mobileCountryCode: form.mobileCountryCode,
        mobile: nextMobile,
        role: form.role,
        status: form.status,
        permissions: form.permissions,
        ...(form.password ? { password: form.password } : {}),
      }).unwrap();

      setMessage(
        response?.tempPassword
          ? `User created. Temporary password: ${response.tempPassword}`
          : "User created successfully"
      );
      resetForm();
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = isLoading || isFetching;

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const blob = await downloadUsersExcelMutation().unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download Excel file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const blob = await downloadUsersPdfMutation().unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF file. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${sectionCardClassName} mobile-compact-panel relative z-50`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Organization Users</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600 dark:text-slate-300">
              Directory keeps core fields simple. Click a user row to open full profile and actions.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              <Plus size={15} />
              Create Member
              {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>

            {!isFreePlan ? (
              <DownloadMenuButton
                label={
                  <span className="flex items-center justify-center gap-1.5">
                    <Download size={15} />
                    Export
                    <ChevronDown size={14} className="opacity-70" />
                  </span>
                }
                onDownloadExcel={handleDownloadExcel}
                onDownloadPdf={handleDownloadPdf}
                downloadingExcel={downloading}
                downloadingPdf={downloadingPdf}
                disabled={isLoading}
                align="right"
                className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
              />
            ) : (
              <div className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 w-full sm:w-auto mt-2 sm:mt-0">
                <LockKeyhole size={16} />
                Download locked on free plan.
              </div>
            )}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total" value={summaryMap.get("Total Users") || 0} />
        <MetricCard label="Approved" value={summaryMap.get("Approved") || 0} />
        <MetricCard label="Pending" value={summaryMap.get("Pending") || 0} />
        <MetricCard label="Active" value={summaryMap.get("Active") || 0} />
      </div>

      {createOpen ? (
      <div className={sectionCardClassName}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Create User</h3>
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="brand-btn brand-btn-secondary brand-btn-sm w-full sm:w-auto"
          >
            <X size={13} /> Close
          </button>
        </div>

        <form onSubmit={createUser} className="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <input
            name="name"
            value={form.name}
            onChange={onInputChange}
            placeholder="Full name"
            className={`${fieldClassName} dashboard-select-control`}
            required
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onInputChange}
            placeholder="Email"
            className={`${fieldClassName} dashboard-select-control`}
            required
          />
          <div className="sm:col-span-2 xl:col-span-3">
            <CountryPhoneField
              label="Mobile Number"
              required
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
              helpText="Select the country code, then enter the user's mobile number."
              containerClassName="space-y-1.5"
              labelClassName="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500"
              groupClassName="shadow-none"
              selectClassName="py-3"
              inputClassName="py-3"
            />
          </div>

          <select
            name="role"
            value={form.role}
            onChange={onInputChange}
            className={fieldClassName}
          >
            {manageableRoleOptions.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={form.status}
            onChange={onInputChange}
            className={fieldClassName}
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>

          <PasswordInput
            icon={null}
            name="password"
            value={form.password}
            onChange={onInputChange}
            placeholder="Password (optional)"
            className={fieldClassName}
          />

          <div className="sm:col-span-2 xl:col-span-3 rounded-[1.45rem] border border-slate-200 bg-slate-50/90 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Permissions</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {permissionGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-[1.15rem] border border-slate-200 bg-white/95 p-3 dark:border-slate-700 dark:bg-slate-950/80"
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{group.label}</p>
                  <div className="mt-2 space-y-2">
                    {group.items.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
          </div>

          <div className="sm:col-span-2 xl:col-span-3 flex justify-stretch sm:justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create User
            </button>
          </div>
        </form>
      </div>
      ) : null}

      <div className={sectionCardClassName}>
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">User Directory</h3>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No users found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, mobile, email"
                  className="w-full rounded-[1.1rem] border border-slate-200 bg-white/95 py-3 pl-8 pr-3 text-sm font-medium text-slate-900 shadow-[0_18px_40px_rgba(59,130,246,0.08)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/10"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className={`${fieldClassName} dashboard-select-control`}
              >
                <option value="ALL">All Roles</option>
                {ORG_MANAGED_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${fieldClassName} dashboard-select-control`}
              >
                {DIRECTORY_STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All Status" : status}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className={`${fieldClassName} dashboard-select-control`}
              >
                <option value="ALL">All Access</option>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredUsers.length > 0
                ? `Showing ${startIndex}-${endIndex} of ${filteredUsers.length} filtered users`
                : "Showing 0 filtered users"}
            </p>

            {filteredUsers.length === 0 ? (
              <p className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                No users match current filters.
              </p>
            ) : (
              <>
                <div className="grid gap-3 md:hidden">
                  {paginatedUsers.map((user) => (
                    <button
                      type="button"
                      key={`card-${user.id}`}
                      onClick={() => router.push(`/org/users/${user.id}`)}
                      className="dashboard-mobile-record-card text-left transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-slate-900 dark:text-white">{user.name}</p>
                          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            user.active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {user.active ? "Active" : "Blocked"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <DetailPill label="Mobile" value={user.mobile || "-"} />
                        <DetailPill label="Role" value={formatRoleLabel(user.role)} />
                        <DetailPill label="Status" value={user.approvalStatus} />
                        <DetailPill label="Profile" value="Open details" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Name</th>
                        <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Mobile</th>
                        <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</th>
                        <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Active</th>
                        <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => router.push(`/org/users/${user.id}`)}
                          className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                        >
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-200">{user.mobile || "-"}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatRoleLabel(user.role)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                                user.active
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {user.active ? "Active" : "Blocked"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                                user.approvalStatus === "APPROVED"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                                  : user.approvalStatus === "PENDING"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
                              }`}
                            >
                              {user.approvalStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredUsers.length}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS}
                  label="users"
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function DetailPill({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
