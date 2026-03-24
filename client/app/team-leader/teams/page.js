"use client";

import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  LocateFixed,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCreateTeamLeaderTeamMutation,
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderTeamsQuery,
  useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation,
} from "@/services/api/teamLeaderApi";
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

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const toCoordinates = (lng, lat) => {
  const longitude = Number(lng);
  const latitude = Number(lat);
  if (Number.isNaN(longitude) || Number.isNaN(latitude)) return null;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))];
};

const formatLocation = (location) => {
  if (!Array.isArray(location) || location.length !== 2) return "-";
  return `${location[1].toFixed(5)}, ${location[0].toFixed(5)}`;
};

const detectLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          longitude: Number(position.coords.longitude.toFixed(6)),
          latitude: Number(position.coords.latitude.toFixed(6)),
        });
      },
      () => reject(new Error("Location permission denied")),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });

export default function TeamLeaderTeamsPage() {
  const authUser = useSelector((state) => state.auth.user);
  const canCreateTeams = hasPermission(authUser, PERMISSIONS.TEAM_CREATE);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM_UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM_DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM_ASSIGN_MEMBERS);
  const [submitting, setSubmitting] = useState(false);
  const [actionTeamId, setActionTeamId] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    attendanceRadius: "25",
    leaderId: "",
    memberIds: [],
    longitude: "",
    latitude: "",
  });

  const {
    data: teamsData,
    isLoading: teamsLoading,
    isFetching: teamsFetching,
    refetch: refetchTeams,
  } = useGetTeamLeaderTeamsQuery(200);

  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useGetTeamLeaderUsersQuery(500, { skip: !(canCreateTeams && canAssignMembers) });

  const [createTeamMutation] = useCreateTeamLeaderTeamMutation();
  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();
  const [deleteTeamMutation] = useDeleteTeamLeaderTeamMutation();

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const summary = useMemo(() => (Array.isArray(teamsData?.summary) ? teamsData.summary : []), [teamsData]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

  const loading = teamsLoading || teamsFetching || usersLoading || usersFetching;

  const leaderOptions = useMemo(
    () =>
      users.filter((user) =>
        [ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(normalizeRole(user.role))
      ),
    [users]
  );

  const memberOptions = useMemo(
    () =>
      users.filter(
        (user) =>
          [ROLES.MEMBER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(normalizeRole(user.role)) &&
          user.active
      ),
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
  }, [form.memberIds, memberOptions, memberSearch]);

  const selectedLeader = useMemo(
    () => leaderOptions.find((user) => String(user.id) === String(form.leaderId)) || null,
    [form.leaderId, leaderOptions]
  );

  const selectedMembers = useMemo(
    () => memberOptions.filter((user) => form.memberIds.includes(String(user.id))),
    [form.memberIds, memberOptions]
  );

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const tasks = [refetchTeams()];
      if (canCreateTeams && canAssignMembers) {
        tasks.push(refetchUsers());
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load team data"));
    }
  }, [canAssignMembers, canCreateTeams, refetchTeams, refetchUsers]);

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

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      attendanceRadius: "25",
      leaderId: "",
      memberIds: [],
      longitude: "",
      latitude: "",
    });
    setLeaderSearch("");
    setMemberSearch("");
    setLeaderOpen(false);
    setMemberOpen(false);
  };

  const onUseCurrentLocation = async () => {
    try {
      setGeoLoading(true);
      setError("");
      const { longitude, latitude } = await detectLocation();
      setForm((prev) => ({
        ...prev,
        areaKey: "",
        longitude: String(longitude),
        latitude: String(latitude),
      }));
      setMessage("Team geofence location detected successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to detect location"));
    } finally {
      setGeoLoading(false);
    }
  };

  const createTeam = async (event) => {
    event.preventDefault();
    if (!canCreateTeams) {
      setError("You do not have permission to create teams.");
      return;
    }

    const validationError = validateTeamForm({
      name: form.name,
      description: form.description,
      attendanceRadius: form.attendanceRadius,
      longitude: form.longitude,
      latitude: form.latitude,
      requireCoordinates: false,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    const coordinates = toCoordinates(form.longitude, form.latitude);

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const payload = {
        name: normalizeTextInput(form.name),
        description: normalizeTextInput(form.description),
        attendanceRadius: Number(form.attendanceRadius || 25),
        ...(canAssignMembers
          ? {
              leaderId: form.leaderId || null,
              memberIds: form.memberIds,
            }
          : {}),
        ...(coordinates ? { coordinates } : {}),
      };

      const response = await createTeamMutation(payload).unwrap();

      setMessage(response?.message || "Team created successfully");
      resetForm();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create team"));
    } finally {
      setSubmitting(false);
    }
  };

  const applyAction = async (teamId, action) => {
    try {
      setActionTeamId(teamId);
      setError("");
      setMessage("");
      await action();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setActionTeamId("");
    }
  };

  const toggleTeamActive = (team) =>
    canUpdateTeams
      ? applyAction(team.id, () =>
          patchTeamMutation({
            teamId: team.id,
            isActive: !team.isActive,
          }).unwrap()
        )
      : setError("You do not have permission to update teams.");

  const deleteTeam = (team) => {
    if (!canDeleteTeams) {
      setError("You do not have permission to delete teams.");
      return;
    }

    const confirmed = window.confirm(`Delete team ${team.name}?`);
    if (!confirmed) return;

    return applyAction(team.id, () => deleteTeamMutation(team.id).unwrap());
  };

  const setTeamLocationFromCurrent = async (team) => {
    if (!canUpdateTeams) {
      setError("You do not have permission to update team geofence.");
      return;
    }
    try {
      setActionTeamId(team.id);
      setError("");
      setMessage("");
      const { longitude, latitude } = await detectLocation();
      await patchTeamMutation({
        teamId: team.id,
        coordinates: [longitude, latitude],
      }).unwrap();
      setMessage(`Team geofence updated for ${team.name}`);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update team location"));
    } finally {
      setActionTeamId("");
    }
  };

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Team Leader Teams</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage teams, assign members, and control team geofence based on your granted permissions.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Teams" value={summaryMap.get("Teams") || 0} />
        <MetricCard label="Assigned Members" value={summaryMap.get("Total Members Assigned") || 0} />
        <MetricCard label="Teams With Leader" value={summaryMap.get("Teams With Leader") || 0} />
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Create Team</h3>
        {!canCreateTeams ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            You do not have permission to create teams.
          </p>
        ) : null}

        <form onSubmit={createTeam} className="mt-4 grid gap-4 lg:grid-cols-2">
          <input
            name="name"
            value={form.name}
            onChange={onInputChange}
            placeholder="Team name"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams}
            required
          />

          <input
            name="attendanceRadius"
            type="number"
            min="5"
            value={form.attendanceRadius}
            onChange={onInputChange}
            placeholder="Attendance radius"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams}
          />

          <textarea
            name="description"
            value={form.description}
            onChange={onInputChange}
            placeholder="Team description"
            className="lg:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams}
            rows={3}
          />

          {canAssignMembers ? (
            <>
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Team Leader</p>
                <div className="relative mt-2">
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
                    disabled={!canCreateTeams}
                  />
                  <button
                    type="button"
                    onClick={() => setLeaderOpen((prev) => !prev)}
                    className="absolute right-2 top-2 text-slate-500"
                    disabled={!canCreateTeams}
                  >
                    {leaderOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {selectedLeader ? (
                  <div className="mt-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
                    Selected: {selectedLeader.name}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    No leader selected
                  </div>
                )}

                {leaderOpen ? (
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-1 pr-1">
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
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Team Members</p>
                <div className="relative mt-2">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    value={memberSearch}
                    onFocus={() => setMemberOpen(true)}
                    onChange={(event) => {
                      setMemberOpen(true);
                      setMemberSearch(event.target.value);
                    }}
                    placeholder="Search members"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-8 text-sm outline-none focus:border-blue-500"
                    disabled={!canCreateTeams}
                  />
                  <button
                    type="button"
                    onClick={() => setMemberOpen((prev) => !prev)}
                    className="absolute right-2 top-2 text-slate-500"
                    disabled={!canCreateTeams}
                  >
                    {memberOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Selected: {form.memberIds.length}
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
                ) : null}

                {memberOpen ? (
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-1 pr-1">
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
                              : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                          }`}
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
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 lg:col-span-2">
              Your role can create teams, but member assignment is disabled for this account.
            </div>
          )}

          <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
            <input
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={onInputChange}
              placeholder="Longitude"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              disabled={!canCreateTeams}
            />
            <input
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={onInputChange}
              placeholder="Latitude"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              disabled={!canCreateTeams}
            />
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={geoLoading || !canCreateTeams}
              className="brand-btn brand-btn-secondary brand-btn-md w-full"
            >
              {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              Use Current Location
            </button>
          </div>

          <div className="lg:col-span-2 flex justify-stretch sm:justify-end">
            <button
              type="submit"
              disabled={submitting || !canCreateTeams}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UsersRound size={16} />}
              Create Team
            </button>
          </div>
        </form>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Directory</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No teams found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:hidden">
              {teams.map((team) => {
                const busy = actionTeamId === team.id;

                return (
                  <article
                    key={`mobile-${team.id}`}
                    className="rounded-[1.45rem] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_34px_rgba(59,130,246,0.08)] dark:border-slate-800 dark:bg-slate-950/75"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-black text-slate-900">{team.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Leader: {team.leaderName || "Unassigned"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          team.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {team.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ResponsiveInfo label="Members" value={team.memberCount} />
                      <ResponsiveInfo label="Radius" value={team.attendanceRadius} />
                      <ResponsiveInfo label="Geo" value={formatLocation(team.location)} />
                      <ResponsiveInfo label="Created" value={formatDate(team.createdAt)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <ActionButton
                        label={team.isActive ? "Deactivate" : "Activate"}
                        icon={<ShieldAlert size={14} />}
                        onClick={() => toggleTeamActive(team)}
                        disabled={busy || !canUpdateTeams}
                        tone={team.isActive ? "danger" : "default"}
                      />
                      <ActionButton
                        label="Set Geo"
                        icon={<LocateFixed size={14} />}
                        onClick={() => setTeamLocationFromCurrent(team)}
                        disabled={busy || !canUpdateTeams}
                      />
                      <ActionButton
                        label="Delete"
                        icon={<Trash2 size={14} />}
                        onClick={() => deleteTeam(team)}
                        disabled={busy || !canDeleteTeams}
                        tone="danger"
                      />
                      {busy ? <Loader2 size={14} className="animate-spin self-center text-slate-500" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Leader</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Members</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Radius</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Geo Location</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Active</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Created</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((team) => {
                    const busy = actionTeamId === team.id;

                    return (
                      <tr key={team.id}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{team.name}</td>
                        <td className="px-3 py-2 text-slate-700">{team.leaderName || "Unassigned"}</td>
                        <td className="px-3 py-2 text-slate-700">{team.memberCount}</td>
                        <td className="px-3 py-2 text-slate-700">{team.attendanceRadius}</td>
                        <td className="px-3 py-2 text-slate-700">{formatLocation(team.location)}</td>
                        <td className="px-3 py-2 text-slate-700">{team.isActive ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(team.createdAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <ActionButton
                              label={team.isActive ? "Deactivate" : "Activate"}
                              icon={<ShieldAlert size={14} />}
                              onClick={() => toggleTeamActive(team)}
                              disabled={busy || !canUpdateTeams}
                              tone={team.isActive ? "danger" : "default"}
                            />
                            <ActionButton
                              label="Set Geo"
                              icon={<LocateFixed size={14} />}
                              onClick={() => setTeamLocationFromCurrent(team)}
                              disabled={busy || !canUpdateTeams}
                            />
                            <ActionButton
                              label="Delete"
                              icon={<Trash2 size={14} />}
                              onClick={() => deleteTeam(team)}
                              disabled={busy || !canDeleteTeams}
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
    <div className="light-glow-soft rounded-[1.5rem] border border-white/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/75">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone = "default" }) {
  const toneClass = tone === "danger" ? "brand-btn-danger" : "brand-btn-soft";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`brand-btn brand-btn-sm ${toneClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ResponsiveInfo({ label, value }) {
  return (
    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
