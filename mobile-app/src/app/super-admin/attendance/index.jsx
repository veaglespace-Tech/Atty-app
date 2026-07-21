import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Modal, TextInput, TouchableOpacity, Platform, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { ChevronLeft, CalendarCheck2, Clock, MapPin, Building2, Search, Download, ChevronDown, ChevronRight } from "lucide-react-native";
import { useGetSuperAdminAttendanceReportsQuery, useGetSuperAdminOrganizationsQuery, useDownloadSuperAdminAttendanceReportsExcelMutation } from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [selectedOrg, setSelectedOrg] = useState({ id: null, label: "All Organizations" });
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("MONTHLY");

  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isRowsModalOpen, setIsRowsModalOpen] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const { data: orgData } = useGetSuperAdminOrganizationsQuery({ limit: 100 });
  
  const uniqueOrgs = useMemo(() => {
    const list = [{ id: null, label: "All Organizations" }];
    if (orgData?.items) {
      orgData.items.forEach(org => list.push({ id: org.id, label: `${org.name} (${org.code})` }));
    }
    return list;
  }, [orgData]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInputValue]);

  const queryStr = useMemo(() => {
    const params = [];
    if (selectedOrg.id) params.push(`orgId=${selectedOrg.id}`);
    if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    if (selectedPeriod === "CUSTOM") {
      params.push(`period=custom`);
      if (customRange.from) params.push(`from=${customRange.from}`);
      if (customRange.to) params.push(`to=${customRange.to}`);
    } else {
      params.push(`period=${selectedPeriod.toLowerCase()}`);
    }
    return params.join("&");
  }, [selectedOrg, searchQuery, selectedPeriod]);

  const shouldSkipQuery = selectedPeriod === "CUSTOM" && (!customRange.from || !customRange.to);
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminAttendanceReportsQuery(queryStr, {
    skip: shouldSkipQuery,
  });

  const [downloadReportsExcel, { isLoading: downloadingExcel }] = useDownloadSuperAdminAttendanceReportsExcelMutation();

  const handleDownload = async () => {
    if (shouldSkipQuery) {
      Alert.alert("Invalid Range", "Custom reports require both from and to dates.");
      return;
    }
    try {
      const blob = await downloadReportsExcel(queryStr).unwrap();
      await downloadAndShareBlob(blob, "super-admin-attendance-reports.xlsx");
    } catch (err) {
      Alert.alert("Download Failed", err?.data?.message || "There was an error downloading the reports.");
    }
  };

  const reports = useMemo(() => {
    if (shouldSkipQuery) return [];
    return data?.items || [];
  }, [data, shouldSkipQuery]);

  const summary = useMemo(() => {
    if (shouldSkipQuery) return [];
    return data?.summary || [];
  }, [data, shouldSkipQuery]);

  const totalPages = Math.ceil(reports.length / rowsPerPage) || 1;
  const currentReports = reports.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const getSummaryValue = (label) => {
    const item = summary.find(s => s.label === label);
    return item ? item.value : 0;
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Platform Attendance Reports</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* Top Header Section */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Generate and export workforce attendance summaries across all organizations or filter by a specific organization.
          </Text>
          
          <View className="flex-row items-center justify-between mb-4">
            <Pressable className="flex-row items-center gap-2 bg-white dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-800">
              <Clock size={16} className="text-slate-500" />
              <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Refresh</Text>
            </Pressable>
            <Pressable 
              onPress={handleDownload}
              disabled={downloadingExcel}
              className={`flex-row items-center gap-2 bg-blue-500 px-4 py-2.5 rounded-xl active:bg-blue-600 shadow-sm shadow-blue-500/30 ${downloadingExcel ? 'opacity-50' : ''}`}
            >
              {downloadingExcel ? <ActivityIndicator size="small" color="#ffffff" /> : <Download size={16} className="text-white" />}
              <Text className="text-sm font-bold text-white">Download Reports</Text>
            </Pressable>
          </View>

          <View className="bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <View className="z-50">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Filter By Organization</Text>
              <Pressable 
                onPress={() => setIsOrgModalOpen(true)}
                className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
              >
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300" numberOfLines={1}>{selectedOrg.label}</Text>
                <ChevronDown size={16} className="text-slate-400" />
              </Pressable>
            </View>
            
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Search Member</Text>
              <View className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
                <Search size={16} className="text-slate-400 ml-1" />
                <TextInput
                  value={searchInputValue}
                  onChangeText={setSearchInputValue}
                  onSubmitEditing={() => {
                    setSearchQuery(searchInputValue);
                    setPage(1);
                  }}
                  placeholder="Name or email..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 h-8"
                  returnKeyType="search"
                />
              </View>
            </View>

            <View className="flex-row items-center justify-between pt-2">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Report Period</Text>
                <Pressable 
                  onPress={() => setSelectedPeriod("CUSTOM")}
                  className={`px-3 py-1.5 rounded-lg border self-start ${selectedPeriod === "CUSTOM" ? 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                >
                  <Text className={`text-[10px] font-bold ${selectedPeriod === "CUSTOM" ? 'text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-400'}`}>CUSTOM</Text>
                </Pressable>
              </View>
              <Pressable 
                onPress={() => setIsPeriodModalOpen(true)}
                className={`px-3 py-1.5 rounded-lg border mt-4 flex-row items-center gap-1 ${selectedPeriod !== "CUSTOM" ? 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
              >
                <Text className={`text-xs font-bold ${selectedPeriod !== "CUSTOM" ? 'text-white dark:text-slate-950' : 'text-slate-700 dark:text-slate-300'}`}>{selectedPeriod !== "CUSTOM" ? selectedPeriod : "PERIODS"}</Text>
                <ChevronDown size={14} className={selectedPeriod !== "CUSTOM" ? 'text-white dark:text-slate-950' : 'text-slate-400'} />
              </Pressable>
            </View>

            {selectedPeriod === "CUSTOM" && (
              <View className="flex-row items-center gap-4 pt-2">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">From Date</Text>
                  <Pressable
                    onPress={() => setShowFromPicker(true)}
                    className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 h-10 justify-center"
                  >
                    <Text className={`text-sm font-semibold ${customRange.from ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                      {customRange.from || "YYYY-MM-DD"}
                    </Text>
                  </Pressable>
                  {showFromPicker && (
                    <DateTimePicker
                      value={customRange.from ? new Date(customRange.from) : new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowFromPicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          const dateStr = selectedDate.toISOString().split('T')[0];
                          setCustomRange(prev => ({ ...prev, from: dateStr }));
                          if (Platform.OS === 'android') setShowFromPicker(false);
                        } else {
                           setShowFromPicker(false);
                        }
                      }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">To Date</Text>
                  <Pressable
                    onPress={() => setShowToPicker(true)}
                    className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 h-10 justify-center"
                  >
                    <Text className={`text-sm font-semibold ${customRange.to ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                      {customRange.to || "YYYY-MM-DD"}
                    </Text>
                  </Pressable>
                  {showToPicker && (
                    <DateTimePicker
                      value={customRange.to ? new Date(customRange.to) : new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowToPicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          const dateStr = selectedDate.toISOString().split('T')[0];
                          setCustomRange(prev => ({ ...prev, to: dateStr }));
                          if (Platform.OS === 'android') setShowToPicker(false);
                        } else {
                           setShowToPicker(false);
                        }
                      }}
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        {!isLoading && reports.length > 0 && (
          <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
            <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Platform Members</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Members")}</Text>
            </View>
            <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Present Days</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Present Days")}</Text>
            </View>
            <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Absent Days</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Absent Days")}</Text>
            </View>
            <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Worked Hours</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Worked Hrs")} hrs</Text>            </View>
          </View>
        )}

        {isLoading && reports.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : reports.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <CalendarCheck2 size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center">No Attendance Records</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no attendance records for the selected period.
            </Text>
          </View>
        ) : (
          <>
            <View className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
              <View className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex-row justify-between items-center">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform Report Records</Text>
              <Text className="text-[10px] font-medium text-slate-400">Range: 2026-07-01 to 2026-07-13</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="p-5">
                {/* Table Header */}
                <View className="flex-row items-center pb-3 border-b border-slate-100 dark:border-slate-800/50 min-w-[800px]">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-48 pr-2">Member</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-48 pr-2">Organization</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Role</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Present</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Half Day</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Absent</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-right">Worked Hours</Text>                </View>

                {/* Table Rows */}
                {currentReports.map((report, index) => {
                  const targetId = report.id || report.userId || report._id || 'unknown';
                  return (
                  <Pressable 
                    key={targetId !== 'unknown' ? targetId : index} 
                    onPress={() => router.push(`/super-admin/attendance/member/${targetId}?memberName=${encodeURIComponent(report.member || "")}&orgName=${encodeURIComponent(report.orgName || "")}&orgCode=${encodeURIComponent(report.orgCode || "")}`)}
                    className="flex-row items-center py-4 border-b border-slate-50 dark:border-slate-800/30 min-w-[800px] active:bg-slate-50 dark:active:bg-slate-800/50"
                  >
                    <View className="w-48 pr-2">
                      <Text className="text-xs font-bold text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>{report.member}</Text>
                      <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>{report.email}</Text>
                    </View>
                    <View className="w-48 pr-2">
                      <Text className="text-xs font-bold text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>{report.orgName}</Text>
                      <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>{report.orgCode}</Text>
                    </View>
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32">{report.role}</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-24 text-center">{report.presentDays}</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-24 text-center">{report.halfDays}</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-24 text-center">{report.absentDays}</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-32 text-right">{report.workedHours?.toFixed(2) || "0.00"} hrs</Text>
                  </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

            {/* Pagination Controls */}
            {/* Pagination Controls */}
            {reports.length > 0 && (
              <View className="mt-4 bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex-col md:flex-row md:items-center justify-between gap-4">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Page View</Text>
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Showing {reports.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, reports.length)} of {reports.length} entries
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-medium text-slate-500">Rows</Text>
                    <Pressable 
                      onPress={() => setIsRowsModalOpen(true)}
                      className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{rowsPerPage}</Text>
                    </Pressable>
                  </View>

                  <View className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  <View className="flex-row items-center gap-2">
                    <Pressable 
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === 1 ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                    >
                      <ChevronLeft size={14} className={page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                      <Text className={`text-xs font-bold ${page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Prev</Text>
                    </Pressable>

                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2">
                      {page} / {totalPages}
                    </Text>

                    <Pressable 
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === totalPages ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                    >
                      <Text className={`text-xs font-bold ${page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Next</Text>
                      <ChevronRight size={14} className={page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Rows Per Page Modal */}
      <Modal visible={isRowsModalOpen} transparent animationType="fade" onRequestClose={() => {}}>
        <Pressable 
          className="flex-1 bg-black/50 justify-center p-6" 
          onPress={() => setIsRowsModalOpen(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
            <View className="p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-black text-slate-900 dark:text-white">Rows Per Page</Text>
            </View>
            <View className="p-2">
              {[10, 25, 50].map((rows) => (
                <TouchableOpacity
                  key={rows}
                  className={`p-4 rounded-xl mb-1 flex-row items-center justify-between ${rowsPerPage === rows ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  onPress={() => {
                    setRowsPerPage(rows);
                    setIsRowsModalOpen(false);
                    setPage(1);
                  }}
                >
                  <Text className={`text-sm font-semibold ${rowsPerPage === rows ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{rows} Rows</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Organizations Modal */}
      <Modal visible={isOrgModalOpen} transparent animationType="fade" onRequestClose={() => {}}>
        <Pressable 
          className="flex-1 bg-black/50 justify-center p-6" 
          onPress={() => setIsOrgModalOpen(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-h-[70%] border border-slate-200 dark:border-slate-800 shadow-xl">
            <View className="p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-black text-slate-900 dark:text-white">Select Organization</Text>
            </View>
            <ScrollView className="p-2">
              {uniqueOrgs.map((org, index) => (
                <TouchableOpacity
                  key={org.id || index}
                  className={`p-4 rounded-xl mb-1 flex-row items-center justify-between ${selectedOrg.id === org.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  onPress={() => {
                    setSelectedOrg(org);
                    setIsOrgModalOpen(false);
                    setPage(1);
                  }}
                >
                  <Text className={`text-sm font-semibold ${selectedOrg.id === org.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{org.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Period Modal */}
      <Modal visible={isPeriodModalOpen} transparent animationType="fade" onRequestClose={() => {}}>
        <Pressable 
          className="flex-1 bg-black/50 justify-center p-6" 
          onPress={() => setIsPeriodModalOpen(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
            <View className="p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-black text-slate-900 dark:text-white">Select Period</Text>
            </View>
            <View className="p-2">
              {['DAILY', 'WEEKLY', 'MONTHLY'].map((period) => (
                <TouchableOpacity
                  key={period}
                  className={`p-4 rounded-xl mb-1 flex-row items-center justify-between ${selectedPeriod === period ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setIsPeriodModalOpen(false);
                    setPage(1);
                  }}
                >
                  <Text className={`text-sm font-semibold ${selectedPeriod === period ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{period}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}