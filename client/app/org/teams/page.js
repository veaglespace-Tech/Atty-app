"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
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
import {
  useCreateOrgTeamMutation,
  useDeleteOrgTeamMutation,
  useGetOrgTeamsQuery,
  useGetOrgUsersQuery,
  usePatchOrgTeamMutation,
} from "@/services/api/orgApi";
import { ROLES, formatRoleLabel, normalizeRole } from "@/utils/roles";
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

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) map.set(item.label, item.value);
  }
  return map;
};

const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-4 sm:p-6";
const fieldClassName =
  "w-full rounded-[1.1rem] border border-slate-200 bg-white/95 px-3 py-3 text-sm font-medium text-slate-900 shadow-[0_18px_40px_rgba(59,130,246,0.08)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/10";
const selectorCardClassName =
  "rounded-[1.35rem] border border-slate-200 bg-slate-50/90 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/70";

export default function OrgTeamsPage() {
  const router = useRouter();
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
    attendanceRadius: "25",
    leaderId: "",
    memberIds: [],
  });
  const shouldLoadUsers = createOpen;

  const {
    data: teamsData,
    isFetching: teamsLoading,
    isLoading: teamsInitialLoading,
    refetch: refetchTeams,
  } = useGetOrgTeamsQuery(200);

  const {
    data: usersData,
    isFetching: usersLoading,
    refetch: refetchUsers,
  } = useGetOrgUsersQuery(500, { skip: !shouldLoadUsers });

  const [createTeamMutation] = useCreateOrgTeamMutation();
  const [patchTeamMutation] = usePatchOrgTeamMutation();
  const [deleteTeamMutation] = useDeleteOrgTeamMutation();

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const summary = useMemo(() => (Array.isArray(teamsData?.summary) ? teamsData.summary : []), [teamsData]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

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
    if (!query) return leaderOptions;
    return leaderOptions.filter(
      (user) =>
        String(user.name || "").toLowerCase().includes(query) ||
        String(user.email || "").toLowerCase().includes(query)
    );
  }, [leaderOptions, leaderSearch]);

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

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      attendanceRadius: "25",
      leaderId: "",
      memberIds: [],
    });
    setLeaderSearch("");
    setMemberSearch("");
    setLeaderOpen(false);
    setMemberOpen(false);
  };

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleLeader = (leaderId) => {
    const id = String(leaderId);
    setForm((prev) => ({
      ...prev,
      leaderId: String(prev.leaderId) === id ? "" : id,
    }));
  };

  const addMember = (memberId) => {
    const id = String(memberId);
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id) ? prev.memberIds : [...prev.memberIds, id],
    }));
  };

  const removeMember = (memberId) => {
    const id = String(memberId);
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.filter((value) => value !== id),
    }));
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
        leaderId: form.leaderId || null,
        memberIds: form.memberIds,
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
    const confirmed = window.confirm(`Delete team ${team.name}?`);
    if (!confirmed) return;

    return applyAction(team.id, () => deleteTeamMutation(team.id).unwrap());
  };

  const loading = teamsLoading || usersLoading;

  return (
    <section className="space-y-6">
      <div className={sectionCardClassName}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">Organization Teams</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Create teams, assign leader and members, and open each team for full management.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              <Plus size={15} />
              Create Team
              {createOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

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

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Teams" value={summaryMap.get("Teams") || 0} />
        <MetricCard label="Assigned Members" value={summaryMap.get("Total Members Assigned") || 0} />
        <MetricCard label="Teams With Leader" value={summaryMap.get("Teams With Leader") || 0} />
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
              placeholder="Attendance radius"
              className={fieldClassName}
            />

            <textarea
              name="description"
              value={form.description}
              onChange={onInputChange}
              placeholder="Team description"
              className="xl:col-span-2 w-full rounded-[1.1rem] border border-slate-200 bg-white/95 px-3 py-3 text-sm font-medium text-slate-900 shadow-[0_18px_40px_rgba(59,130,246,0.08)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/10"
              rows={3}
            />

            <div className={selectorCardClassName}>
              <p className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Team Leader</p>
              <div className="mt-2 relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={leaderSearch}
                  onFocus={() => setLeaderOpen(true)}
                  onChange={(event) => {
                    setLeaderOpen(true);
                    setLeaderSearch(event.target.value);
                  }}
                  placeholder="Search leader"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setLeaderOpen((prev) => !prev)}
                  className="absolute right-3 top-3 text-slate-500 dark:text-slate-400"
                >
                  {leaderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {selectedLeader ? (
                <div className="mt-2 rounded-[1rem] bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  Selected: {selectedLeader.name}
                </div>
              ) : (
                <div className="mt-2 rounded-[1rem] bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  No leader selected
                </div>
              )}

              {leaderOpen ? (
                <div className="mt-2 max-h-52 space-y-1 overflow-auto rounded-[1.1rem] border border-slate-200 bg-white/95 p-1 pr-1 shadow-[0_18px_40px_rgba(59,130,246,0.08)] dark:border-slate-700 dark:bg-slate-950/95">
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

            <div className={selectorCardClassName}>
              <p className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Team Members</p>
              <div className="mt-2 relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={memberSearch}
                  onFocus={() => setMemberOpen(true)}
                  onChange={(event) => {
                    setMemberOpen(true);
                    setMemberSearch(event.target.value);
                  }}
                  placeholder="Search members"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setMemberOpen((prev) => !prev)}
                  className="absolute right-3 top-3 text-slate-500 dark:text-slate-400"
                >
                  {memberOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Selected: {form.memberIds.length}</p>

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
              ) : null}

              {memberOpen ? (
                <div className="mt-2 max-h-52 space-y-1 overflow-auto rounded-[1.1rem] border border-slate-200 bg-white/95 p-1 pr-1 shadow-[0_18px_40px_rgba(59,130,246,0.08)] dark:border-slate-700 dark:bg-slate-950/95">
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teams.slice(0, 6).map((team) => (
          <button
            type="button"
            key={`card-${team.id}`}
            onClick={() => router.push(`/org/teams/${team.id}`)}
            className="light-glow-soft rounded-[1.75rem] border border-white/80 bg-white/90 p-5 text-left transition dark:border-slate-800 dark:bg-slate-950/75"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">{team.name}</h4>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  team.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {team.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              Leader: <span className="text-slate-900 dark:text-white">{team.leaderName || "Unassigned"}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              Members: <span className="text-slate-900 dark:text-white">{team.memberCount || 0}</span>
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-blue-600 dark:text-blue-200">
              Open Team <ArrowRight size={12} />
            </p>
          </button>
        ))}
      </div>

      <div className={sectionCardClassName}>
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
            <div className="grid gap-3 md:hidden">
              {teams.map((team) => {
                const busy = actionTeamId === String(team.id);

                return (
                  <article
                    key={`mobile-${team.id}`}
                    className="rounded-[1.45rem] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_34px_rgba(59,130,246,0.08)] dark:border-slate-800 dark:bg-slate-950/75"
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
                      <ActionButton
                        label={team.isActive ? "Deactivate" : "Activate"}
                        icon={<ShieldAlert size={14} />}
                        onClick={() => toggleTeamActive(team)}
                        disabled={busy}
                        tone={team.isActive ? "danger" : "default"}
                      />
                      <ActionButton
                        label="Delete"
                        icon={<Trash2 size={14} />}
                        onClick={() => deleteTeam(team)}
                        disabled={busy}
                        tone="danger"
                      />
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
                  {teams.map((team) => {
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
                            <ActionButton
                              label={team.isActive ? "Deactivate" : "Activate"}
                              icon={<ShieldAlert size={14} />}
                              onClick={() => toggleTeamActive(team)}
                              disabled={busy}
                              tone={team.isActive ? "danger" : "default"}
                            />
                            <ActionButton
                              label="Delete"
                              icon={<Trash2 size={14} />}
                              onClick={() => deleteTeam(team)}
                              disabled={busy}
                              tone="danger"
                            />
                            {busy ? <Loader2 size={14} className="animate-spin text-slate-500" /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="light-glow-soft flex min-h-[7.75rem] flex-col justify-between rounded-[1.5rem] border border-white/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/75">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
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
    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
