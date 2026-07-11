import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CalendarCheck2, Clock, MapPin, Building2 } from "lucide-react-native";
import { useGetSuperAdminAttendanceReportsQuery } from "@/services/api/superAdminApi";

export default function AttendancePage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminAttendanceReportsQuery("");

  const reports = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(() => data?.summary || [], [data]);

  const getSummaryValue = (label) => {
    const item = summary.find(s => s.label === label);
    return item ? item.value : 0;
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Global Attendance</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* Stats Row */}
        {!isLoading && reports.length > 0 && (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Present</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Present Days")}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Half Days</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Half Days")}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Total Hrs</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Worked Hrs")}</Text>
            </View>
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
          <View className="space-y-4">
            {reports.map((report, index) => (
              <View key={report.userId || index} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-black text-slate-900 dark:text-white">{report.member}</Text>
                    <Text className="text-xs font-semibold text-slate-500">{report.email}</Text>
                  </View>
                  <View className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      {report.role}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 mb-4 bg-indigo-50 dark:bg-indigo-900/10 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                  <Building2 size={14} className="text-indigo-500" />
                  <Text className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    {report.orgName} ({report.orgCode})
                  </Text>
                </View>
                
                <View className="flex-row justify-between pt-2">
                  <View className="items-center flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Present</Text>
                    <Text className="text-base font-bold text-emerald-600 dark:text-emerald-400">{report.presentDays}</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Absent</Text>
                    <Text className="text-base font-bold text-rose-600 dark:text-rose-400">{report.absentDays}</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Half Day</Text>
                    <Text className="text-base font-bold text-amber-600 dark:text-amber-400">{report.halfDays}</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Hours</Text>
                    <Text className="text-base font-bold text-blue-600 dark:text-blue-400">{report.workedHours?.toFixed(1) || 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}