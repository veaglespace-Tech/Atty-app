"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Edit2,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { formatRoleLabel, ROLES } from "@/utils/roles";
import { useGetOrgUsersQuery } from "@/services/api/orgApi";

const SUMMARY_CONFIG = [
  { key: "total", label: "Total Staff", icon: Users, tone: "blue" },
  { key: "admin", label: "Workspace Admins", icon: ShieldCheck, tone: "emerald" },
  { key: "tl", label: "Team Leaders", icon: ShieldAlert, tone: "amber" },
  { key: "active", label: "Active Status", icon: Users, tone: "indigo" },
];

export default function EmployeesPage() {
  const { user } = useSelector((state) => state.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data, isLoading, isFetching } = useGetOrgUsersQuery(300, { skip: !user });
  const loading = isLoading || isFetching;
  const userRole = user?.currentRole || ROLES.MEMBER;

  const staff = useMemo(() => {
    const users = Array.isArray(data?.items) ? data.items : [];
    return users.map((member) => ({
      ...member,
      status: member.active ? "Active" : "Inactive",
    }));
  }, [data]);

  const filteredStaff = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return staff;

    return staff.filter((member) =>
      [member.name, member.email, formatRoleLabel(member.role), member.status].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [searchValue, staff]);

  const summary = useMemo(
    () => ({
      total: staff.length,
      admin: staff.filter((member) => member.role === ROLES.SUBADMIN || member.role === ROLES.ADMIN)
        .length,
      tl: staff.filter((member) => member.role === ROLES.TEAM_LEADER).length,
      active: staff.filter((member) => member.status === "Active").length,
    }),
    [staff]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="brand-kicker">Syncing user directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="light-glow-card-static relative overflow-hidden rounded-[2.2rem] px-6 py-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(92,209,229,0.14),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.20),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(92,209,229,0.18),transparent_28%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.24fr)_minmax(320px,0.76fr)]">
          <div>
            <div className="brand-chip mobile-hide-chip">
              Workspace Directory
            </div>
            <h1 className="brand-hero-title mobile-compact-hero-title mt-3 sm:mt-4">Team Members & Access</h1>
            <p className="brand-copy mobile-hide-copy mt-3 max-w-2xl">
              Review people, hierarchy, and access status inside{" "}
              <strong>{user?.organizationCode || "your workspace"}</strong> from one place.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="brand-chip">{formatRoleLabel(userRole)}</span>
              <span className="brand-chip mobile-hide-chip">{filteredStaff.length} Visible Members</span>
            </div>

            {userRole === ROLES.ADMIN ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="brand-btn brand-btn-primary brand-btn-lg rounded-[1.25rem]"
                >
                  <UserPlus size={18} />
                  Onboard New Staff
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SUMMARY_CONFIG.map((item) => (
              <StatsBox
                key={item.key}
                icon={item.icon}
                label={item.label}
                value={String(summary[item.key]).padStart(2, "0")}
                tone={item.tone}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="light-glow-card-static overflow-hidden rounded-[2rem]">
        <div className="flex flex-col gap-4 border-b border-white/70 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <h2 className="brand-section-title text-[1.35rem]">Directory</h2>
            <p className="brand-copy-sm mobile-hide-helper mt-2">
              {searchValue.trim()
                ? `Showing ${filteredStaff.length} of ${staff.length} members matching "${searchValue}".`
                : `Showing all ${staff.length} members in this workspace.`}
            </p>
          </div>

          <label className="relative min-w-0 w-full lg:w-[340px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, email, role, status"
              className="w-full rounded-[1.2rem] border border-slate-200 bg-white/88 py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-100/60 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:border-blue-500/25 dark:focus:ring-blue-500/10"
            />
          </label>
        </div>

        {filteredStaff.length > 0 ? (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {filteredStaff.map((person, index) => (
                <article
                  key={person._id || `${person.email || "member"}-${index}`}
                  className="brand-panel-soft rounded-[1.6rem] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="brand-icon-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black">
                      {person.name?.[0] || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
                          {person.name || "Unknown User"}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusClasses(
                            person.status
                          )}`}
                        >
                          {person.status}
                        </span>
                      </div>
                      <p className="brand-copy-sm mt-1 break-all text-xs">{person.email || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <StaffCardDetail label="Role" value={formatRoleLabel(person.role)} />
                    <StaffCardDetail label="Access" value={person.active ? "Enabled" : "Review Required"} />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      className="brand-btn brand-btn-secondary brand-btn-md flex-1 rounded-[1.15rem]"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    {userRole === ROLES.ADMIN ? (
                      <button
                        type="button"
                        className="brand-btn brand-btn-danger brand-btn-md flex-1 rounded-[1.15rem]"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[820px] w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      User Profile
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      Workspace Role
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaff.map((person, index) => (
                    <tr
                      key={person._id || `${person.email || "member"}-${index}`}
                      className="bg-white/70 transition-colors hover:bg-blue-50/60 dark:bg-transparent dark:hover:bg-slate-900/70"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="brand-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black">
                            {person.name?.[0] || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                              {person.name || "Unknown User"}
                            </p>
                            <p className="brand-copy-sm mt-1 truncate text-xs">{person.email || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {person.role === ROLES.ADMIN || person.role === ROLES.SUBADMIN ? (
                            <ShieldCheck className="text-blue-600 dark:text-blue-300" size={16} />
                          ) : (
                            <ShieldAlert className="text-amber-500 dark:text-amber-300" size={16} />
                          )}
                          <span className="text-sm font-semibold tracking-[0.01em] text-slate-700 dark:text-slate-100">
                            {formatRoleLabel(person.role)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusClasses(
                            person.status
                          )}`}
                        >
                          {person.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="brand-btn brand-btn-secondary h-10 w-10 rounded-xl p-0"
                          >
                            <Edit2 size={16} />
                          </button>
                          {userRole === ROLES.ADMIN ? (
                            <button
                              type="button"
                              className="brand-btn brand-btn-danger h-10 w-10 rounded-xl p-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="brand-icon-shell mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <Search size={22} />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
              No members found
            </h3>
            <p className="brand-copy-sm mt-2">
              Try a different search term or clear the filter to see your full directory.
            </p>
          </div>
        )}
      </section>

      {showAddModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="light-glow-card-static relative w-full max-w-lg rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="brand-kicker">Quick Onboarding</p>
                <h3 className="brand-section-title mt-2">Invite Workspace Member</h3>
                <p className="brand-copy-sm mt-2">
                  Prepare a new account with the right role for your organization structure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="brand-btn brand-btn-secondary h-10 w-10 rounded-xl p-0"
                aria-label="Close invite modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="brand-kicker mb-1.5 ml-1 block">Staff Role</label>
                <select className="w-full rounded-[1.2rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/10">
                  <option value={ROLES.MEMBER}>Member</option>
                  <option value={ROLES.TEAM_LEADER}>Team Leader</option>
                  <option value={ROLES.SUBADMIN}>Sub-Admin</option>
                </select>
              </div>

              <div>
                <label className="brand-kicker mb-1.5 ml-1 block">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full rounded-[1.2rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="brand-kicker mb-1.5 ml-1 block">Work Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full rounded-[1.2rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="brand-btn brand-btn-secondary brand-btn-md rounded-[1.2rem]"
              >
                Cancel
              </button>
              <button type="button" className="brand-btn brand-btn-primary brand-btn-md rounded-[1.2rem]">
                Confirm Onboarding
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatsBox({ icon: Icon, label, value }) {
  return (
    <div className="dashboard-summary-card">
      <div className="flex items-center justify-between gap-3">
        <div className="brand-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="brand-kicker mt-2">{label}</p>
    </div>
  );
}

function StaffCardDetail({ label, value }) {
  return (
    <div className="dashboard-detail-tile px-4 py-3">
      <p className="brand-kicker">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function getStatusClasses(status) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200";
}
