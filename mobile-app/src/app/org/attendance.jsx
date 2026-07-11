import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, TextInput, Alert, ToastAndroid, Platform } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, CalendarCheck2, Clock, Search, MapPin, Save, Crosshair, ChevronDown } from "lucide-react-native";
import { useGetOrgAttendanceQuery, useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation, useGetOrgTeamsQuery, usePatchOrgTeamMutation } from "@/services/api/orgApi";
import { formatHoursValue } from "@/utils/time";
import { getCurrentLocation } from "@/utils/location";
import { useSelector } from "react-redux";
import { hasPermission, PERMISSIONS } from "@/utils/roles";
import useLocalPagination from "@/hooks/useLocalPagination";

const MetricCard = ({ label, value, bgClass, textClass }) =>
  <View className={`flex-1 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm ${bgClass}`}>
    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{label}</Text>
    <Text className={`text-3xl font-black tracking-tight ${textClass}`}>{value}</Text>
  </View>;

export default function OrgAttendancePage() {
  const authUser = useSelector((state) => state.auth.user);
  const canSetWorkspaceLocation = hasPermission(authUser, PERMISSIONS.LOCATION_SET);
  const canManageTeamAttendance = hasPermission(authUser, PERMISSIONS.ATTENDANCE_MANAGE);

  const [period, setPeriod] = useState("monthly");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [teamId, setTeamId] = useState("");
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [searchPlace, setSearchPlace] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetOrgAttendanceQuery(`period=${period}`);
  const { data: settingsData, isLoading: loadingSettings, refetch: refetchSettings } = useGetOrgAttendanceSettingsQuery();
  const { data: teamsData } = useGetOrgTeamsQuery("limit=100", { skip: !canManageTeamAttendance });
  
  const [updateSettings, { isLoading: updatingSettings }] = useUpdateOrgAttendanceSettingsMutation();
  const [patchTeamMutation, { isLoading: updatingTeam }] = usePatchOrgTeamMutation();

  const teams = teamsData?.items || [];

  const [geofenceRadius, setGeofenceRadius] = useState("50");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    if (!teamId) {
      if (settingsData?.settings) {
        setGeofenceRadius(settingsData.settings.radius?.toString() || settingsData.settings.attendanceRadius?.toString() || "50");
        setLat(settingsData.settings.latitude?.toString() || (Array.isArray(settingsData.settings.location) ? settingsData.settings.location[1]?.toString() : ""));
        setLng(settingsData.settings.longitude?.toString() || (Array.isArray(settingsData.settings.location) ? settingsData.settings.location[0]?.toString() : ""));
      }
    } else {
      const t = teams.find(t => t.id.toString() === teamId);
      if (t) {
        setGeofenceRadius(t.attendanceRadius?.toString() || "25");
        setLat(t.latitude?.toString() || "");
        setLng(t.longitude?.toString() || "");
      }
    }
  }, [settingsData, teamId, teams]);

  const rawRecords = data?.items || [];
  const summary = data?.summary || [];

  const records = rawRecords.filter(r => {
    const matchesSearch = !search || r.member?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSummaryValue = (label) => {
    const item = summary.find((s) => s.label === label);
    return item ? item.value : 0;
  };

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(records, { initialPageSize: 10, dependencies: [search, statusFilter, period] });

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    if (status === "PRESENT") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    if (status === "ABSENT") return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50";
    if (status === "HALF_DAY") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
    return "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800/50";
  };

  const handleUseCurrentLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setLat(loc.latitude.toString());
      setLng(loc.longitude.toString());
      if (Platform.OS === 'android') ToastAndroid.show("Location fetched", ToastAndroid.SHORT);
    } catch (error) {
      Alert.alert("Location Error", error.message || "Failed to get location");
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (teamId) {
        await patchTeamMutation({
          teamId,
          attendanceRadius: Number(geofenceRadius),
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
        }).unwrap();
      } else {
        await updateSettings({
          radius: Number(geofenceRadius),
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          coordinates: lng && lat ? [Number(lng), Number(lat)] : null,
        }).unwrap();
      }
      if (Platform.OS === 'android') ToastAndroid.show("Settings saved", ToastAndroid.SHORT);
      refetchSettings();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || error?.message || "Failed to save settings");
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchSettings();
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Attendance Records</Text>
        </View>
        <Text className="text-xs font-semibold text-slate-500 text-center mb-2">Configure organization geofence and monitor team attendance logs.</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isFetching || loadingSettings} onRefresh={handleRefresh} tintColor="#2563eb" />
        }
      >
        {/* FILTERS */}
        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 mb-6">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Filters</Text>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700 mb-3">
            <Search size={16} className="text-slate-400" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search member..."
              placeholderTextColor="#94a3b8"
              className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
            />
          </View>
          <View className="flex-row gap-2">
            <Pressable 
              onPress={() => setStatusFilter(statusFilter === "ALL" ? "PRESENT" : "ALL")}
              className={`flex-1 py-2.5 rounded-lg border ${statusFilter === "PRESENT" ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'} items-center`}
            >
              <Text className={`text-[10px] font-bold ${statusFilter === "PRESENT" ? 'text-blue-800' : 'text-slate-600 dark:text-slate-400'}`}>Status: {statusFilter}</Text>
            </Pressable>
            <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {["weekly", "monthly"].map((p) =>
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md justify-center ${period === p ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                >
                  <Text className={`text-[10px] font-bold uppercase tracking-wider ${period === p ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {p}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <MetricCard
            label="Records"
            value={getSummaryValue("Total Logs")}
            bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-[#1e3a8a]/30"
            textClass="text-white"
          />
          <MetricCard
            label="Present"
            value={getSummaryValue("Present")}
            bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-[#1e3a8a]/30"
            textClass="text-white"
          />
        </View>
        <View className="flex-row flex-wrap justify-between mb-6">
          <MetricCard
            label="Half Day"
            value={getSummaryValue("Half Day") || 0}
            bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-[#1e3a8a]/30"
            textClass="text-white"
          />
          <MetricCard
            label="Absent"
            value={getSummaryValue("Absent")}
            bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-[#1e3a8a]/30"
            textClass="text-white"
          />
        </View>

        {/* SETTINGS */}
        {(canSetWorkspaceLocation || canManageTeamAttendance) && (
          <>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Attendance Settings</Text>
            <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 mb-6 relative">
              
              <View className="flex-row gap-3 mb-4 z-50">
                <View className="flex-[2] relative">
                  <Pressable 
                    onPress={() => setShowTeamMenu(!showTeamMenu)}
                    disabled={!canManageTeamAttendance}
                    className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex-row items-center justify-between ${!canManageTeamAttendance ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                      {teamId ? (teams.find(t => t.id.toString() === teamId)?.name || 'Unknown Team') : 'Organization-wide Geofence'}
                    </Text>
                    {canManageTeamAttendance && <ChevronDown size={14} className="text-slate-400 ml-2 shrink-0" />}
                  </Pressable>
                  
                  {showTeamMenu && (
                    <View className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden z-50 shadow-lg max-h-48">
                      <ScrollView nestedScrollEnabled={true}>
                        <Pressable 
                          onPress={() => { setTeamId(""); setShowTeamMenu(false); }}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700"
                        >
                          <Text className="text-sm font-semibold text-slate-900 dark:text-white">Organization-wide Geofence</Text>
                        </Pressable>
                        {teams.map(t => (
                          <Pressable 
                            key={t.id}
                            onPress={() => { setTeamId(t.id.toString()); setShowTeamMenu(false); }}
                            className="px-4 py-3 border-b border-slate-100 dark:border-slate-700"
                          >
                            <Text className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <View className="flex-1">
                  <TextInput 
                    value={geofenceRadius}
                    onChangeText={setGeofenceRadius}
                    keyboardType="numeric"
                    placeholder="Radius"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white h-full"
                  />
                </View>
              </View>

              <View className="relative mb-4 z-40">
                <Search size={16} className="absolute left-4 top-3.5 text-slate-400 z-10" />
                <TextInput 
                  value={searchPlace}
                  onChangeText={setSearchPlace}
                  placeholder="Search for a place (e.g. Pune Station)"
                  placeholderTextColor="#94a3b8"
                  editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              <View className="flex-row gap-3 mb-6 z-30">
                <Pressable 
                  onPress={handleUseCurrentLocation}
                  disabled={!canSetWorkspaceLocation && !(canManageTeamAttendance && !!teamId)}
                  className="flex-[2] bg-slate-50 dark:bg-slate-800/50 py-3 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70 border border-slate-200 dark:border-slate-700"
                >
                  <Crosshair size={14} className="text-slate-600 dark:text-slate-400" />
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Use Current Location</Text>
                </Pressable>

                <View className="flex-1">
                  <TextInput 
                    value={lat}
                    onChangeText={setLat}
                    keyboardType="numeric"
                    placeholder="Latitude"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white h-full"
                  />
                </View>
              </View>

              <View className="flex-row gap-3 mb-6 z-20">
                <View className="flex-1">
                  <TextInput 
                    value={lng}
                    onChangeText={setLng}
                    keyboardType="numeric"
                    placeholder="Longitude"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </View>
                <View className="flex-1 items-end justify-center">
                  <Pressable 
                    onPress={handleSaveSettings}
                    disabled={updatingSettings || updatingTeam}
                    className="bg-blue-600 py-3.5 px-6 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70 disabled:opacity-50"
                  >
                    {(updatingSettings || updatingTeam) ? <ActivityIndicator size="small" color="#ffffff" /> : <Save size={16} className="text-white" />}
                    <Text className="text-sm font-bold text-white">Save Settings</Text>
                  </Pressable>
                </View>
              </View>

            </View>
          </>
        )}

        {/* LOGS */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Attendance Logs</Text>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : records.length === 0 ? (
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <CalendarCheck2 size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 dark:text-slate-400 font-medium">No attendance logs found.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {records.map((record) => (
              <View key={record.id} className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {record.member || "Unknown"}
                    </Text>
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      {record.date || "-"}
                    </Text>
                  </View>
                  <View className={`px-3 py-1.5 rounded-full border ${getStatusColor(record.status)}`}>
                    <Text className="text-[10px] font-black uppercase tracking-[0.15em]">
                      {record.status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Punch In</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={14} className="text-blue-500" />
                      <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300" numberOfLines={1} adjustsFontSizeToFit>
                        {record.punchInAt ? formatTime(record.punchInAt) : "-"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Punch Out</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={14} className="text-purple-500" />
                      <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300" numberOfLines={1} adjustsFontSizeToFit>
                        {record.punchOutAt ? formatTime(record.punchOutAt) : "-"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Hrs</Text>
                    <Text className="text-base font-black text-slate-900 dark:text-white">
                      {formatHoursValue(record.workedHours ?? record.workedMinutes, { fromMinutes: record.workedHours == null })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {totalPages > 1 && (
              <View className="bg-[#0f172a] dark:bg-[#0f172a] rounded-[24px] p-5 mt-2 flex-col gap-4 shadow-sm shadow-slate-200 dark:shadow-none border border-[#1e293b]">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
                  <Text className="text-xs font-semibold text-slate-300">
                    Showing {startIndex}-{endIndex} of {records.length} records
                  </Text>
                </View>
                
                <View className="flex-row flex-wrap items-center justify-between gap-4">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-semibold text-slate-400">Rows</Text>
                    <View className="bg-[#1e293b] rounded-lg border border-[#334155] px-2 py-1 flex-row items-center">
                      <TextInput 
                        value={pageSize.toString()}
                        editable={false}
                        className="text-xs font-bold text-slate-300 px-2"
                      />
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable 
                      onPress={() => setPage(page - 1)}
                      disabled={page === 1}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-[#334155] ${page === 1 ? 'opacity-40' : 'active:bg-[#1e293b]'}`}
                    >
                      <ChevronLeft size={14} className="text-slate-300" />
                      <Text className="text-xs font-bold text-slate-300">Prev</Text>
                    </Pressable>

                    <Text className="text-xs font-bold text-white px-2">
                      {page} / {totalPages}
                    </Text>

                    <Pressable 
                      onPress={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-[#334155] ${page === totalPages ? 'opacity-40' : 'active:bg-[#1e293b]'}`}
                    >
                      <Text className="text-xs font-bold text-slate-300">Next</Text>
                      <ChevronRight size={14} className="text-slate-300" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}