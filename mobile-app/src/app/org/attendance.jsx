import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, TextInput, Alert, ToastAndroid, Platform, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, CalendarCheck2, Clock, Search, MapPin, Save, Crosshair, ChevronDown, Download, FileBox, FileText } from "lucide-react-native";
import { useGetOrgAttendanceQuery, useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation, useGetOrgTeamsQuery, usePatchOrgTeamMutation, useDownloadOrgAttendancePdfMutation, useDownloadOrgAttendanceExcelMutation } from "@/services/api/orgApi";
import { formatHoursValue } from "@/utils/time";
import { getCurrentLocation } from "@/utils/location";
import { useSelector } from "react-redux";
import { hasPermission, PERMISSIONS } from "@/utils/roles";
import useLocalPagination from "@/hooks/useLocalPagination";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const MetricCard = ({ label, value, bgClass, textClass }) =>
  <View className={`flex-1 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm ${bgClass}`}>
    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{label}</Text>
    <Text className={`text-3xl font-black tracking-tight ${textClass}`}>{value}</Text>
  </View>;


const DropdownFilter = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  
  return (
    <View className="flex-1 min-w-[140px]">
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl active:bg-slate-100 dark:active:bg-slate-800/80">
        <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mr-2" numberOfLines={1}>{selectedLabel}</Text>
        <ChevronDown size={14} className="text-slate-400" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40 dark:bg-black/60" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-t-[32px] pt-4 pb-8 max-h-[80%] border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white px-6 mb-4">{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  className={`px-5 py-4 mb-2 rounded-2xl flex-row items-center justify-between ${value === opt.value ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800'}`}
                >
                  <Text className={`text-[15px] font-bold ${value === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const ExportDropdown = ({ onPdf, onExcel, loadingPdf, loadingExcel }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center gap-2 bg-blue-500 dark:bg-blue-600 px-5 py-2.5 rounded-full shadow-sm shadow-blue-500/20 active:opacity-80">
        <Download size={16} color="#fff" />
        <Text className="text-white text-sm font-bold">Export</Text>
        <ChevronDown size={14} color="#fff" />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40 dark:bg-black/60" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-t-[32px] pt-4 pb-8 max-h-[80%] border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white px-6 mb-4">Export Options</Text>
            <View className="px-4 gap-3">
              <Pressable onPress={() => { setOpen(false); onPdf(); }} disabled={loadingPdf} className="flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {loadingPdf ? <ActivityIndicator size="small" /> : <FileBox size={18} className="text-slate-600 dark:text-slate-400" />}
                <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Export as PDF</Text>
              </Pressable>
              <Pressable onPress={() => { setOpen(false); onExcel(); }} disabled={loadingExcel} className="flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {loadingExcel ? <ActivityIndicator size="small" /> : <FileText size={18} className="text-slate-600 dark:text-slate-400" />}
                <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Export as Excel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

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

  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [searchPlaceTimeout, setSearchPlaceTimeout] = useState(null);

  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedCustomFrom, setAppliedCustomFrom] = useState(customFrom);
  const [appliedCustomTo, setAppliedCustomTo] = useState(customTo);

  const handlePlaceSearch = (text) => {
    setSearchPlace(text);
    if (searchPlaceTimeout) clearTimeout(searchPlaceTimeout);
    
    if (text.length >= 3) {
      setSearchingPlace(true);
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
          const data = await res.json();
          setPlaceSuggestions(data);
        } catch (e) {
          console.error("Place search error", e);
        } finally {
          setSearchingPlace(false);
        }
      }, 500);
      setSearchPlaceTimeout(timeout);
    } else {
      setPlaceSuggestions([]);
    }
  };

  const handleSelectPlace = (loc) => {
    setSearchPlace(loc.display_name);
    setLat(loc.lat);
    setLng(loc.lon);
    setPlaceSuggestions([]);
  };


  const queryString = period === "custom" ? `period=custom&from=${appliedCustomFrom}&to=${appliedCustomTo}` : `period=${period}`;
  const { data, isLoading, isFetching, refetch } = useGetOrgAttendanceQuery(queryString);
  const { data: settingsData, isLoading: loadingSettings, refetch: refetchSettings } = useGetOrgAttendanceSettingsQuery();
  const { data: teamsData } = useGetOrgTeamsQuery("limit=100", { skip: !canManageTeamAttendance });
  
  const [updateSettings, { isLoading: updatingSettings }] = useUpdateOrgAttendanceSettingsMutation();
  const [patchTeamMutation, { isLoading: updatingTeam }] = usePatchOrgTeamMutation();
  const [downloadOrgAttendancePdf, { isLoading: downloadingPdf }] = useDownloadOrgAttendancePdfMutation();
  const [downloadOrgAttendanceExcel, { isLoading: downloadingExcel }] = useDownloadOrgAttendanceExcelMutation();

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
      <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organization Attendance</Text>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
          Configure organization geofence and monitor team attendance logs.
        </Text>
        
        <View className="flex-row gap-2 flex-wrap">
          <ExportDropdown 
            loadingPdf={downloadingPdf} 
            loadingExcel={downloadingExcel}
            onPdf={async () => {
              try {
                const blob = await downloadOrgAttendancePdf(queryString).unwrap();
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result.split(',')[1];
                    const filename = `attendance-report-${period}.pdf`;
                    const uri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Success", "PDF downloaded successfully.");
                    }
                  } catch (e) {
                    Alert.alert("Error", "Failed to save PDF to device.");
                  }
                };
                reader.readAsDataURL(blob);
              } catch (e) { Alert.alert("Error", "Failed to download PDF"); }
            }}
            onExcel={async () => {
              try {
                const blob = await downloadOrgAttendanceExcel(queryString).unwrap();
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result.split(',')[1];
                    const filename = `attendance-report-${period}.xlsx`;
                    const uri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Success", "Excel downloaded successfully.");
                    }
                  } catch (e) {
                    Alert.alert("Error", "Failed to save Excel to device.");
                  }
                };
                reader.readAsDataURL(blob);
              } catch (e) { Alert.alert("Error", "Failed to download Excel"); }
            }}
          />
          <Pressable 
            onPress={handleRefresh}
            className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full active:opacity-80"
          >
            <RefreshControl refreshing={isFetching || loadingSettings} style={{display: 'none'}} />
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-bold">Refresh</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 24 }}
        refreshControl={
          <RefreshControl refreshing={isFetching || loadingSettings} onRefresh={handleRefresh} tintColor="#2563eb" />
        }
      >
        {/* FILTERS */}
        <View className="mt-6 mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-6 p-5">
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[140px]">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Filter By Status</Text>
              <DropdownFilter
                label="All Statuses"
                value={statusFilter}
                onSelect={setStatusFilter}
                options={[
                  { label: "All Statuses", value: "ALL" },
                  { label: "Present", value: "PRESENT" },
                  { label: "Absent", value: "ABSENT" },
                  { label: "Half Day", value: "HALF_DAY" }
                ]}
              />
            </View>
            
            <View className="flex-[1.5] min-w-[200px]">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Report Period</Text>
              <View className="flex-row gap-2">
                <Pressable 
                  onPress={() => setPeriod('custom')} 
                  className={`px-4 py-3.5 rounded-xl border flex-row items-center justify-center ${period === 'custom' ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 active:bg-slate-100 dark:active:bg-slate-800'}`}
                >
                  <Text className={`text-[11px] font-black uppercase tracking-widest ${period === 'custom' ? 'text-white' : 'text-slate-700 dark:text-slate-400'}`}>Custom</Text>
                </Pressable>
                <View className="flex-1">
                  <DropdownFilter
                    label="Standard Periods"
                    value={period}
                    onSelect={setPeriod}
                    options={[
                      { label: "Weekly", value: "weekly" },
                      { label: "Monthly", value: "monthly" }
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
          <View className="mt-4">
             <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Search Member</Text>
             <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3">
               <Search size={16} className="text-slate-400" />
               <TextInput
                 value={search} onChangeText={setSearch} placeholder="Name or email..." placeholderTextColor="#94a3b8"
                 className="flex-1 ml-3 text-[13px] font-semibold text-slate-900 dark:text-white outline-none"
               />
             </View>
          </View>
          {period === 'custom' && (
            <View className="mt-4 flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">From Date</Text>
                  <TextInput 
                    value={customFrom} onChangeText={setCustomFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3.5 text-[13px] font-semibold text-slate-900 dark:text-white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">To Date</Text>
                  <TextInput 
                    value={customTo} onChangeText={setCustomTo} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3.5 text-[13px] font-semibold text-slate-900 dark:text-white"
                  />
                </View>
              </View>
              <Pressable 
                onPress={() => { setAppliedCustomFrom(customFrom); setAppliedCustomTo(customTo); }}
                className="bg-blue-600 rounded-xl py-3.5 items-center justify-center active:opacity-80"
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Apply Dates</Text>
              </Pressable>
            </View>
          )}

        </View>
        {/* SUMMARY CARDS */}
        <View className="mx-4 flex-row flex-wrap justify-between mb-6 gap-y-3">
          <View className="w-[48%]">
            <MetricCard label="Records" value={getSummaryValue("Total Logs")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Present" value={getSummaryValue("Present")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Half Day" value={getSummaryValue("Half Day") || 0} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Absent" value={getSummaryValue("Absent")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
        </View>

        {/* SETTINGS */}
        {(canSetWorkspaceLocation || canManageTeamAttendance) && (
          <>
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 mx-6 mt-2">Attendance Settings</Text>
            <View className="mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200 dark:border-slate-800/80 mb-6">
              
              <View className="flex-col gap-4 mb-4">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Select Team</Text>
                  <View className={!canManageTeamAttendance ? 'opacity-50' : ''} pointerEvents={!canManageTeamAttendance ? 'none' : 'auto'}>
                    <DropdownFilter
                      label="Organization-wide Geofence"
                      value={teamId}
                      onSelect={setTeamId}
                      options={[
                        { label: "Organization-wide Geofence", value: "" },
                        ...teams.map(t => ({ label: t.name, value: t.id.toString() }))
                      ]}
                    />
                  </View>
                </View>
                
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Geofence Radius (meters)</Text>
                  <TextInput 
                    value={geofenceRadius}
                    onChangeText={setGeofenceRadius}
                    keyboardType="numeric"
                    placeholder="e.g. 50"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Search Location</Text>
                <View className="relative">
                  <Search size={16} className="absolute left-4 top-3.5 text-slate-400 z-10" />
                  <TextInput 
                    value={searchPlace}
                    onChangeText={handlePlaceSearch}
                    placeholder="e.g. Pune Station"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                  {searchingPlace && <ActivityIndicator size="small" color="#94a3b8" className="absolute right-4 top-3.5" />}
                </View>
                
                {placeSuggestions.length > 0 && (
                  <View className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                    {placeSuggestions.map((loc, i) => (
                      <Pressable 
                        key={i} 
                        onPress={() => handleSelectPlace(loc)}
                        className={`px-4 py-3.5 active:bg-slate-50 dark:active:bg-slate-700/50 ${i !== placeSuggestions.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}
                      >
                        <Text className="text-[13px] font-semibold text-slate-900 dark:text-white" numberOfLines={2}>
                          {loc.display_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <Pressable 
                onPress={handleUseCurrentLocation}
                disabled={!canSetWorkspaceLocation && !(canManageTeamAttendance && !!teamId)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 py-3.5 mb-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <Crosshair size={16} className="text-slate-600 dark:text-slate-400" />
                <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Use My Current Location</Text>
              </Pressable>

              <View className="flex-row gap-4 mb-6">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Latitude</Text>
                  <TextInput 
                    value={lat}
                    onChangeText={setLat}
                    keyboardType="numeric"
                    placeholder="Lat"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Longitude</Text>
                  <TextInput 
                    value={lng}
                    onChangeText={setLng}
                    keyboardType="numeric"
                    placeholder="Lng"
                    placeholderTextColor="#94a3b8"
                    editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleSaveSettings}
                disabled={updatingSettings || updatingTeam || (!canSetWorkspaceLocation && !teamId)}
                className="w-full bg-blue-600 py-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
              >
                {(updatingSettings || updatingTeam) ? <ActivityIndicator size="small" color="#ffffff" /> : <Save size={18} className="text-white" />}
                <Text className="text-[15px] font-bold text-white">Save Location Settings</Text>
              </Pressable>

            </View>
          </>
        )}

        {/* LOGS */}
        <View className="mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-8">
          <View className="px-5 pt-5 pb-3">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Attendance Logs</Text>
          </View>
          
          <View className="px-5 pb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Showing {records.length > 0 ? `${startIndex}-${endIndex} of ${records.length}` : '0'} attendance records
            </Text>
          </View>
          
          <View className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 p-5">

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
            {paginatedItems.map((record) => (
              <Pressable 
                key={record.id} 
                onPress={() => router.push(`/org/attendance/${record.id}`)}
                className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
              >
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
              </Pressable>
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
                    <View className="bg-[#1e293b] rounded-lg border border-[#334155] px-3 py-1.5 flex-row items-center">
                      <Text className="text-xs font-bold text-slate-300">{pageSize.toString()}</Text>
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
      
          </View>
        </View>
      </ScrollView>
    </View>
  );
}