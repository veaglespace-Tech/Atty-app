import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Alert, Pressable } from "react-native";
import { CheckCircle2, Clock, MapPin, RefreshCcw, Timer, UserCheck, XCircle, MapPinned, FileWarning } from "lucide-react-native";

import { useGetMemberAttendanceQuery, useGetMemberDashboardQuery } from "@/services/api/memberApi";
import { usePunchInMutation, usePunchOutMutation, useRequestRegularizationMutation } from "@/services/api/attendanceApi";
import AttendanceFaceCaptureModal from "@/components/attendance/AttendanceFaceCaptureModal";
import RegularizationModal from "@/components/attendance/RegularizationModal";
import AttendanceSelfieProofLinks from "@/components/attendance/AttendanceSelfieProofLinks";
import { getTodayDateKey } from "@/utils/date";
import { getCurrentCoordinates } from "@/utils/location";
import { formatHoursValue } from "@/utils/time";

const todayKey = getTodayDateKey;

const toSummaryMap = (summary: any[]) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatWorkedHours = (record: any) =>
  formatHoursValue(record?.workedHours ?? record?.workedMinutes, {
    fromMinutes: record?.workedHours == null,
  });

const formatCoordinates = (coordinates: number[]) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return "-";
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return "-";
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatPunchLocation = (record: any) => {
  if (record?.punchInLocationMeta?.displayText) {
    return record.punchInLocationMeta.displayText;
  }
  return formatCoordinates(record?.punchInCoordinates);
};

export default function MyAttendanceCore({ user, isEmbedded = false }: { user: any, isEmbedded?: boolean }) {
  const [actionLoading, setActionLoading] = useState("");
  const [pendingPunchType, setPendingPunchType] = useState<"in" | "out" | "">("");
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isFetching: dashboardFetching,
    refetch: refetchDashboard,
  } = useGetMemberDashboardQuery(undefined, { skip: !user });

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    refetch: refetchAttendance,
  } = useGetMemberAttendanceQuery({ limit: 30 }, { skip: !user });

  const [punchInMutation] = usePunchInMutation();
  const [punchOutMutation] = usePunchOutMutation();
  const [requestRegularizationMutation, { isLoading: isSubmittingRegularization }] = useRequestRegularizationMutation();

  const records = useMemo(() => (Array.isArray(attendanceData?.items) ? attendanceData.items : []), [attendanceData]);
  const summary = useMemo(() => (Array.isArray(dashboardData?.summary) ? dashboardData.summary : []), [dashboardData]);
  
  const loading = dashboardLoading || dashboardFetching || attendanceLoading || attendanceFetching;
  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);

  const todayRecord = useMemo(() => records.find((record: any) => String(record.date) === todayKey()) || null, [records]);
  const todayStatusValue = summaryMap.get("Today Status") || todayRecord?.status || "No Record";

  const fetchAttendance = async () => {
    try {
      await Promise.all([refetchDashboard(), refetchAttendance()]);
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || err?.message || "Unable to fetch attendance data");
    }
  };

  const resolvePunchLocationPayload = async () => {
    const coordinates = await getCurrentCoordinates();
    return {
      coordinates,
      location: {
        inputFormat: "NEW2",
        mode: "AUTO",
        source: "DEVICE_GPS",
        displayText: `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
        coordinates,
      },
    };
  };

  const submitPunch = async (type: "in" | "out", selfieImageDataUrl: string) => {
    try {
      setActionLoading(type);
      const locationPayload = await resolvePunchLocationPayload();
      
      const payload = {
        userLocation: locationPayload.coordinates,
        location: locationPayload.location,
        selfieImageDataUrl,
      };

      if (type === "in") {
        await punchInMutation(payload).unwrap();
      } else {
        await punchOutMutation(payload).unwrap();
      }

      Alert.alert("Success", `Punch ${type} successful!`);
      setPendingPunchType("");
      await fetchAttendance();
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || err?.message || "Attendance action failed");
    } finally {
      setActionLoading("");
    }
  };

  const submitRegularization = async (payload: any) => {
    try {
      await requestRegularizationMutation(payload).unwrap();
      Alert.alert("Success", "Regularization request submitted successfully");
      setIsRegularizeModalOpen(false);
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || err?.message || "Failed to submit regularization request");
    }
  };

  const canPunchIn = !todayRecord?.punchInAt;
  const canPunchOut = Boolean(todayRecord?.punchInAt) && !todayRecord?.punchOutAt;

  const Container = isEmbedded ? View : ScrollView;
  const containerProps = isEmbedded 
    ? { className: "gap-4" } 
    : { 
        className: "flex-1", 
        contentContainerStyle: { padding: 16, paddingBottom: 40 },
        refreshControl: <RefreshControl refreshing={loading} onRefresh={fetchAttendance} tintColor="#2563eb" />
      };

  return (
    <Container {...containerProps as any}>
      <View className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden mb-4">
        <Text className="text-xl font-black text-slate-900 dark:text-white mb-4">Actions</Text>
        
        <View className="flex-row flex-wrap gap-3">
          <Pressable 
            onPress={() => setPendingPunchType("in")}
            disabled={!canPunchIn || actionLoading !== ""}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${!canPunchIn ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-600'}`}
          >
            {actionLoading === "in" ? <ActivityIndicator color="white" /> : <MapPinned size={18} color={!canPunchIn ? "#94a3b8" : "white"} />}
            <Text className={`font-bold ml-2 ${!canPunchIn ? 'text-slate-400' : 'text-white'}`}>Punch In</Text>
          </Pressable>

          <Pressable 
            onPress={() => setPendingPunchType("out")}
            disabled={!canPunchOut || actionLoading !== ""}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${!canPunchOut ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-600'}`}
          >
            {actionLoading === "out" ? <ActivityIndicator color="white" /> : <Timer size={18} color={!canPunchOut ? "#94a3b8" : "white"} />}
            <Text className={`font-bold ml-2 ${!canPunchOut ? 'text-slate-400' : 'text-white'}`}>Punch Out</Text>
          </Pressable>
        </View>

        {user?.role === "MEMBER" && (
          <Pressable 
            onPress={() => setIsRegularizeModalOpen(true)}
            className="mt-3 flex-row items-center justify-center py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <FileWarning size={16} color="#f59e0b" />
            <Text className="font-bold text-slate-700 dark:text-slate-300 ml-2">Technical Issue? Regularize</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
        <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Today Status</Text>
          <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1} adjustsFontSizeToFit>{todayStatusValue}</Text>
        </View>
        <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Worked Hrs (Month)</Text>
          <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1} adjustsFontSizeToFit>{formatHoursValue(summaryMap.get("Worked Hrs This Month") || 0)}</Text>
        </View>
        <View className="w-[48%] bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-[20px] border border-emerald-100 dark:border-emerald-800/50">
          <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Present (Month)</Text>
          <Text className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{summaryMap.get("Present This Month") || 0}</Text>
        </View>
        <View className="w-[48%] bg-rose-50 dark:bg-rose-500/10 p-4 rounded-[20px] border border-rose-100 dark:border-rose-800/50">
          <Text className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Absent (Month)</Text>
          <Text className="text-2xl font-black text-rose-700 dark:text-rose-300">{summaryMap.get("Absent This Month") || 0}</Text>
        </View>
      </View>

      <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
        Recent History
      </Text>

      {records.length === 0 ? (
        <View className="py-8 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Text className="text-slate-500 font-medium">No recent logs.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {records.slice(0, 15).map((record: any) => (
            <View key={record.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-slate-900 dark:text-white">{record.date}</Text>
                <View className={`px-2 py-1 rounded-full border ${
                  record.status === 'PRESENT' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800/50 dark:text-emerald-400' :
                  record.status === 'ABSENT' ? 'bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800/50 dark:text-rose-400' :
                  record.status === 'REGULARIZED' ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800/50 dark:text-blue-400' :
                  'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}>
                  <Text className="text-[10px] font-black uppercase tracking-[0.1em]">{record.status}</Text>
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
                    punchOutSelfieUrl={record.punchOutSelfieUrl}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <AttendanceFaceCaptureModal
        open={Boolean(pendingPunchType)}
        actionLabel={pendingPunchType === "out" ? "Punch Out" : "Punch In"}
        isSubmitting={actionLoading !== ""}
        onClose={() => setPendingPunchType("")}
        onSubmit={(selfieImageDataUrl) => submitPunch(pendingPunchType as "in" | "out", selfieImageDataUrl)}
      />

      {user?.role === "MEMBER" && (
        <RegularizationModal 
          open={isRegularizeModalOpen}
          onClose={() => setIsRegularizeModalOpen(false)}
          onSubmit={submitRegularization}
          isSubmitting={isSubmittingRegularization}
        />
      )}
    </Container>
  );
}
