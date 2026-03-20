"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, RefreshCcw, LocateFixed, Save, Search, MapPin } from "lucide-react";
import {
  useGetTeamLeaderAttendanceQuery,
  usePatchTeamLeaderTeamMutation,
  useGetTeamLeaderTeamsQuery,
} from "@/store/api/teamLeaderApi";
import {
  getErrorMessage,
  validateAttendanceSettingsForm,
  validateDateWindow,
} from "@/utils/formValidation";

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return "-";

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return "-";

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

const DEFAULT_FILTERS = Object.freeze({
  search: "",
  status: "ALL",
  date: "",
  from: "",
  to: "",
});

export default function TeamLeaderAttendancePage() {
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
  });
  const [queryString, setQueryString] = useState("limit=300");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [settings, setSettings] = useState({
    attendanceRadius: "25",
    longitude: "",
    latitude: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetTeamLeaderAttendanceQuery(queryString);
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useGetTeamLeaderTeamsQuery();
  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();

  const teams = useMemo(() => (Array.isArray(teamsData?.items) ? teamsData.items : []), [teamsData]);
  const currentTeam = useMemo(() => teams[0] || null, [teams]);

  useEffect(() => {
    if (currentTeam) {
      const lon = currentTeam.longitude != null ? String(currentTeam.longitude) : "";
      const lat = currentTeam.latitude != null ? String(currentTeam.latitude) : "";
      setSettings({
        attendanceRadius: String(currentTeam.attendanceRadius || 25),
        longitude: lon,
        latitude: lat,
      });
    }
  }, [currentTeam]);
  const records = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const meta = data?.meta || null;
  const loading = isLoading || isFetching;

  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

  const filteredRecords = useMemo(() => {
    const query = String(filters.search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) =>
      `${record.member || ""} ${record.role || ""} ${record.status || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [records, filters.search]);

  const buildQueryString = (inputFilters = DEFAULT_FILTERS) => {
    const params = new URLSearchParams({ limit: "300" });
    if (inputFilters.status && inputFilters.status !== "ALL") {
      params.set("status", inputFilters.status);
    }

    if (inputFilters.date) {
      params.set("date", inputFilters.date);
    } else {
      if (inputFilters.from) params.set("from", inputFilters.from);
      if (inputFilters.to) params.set("to", inputFilters.to);
    }
    return params.toString();
  };

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onApplyFilters = (event) => {
    event.preventDefault();
    const validationError = validateDateWindow(filters);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setQueryString(buildQueryString(filters));
  };

  const onResetFilters = () => {
    const nextFilters = { ...DEFAULT_FILTERS };
    setFilters(nextFilters);
    setError("");
    setQueryString(buildQueryString(nextFilters));
  };

  const onSettingsChange = (event) => {
    const { name, value } = event.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const onUseCurrentLocation = async () => {
    try {
      setGeoLoading(true);
      setSettingsError("");
      const coordinates = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
          (err) => reject(new Error("Location permission denied")),
          { enableHighAccuracy: true }
        );
      });
      setSettings((prev) => ({
        ...prev,
        longitude: String(coordinates[0].toFixed(6)),
        latitude: String(coordinates[1].toFixed(6)),
      }));
      setSettingsMessage("Detected current location.");
    } catch (err) {
      setSettingsError(err.message);
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
    if (!currentTeam) {
      setSettingsError("No team found to update settings.");
      return;
    }

    const validationError = validateAttendanceSettingsForm({
      attendanceRadius: settings.attendanceRadius,
      longitude: settings.longitude,
      latitude: settings.latitude,
    });
    if (validationError) {
      setSettingsError(validationError);
      return;
    }

    try {
      setSettingsLoading(true);
      setSettingsError("");
      setSettingsMessage("");

      await patchTeamMutation({
        teamId: currentTeam.id,
        attendanceRadius: Number(settings.attendanceRadius || 25),
        longitude: Number(settings.longitude),
        latitude: Number(settings.latitude),
      }).unwrap();

      setSettingsMessage("Team location updated successfully.");
      await Promise.all([refetch(), refetchTeams()]);
    } catch (err) {
      setSettingsError(getErrorMessage(err, "Failed to update team location."));
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Team Leader Attendance</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track your team attendance logs, punch timings, and geo-validation status.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Team: {meta?.teamName || "-"}
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                setError("");
                await refetch();
              } catch (err) {
                setError(err?.data?.message || err?.error || "Failed to load team attendance");
              }
            }}
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
      </div>

      <form onSubmit={onApplyFilters} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            name="search"
            value={filters.search}
            onChange={onFilterChange}
            placeholder="Search member"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            name="status"
            value={filters.status}
            onChange={onFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
          </select>

          <input
            name="date"
            type="date"
            value={filters.date}
            onChange={onFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <input
            name="from"
            type="date"
            value={filters.from}
            onChange={onFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <input
            name="to"
            type="date"
            value={filters.to}
            onChange={onFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            <Filter size={16} />
            Apply Filters
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance Settings</h3>
        <p className="mt-1 text-xs text-slate-500">Update the work location for {currentTeam?.name || "your team"}.</p>

        <form onSubmit={saveSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="attendanceRadius"
            type="number"
            min="5"
            value={settings.attendanceRadius}
            onChange={onSettingsChange}
            placeholder="Attendance radius (meters)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <div className="md:col-span-2 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchLocation(e.target.value)}
                placeholder="Search for a location (e.g. Mumbai Airport)"
                className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              {searching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-slate-400" size={16} />}
            </div>

            {suggestions.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            Use Current Location
          </button>

          <div className="grid grid-cols-2 gap-2">
            <input
              name="longitude"
              type="number"
              step="any"
              value={settings.longitude}
              onChange={onSettingsChange}
              placeholder="Longitude"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <input
              name="latitude"
              type="number"
              step="any"
              value={settings.latitude}
              onChange={onSettingsChange}
              placeholder="Latitude"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {settingsError && <p className="md:col-span-2 text-xs font-semibold text-red-600">{settingsError}</p>}
          {settingsMessage && <p className="md:col-span-2 text-xs font-semibold text-emerald-600">{settingsMessage}</p>}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={settingsLoading || !currentTeam}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {settingsLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Team Location
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Records" value={summaryMap.get("Records") || 0} />
        <MetricCard label="Present" value={summaryMap.get("Present") || 0} />
        <MetricCard label="Half Day" value={summaryMap.get("Half Day") || 0} />
        <MetricCard label="Absent" value={summaryMap.get("Absent") || 0} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Attendance Logs</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading team attendance...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No team attendance records found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Member</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Location</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Worked (min)</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Geo Valid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-2 text-slate-700">{record.date}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{record.member}</td>
                    <td className="px-3 py-2 text-slate-700">{record.role}</td>
                    <td className="px-3 py-2 text-slate-700">{record.status}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchInAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(record.punchOutAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatLocation(record)}</td>
                    <td className="px-3 py-2 text-slate-700">{record.workedMinutes || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{formatGeoStatus(record)}</td>
                  </tr>
                ))}
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
