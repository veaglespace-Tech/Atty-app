"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, LocateFixed, RefreshCcw, Save, Search, MapPin } from "lucide-react";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";
import PaginationControls from "@/components/dashboard/PaginationControls";
import {
  useGetOrgAttendanceQuery,
  useGetOrgAttendanceSettingsQuery,
  useUpdateOrgAttendanceSettingsMutation,
  useGetOrgTeamsQuery,
  usePatchOrgTeamMutation,
} from "@/services/api/orgApi";
import MyAttendancePanel from "@/components/attendance/MyAttendancePanel";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { normalizeRole, ROLES } from "@/utils/roles";
import { formatHoursValue } from "@/utils/time";
import {
  getErrorMessage,
  validateAttendanceSettingsForm,
} from "@/utils/formValidation";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatWorkedHours = (record) =>
  formatHoursValue(record?.workedHours ?? record?.workedMinutes, {
    fromMinutes: record?.workedHours == null,
  });

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const parseCoordinates = (lng, lat) => {
  const longitude = Number(lng);
  const latitude = Number(lat);
  if (Number.isNaN(longitude) || Number.isNaN(latitude)) return null;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))];
};

const detectLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
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

export default function OrgAttendancePage() {
  const authUser = useSelector((state) => state.auth.user);
  const currentRole = authUser?.currentRole;
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [settings, setSettings] = useState({
    teamId: "",
    attendanceRadius: "25",
    areaKey: "",
    longitude: "",
    latitude: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    refetch: refetchAttendance,
  } = useGetOrgAttendanceQuery(DASHBOARD_FETCH_LIMITS.ORG_ATTENDANCE);

  const {
    data: settingsData,
    isLoading: settingsInitialLoading,
    isFetching: settingsFetching,
    refetch: refetchSettings,
  } = useGetOrgAttendanceSettingsQuery();
  const { data: teamsData, isLoading: teamsLoading } = useGetOrgTeamsQuery(
    DASHBOARD_FETCH_LIMITS.ORG_TEAMS
  );

  const [updateSettingsMutation] = useUpdateOrgAttendanceSettingsMutation();
  const [patchTeamMutation] = usePatchOrgTeamMutation();

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);

  const summary = useMemo(
    () => (Array.isArray(attendanceData?.summary) ? attendanceData.summary : []),
    [attendanceData]
  );
  const records = useMemo(
    () => (Array.isArray(attendanceData?.items) ? attendanceData.items : []),
    [attendanceData]
  );

  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);
  const showSelfAttendance = normalizeRole(currentRole) === ROLES.SUB_ADMIN;
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedRecords,
    setPage,
    setPageSize,
  } = useLocalPagination(records, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.ATTENDANCE[0],
  });

  useEffect(() => {
    const location = settingsData?.settings?.location;
    setSettings((prev) => ({
      ...prev,
      attendanceRadius: String(settingsData?.settings?.attendanceRadius || 25),
      longitude: Array.isArray(location) ? String(location[0]) : "",
      latitude: Array.isArray(location) ? String(location[1]) : "",
    }));
  }, [settingsData]);

  const refreshData = async () => {
    setError("");
    await Promise.all([refetchAttendance(), refetchSettings()]);
  };

  const onSettingsChange = (event) => {
    const { name, value } = event.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const onTeamChange = (event) => {
    const teamId = event.target.value;
    setSettings((prev) => ({
      ...prev,
      teamId,
    }));

    if (!teamId) {
      const location = settingsData?.settings?.location;
      setSettings((prev) => ({
        ...prev,
        attendanceRadius: String(settingsData?.settings?.attendanceRadius || 25),
        longitude: Array.isArray(location) ? String(location[0]) : "",
        latitude: Array.isArray(location) ? String(location[1]) : "",
      }));
      return;
    }

    const team = teams.find((t) => String(t.id) === teamId);
    if (team) {
      const lon = team.longitude != null ? String(team.longitude) : "";
      const lat = team.latitude != null ? String(team.latitude) : "";

      setSettings((prev) => ({
        ...prev,
        attendanceRadius: String(team.attendanceRadius || 25),
        longitude: lon,
        latitude: lat,
      }));
    }
  };


  const onUseCurrentLocation = async () => {
    try {
      setGeoLoading(true);
      setError("");
      const { longitude, latitude } = await detectLocation();
      setSettings((prev) => ({
        ...prev,
        longitude: String(longitude),
        latitude: String(latitude),
      }));
      setMessage("Organization location detected successfully.");
    } catch (geoError) {
      setError(geoError.message || "Failed to detect location");
    } finally {
      setGeoLoading(false);
    }
  };

  const onSearchLocation = async (query) => {
    setSearchQuery(query);
    setSearchError("");
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        try {
          setSearching(true);
          setSearchError("");
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery
            )}&limit=5`
          );
          if (!res.ok) throw new Error("Search service currently unavailable");
          const data = await res.json();
          setSuggestions(data);
        } catch (err) {
          console.error("Search failed", err);
          setSearchError("Failed to fetch locations. Please check your internet or try again.");
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const onSelectSuggestion = (suggestion) => {
    setSettings((prev) => ({
      ...prev,
      longitude: String(Number(suggestion.lon).toFixed(6)),
      latitude: String(Number(suggestion.lat).toFixed(6)),
    }));
    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    const validationError = validateAttendanceSettingsForm({
      attendanceRadius: settings.attendanceRadius,
      longitude: settings.longitude,
      latitude: settings.latitude,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const coordinates = parseCoordinates(settings.longitude, settings.latitude);

    try {
      setSettingsLoading(true);
      setError("");
      setMessage("");

      if (settings.teamId) {
        await patchTeamMutation({
          teamId: settings.teamId,
          attendanceRadius: Number(settings.attendanceRadius || 25),
          longitude: coordinates[0],
          latitude: coordinates[1],
        }).unwrap();
        setMessage("Team attendance settings updated successfully.");
      } else {
        await updateSettingsMutation({
          attendanceRadius: Number(settings.attendanceRadius || 25),
          coordinates,
        }).unwrap();
        setMessage("Organization-wide attendance settings updated.");
      }

      await Promise.all([refetchAttendance(), refetchSettings()]);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to save attendance settings"));
    } finally {
      setSettingsLoading(false);
    }
  };

  const loading =
    attendanceLoading ||
    attendanceFetching ||
    settingsInitialLoading ||
    settingsFetching ||
    teamsLoading;

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">Organization Attendance</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              Configure organization geofence and monitor team attendance logs.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshData}
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

      {showSelfAttendance ? (
        <MyAttendancePanel
          title="My Attendance"
          description="Mark your own sub admin attendance with live GPS while keeping organization logs in view."
          limit={8}
          onAttendanceChange={refreshData}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Records" value={summaryMap.get("Records") || 0} />
        <MetricCard label="Present" value={summaryMap.get("Present") || 0} />
        <MetricCard label="Half Day" value={summaryMap.get("Half Day") || 0} />
        <MetricCard label="Absent" value={summaryMap.get("Absent") || 0} />
      </div>

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance Settings</h3>

        <form onSubmit={saveSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            name="teamId"
            value={settings.teamId}
            onChange={onTeamChange}
            className="dashboard-field-control dashboard-select-control"
          >
            <option value="">Organization-wide Geofence</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <input
            name="attendanceRadius"
            type="number"
            min="5"
            value={settings.attendanceRadius}
            onChange={onSettingsChange}
            placeholder="Attendance radius (meters)"
            className="dashboard-field-control"
          />

          <div className="relative md:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchLocation(e.target.value)}
                placeholder="Search for a place (e.g. Pune Station)"
                className="dashboard-field-control w-full pl-10 pr-4"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              {searching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-slate-400" size={16} />}
            </div>

            {suggestions.length > 0 && (
              <ul className="dashboard-dropdown-menu absolute z-50 mt-1 w-full overflow-hidden">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => onSelectSuggestion(s)}
                    className="flex cursor-pointer items-start gap-2 border-b border-slate-50 px-4 py-2 hover:bg-slate-50"
                  >
                    <MapPin className="mt-1 shrink-0 text-slate-400" size={14} />
                    <span className="text-xs text-slate-700">{s.display_name}</span>
                  </li>
                ))}
              </ul>
            )}

            {searchError && (
              <p className="mt-1 text-[10px] font-semibold text-red-500">{searchError}</p>
            )}
          </div>


          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={geoLoading}
            className="brand-btn brand-btn-secondary brand-btn-md w-full"
          >
            {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            Use Current Location
          </button>

          <input
            name="longitude"
            type="number"
            step="any"
            value={settings.longitude}
            onChange={onSettingsChange}
            placeholder="Longitude"
            className="dashboard-field-control"
          />

          <input
            name="latitude"
            type="number"
            step="any"
            value={settings.latitude}
            onChange={onSettingsChange}
            placeholder="Latitude"
            className="dashboard-field-control"
          />

          <div className="md:col-span-2 flex justify-stretch sm:justify-end">
            <button
              type="submit"
              disabled={settingsLoading}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              {settingsLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </form>
      </div>

      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance Logs</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading attendance logs...</span>
          </div>
        ) : records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No attendance records found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="mobile-hide-helper text-xs font-semibold text-slate-500">
              Showing {startIndex}-{endIndex} of {records.length} attendance records
            </p>

            <div className="grid gap-3 md:hidden">
              {paginatedRecords.map((record) => (
                <article
                  key={`mobile-${record.id}`}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-black text-slate-900">{record.member}</h4>
                      <p className="mt-1 text-xs text-slate-500">{record.date}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {record.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <AttendanceDetail label="Role" value={record.role} />
                    <AttendanceDetail label="Punch In" value={formatDate(record.punchInAt)} />
                    <AttendanceDetail label="Punch Out" value={formatDate(record.punchOutAt)} />
                    <AttendanceDetail label="Worked Hrs" value={formatWorkedHours(record)} />
                    <AttendanceDetail
                      label="Selfie Proof"
                      value={
                        <AttendanceSelfieProofLinks
                          punchInSelfieUrl={record.punchInSelfieUrl}
                          punchOutSelfieUrl={record.punchOutSelfieUrl}
                        />
                      }
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Member</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Worked Hrs</th>
                    <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Selfie Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-3 py-2 text-slate-700">{record.date}</td>
                      <td className="px-3 py-2 text-slate-700">{record.member}</td>
                      <td className="px-3 py-2 text-slate-700">{record.role}</td>
                      <td className="px-3 py-2 text-slate-700">{record.status}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(record.punchInAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(record.punchOutAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatWorkedHours(record)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <AttendanceSelfieProofLinks
                          punchInSelfieUrl={record.punchInSelfieUrl}
                          punchOutSelfieUrl={record.punchOutSelfieUrl}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={records.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.ATTENDANCE}
              label="records"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function AttendanceDetail({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
