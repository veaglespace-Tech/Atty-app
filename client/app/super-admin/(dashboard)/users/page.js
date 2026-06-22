"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCcw, Search } from "lucide-react";

import PaginationControls from "@/components/dashboard/PaginationControls";
import SectionEyebrow from "@/components/SectionEyebrow";
import useLocalPagination from "@/hooks/useLocalPagination";
import { useGetAllSuperAdminUsersQuery } from "@/services/api/superAdminApi";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { ROLES, formatRoleLabel } from "@/utils/roles";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card rounded-[1.75rem] px-5 py-5">
      <p className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-blue-100/80">
        {label}
      </p>
      <p className="mt-4 text-[2.2rem] font-black leading-none tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default function SuperAdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetAllSuperAdminUsersQuery();

  const users = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const loading = isLoading || isFetching;

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (!query) return true;
      return [
        user.name,
        user.email,
        user.organization?.name,
        user.organization?.organizationCode,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(query);
    });
  }, [users, searchTerm]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredUsers, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.USERS?.[0] || 10,
    dependencies: [searchTerm],
  });

  const getStatusTone = (user) => {
    if (!user.isActive) {
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  };

  const activeUsersCount = users.filter((u) => u.isActive).length;
  const superAdminsCount = users.filter((u) => u.role === ROLES.SUPER_ADMIN).length;

  return (
    <section className="space-y-6">
      <div className={`${panelClassName} mobile-compact-panel relative z-20`}>
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="mobile-hide-chip border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              Platform Directory
            </SectionEyebrow>
            <h2 className="mobile-compact-hero-title mt-3 sm:mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Users
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              View all users across the entire platform. Open a user&apos;s detail page to manage their profile and permissions.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-[240px]">
            <div className="dashboard-summary-card">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Live View
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {filteredUsers.length} of {users.length} users visible.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-1">
              <button
                type="button"
                onClick={refetch}
                disabled={loading}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Users" value={users.length || 0} />
        <MetricCard label="Active Users" value={activeUsersCount || 0} />
        <MetricCard label="Super Admins" value={superAdminsCount || 0} />
      </div>

      <div className={`${panelClassName} mobile-compact-panel`}>
        <div className="mt-5 grid gap-3 xl:grid-cols-1">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Search Users
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name, email, organization name"
                className="dashboard-field-control w-full pl-9 pr-3 text-sm max-w-md"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No users found.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-300">
              Showing {startIndex}-{endIndex} of {filteredUsers.length} users
            </p>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS || [10, 25, 50, 100]}
              label="users"
            />

            <div className="grid gap-4 md:hidden">
              {paginatedItems.map((user) => (
                <div
                  key={user.id}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {user.name}
                      </h4>
                      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                    <Link href={`/super-admin/users/${user.id}`}>
                        <ArrowRight size={16} className="shrink-0 text-slate-400 hover:text-blue-500" />
                      </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CompactInfo label="Role" value={formatRoleLabel(user.role)} />
                    <CompactInfo label="Organization" value={user.organization?.name || "-"} />
                    <div className="dashboard-detail-tile">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Status</p>
                      <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(user)}`}>
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 md:block dark:border-slate-800 dark:bg-slate-950/70">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-blue-50/55 dark:hover:bg-slate-900/55"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-[12px] text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {formatRoleLabel(user.role)}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {user.organization ? (
                          <>
                            <span className="block font-medium">{user.organization.name}</span>
                            <span className="text-[11px] text-slate-400">{user.organization.organizationCode}</span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(user)}`}
                        >
                          {user.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                          <Link
                            href={`/super-admin/users/${user.id}`}
                            className="brand-btn brand-btn-soft brand-btn-sm"
                          >
                            Open Detail
                          </Link>
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
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS || [10, 25, 50, 100]}
              label="users"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function CompactInfo({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
