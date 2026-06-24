"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, LocateFixed, RefreshCcw, Save, Search, MapPin, X, Download, FileBox, FileText, ChevronDown } from "lucide-react";
import { addNotification } from "@/store/slices/notificationSlice";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";
import PaginationControls from "@/components/dashboard/PaginationControls";
import {
  useGetOrgAttendanceQuery,
  useDownloadOrgAttendanceExcelMutation,
  useDownloadOrgAttendancePdfMutation,
  useGetOrgAttendanceSettingsQuery,
  useUpdateOrgAttendanceSettingsMutation,
  useGetOrgTeamsQuery,
  usePatchOrgTeamMutation,
} from "@/services/api/orgApi";
import MyAttendancePanel from "@/components/attendance/MyAttendancePanel";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_FETCH_LIMITS, DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { PERMISSIONS, normalizeRole, ROLES, hasPermission, formatRoleLabel } from "@/utils/roles";
import { formatHoursValue } from "@/utils/time";
import { getDateKey, getTodayDateKey } from "@/utils/date";
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

const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return "-";
  }
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return "-";
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatLocation = (record) => {
  if (record?.punchInLocationMeta?.displayText) return record.punchInLocationMeta.displayText;
  if (record?.punchInLocationMeta?.areaLabel) return record.punchInLocationMeta.areaLabel;
  return formatCoordinates(record?.punchInCoordinates);
};

const formatGeoStatus = (record) => {
  if (record?.punchInValid === false) return "No";
  if (record?.punchOutValid === false) return "No";
  return "Yes";
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


const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half Day" },
];

const todayKey = getTodayDateKey;

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  return getDateKey(date);
};

const getDefaultCustomRange = () => ({
  from: daysAgoKey(89),
  to: todayKey(),
});

const toQueryString = ({ period, from, to, status }) => {
  const params = new URLSearchParams({
    period,
  });

  if (period === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  return params.toString();
};

const getInclusiveDaySpan = (from, to) => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const diffInMs = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffInMs / (24 * 60 * 60 * 1000)) + 1;
};

const getCustomRangeError = ({ period, from, to, minDays, maxDays }) => {
  if (period !== "custom") return "";
  if (!from || !to) return "Select both From and To dates for a custom report.";
  if (from > to) return "From date cannot be after To date.";

  const today = todayKey();
  if (to > today) return "Custom report range cannot extend into future dates.";

  const span = getInclusiveDaySpan(from, to);
  if (span < minDays || span > maxDays) {
    return `Custom range must stay between ${minDays} and ${maxDays} days.`;
  }

  return "";
};

export default function OrgAttendancePage() {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const currentRole = authUser?.currentRole;
  const canSetWorkspaceLocation = hasPermission(authUser, PERMISSIONS.LOCATION_SET);
  const canManageTeamAttendance = hasPermission(authUser, PERMISSIONS.ATTENDANCE_MANAGE);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [settings, setSettings] = useState({
    teamId: "",
    attendanceRadius: "25",
    areaKey: "",
    longitude: "",
    latitude: "",
  });
  const [message, setMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [period, setPeriod] = useState("monthly");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadError, setDownloadError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = require('react').useRef(null);
  
  const rangeRules = useMemo(() => ({ minDays: 1, maxDays: 364 }), []);
  
  const customRangeError = useMemo(
    () =>
      getCustomRangeError({
        period,
        from: customRange.from,
        to: customRange.to,
        minDays: rangeRules.minDays,
        maxDays: rangeRules.maxDays,
      }),
    [customRange.from, customRange.to, period, rangeRules.maxDays, rangeRules.minDays]
  );

  const queryString = useMemo(
    () =>
      toQueryString({
        period,
        from: customRange.from,
        to: customRange.to,
        status: statusFilter,
      }),
    [customRange.from, customRange.to, period, statusFilter]
  );
  
  const [downloadOrgAttendancePdf, { isLoading: downloadingPdf }] = useDownloadOrgAttendancePdfMutation();
  const [downloadOrgAttendanceExcel, { isLoading: downloadingExcel }] = useDownloadOrgAttendanceExcelMutation();


  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    refetch: refetchAttendance,
  } = useGetOrgAttendanceQuery(queryString, { skip: period === "custom" && Boolean(customRangeError) });

  const {
    data: settingsData,
    isLoading: settingsInitialLoading,
    isFetching: settingsFetching,
    refetch: refetchSettings,
  } = useGetOrgAttendanceSettingsQuery();
  const { data: teamsData, isLoading: teamsLoading } = useGetOrgTeamsQuery(
    DASHBOARD_FETCH_LIMITS.ORG_TEAMS,
    { skip: !canManageTeamAttendance }
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
    try {
      await Promise.all([refetchAttendance(), refetchSettings()]);
    } catch (err) {
      if (!err?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: err?.data?.message || err?.error || "Failed to refresh attendance",
          })
        );
      }
    }
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
      const { longitude, latitude } = await detectLocation();
      setSettings((prev) => ({
        ...prev,
        longitude: String(longitude),
        latitude: String(latitude),
      }));
      setMessage("Organization location detected successfully.");
    } catch (geoError) {
      dispatch(
        addNotification({
          type: "error",
          message: geoError.message || "Failed to detect location",
        })
      );
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
      setMessage("");

      if (settings.teamId) {
        if (!canManageTeamAttendance) {
          throw new Error("Missing required permission");
        }
        await patchTeamMutation({
          teamId: settings.teamId,
          attendanceRadius: Number(settings.attendanceRadius || 25),
          longitude: coordinates[0],
          latitude: coordinates[1],
        }).unwrap();
        setMessage("Team attendance settings updated successfully.");
      } else {
        if (!canSetWorkspaceLocation) {
          throw new Error("Missing required permission");
        }
        await updateSettingsMutation({
          attendanceRadius: Number(settings.attendanceRadius || 25),
          coordinates,
        }).unwrap();
        setMessage("Organization-wide attendance settings updated.");
      }

      await Promise.all([refetchAttendance(), refetchSettings()]);
    } catch (mutationError) {
      if (!mutationError?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: mutationError?.message || "Failed to save attendance settings",
          })
        );
      }
    } finally {
      setSettingsLoading(false);
    }
  };


  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrgAttendancePdf(queryString).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report-${period}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download PDF."));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadOrgAttendanceExcel(queryString).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report-${period}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      setDownloadError(getErrorMessage(err, "Failed to download Excel."));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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



        
        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="brand-input min-w-[140px]"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="brand-input min-w-[140px]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {period === "custom" && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    From
                  </label>
                  <input
                    type="date"
                    value={customRange.from}
                    onChange={(e) =>
                      setCustomRange((p) => ({ ...p, from: e.target.value }))
                    }
                    className="brand-input min-w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    To
                  </label>
                  <input
                    type="date"
                    value={customRange.to}
                    max={todayKey()}
                    onChange={(e) =>
                      setCustomRange((p) => ({ ...p, to: e.target.value }))
                    }
                    className="brand-input min-w-[140px]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={loading || Boolean(customRangeError) || downloadingPdf || downloadingExcel}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {(downloadingPdf || downloadingExcel) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export
              <ChevronDown size={14} className="ml-1 opacity-60" />
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
        {customRangeError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {customRangeError}
          </p>
        )}
        {downloadError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {downloadError}
          </p>
        )}

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

      {canSetWorkspaceLocation || canManageTeamAttendance ? (
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance Settings</h3>

        <form onSubmit={saveSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            name="teamId"
            value={settings.teamId}
            onChange={onTeamChange}
            disabled={!canManageTeamAttendance}
            className="dashboard-field-control dashboard-select-control"
          >
            <option value="">
              {canSetWorkspaceLocation ? "Organization-wide Geofence" : "Select Team"}
            </option>
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
            disabled={!settings.teamId && !canSetWorkspaceLocation}
            className="dashboard-field-control"
          />

          <div className="relative md:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchLocation(e.target.value)}
                placeholder="Search for a place (e.g. Pune Station)"
                disabled={!settings.teamId && !canSetWorkspaceLocation}
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
            disabled={geoLoading || (!settings.teamId && !canSetWorkspaceLocation)}
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
            disabled={!settings.teamId && !canSetWorkspaceLocation}
            className="dashboard-field-control"
          />

          <input
            name="latitude"
            type="number"
            step="any"
            value={settings.latitude}
            onChange={onSettingsChange}
            placeholder="Latitude"
            disabled={!settings.teamId && !canSetWorkspaceLocation}
            className="dashboard-field-control"
          />

          <div className="md:col-span-2 flex justify-stretch sm:justify-end">
            <button
              type="submit"
              disabled={settingsLoading || (!settings.teamId && !canSetWorkspaceLocation)}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              {settingsLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </form>
      </div>
      ) : null}

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
                    <AttendanceDetail label="Role" value={formatRoleLabel(record.role)} />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="brand-btn brand-btn-soft brand-btn-sm w-full"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm" style={{ minWidth: "860px" }}>
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Date</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Member</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Worked Hrs</th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Geo Valid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700 font-medium">{record.date}</td>
                      <td className="px-3 py-3 text-slate-900 font-bold">{record.member}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700 font-semibold">{formatRoleLabel(record.role)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          {record.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-slate-700">
                        {record.punchInAt ? new Date(record.punchInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-slate-700">
                        {record.punchOutAt ? new Date(record.punchOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-slate-700">{formatWorkedHours(record)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-slate-700">{formatGeoStatus(record)}</td>
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

      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedRecord(null)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 p-6 sm:p-7">
            <div className="brand-metric-glow" />
            <div className="relative flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Attendance Details</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Detailed punch log and verification</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800/50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto py-4 space-y-4 pr-1">
                {/* Member Profile info */}
                <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-200 font-bold text-base">
                    {selectedRecord.member?.[0] || "M"}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{selectedRecord.member}</h4>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{formatRoleLabel(selectedRecord.role)}</p>
                  </div>
                </div>

                {/* Date & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="dashboard-detail-tile">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Date</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{selectedRecord.date}</p>
                  </div>
                  <div className="dashboard-detail-tile">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                    <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{selectedRecord.status}</p>
                  </div>
                </div>

                {/* Geo Validation & Worked Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="dashboard-detail-tile">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Geo Valid</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{formatGeoStatus(selectedRecord)}</p>
                  </div>
                  <div className="dashboard-detail-tile">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worked Hours</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{formatWorkedHours(selectedRecord)}</p>
                  </div>
                </div>

                {/* Punch In Info */}
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In Details</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedRecord.punchInAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{formatLocation(selectedRecord)}</p>
                    </div>
                  </div>
                </div>

                {/* Punch Out Info */}
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out Details</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedRecord.punchOutAt)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {selectedRecord.punchOutLocationMeta?.displayText || selectedRecord.punchOutLocationMeta?.areaLabel || formatCoordinates(selectedRecord.punchOutCoordinates)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selfie Proof */}
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-3.5 space-y-2.5">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Selfie Verification</h5>
                  <AttendanceSelfieProofLinks
                    punchInSelfieUrl={selectedRecord.punchInSelfieUrl}
                    punchOutSelfieUrl={selectedRecord.punchOutSelfieUrl}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end border-t border-slate-200/60 pt-4 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="brand-btn brand-btn-secondary brand-btn-md px-6"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
