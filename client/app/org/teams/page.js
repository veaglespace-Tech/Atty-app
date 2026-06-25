"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import {
  useCreateOrgTeamMutation,
  useDeleteOrgTeamMutation,
  useGetOrgTeamsQuery,
  useGetOrgUsersQuery,
  usePatchOrgTeamMutation,
} from "@/services/api/orgApi";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";
import {
  getErrorMessage,
  normalizeTextInput,
  validateTeamForm,
} from "@/utils/formValidation";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-4 sm:p-6";
const fieldClassName = "dashboard-field-control";
const selectorCardClassName = "dashboard-filter-shell";
const selectorSummaryClassName = "dashboard-filter-field mt-2";
const selectorSummaryLabelClassName =
  "text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400";
const selectorSummaryValueClassName =
  "mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100";
const selectorSummaryHelperClassName =
  "mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400";
const selectorSearchFieldClassName = `${fieldClassName} !pl-10 pr-10`;
const selectorSearchIconClassName =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400";
const selectorSearchToggleClassName =
  "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400";
const selectorChipClassName =
  "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";

export default function OrgTeamsPage() {
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);
  const canCreateTeams = hasPermission(authUser, PERMISSIONS.TEAM_CREATE);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM_UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM_DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM_ASSIGN_MEMBERS);
  const [submitting, setSubmitting] = useState(false);
  const [actionTeamId, setActionTeamId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    attendanceRadius: "",
    leaderId: "",
    memberIds: [],
  });
  const shouldLoadUsers = createOpen && canCreateTeams && canAssignMembers;

  const {
    data: teamsData,
    isFetching: teamsLoading,
    isLoading: teamsInitialLoading,
    refetch: refetchTeams,
  } = useGetOrgTeamsQuery(DASHBOARD_FETCH_LIMITS.ORG_TEAMS);

  const {
    data: usersData,
    isFetching: usersLoading,
    refetch: refetchUsers,
  } = useGetOrgUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS, { skip: !shouldLoadUsers });

  const [createTeamMutation] = useCreateOrgTeamMutation();
  const [patchTeamMutation] = usePatchOrgTeamMutation();
  const [deleteTeamMutation] = useDeleteOrgTeamMutation();

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);

  const leaderOptions = useMemo(
    () =>
      users.filter((user) => {
        const role = normalizeRole(user.role);
        return [ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(role) && user.active;
      }),
    [users]
  );

  const memberOptions = useMemo(
    () =>
      users.filter((user) => {
        const role = normalizeRole(user.role);
        return [ROLES.MEMBER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(role) && user.active;
      }),
    [users]
  );

  const filteredLeaders = useMemo(() => {
    const query = leaderSearch.trim().toLowerCase();
    return leaderOptions.filter((user) => {
      if (String(user.id) === String(form.leaderId)) return false;
      if (!query) return true;
      return (
        String(user.name || "").toLowerCase().includes(query) ||
        String(user.email || "").toLowerCase().includes(query)
      );
    });
  }, [form.leaderId, leaderOptions, leaderSearch]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return memberOptions.filter((user) => {
      if (form.memberIds.includes(String(user.id))) return false;
      if (!query) return true;
      return (
        String(user.name || "").toLowerCase().includes(query) ||
        String(user.email || "").toLowerCase().includes(query)
      );
    });
  }, [memberOptions, memberSearch, form.memberIds]);

  const selectedLeader = useMemo(
    () => leaderOptions.find((user) => String(user.id) === String(form.leaderId)) || null,
    [form.leaderId, leaderOptions]
  );

  const selectedMembers = useMemo(
    () => memberOptions.filter((user) => form.memberIds.includes(String(user.id))),
    [form.memberIds, memberOptions]
  );

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedTeams,
    setPage,
    setPageSize,
  } = useLocalPagination(teams, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.TEAMS[0],
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      attendanceRadius: "",
      leaderId: "",
      memberIds: [],
    });
    setLeaderSearch("");
    setMemberSearch("");
    setLeaderOpen(false);
    setMemberOpen(false);
  };

  const onInputChange = (event) => {
    const { name, value, type } = event.target;
    let newValue = value;
    if (type === "number" && newValue !== "") {
      newValue = String(Number(newValue));
    }
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const toggleLeader = (leaderId) => {
    const id = String(leaderId);
    setForm((prev) => ({
      ...prev,
      leaderId: String(prev.leaderId) === id ? "" : id,
    }));
    setLeaderSearch("");
  };

  const addMember = (memberId) => {
    const id = String(memberId);
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id) ? prev.memberIds : [...prev.memberIds, id],
    }));
    setMemberSearch("");
  };

  const removeMember = (memberId) => {
    const id = String(memberId);
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.filter((value) => value !== id),
    }));
    setMemberSearch("");
  };

  const refreshAll = async () => {
    const tasks = [refetchTeams()];
    if (shouldLoadUsers) {
      tasks.push(refetchUsers());
    }
    await Promise.all(tasks);
  };

  const createTeam = async (event) => {
    event.preventDefault();
    if (!canCreateTeams) {
      setError("Missing required permission");
      return;
    }

    const validationError = validateTeamForm({
      name: form.name,
      description: form.description,
      attendanceRadius: form.attendanceRadius,
      longitude: "",
      latitude: "",
      requireCoordinates: false,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await createTeamMutation({
        name: normalizeTextInput(form.name),
        description: normalizeTextInput(form.description),
        attendanceRadius: Number(form.attendanceRadius || 25),
        ...(canAssignMembers
          ? {
              leaderId: form.leaderId || null,
              memberIds: form.memberIds,
            }
          : {}),
      }).unwrap();

      setMessage("Team created successfully");
      resetForm();
      setCreateOpen(false);
      await refetchTeams();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to create team"));
    } finally {
      setSubmitting(false);
    }
  };

  const applyAction = async (teamId, action) => {
    try {
      setActionTeamId(String(teamId));
      setError("");
      setMessage("");
      await action();
      await refetchTeams();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Action failed"));
    } finally {
      setActionTeamId("");
    }
  };

  const toggleTeamActive = (team) =>
    applyAction(team.id, () =>
      patchTeamMutation({
        teamId: team.id,
        isActive: !team.isActive,
      }).unwrap()
    );

  const deleteTeam = (team) => {
    if (!canDeleteTeams) {
      setError("Missing required permission");
      return;
    }
    const confirmed = window.confirm(`Delete team ${team.name}?`);
    if (!confirmed) return;

    return applyAction(team.id, () => deleteTeamMutation(team.id).unwrap());
  };

  const loading = teamsLoading || usersLoading;

  return (
    <section className="space-y-6">
      <div className={`${sectionCardClassName} mobile-compact-panel`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Organization Teams</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600 dark:text-slate-300">
              Create teams, assign leader and members, and open each team for full management.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {canCreateTeams ? (
              <button
                type="button"
                onClick={() => setCreateOpen((prev) => !prev)}
                className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
              >
                <Plus size={15} />
                Create Team
                {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : null}

            <button
              type="button"
              onClick={refreshAll}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
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

      {createOpen ? (
        <div className={sectionCardClassName}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Create Team</h3>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setCreateOpen(false);
              }}
              className="brand-btn brand-btn-secondary brand-btn-sm w-full sm:w-auto"
            >
              <X size={13} /> Close
            </button>
          </div>

          <form onSubmit={createTeam} className="mt-5 grid gap-3 sm:gap-4 xl:grid-cols-2">
            <input
              name="name"
              value={form.name}
              onChange={onInputChange}
              placeholder="Team name"
              className={fieldClassName}
              required
            />

            <input
              name="attendanceRadius"
              type="number"
              min="5"
              value={form.attendanceRadius}
              onChange={onInputChange}
              placeholder="Attendance radius (optional, default 25)"
              className={fieldClassName}
            />

            <textarea
              name="description"
              value={form.description}
              onChange={onInputChange}
              placeholder="Team description"
              className="dashboard-field-control xl:col-span-2"
              rows={3}
            />

            {canAssignMembers ? (
            <div className={selectorCardClassName}>
              <p className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Team Leader</p>
              <div className="mt-2 relative">
                <Search size={14} className={selectorSearchIconClassName} />
                <input
                  value={leaderSearch}
                  onFocus={() => setLeaderOpen(true)}
                  onChange={(event) => {
                    setLeaderOpen(true);
                    setLeaderSearch(event.target.value);
                  }}
                  placeholder="Search leader"
                  className={selectorSearchFieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setLeaderOpen((prev) => !prev)}
                  className={selectorSearchToggleClassName}
                >
                  {leaderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div className={selectorSummaryClassName}>
                <p className={selectorSummaryLabelClassName}>Selected Leader</p>
                <p className={selectorSummaryValueClassName}>
                  {selectedLeader ? "1 leader" : "0 leaders"}
                </p>

                {selectedLeader ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLeader(selectedLeader.id)}
                      className={selectorChipClassName}
                    >
                      {selectedLeader.name}
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p className={selectorSummaryHelperClassName}>No leader selected</p>
                )}
              </div>

              {leaderOpen ? (
                <div className="dashboard-dropdown-menu mt-2 max-h-52 space-y-1 overflow-auto p-1 pr-1">
                  {filteredLeaders.map((leader) => {
                    const active = String(form.leaderId) === String(leader.id);
                    return (
                      <button
                        key={leader.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggleLeader(leader.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-blue-500/30 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span>{leader.name}</span>
                        <span className="ml-2 text-xs opacity-80">{formatRoleLabel(leader.role)}</span>
                      </button>
                    );
                  })}
                  {filteredLeaders.length === 0 ? (
                    <p className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">No leader found</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : null}

            {canAssignMembers ? (
            <div className={selectorCardClassName}>
              <p className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Team Members</p>
              <div className="mt-2 relative">
                <Search size={14} className={selectorSearchIconClassName} />
                <input
                  value={memberSearch}
                  onFocus={() => setMemberOpen(true)}
                  onChange={(event) => {
                    setMemberOpen(true);
                    setMemberSearch(event.target.value);
                  }}
                  placeholder="Search members"
                  className={selectorSearchFieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setMemberOpen((prev) => !prev)}
                  className={selectorSearchToggleClassName}
                >
                  {memberOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div className={selectorSummaryClassName}>
                <p className={selectorSummaryLabelClassName}>Selected Members</p>
                <p className={selectorSummaryValueClassName}>
                  {form.memberIds.length} {form.memberIds.length === 1 ? "member" : "members"}
                </p>

                {selectedMembers.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <button
                        key={`selected-${member.id}`}
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                      >
                        {member.name}
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    No members selected
                  </p>
                )}
              </div>

              {memberOpen ? (
                <div className="dashboard-dropdown-menu mt-2 max-h-52 space-y-1 overflow-auto p-1 pr-1">
                  {filteredMembers.map((member) => {
                    const active = form.memberIds.includes(String(member.id));
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addMember(member.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-blue-500/30 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span>{member.name}</span>
                        <span className="ml-2 text-xs opacity-80">{formatRoleLabel(member.role)}</span>
                      </button>
                    );
                  })}
                  {filteredMembers.length === 0 ? (
                    <p className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">No member found</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : null}

            <div className="xl:col-span-2 flex justify-stretch sm:justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <UsersRound size={16} />}
                Create Team
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className={`${sectionCardClassName} mobile-compact-panel`}>
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Team Directory</h3>

        {teamsInitialLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No teams found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {startIndex}-{endIndex} of {teams.length} teams
            </p>

            <div className="grid gap-3 md:hidden">
              {paginatedTeams.map((team) => {
                const busy = actionTeamId === String(team.id);

                return (
                  <article
                    key={`mobile-${team.id}`}
                    className="dashboard-mobile-record-card"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/org/teams/${team.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-black text-slate-900 dark:text-white">{team.name}</h4>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Leader: {team.leaderName || "Unassigned"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            team.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {team.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </button>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Members" value={team.memberCount || 0} />
                      <DetailTile label="Radius" value={team.attendanceRadius} />
                      <DetailTile label="Created" value={formatDate(team.createdAt)} />
                      <DetailTile label="Open" value="View team details" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canUpdateTeams ? (
                        <ActionButton
                          label={team.isActive ? "Deactivate" : "Activate"}
                          icon={<ShieldAlert size={14} />}
                          onClick={() => toggleTeamActive(team)}
                          disabled={busy}
                          tone={team.isActive ? "danger" : "default"}
                        />
                      ) : null}
                      {canDeleteTeams ? (
                        <ActionButton
                          label="Delete"
                          icon={<Trash2 size={14} />}
                          onClick={() => deleteTeam(team)}
                          disabled={busy}
                          tone="danger"
                        />
                      ) : null}
                      {busy ? <Loader2 size={14} className="animate-spin self-center text-slate-500" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Leader</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Members</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Radius</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Active</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Created</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTeams.map((team) => {
                    const busy = actionTeamId === String(team.id);
                    return (
                      <tr
                        key={team.id}
                        onClick={() => router.push(`/org/teams/${team.id}`)}
                        className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{team.name}</td>
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{team.leaderName || "Unassigned"}</td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{team.memberCount || 0}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{team.attendanceRadius}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{team.isActive ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(team.createdAt)}</td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            {canUpdateTeams ? (
                              <ActionButton
                                label={team.isActive ? "Deactivate" : "Activate"}
                                icon={<ShieldAlert size={14} />}
                                onClick={() => toggleTeamActive(team)}
                                disabled={busy}
                                tone={team.isActive ? "danger" : "default"}
                              />
                            ) : null}
                            {canDeleteTeams ? (
                              <ActionButton
                                label="Delete"
                                icon={<Trash2 size={14} />}
                                onClick={() => deleteTeam(team)}
                                disabled={busy}
                                tone="danger"
                              />
                            ) : null}
                            {busy ? <Loader2 size={14} className="animate-spin text-slate-500" /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
        )}
      </div>
    </section>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone = "default" }) {
  const style = tone === "danger" ? "brand-btn-danger" : "brand-btn-soft";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`brand-btn brand-btn-sm w-full sm:w-auto ${style}`}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
