import React from "react";
import { View, Text } from "react-native";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";
import { formatHoursValue } from "@/utils/time";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatWorkedHours = (record) =>
  formatHoursValue(record?.workedHours ?? record?.workedMinutes, {
    fromMinutes: record?.workedHours == null
  });

export default function AttendanceRecordItem({ record }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-bold text-slate-900 dark:text-white">{record.date}</Text>
        <View className={`px-2 py-1 rounded-full border ${
          record.status === 'PRESENT' ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50' :
          record.status === 'ABSENT' ? 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50' :
          record.status === 'REGULARIZED' ? 'bg-blue-100 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800/50' :
          'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`
        }>
          <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${
            record.status === 'PRESENT' ? 'text-emerald-700 dark:text-emerald-400' :
            record.status === 'ABSENT' ? 'text-rose-700 dark:text-rose-400' :
            record.status === 'REGULARIZED' ? 'text-blue-700 dark:text-blue-400' :
            'text-slate-700 dark:text-slate-300'}`}>{record.status}</Text>
        </View>
      </View>
      <View className="flex-row border-t border-slate-100 dark:border-slate-800 pt-3">
        <View className="flex-1">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Punch In</Text>
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDateTime(record.punchInAt)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Punch Out</Text>
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDateTime(record.punchOutAt)}</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Hrs</Text>
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatWorkedHours(record)}</Text>
        </View>
      </View>
      {(record.punchInSelfieUrl || record.punchOutSelfieUrl) && (
        <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Selfie Proofs</Text>
          <AttendanceSelfieProofLinks
            punchInSelfieUrl={record.punchInSelfieUrl}
            punchOutSelfieUrl={record.punchOutSelfieUrl} />
        </View>
      )}
    </View>
  );
}
