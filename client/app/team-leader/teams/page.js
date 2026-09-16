"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileBox,
  FileText,
  Loader2,
  LocateFixed,
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
  useCreateTeamLeaderTeamMutation,
  useDeleteTeamLeaderTeamMutation,
  useGetTeamLeaderTeamsQuery,
  useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation,
  useDownloadTeamLeaderTeamsPdfMutation,
  useDownloadTeamLeaderTeamsExcelMutation,
} from "@/services/api/teamLeaderApi";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole, getDashboardRootByRole } from "@/utils/roles";
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

const selectorSummaryClassName =
  "dashboard-filter-field mt-2";
const selectorSummaryLabelClassName =
  "text-[10px] font-black uppercase tracking-[0.16em] text-slate-500";
const selectorSummaryValueClassName = "mt-1 text-sm font-semibold text-slate-900";
const selectorSummaryHelperClassName = "mt-2 text-xs font-semibold text-slate-500";
const selectorSearchFieldClassName =
  "w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500";
const selectorSearchIconClassName =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400";
const selectorSearchToggleClassName = "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500";
const selectorChipClassName =
  "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";

const detectLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 150) {
          reject(new Error(`Location accuracy is too low (${Math.round(position.coords.accuracy)}m). Please turn on GPS and go near a window or outside.`));
          return;
        }
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
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);
  const canCreateTeams = hasPermission(authUser, PERMISSIONS.TEAM.CREATE);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM.UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM.DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM.ASSIGN_MEMBERS);
  const canManageAttendance = hasPermission(authUser, PERMISSIONS.ATTENDANCE.MANAGE);
  const rootPath = getDashboardRootByRole(authUser?.currentRole || ROLES.MEMBER);
  const [submitting, setSubmitting] = useState(false);
  const [actionTeamId, setActionTeamId] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    attendanceRadius: "",
    leaderId: authUser?.id ? String(authUser.id) : "",
    memberIds: [],
    longitude: "",
    latitude: "",
  });

  const myTeamIds = useMemo(() => {
    const ids = new Set();
    if (authUser?.teamMemberships) {
      authUser.teamMemberships.forEach((tm) => {
        if (tm?.team?.id) ids.add(String(tm.team.id));
      });
    }
    if (authUser?.teamsLed) {
      authUser.teamsLed.forEach((t) => {
        if (t?.id) ids.add(String(t.id));
      });
    }
    return ids;
  }, [authUser]);

  const {
    data: teamsData,
    isLoading: teamsLoading,
    isFetching: teamsFetching,
    refetch: refetchTeams,
  } = useGetTeamLeaderTeamsQuery(DASHBOARD_FETCH_LIMITS.TEAM_LEADER_TEAMS);

  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useGetTeamLeaderUsersQuery({ limit: DASHBOARD_FETCH_LIMITS.TEAM_LEADER_USERS, assignable: true }, {
    skip: !(canCreateTeams && canAssignMembers),
  });

  const [createTeamMutation] = useCreateTeamLeaderTeamMutation();
  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();
  const [deleteTeamMutation] = useDeleteTeamLeaderTeamMutation();
  const [downloadTeamsPdf, { isLoading: downloadingPdf }] = useDownloadTeamLeaderTeamsPdfMutation();
  const [downloadTeamsExcel, { isLoading: downloadingExcel }] = useDownloadTeamLeaderTeamsExcelMutation();

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [downloadMenuRef]);

  const onDownloadPdf = async () => {
    try {
      setError("");
      const blob = await downloadTeamsPdf().unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `team-details-${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download PDF."));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setError("");
      const blob = await downloadTeamsExcel().unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `team-details-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download Excel."));
    }
  };

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);

  const loading = teamsLoading || teamsFetching || usersLoading || usersFetching;

  const memberOptions = useMemo(
    () =>
      users.filter(
        (user) =>
          [ROLES.MEMBER, ROLES.LIFE_MEMBER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(normalizeRole(user.role)) &&
          user.active
      ),
    [users]
  );

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
    let value = event.target.value;
    if (event.target.name === "attendanceRadius") {
      value = value.replace(/^0+(?=\d)/, "");
    }
    setForm((prev) => ({ ...prev, [event.target.name]: value }));
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

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      attendanceRadius: "",
      leaderId: authUser?.id ? String(authUser.id) : "",
      memberIds: [],
      longitude: "",
      latitude: "",
    });
    setMemberSearch("");
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
      setIsFormOpen(false);
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
    if (!canManageAttendance) {
      setError("Admin permission is required to update team geofence.");
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
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6 !overflow-visible">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-[280px] flex-1">
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">{canCreateTeams ? "Team Leader Teams" : "My Teams"}</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Manage teams, assign members, and control team geofence based on your granted permissions.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end lg:shrink-0 lg:max-w-full">
            {canCreateTeams ? (
              <button
                type="button"
                onClick={() => setIsFormOpen((prev) => !prev)}
                className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
              >
                Create Team
              </button>
            ) : null}
            <button title="Refresh"
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              
            </button>

            <div className="relative w-full sm:w-auto" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={loading || downloadingPdf || downloadingExcel}
                className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
              >
                {(downloadingPdf || downloadingExcel) ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Export
                <ChevronDown size={14} className={`ml-1 opacity-60 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl z-50">
                  <button
                    onClick={onDownloadPdf}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <FileBox size={16} />
                    Download PDF
                  </button>
                  <button
                    onClick={onDownloadExcel}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-emerald-600"
                  >
                    <FileText size={16} />
                    Download Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      {isFormOpen ? (
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Create Team</h3>
          <button
            onClick={() => setIsFormOpen(false)}
            className="brand-btn brand-btn-secondary brand-btn-sm"
          >
            Close
          </button>
        </div>
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
            placeholder="Attendance radius (optional, default 25)"
            className="dashboard-field-control"
            disabled={!canCreateTeams}
          />

          <textarea
            name="description"
            value={form.description}
            onChange={onInputChange}
            placeholder="Team description"
            className="dashboard-field-control lg:col-span-2"
            disabled={!canCreateTeams}
            rows={3}
          />

          {canAssignMembers ? (
            <>
              <div className="dashboard-filter-shell">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Team Leader</p>
                <div className={selectorSummaryClassName}>
                  <p className={selectorSummaryValueClassName}>
                    1 leader
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className={selectorChipClassName}>
                      {authUser?.name || "You"}
                    </div>
                  </div>
                  <p className={selectorSummaryHelperClassName}>You are automatically assigned as the team leader.</p>
                </div>
              </div>

              <div className="dashboard-filter-shell">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Team Members</p>
                <div className="relative mt-2">
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
                    disabled={!canCreateTeams}
                  />
                  <button
                    type="button"
                    onClick={() => setMemberOpen((prev) => !prev)}
                    className={selectorSearchToggleClassName}
                    disabled={!canCreateTeams}
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
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      No members selected
                    </p>
                  )}
                </div>

                {memberOpen ? (
                  <div className="dashboard-dropdown-menu mt-2 max-h-40 space-y-1 overflow-auto p-1 pr-1">
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
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={onInputChange}
              placeholder="Latitude"
              className="dashboard-field-control"
              disabled={!canCreateTeams}
            />
          <input
            name="longitude"
            type="number"
            step="any"
            value={form.longitude}
            onChange={onInputChange}
            placeholder="Longitude"
            className="dashboard-field-control"
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
      ) : null}

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Team Directory</h3>
          {teams.length > 0 && (
            <p className="text-xs font-semibold text-slate-400">
              {startIndex}-{endIndex} of {teams.length}
            </p>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2.5 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-semibold">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <UsersRound size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-700">No teams yet</p>
            <p className="mt-1.5 text-sm text-slate-500">Create your first team to get started.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4">
              {paginatedTeams.map((team) => {
                const busy = actionTeamId === team.id;
                const isMine = myTeamIds.has(String(team.id));

                return (
                  <article
                    key={team.id}
                    onClick={() => router.push(`${rootPath}/teams/${team.id}`)}
                    className="group light-glow-card cursor-pointer rounded-[1.6rem] p-5 sm:p-6 transition-all duration-300 relative"
                  >
                    {/* Header: Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${rootPath}/teams/${team.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors duration-200"
                          >
                            {team.name}
                          </Link>
                          {isMine && (
                            <span className="inline-flex shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                              Mine
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          team.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {team.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    {/* Info Grid */}
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                      {/* Leader */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100">
                          <UsersRound size={14} className="text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Leader</p>
                          <p className="truncate text-xs font-bold text-slate-800">{team.leaderName || "Unassigned"}</p>
                        </div>
                      </div>

                      {/* Sub-Leader */}
                      {team.subLeaderName && (
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100">
                            <UsersRound size={14} className="text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Sub-Leader</p>
                            <p className="truncate text-xs font-bold text-slate-800">{team.subLeaderName}</p>
                          </div>
                        </div>
                      )}

                      {/* Members */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100">
                          <UsersRound size={14} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Members</p>
                          <p className="text-xs font-bold text-slate-800">{team.memberCount}</p>
                        </div>
                      </div>

                      {/* Radius */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-purple-100">
                          <LocateFixed size={14} className="text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Radius</p>
                          <p className="text-xs font-bold text-slate-800">{team.attendanceRadius}m</p>
                        </div>
                      </div>

                      {/* Geo */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-50 to-emerald-100">
                          <LocateFixed size={14} className="text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Geo</p>
                          <p className="truncate text-xs font-bold text-slate-800">{formatLocation(team.location)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                      <ActionButton
                        label={team.isActive ? "Deactivate" : "Activate"}
                        icon={<ShieldAlert size={13} />}
                        onClick={(e) => { e.stopPropagation(); toggleTeamActive(team); }}
                        disabled={busy || !canUpdateTeams}
                        tone={team.isActive ? "danger" : "default"}
                      />
                      <ActionButton
                        label="Set Geo"
                        icon={<LocateFixed size={13} />}
                        onClick={(e) => { e.stopPropagation(); setTeamLocationFromCurrent(team); }}
                        disabled={busy || !canManageAttendance}
                      />
                      <ActionButton
                        label="Delete"
                        icon={<Trash2 size={13} />}
                        onClick={(e) => { e.stopPropagation(); deleteTeam(team); }}
                        disabled={busy || !canDeleteTeams}
                        tone="danger"
                      />
                      {busy && <Loader2 size={14} className="animate-spin text-slate-400 ml-1" />}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6">
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
          </>
        )}
      </div>
    </section>
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

