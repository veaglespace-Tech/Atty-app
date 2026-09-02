import React from "react";
import { View, Text } from "react-native";
import { formatHoursValue } from "@/utils/time";

export default function AttendanceSummaryStats({ summaryMap }) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3 mb-5">
      <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800 flex-col justify-between">
        <Text className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2" numberOfLines={1} adjustsFontSizeToFit>Present (M)</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white">{summaryMap.get("Present This Month") || 0}</Text>
      </View>
      <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800 flex-col justify-between">
        <Text className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2" numberOfLines={1} adjustsFontSizeToFit>Absent (M)</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white">{summaryMap.get("Absent This Month") || 0}</Text>
      </View>
      <View className="w-full bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800 flex-row items-center justify-between">
        <Text className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Worked Hrs This Month</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white">{formatHoursValue(summaryMap.get("Worked Hrs This Month") || 0)}</Text>
      </View>
    </View>
  );
}
