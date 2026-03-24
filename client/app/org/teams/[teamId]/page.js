"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Search,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  useDeleteOrgTeamMutation,
  useGetOrgTeamByIdQuery,
  useGetOrgUsersQuery,
  usePatchOrgTeamMutation,
} from "@/services/api/orgApi";
import { ROLES, formatRoleLabel, normalizeRole } from "@/utils/roles";

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function OrgTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = Number(params?.teamId);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    attendanceRadius: "25",
    isActive: true,
    leaderId: "",
    memberIds: [],
  });

  const {
    data: teamData,
    isLoading: teamLoading,
    isFetching: teamFetching,
    refetch: refetchTeam,
  } = useGetOrgTeamByIdQuery(teamId, { skip: !Number.isFinite(teamId) || teamId <= 0 });

  const { data: usersData, isLoading: usersLoading } = useGetOrgUsersQuery(500);

  const [patchTeamMutation] = usePatchOrgTeamMutation();
  const [deleteTeamMutation] = useDeleteOrgTeamMutation();

  const team = teamData?.item || null;
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(String(user.id), user));
    return map;
  }, [users]);

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

  useEffect(() => {
    if (!team) return;
    setForm({
      name: team.name || "",
      description: team.description || "",
      attendanceRadius: String(team.attendanceRadius || 25),
      isActive: Boolean(team.isActive),
      leaderId: team.leaderId ? String(team.leaderId) : "",
      memberIds: Array.isArray(team.memberIds) ? team.memberIds.map((id) => String(id)) : [],
    });
  }, [team]);

  const selectedLeader = useMemo(
    () => leaderOptions.find((user) => String(user.id) === String(form.leaderId)) || null,
    [form.leaderId, leaderOptions]
  );

  const selectedMembers = useMemo(
    () =>
      form.memberIds
        .map((id) => ({ id, user: userMap.get(String(id)) || null }))
        .filter((item) => item.user),
    [form.memberIds, userMap]
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

  const saveBasics = async () => {
    if (!form.name.trim()) {
      setError("Team name is required");
      return;
    }

    try {
      setSavingBasics(true);
      setError("");
      setMessage("");
      await patchTeamMutation({
        teamId,
        name: form.name.trim(),
        description: form.description,
        attendanceRadius: Number(form.attendanceRadius || 25),
        isActive: Boolean(form.isActive),
      }).unwrap();
      setMessage("Team details updated");
      await refetchTeam();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update details"));
    } finally {
      setSavingBasics(false);
    }
  };

  const saveLeader = async () => {
    try {
      setSavingLeader(true);
      setError("");
      setMessage("");
      await patchTeamMutation({
        teamId,
        leaderId: form.leaderId || null,
      }).unwrap();
      setMessage("Team leader updated");
      await refetchTeam();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update team leader"));
    } finally {
      setSavingLeader(false);
    }
  };

  const saveMembers = async () => {
    try {
      setSavingMembers(true);
      setError("");
      setMessage("");
      await patchTeamMutation({
        teamId,
        memberIds: form.memberIds,
      }).unwrap();
      setMessage("Team members updated");
      await refetchTeam();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to update members"));
    } finally {
      setSavingMembers(false);
    }
  };

  const deleteTeam = async () => {
    if (!team) return;
    const confirmed = window.confirm(`Delete team ${team.name}?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");
      await deleteTeamMutation(team.id).unwrap();
      router.push("/org/teams");
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to delete team"));
    } finally {
      setDeleting(false);
    }
  };

  if (!Number.isFinite(teamId) || teamId <= 0) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid team id.
      </section>
    );
  }

  if (teamLoading || usersLoading) {
    return (
      <section className="flex items-center justify-center gap-2 py-20 text-slate-600">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-semibold">Loading team details...</span>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/org/teams")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to Teams
        </button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-700">
          Team not found.
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
              onClick={() => router.push("/org/teams")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{team.name}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">Manage details, team leader and members separately.</p>
          </div>

          <button
            type="button"
            onClick={deleteTeam}
            disabled={deleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 sm:w-auto"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete Team
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Details</h3>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Radius</label>
              <input
                type="number"
                min="5"
                value={form.attendanceRadius}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, attendanceRadius: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <label className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Active Team
            </label>
          </div>

          <button
            type="button"
            onClick={saveBasics}
            disabled={savingBasics || teamFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingBasics ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Details
          </button>
        </div>

        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Leader</h3>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={leaderSearch}
              onFocus={() => setLeaderOpen(true)}
              onChange={(event) => {
                setLeaderOpen(true);
                setLeaderSearch(event.target.value);
              }}
              placeholder="Search leader"
              className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-8 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setLeaderOpen((prev) => !prev)}
              className="absolute right-2 top-2 text-slate-500"
            >
              {leaderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {selectedLeader ? (
            <div className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
              Selected Leader: {selectedLeader.name}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">No leader selected</div>
          )}

          {leaderOpen ? (
            <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-1">
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
                        : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>{leader.name}</span>
                    <span className="ml-2 text-xs opacity-80">{formatRoleLabel(leader.role)}</span>
                  </button>
                );
              })}
              {filteredLeaders.length === 0 ? (
                <p className="px-2 py-2 text-xs font-semibold text-slate-500">No leader found</p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveLeader}
            disabled={savingLeader || teamFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingLeader ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
            Update Leader
          </button>
        </div>

        <div className="light-glow-card-static space-y-4 rounded-[1.9rem] p-6 xl:col-span-1">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Members</h3>

          <p className="text-xs font-semibold text-slate-600">Current Members ({form.memberIds.length})</p>
          <div className="max-h-32 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
            {selectedMembers.length === 0 ? (
              <p className="text-xs text-slate-500">No members in this team</p>
            ) : (
              selectedMembers.map(({ id, user }) => (
                <div key={`current-${id}`} className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                  <span>{user.name}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(id)}
                    className="brand-btn brand-btn-danger brand-btn-sm"
                  >
                    <X size={11} /> Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={memberSearch}
              onFocus={() => setMemberOpen(true)}
              onChange={(event) => {
                setMemberOpen(true);
                setMemberSearch(event.target.value);
              }}
              placeholder="Search and add members"
              className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-8 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setMemberOpen((prev) => !prev)}
              className="absolute right-2 top-2 text-slate-500"
            >
              {memberOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {memberOpen ? (
            <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-1">
              {filteredMembers.map((member) => {
                return (
                  <button
                    key={member.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addMember(member.id)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span>{member.name}</span>
                    <span className="ml-2 text-xs opacity-80">{formatRoleLabel(member.role)}</span>
                  </button>
                );
              })}
              {filteredMembers.length === 0 ? (
                <p className="px-2 py-2 text-xs font-semibold text-slate-500">No member found</p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveMembers}
            disabled={savingMembers || teamFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingMembers ? <Loader2 size={16} className="animate-spin" /> : <UsersRound size={16} />}
            Update Members
          </button>
        </div>
      </div>
    </section>
  );
}
