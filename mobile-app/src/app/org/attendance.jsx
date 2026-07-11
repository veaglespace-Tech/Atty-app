import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CalendarCheck2, Clock } from "lucide-react-native";
import { useGetOrgAttendanceQuery } from "@/services/api/orgApi";
import { formatHoursValue } from "@/utils/time";

const MetricCard = ({ label, value, bgClass, textClass }) =>
  <View className={`flex-1 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm ${bgClass}`}>
    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{label}</Text>
    <Text className={`text-3xl font-black tracking-tight ${textClass}`}>{value}</Text>
  </View>;

export default function OrgAttendancePage() {
  const [period, setPeriod] = useState("monthly");
  const { data, isLoading, isFetching, refetch } = useGetOrgAttendanceQuery(`period=${period}`);

  const records = data?.items || [];
  const summary = data?.summary || [];

  const getSummaryValue = (label) => {
    const item = summary.find((s) => s.label === label);
    return item ? item.value : 0;
  };

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

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Attendance Records</Text>
        </View>

        <View className="flex-row gap-2 mt-2">
          <MetricCard
            label="Present"
            value={getSummaryValue("Present")}
            bgClass="bg-emerald-50 dark:bg-emerald-500/10"
            textClass="text-emerald-600 dark:text-emerald-400" />
          
          <MetricCard
            label="Absent"
            value={getSummaryValue("Absent")}
            bgClass="bg-rose-50 dark:bg-rose-500/10"
            textClass="text-rose-600 dark:text-rose-400" />
          
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />
        }>
        
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {period} Records ({records.length})
          </Text>
          <View className="flex-row bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
            {["weekly", "monthly"].map((p) =>
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md ${period === p ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}>
              
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${period === p ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {p}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {isLoading ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        records.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <CalendarCheck2 size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 dark:text-slate-400 font-medium">No attendance logs found.</Text>
          </View> :

        <View className="gap-4">
            {records.map((record) =>
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
          )}
          </View>
        }
      </ScrollView>
    </View>);

}