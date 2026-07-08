import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useColorScheme } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MapPin, Clock, Save } from "lucide-react-native";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation } from "@/services/api/orgApi";
import { getCurrentCoordinates } from "@/utils/location";

function LocationSettings() {
  const { data: settingsData, isLoading } = useGetOrgAttendanceSettingsQuery(undefined);
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const persistedSettings = settingsData?.settings;
  const persistedLocation = Array.isArray(persistedSettings?.location) ? persistedSettings.location : [];
  
  const [draftRadius, setDraftRadius] = useState<number | null>(null);
  const [draftLatitude, setDraftLatitude] = useState<number | null>(null);
  const [draftLongitude, setDraftLongitude] = useState<number | null>(null);

  const radius = draftRadius ?? (Number(persistedSettings?.attendanceRadius) || 25);
  const latitude = draftLatitude ?? (Number(persistedLocation[1]) || 0);
  const longitude = draftLongitude ?? (Number(persistedLocation[0]) || 0);

  const handleFetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const [lng, lat] = await getCurrentCoordinates();
      setDraftLatitude(lat);
      setDraftLongitude(lng);
      Alert.alert("Success", "Location detected! Click 'Update Geofencing' to save.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to fetch current location.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    try {
      if (latitude < -90 || latitude > 90) {
        Alert.alert("Error", "Invalid Latitude. Must be between -90 and 90.");
        return;
      }
      if (longitude < -180 || longitude > 180) {
        Alert.alert("Error", "Invalid Longitude. Must be between -180 and 180.");
        return;
      }
      
      await updateSettings({
        attendanceRadius: radius,
        coordinates: [longitude, latitude],
      }).unwrap();
      Alert.alert("Success", `Location settings updated successfully to ${latitude}, ${longitude}.`);
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to update location settings.");
    }
  };

  if (isLoading) return <ActivityIndicator size="small" color="#2563eb" className="py-4" />;

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-5">
      <View className="flex-row items-center gap-3 mb-6">
        <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-blue-50 dark:bg-slate-800">
          <MapPin size={24} className="text-blue-600 dark:text-blue-400" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Geofencing</Text>
          <Text className="text-sm text-slate-500">Configure physical boundaries</Text>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Radius (meters)</Text>
        <TextInput
          keyboardType="numeric"
          value={radius.toString()}
          onChangeText={(val) => setDraftRadius(val ? Number(val) : null)}
          className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
        />
      </View>

      <View className="flex-row items-center justify-between mb-2 ml-1">
        <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Coordinates</Text>
        <Pressable onPress={handleFetchCurrentLocation} disabled={isFetchingLocation} className="flex-row items-center bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
          {isFetchingLocation ? <ActivityIndicator size="small" color="#2563eb" /> : <MapPin size={14} color="#2563eb" />}
          <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-400 ml-1.5">{isFetchingLocation ? "Detecting" : "Detect"}</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-3 mb-6 w-full">
        <View className="flex-1">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Longitude</Text>
          <TextInput
            keyboardType="numeric"
            value={longitude.toString()}
            onChangeText={(val) => setDraftLongitude(val ? Number(val) : null)}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
          />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Latitude</Text>
          <TextInput
            keyboardType="numeric"
            value={latitude.toString()}
            onChangeText={(val) => setDraftLatitude(val ? Number(val) : null)}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
          />
        </View>
      </View>

      <Pressable onPress={handleSave} disabled={isUpdating} className="w-full bg-blue-600 rounded-[20px] py-4 items-center flex-row justify-center active:scale-95 transition-transform shadow-sm">
        {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" />}
        <Text className="text-white font-bold text-base ml-2">Update Geofencing</Text>
      </Pressable>
    </View>
  );
}

function TimeSettings() {
  const { data: settingsData, isLoading } = useGetOrgAttendanceSettingsQuery(undefined);
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();
  const colorScheme = useColorScheme();

  const persistedSettings = settingsData?.settings;
  const [draftStartTime, setDraftStartTime] = useState<string | null>(null);
  const [draftEndTime, setDraftEndTime] = useState<string | null>(null);
  const [draftGraceMinutes, setDraftGraceMinutes] = useState<number | null>(null);

  const startTime = draftStartTime ?? (persistedSettings?.attendanceStartTime || "09:00");
  const endTime = draftEndTime ?? (persistedSettings?.attendanceEndTime || "18:00");
  const graceMinutes = draftGraceMinutes ?? (Number(persistedSettings?.lateGraceMinutes) || 0);

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
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to update time settings.");
    }
  };

  if (isLoading) return <ActivityIndicator size="small" color="#2563eb" className="py-4" />;

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <View className="flex-row items-center gap-3 mb-6">
        <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 dark:bg-slate-800">
          <Clock size={24} className="text-slate-900 dark:text-white" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Time Settings</Text>
          <Text className="text-sm text-slate-500">Configure working hours</Text>
        </View>
      </View>

      <View className="flex-row gap-3 mb-5 w-full">
        <View className="flex-1">
          <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Start Time</Text>
          <TextInput
            value={startTime}
            onChangeText={setDraftStartTime}
            placeholder="09:00"
            placeholderTextColor="#94a3b8"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
          />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">End Time</Text>
          <TextInput
            value={endTime}
            onChangeText={setDraftEndTime}
            placeholder="18:00"
            placeholderTextColor="#94a3b8"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Grace Period (Mins)</Text>
        <TextInput
          keyboardType="numeric"
          value={graceMinutes.toString()}
          onChangeText={(val) => setDraftGraceMinutes(val ? Number(val) : null)}
          className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
        />
      </View>

      <Pressable onPress={handleSave} disabled={isUpdating} className="w-full bg-slate-900 dark:bg-white rounded-[20px] py-4 items-center flex-row justify-center active:scale-95 transition-transform shadow-sm">
        {isUpdating ? <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#0f172a' : '#fff'} /> : <Save size={18} className="text-white dark:text-slate-900" />}
        <Text className="text-white dark:text-slate-900 font-bold text-base ml-2">Update Time</Text>
      </Pressable>
    </View>
  );
}

export default function OrgWorkspacePage() {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Workspace</Text>
          <View className="w-10" />
        </View>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Configurations</Text>
          <Text className="text-3xl font-black text-slate-900 dark:text-white mb-6 tracking-tight ml-1">Attendance Settings</Text>
          
          <LocationSettings />
          <TimeSettings />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
