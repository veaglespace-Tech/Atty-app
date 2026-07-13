"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  User,
  UserCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import {
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderTeamByIdQuery,
  useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation,
} from "@/services/api/teamLeaderApi";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function TeamLeaderTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);
  const teamId = Number(params?.teamId);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM.UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM.DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM.ASSIGN_MEMBERS);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("DETAILS");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
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
  } = useGetTeamLeaderTeamByIdQuery(teamId, { skip: !Number.isFinite(teamId) || teamId <= 0 });

  const { data: usersData, isLoading: usersLoading } = useGetTeamLeaderUsersQuery(
    { limit: 500, assignable: true },
    {
      skip: !canAssignMembers,
    }
  );

  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();
  const [deleteTeamMutation] = useDeleteTeamLeaderTeamMutation();

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
    if (!canUpdateTeams) {
      setError("Missing required permission");
      return;
    }

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
    if (!canAssignMembers) {
      setError("Missing required permission");
      return;
    }

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
    if (!canAssignMembers) {
      setError("Missing required permission");
      return;
    }

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
    if (!canDeleteTeams) {
      setError("Missing required permission");
      return;
    }
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

          {canDeleteTeams ? (
            <button
              type="button"
              onClick={deleteTeam}
              disabled={deleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 sm:w-auto"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Delete Team
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="light-glow-card-static rounded-[1.7rem] p-2 mt-8">
        <div className={`grid gap-2 sm:grid-cols-${canAssignMembers ? "2" : "1"}`}>
          <button
            type="button"
            onClick={() => setActiveTab("DETAILS")}
            className={`brand-btn brand-btn-md justify-center rounded-[1.25rem] ${
              activeTab === "DETAILS" ? "brand-btn-primary" : "brand-btn-secondary"
            }`}
          >
            <Settings size={16} />
            Team Details
          </button>
          
          {canAssignMembers && (
              <button
                type="button"
                onClick={() => setActiveTab("MEMBERS")}
                className={`brand-btn brand-btn-md justify-center rounded-[1.25rem] ${
                  activeTab === "MEMBERS" ? "brand-btn-primary" : "brand-btn-secondary"
                }`}
              >
                <Users size={16} />
                Team Members
              </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "DETAILS" && (
        <div className="max-w-2xl space-y-6 pt-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Details</h3>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={!canUpdateTeams}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              disabled={!canUpdateTeams}
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
                  setForm((prev) => ({ ...prev, attendanceRadius: event.target.value.replace(/^0+(?=\d)/, "") }))
                }
                disabled={!canUpdateTeams}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <label className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                disabled={!canUpdateTeams}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Active Team
            </label>
          </div>

          <button
            type="button"
            onClick={saveBasics}
            disabled={!canUpdateTeams || savingBasics || teamFetching}
            className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
          >
            {savingBasics ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Details
          </button>
        </div>
        )}

        {activeTab === "MEMBERS" && canAssignMembers && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Members</h3>
            <button
              type="button"
              onClick={() => setIsAddMemberOpen((prev) => !prev)}
              className="brand-btn brand-btn-primary brand-btn-sm"
            >
              <Plus size={14} /> Add Member
            </button>
          </div>

          {isAddMemberOpen && (
            <div className="light-glow-card-static space-y-4 rounded-[1.4rem] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Select and Add Members</h4>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={memberSearch}
                  onFocus={() => setMemberOpen(true)}
                  onChange={(event) => {
                    setMemberOpen(true);
                    setMemberSearch(event.target.value);
                  }}
                  placeholder="Search members to add..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setMemberOpen((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-500"
                >
                  {memberOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {memberOpen && (
                <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-1">
                  {filteredMembers.map((member) => (
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
                  ))}
                  {filteredMembers.length === 0 && (
                    <p className="px-2 py-2 text-xs font-semibold text-slate-500">No member found</p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    saveMembers();
                    setIsAddMemberOpen(false);
                  }}
                  disabled={savingMembers || teamFetching}
                  className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
                >
                  {savingMembers ? <Loader2 size={16} className="animate-spin" /> : <UsersRound size={16} />}
                  Submit & Save
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Current Members Directory ({form.memberIds.length})</h4>
            </div>
            
            {selectedMembers.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-500">
                No members currently in this team.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {selectedMembers.map(({ id, user }) => (
                  <li key={`current-${id}`} className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs font-medium text-slate-500">{formatRoleLabel(user.role)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(id)}
                      className="brand-btn brand-btn-danger brand-btn-sm px-4"
                    >
                      <X size={14} /> Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveMembers}
              disabled={savingMembers || teamFetching}
              className="brand-btn brand-btn-primary brand-btn-md"
            >
              {savingMembers ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Member Changes
            </button>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
