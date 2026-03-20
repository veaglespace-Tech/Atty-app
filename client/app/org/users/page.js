"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, RefreshCcw, Search, UserPlus, X } from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import {
  useCreateOrgUserMutation,
  useGetOrgUsersQuery,
} from "@/store/api/orgApi";
import {
  ORG_MANAGED_ROLE_OPTIONS,
  PERMISSION_GROUPS,
  ROLES,
  formatPermissionLabel,
  formatRoleLabel,
  getAssignablePermissionsByRole,
  getDefaultPermissionsForRole,
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

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) map.set(item.label, item.value);
  }
  return map;
};

export default function OrgUsersPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
  } = useGetOrgUsersQuery(300);

  const [createUserMutation] = useCreateOrgUserMutation();

  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const summary = useMemo(() => (Array.isArray(usersData?.summary) ? usersData.summary : []), [usersData]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

  const assignablePermissions = useMemo(() => getAssignablePermissionsByRole(ROLES.ORG_ADMIN), []);
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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Organization Users</h2>
            <p className="mt-2 text-sm text-slate-600">
              Directory keeps core fields simple. Click a user row to open full profile and actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={15} />
              Create Member
              {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total" value={summaryMap.get("Total Users") || 0} />
        <MetricCard label="Approved" value={summaryMap.get("Approved") || 0} />
        <MetricCard label="Pending" value={summaryMap.get("Pending") || 0} />
        <MetricCard label="Active" value={summaryMap.get("Active") || 0} />
      </div>

      {createOpen ? (
      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Create User</h3>
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
          >
            <X size={13} /> Close
          </button>
        </div>

        <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            name="name"
            value={form.name}
            onChange={onInputChange}
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onInputChange}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
          <div className="md:col-span-3">
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
            />
          </div>

          <select
            name="role"
            value={form.role}
            onChange={onInputChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {ORG_MANAGED_ROLE_OPTIONS.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={form.status}
            onChange={onInputChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>

          <input
            name="password"
            type="text"
            value={form.password}
            onChange={onInputChange}
            placeholder="Password (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <div className="md:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Permissions</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {permissionGroups.map((group) => (
                <div key={group.key} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{group.label}</p>
                  <div className="mt-2 space-y-2">
                    {group.items.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700"
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

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create User
            </button>
          </div>
        </form>
      </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">User Directory</h3>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, mobile, email"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                {ORG_MANAGED_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Access</option>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              Showing {filteredUsers.length} of {users.length} users
            </p>

            {filteredUsers.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                No users match current filters.
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Name</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Mobile</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Active</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/org/users/${user.id}`)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700">{user.mobile || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{formatRoleLabel(user.role)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          user.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {user.active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          user.approvalStatus === "APPROVED"
                            ? "bg-blue-100 text-blue-700"
                            : user.approvalStatus === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
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
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
