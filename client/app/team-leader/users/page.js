"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronUp, Loader2, Plus, RefreshCcw, Search, UserPlus } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import CountryPhoneField from "@/components/CountryPhoneField";
import PasswordInput from "@/components/PasswordInput";
import useLocalPagination from "@/hooks/useLocalPagination";
import { useGetTeamLeaderUsersQuery } from "@/services/api/teamLeaderApi";
import { useCreateOrgUserMutation } from "@/services/api/orgApi";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLES,
  formatPermissionLabel,
  formatRoleLabel,
  getAssignablePermissionsByRole,
  getDefaultPermissionsForRole,
  getManagedRoleOptions,
  normalizeRole,
  hasPermission,
} from "@/utils/roles";
import {
  getErrorMessage,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
  validateManagedUserForm,
} from "@/utils/formValidation";

const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-4 sm:p-6";
const fieldClassName = "dashboard-field-control";

export default function TeamLeaderUsersPage() {
  const authUser = useSelector((state) => state.auth.user);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const canCreateUser = hasPermission(authUser, PERMISSIONS.USERS_CREATE);

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
  } = useGetTeamLeaderUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS);

  const [createUserMutation] = useCreateOrgUserMutation();

  const actorRole = normalizeRole(authUser?.currentRole);
  const manageableRoleOptions = useMemo(() => getManagedRoleOptions(actorRole), [actorRole]);
  const assignablePermissions = useMemo(() => getAssignablePermissionsByRole(actorRole), [actorRole]);
  const permissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((permission) => assignablePermissions.includes(permission)),
      })).filter((group) => group.items.length > 0),
    [assignablePermissions]
  );

  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && normalizeRole(user.role) !== roleFilter) return false;
      if (!query) return true;
      const haystack = [user.name, user.email, user.mobile]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [users, searchTerm, roleFilter]);

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
    dependencies: [searchTerm, roleFilter],
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

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: normalizeTextInput(form.name),
        email: normalizeEmailInput(form.email),
        mobile: toDigitsOnly(form.mobile),
        mobileCountryCode: form.mobileCountryCode,
        role: form.role,
        status: form.status,
        permissions: form.permissions,
      };
      if (form.password) payload.password = form.password;

      await createUserMutation(payload).unwrap();
      setMessage("User created successfully");
      resetForm();
      setCreateOpen(false);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className={sectionCardClassName}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">My Team Members</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Users belonging to your team(s) only.
            </p>
            {usersData?.summary ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {usersData.summary.map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <span className="font-black text-slate-900 dark:text-white">{item.value}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {canCreateUser ? (
              <button
                type="button"
                onClick={() => setCreateOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <UserPlus size={15} />
                Add User
                {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : null}

            <button
              type="button"
              onClick={refetch}
              disabled={isLoading || isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {isLoading || isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      </div>

      {/* Create User Form */}
      {createOpen ? (
        <div className={sectionCardClassName}>
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">Add New User</h3>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Full Name *</label>
                <input name="name" value={form.name} onChange={onInputChange} placeholder="Enter full name" className={fieldClassName} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Email *</label>
                <input name="email" type="email" value={form.email} onChange={onInputChange} placeholder="Enter email" className={fieldClassName} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile *</label>
                <CountryPhoneField
                  countryCode={form.mobileCountryCode}
                  phone={form.mobile}
                  onCountryCodeChange={(val) => setForm((prev) => ({ ...prev, mobileCountryCode: val }))}
                  onPhoneChange={(val) => setForm((prev) => ({ ...prev, mobile: val }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
                <PasswordInput name="password" value={form.password} onChange={onInputChange} placeholder="Leave blank to auto-generate" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Role</label>
                <select name="role" value={form.role} onChange={onInputChange} className={fieldClassName}>
                  {manageableRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {permissionGroups.length > 0 ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Permissions</label>
                <div className="space-y-3">
                  {permissionGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-xs font-semibold text-slate-400">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((permission) => (
                          <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:border-blue-200">
                            <input
                              type="checkbox"
                              checked={form.permissions.includes(permission)}
                              onChange={() => onPermissionToggle(permission)}
                              className="h-3.5 w-3.5 rounded accent-blue-600"
                            />
                            {formatPermissionLabel(permission)}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {submitting ? "Creating..." : "Create User"}
              </button>
              <button
                type="button"
                onClick={() => { setCreateOpen(false); resetForm(); setError(""); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Users List */}
      <div className={sectionCardClassName}>
        <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Members</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email..."
                className="rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-300 w-52 transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300"
            >
              <option value="ALL">All Roles</option>
              {["MEMBER", "TEAM_LEADER", "SUB_ADMIN"].map((role) => (
                <option key={role} value={role}>{formatRoleLabel(role)}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm font-semibold">Loading team members...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-bold text-slate-400">No team members found.</p>
            <p className="mt-1 text-xs text-slate-400">
              {users.length === 0
                ? "You have no team members yet. Make sure you are assigned to a team."
                : "Try adjusting the search filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-3 pr-4 text-xs font-black uppercase tracking-wide text-slate-400">Name</th>
                    <th className="pb-3 pr-4 text-xs font-black uppercase tracking-wide text-slate-400">Email</th>
                    <th className="pb-3 pr-4 text-xs font-black uppercase tracking-wide text-slate-400">Mobile</th>
                    <th className="pb-3 pr-4 text-xs font-black uppercase tracking-wide text-slate-400">Role</th>
                    <th className="pb-3 text-xs font-black uppercase tracking-wide text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{user.name || "-"}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{user.email || "-"}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{user.mobile || "-"}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                          {formatRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          user.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {user.active ? "Active" : "Blocked"}
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
          </div>
        )}
      </div>
    </section>
  );
}
