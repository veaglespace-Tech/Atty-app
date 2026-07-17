import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CalendarCheck2, Download, ChevronDown, RefreshCw } from "lucide-react-native";
import { useGetSuperAdminUserAttendanceLogsQuery, useDownloadSuperAdminUserAttendanceExcelMutation } from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

export default function MemberAttendancePage() {
  const { id, memberName, orgName, orgCode } = useLocalSearchParams();
  const { data, isLoading, refetch, isFetching } = useGetSuperAdminUserAttendanceLogsQuery({ userId: id }, { skip: !id || isNaN(Number(id)) });
  const [downloadExcel, { isLoading: isDownloading }] = useDownloadSuperAdminUserAttendanceExcelMutation();

  const handleDownload = async () => {
    try {
      const blob = await downloadExcel({ userId: id }).unwrap();
      await downloadAndShareBlob(blob, `attendance_${memberName || "member"}.xlsx`);
    } catch (err) {
      alert("Failed to download report.");
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard');
    } else {
      router.replace("/super-admin/attendance");
    }
  };

  const logs = data?.items || [];
  const summary = data?.summary || {};

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: 40, paddingBottom: 40 }}>
        {/* Profile Card */}
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 mb-6 flex-col lg:flex-row lg:justify-between lg:items-center gap-6 shadow-sm">
          <View className="flex-row items-center gap-4">
            <Pressable onPress={handleBack} className="flex-row items-center px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-800">
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300 mr-2" />
              <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">Back to Attendance</Text>
            </Pressable>
            <View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1">{memberName || "Member"}</Text>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                MEMBER • {orgName || "Unknown Org"} ({orgCode || "-"})
              </Text>
            </View>
          </View>

          <View className="items-start lg:items-end">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Selected Range</Text>
            <Text className="text-xs font-bold text-slate-400 mb-3">2026-07-01 to 2026-07-14</Text>
            <Pressable 
              onPress={handleDownload}
              disabled={isDownloading}
              className={`bg-blue-500 px-4 py-2.5 rounded-xl flex-row items-center active:bg-blue-600 shadow-sm shadow-blue-500/30 ${isDownloading ? 'opacity-50' : ''}`}
            >
              {isDownloading ? <ActivityIndicator size="small" color="#fff" className="mr-2" /> : <Download size={14} className="text-white mr-2" />}
              <Text className="text-white text-sm font-bold">Download User Report</Text>
              <ChevronDown size={14} className="text-white ml-2" />
            </Pressable>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-col md:flex-row justify-between gap-4 mb-6">
          <View className="flex-1 bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Total Logs</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalLogs || logs.length || 0}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Present Days</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{summary.presentDays || 0}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Half Days</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{summary.halfDays || 0}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Worked Hours</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{summary.workedHours?.toFixed(2) || "0"} hrs</Text>
          </View>
        </View>

        {/* Logs Table */}
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden mb-6">
          <View className="px-5 py-4 border-b border-slate-100 dark:border-[#1E293B] flex-row justify-between items-center">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Daily Attendance Logs ({logs.length} Entries)</Text>
            <Pressable onPress={() => refetch()} className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 active:bg-slate-50 dark:active:bg-slate-800">
              <RefreshCw size={12} className="text-slate-600 dark:text-slate-400 mr-2" />
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Refresh Logs</Text>
            </Pressable>
          </View>

          {isLoading || isFetching ? (
            <View className="p-12 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : logs.length === 0 ? (
            <View className="p-12 items-center justify-center">
              <CalendarCheck2 size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
              <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">No attendance logs found.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="p-5">
                <View className="flex-row items-center pb-3 border-b border-slate-100 dark:border-[#1E293B] min-w-[700px]">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 pr-2">Date</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24">Status</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Punch In</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Punch Out</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-center">Worked Hours</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-right">Geo Valid</Text>
                </View>

                {logs.map((log, idx) => {
                  const isAbsent = log.status === "ABSENT";
                  const isPresent = log.status === "PRESENT";
                  const isHalfDay = log.status === "HALF_DAY";
                  
                  let statusColors = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
                  if (isPresent) statusColors = "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30";
                  if (isAbsent) statusColors = "bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30";
                  if (isHalfDay) statusColors = "bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30";

                  return (
                    <View key={log.id || idx} className="flex-row items-center py-4 border-b border-slate-50 dark:border-[#1E293B]/50 min-w-[700px]">
                      <Text className="text-xs font-bold text-slate-900 dark:text-white w-32 pr-2">
                        {log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : log.date) : "-"}
                      </Text>
                      <View className="w-24">
                        <View className={`px-2.5 py-1 rounded self-start ${statusColors}`}>
                          <Text className={`text-[10px] font-black uppercase tracking-widest ${statusColors.split(' ')[2]} ${statusColors.split(' ')[3]}`}>
                            {log.status || "UNKNOWN"}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-24 text-center">{log.punchIn ? new Date(log.punchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-24 text-center">{log.punchOut ? new Date(log.punchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-32 text-center">{log.workedHours?.toFixed(2) || "0.00"} hrs</Text>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-24 text-right">{log.geoValid === false ? "No" : "Yes"}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
