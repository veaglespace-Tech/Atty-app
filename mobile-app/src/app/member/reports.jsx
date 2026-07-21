<<<<<<< HEAD
import TeamLeaderReportsPage from "../team-leader/reports";
export default TeamLeaderReportsPage;
=======
import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, FileBarChart, Clock, CalendarDays, CheckCircle2, XCircle } from "lucide-react-native";
import { useGetMemberAttendanceQuery } from "@/services/api/memberApi";

const formatHoursValue = (val) => {
  if (val == null) return "-";
  return typeof val === "number" ? val.toFixed(2) : String(val);
};

export default function ReportsPage() {
  const { data: attendanceData, isLoading } = useGetMemberAttendanceQuery({ limit: 30 });
  const logs = Array.isArray(attendanceData?.items) ? attendanceData.items : [];
  const meta = attendanceData?.meta || {};

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Native-style App Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <Pressable 
          onPress={() => router.back()} 
          className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900/80 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-95"
        >
          <ChevronLeft size={22} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Reports</Text>
        <View className="w-11" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Native Widget-like Metric Cards */}
          <View className="flex-row flex-wrap justify-between mb-8">
            <View className="w-[48%] bg-emerald-50 dark:bg-emerald-900/20 rounded-[28px] p-5 mb-4 border border-emerald-100 dark:border-emerald-800/50">
              <Text className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-1">Present</Text>
              <Text className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{meta.presentDays || 0}</Text>
            </View>
            <View className="w-[48%] bg-rose-50 dark:bg-rose-900/20 rounded-[28px] p-5 mb-4 border border-rose-100 dark:border-rose-800/50">
              <Text className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest mb-1">Absent</Text>
              <Text className="text-3xl font-black text-rose-700 dark:text-rose-300">{meta.absentDays || 0}</Text>
            </View>
            <View className="w-[48%] bg-amber-50 dark:bg-amber-900/20 rounded-[28px] p-5 border border-amber-100 dark:border-amber-800/50">
              <Text className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-1">Half Day</Text>
              <Text className="text-3xl font-black text-amber-700 dark:text-amber-300">{meta.halfDays || 0}</Text>
            </View>
            <View className="w-[48%] bg-blue-50 dark:bg-blue-900/20 rounded-[28px] p-5 border border-blue-100 dark:border-blue-800/50">
              <Text className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-1">Worked Hrs</Text>
              <Text className="text-3xl font-black text-blue-700 dark:text-blue-300">{formatHoursValue(meta.workedHours)}</Text>
            </View>
          </View>

          <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
            Daily Attendance Log
          </Text>

          {logs.length === 0 ? (
            <View className="bg-white dark:bg-slate-900/80 rounded-[32px] p-8 items-center shadow-sm border border-slate-100 dark:border-slate-800">
              <View className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center mb-5">
                <FileBarChart size={32} className="text-slate-300 dark:text-slate-600" />
              </View>
              <Text className="text-lg font-black text-slate-900 dark:text-white mb-2">No Records</Text>
              <Text className="text-sm font-medium text-slate-500 text-center">No attendance records found for this period.</Text>
            </View>
          ) : (
            <View className="bg-white dark:bg-slate-900/80 rounded-[32px] p-2 shadow-sm border border-slate-100 dark:border-slate-800">
              {logs.map((log, index) => {
                const isLast = index === logs.length - 1;
                const isPresent = log.status.toUpperCase() === 'PRESENT';
                const isAbsent = log.status.toUpperCase() === 'ABSENT';
                
                return (
                  <View 
                    key={log.id} 
                    className={`p-4 flex-row items-center justify-between ${!isLast ? 'border-b border-slate-100 dark:border-slate-800/60' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className={`h-12 w-12 rounded-[24px] items-center justify-center mr-4 ${isPresent ? 'bg-emerald-50 dark:bg-emerald-500/10' : isAbsent ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-50 dark:bg-slate-800'}`}>
                        {isPresent ? <CheckCircle2 size={20} className="text-emerald-500" /> : isAbsent ? <XCircle size={20} className="text-rose-500" /> : <CalendarDays size={20} className="text-slate-400" />}
                      </View>
                      <View>
                        <Text className="text-base font-black text-slate-900 dark:text-white mb-1">{log.date}</Text>
                        <View className="flex-row items-center">
                          <Text className="text-xs font-bold text-slate-500">In: {log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</Text>
                          <Text className="text-xs font-bold text-slate-300 dark:text-slate-600 mx-2">•</Text>
                          <Text className="text-xs font-bold text-slate-500">Out: {log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end pl-2">
                      <View className={`px-3 py-1.5 rounded-full mb-1 ${isPresent ? 'bg-emerald-100 dark:bg-emerald-500/20' : isAbsent ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-[10px] font-black uppercase tracking-widest ${isPresent ? 'text-emerald-700 dark:text-emerald-400' : isAbsent ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {log.status}
                        </Text>
                      </View>
                      {log.workedHours != null && (
                        <Text className="text-xs font-bold text-slate-400 mt-1">{formatHoursValue(log.workedHours)} hrs</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
