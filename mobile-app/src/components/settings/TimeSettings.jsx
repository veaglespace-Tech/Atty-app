import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Clock, RotateCcw } from "lucide-react-native";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation } from "@/services/api/orgApi";

export default function TimeSettings() {
  const { data: settingsData, isLoading: loadingSettings } = useGetOrgAttendanceSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();

  const persistedSettings = settingsData?.settings;
  const defaultStartTime = persistedSettings?.attendanceStartTime || "09:00";
  const defaultEndTime = persistedSettings?.attendanceEndTime || "18:00";
  const defaultGraceMinutes = Number(persistedSettings?.lateGraceMinutes) || 0;

  const [draftStartTime, setDraftStartTime] = useState(null);
  const [draftEndTime, setDraftEndTime] = useState(null);
  const [draftGraceMinutes, setDraftGraceMinutes] = useState(null);

  const startTime = draftStartTime ?? defaultStartTime;
  const endTime = draftEndTime ?? defaultEndTime;
  const graceMinutes = draftGraceMinutes ?? defaultGraceMinutes;

  const hasChanges = draftStartTime !== null || draftEndTime !== null || draftGraceMinutes !== null;

  const handleUndo = () => {
    setDraftStartTime(null);
    setDraftEndTime(null);
    setDraftGraceMinutes(null);
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        attendanceStartTime: startTime,
        attendanceEndTime: endTime,
        lateGraceMinutes: graceMinutes,
      }).unwrap();
      Alert.alert("Success", "Time settings updated successfully.");
      setDraftStartTime(null);
      setDraftEndTime(null);
      setDraftGraceMinutes(null);
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update time settings.");
    }
  };

  if (loadingSettings) {
    return <ActivityIndicator size="small" color="#3b82f6" style={{ margin: 20 }} />;
  }

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
          <Clock size={18} className="text-orange-600 dark:text-orange-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Time Settings</Text>
          <Text className="text-xs font-semibold text-slate-500">Configure workspace working hours.</Text>
        </View>
        {hasChanges && (
          <TouchableOpacity onPress={handleUndo} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <RotateCcw size={16} className="text-slate-500" />
          </TouchableOpacity>
        )}
      </View>

      <View className="gap-y-4">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Start Time</Text>
            <TextInput
              value={startTime}
              onChangeText={setDraftStartTime}
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
              placeholder="09:00"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">End Time</Text>
            <TextInput
              value={endTime}
              onChangeText={setDraftEndTime}
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
              placeholder="18:00"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Late Grace Period (Mins)</Text>
          <TextInput
            value={String(graceMinutes)}
            onChangeText={(val) => setDraftGraceMinutes(Number(val) || 0)}
            keyboardType="number-pad"
            className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
          />
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isUpdating || !hasChanges}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white   ${isUpdating || !hasChanges ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Time Settings</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
