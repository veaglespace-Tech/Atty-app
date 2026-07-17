import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Clock, MapPin } from "lucide-react-native";
import { useGetOrgAttendanceLogByIdQuery } from "@/services/api/orgApi";
import { formatRoleLabel } from "@/utils/roles";
import { formatHoursValue } from "@/utils/time";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatTimeOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatWorkedHours = (record) =>
  formatHoursValue(record?.workedHours ?? record?.workedMinutes, {
    fromMinutes: record?.workedHours == null,
  });

const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return "-";
  }
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return "-";
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatLocation = (record) => {
  if (record?.punchInLocationMeta?.displayText) return record.punchInLocationMeta.displayText;
  if (record?.punchInLocationMeta?.areaLabel) return record.punchInLocationMeta.areaLabel;
  return formatCoordinates(record?.punchInCoordinates);
};

const formatOutLocation = (record) => {
  if (record?.punchOutLocationMeta?.displayText) return record.punchOutLocationMeta.displayText;
  if (record?.punchOutLocationMeta?.areaLabel) return record.punchOutLocationMeta.areaLabel;
  return formatCoordinates(record?.punchOutCoordinates);
};

const formatGeoStatus = (record) => {
  if (record?.punchInValid === false) return "No";
  if (record?.punchOutValid === false) return "No";
  return "Yes";
};

export default function OrgAttendanceLogDetailPage() {
  const { logId } = useLocalSearchParams();

  const { data, isLoading, error } = useGetOrgAttendanceLogByIdQuery(logId, {
    skip: !logId,
  });

  const record = data?.item;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View className="flex-1 items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Log Not Found</Text>
        <Text className="mt-2 text-sm text-center text-slate-500 dark:text-slate-400">
          The attendance log you are looking for does not exist or you don't have permission to view it.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </Pressable>
        <View>
          <Text className="text-xl font-black text-slate-900 dark:text-white">Attendance Details</Text>
          <Text className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Detailed punch log and verification</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        {/* Member Profile */}
        <View className="flex-row items-center gap-4 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
          <View className="h-14 w-14 rounded-[20px] bg-blue-50 dark:bg-blue-900/30 items-center justify-center border border-blue-100 dark:border-blue-800/30">
            <Text className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {record.member?.name?.[0]?.toUpperCase() || record.member?.email?.[0]?.toUpperCase() || "M"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{record.member?.name || record.member?.email}</Text>
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
              {formatRoleLabel(record.member?.role)}
            </Text>
          </View>
        </View>

        {/* Overview Tiles */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Summary</Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{record.date}</Text>
            </View>
            <View className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Text>
              <Text className="mt-1 text-sm font-black uppercase text-slate-900 dark:text-white">{record.status}</Text>
            </View>
            <View className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Geo Valid</Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatGeoStatus(record)}</Text>
            </View>
            <View className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Worked Hours</Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatWorkedHours(record)}</Text>
            </View>
          </View>
        </View>

        {/* Punch In */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Punch In Details</Text>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center"><Clock size={14} className="text-blue-600 dark:text-blue-400" /></View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</Text>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">{formatTimeOnly(record.punchInAt)}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center"><MapPin size={14} className="text-blue-600 dark:text-blue-400" /></View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</Text>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{formatLocation(record)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Punch Out */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Punch Out Details</Text>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center"><Clock size={14} className="text-blue-600 dark:text-blue-400" /></View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</Text>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">{formatTimeOnly(record.punchOutAt)}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center"><MapPin size={14} className="text-blue-600 dark:text-blue-400" /></View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</Text>
                <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{formatOutLocation(record)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Selfie Verification */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Selfie Verification</Text>
          <AttendanceSelfieProofLinks
            punchInSelfieUrl={record.punchInSelfieUrl}
            punchOutSelfieUrl={record.punchOutSelfieUrl}
          />
        </View>
      </ScrollView>
    </View>
  );
}
