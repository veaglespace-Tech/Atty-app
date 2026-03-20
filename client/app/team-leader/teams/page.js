"use client";

import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, LocateFixed, RefreshCcw, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import {
  useCreateTeamLeaderTeamMutation,
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderTeamsQuery,
  useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation,
} from "@/store/api/teamLeaderApi";
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

  const onMembersChange = (event) => {
    const selectedIds = Array.from(event.target.selectedOptions).map((option) => option.value);
    setForm((prev) => ({ ...prev, memberIds: selectedIds }));
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Create Team</h3>
        {!canCreateTeams ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            You do not have permission to create teams.
          </p>
        ) : null}

        <form onSubmit={createTeam} className="mt-4 grid gap-3 md:grid-cols-2">
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
            className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams}
            rows={3}
          />

          <select
            name="leaderId"
            value={form.leaderId}
            onChange={onInputChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams || !canAssignMembers}
          >
            <option value="">No leader selected</option>
            {leaderOptions.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.name} ({formatRoleLabel(leader.role)})
              </option>
            ))}
          </select>

          <select
            multiple
            value={form.memberIds}
            onChange={onMembersChange}
            className="h-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={!canCreateTeams || !canAssignMembers}
          >
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({formatRoleLabel(member.role)})
              </option>
            ))}
          </select>

          <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              Use Current Location
            </button>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !canCreateTeams}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UsersRound size={16} />}
              Create Team
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Directory</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No teams found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition disabled:opacity-60 ${toneClass}`}
    >
      {icon}
      {label}
    </button>
  );
}
