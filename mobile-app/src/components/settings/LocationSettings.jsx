import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { MapPin } from "lucide-react-native";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation } from "@/services/api/orgApi";
import { getCurrentCoordinates } from "@/utils/location";

export default function LocationSettings() {
  const { data: settingsData, isLoading: loadingSettings } = useGetOrgAttendanceSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();

  const persistedSettings = settingsData?.settings;
  const persistedLocation = Array.isArray(persistedSettings?.location) ? persistedSettings.location : [];
  const defaultRadius = Number(persistedSettings?.attendanceRadius) || 25;
  const defaultLongitude = Number(persistedLocation[0]) || 0;
  const defaultLatitude = Number(persistedLocation[1]) || 0;

  const [draftRadius, setDraftRadius] = useState(null);
  const [draftLatitude, setDraftLatitude] = useState(null);
  const [draftLongitude, setDraftLongitude] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const radius = draftRadius ?? defaultRadius;
  const latitude = draftLatitude ?? defaultLatitude;
  const longitude = draftLongitude ?? defaultLongitude;
  const hasChanges = draftRadius !== null || draftLatitude !== null || draftLongitude !== null;

  const handleFetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const [lng, lat] = await getCurrentCoordinates();
      setDraftLatitude(lat);
      setDraftLongitude(lng);
      Alert.alert("Success", "Coordinates fetched. Press Save to update.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to fetch location.");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        attendanceRadius: radius,
        coordinates: [longitude, latitude],
      }).unwrap();
      Alert.alert("Success", "Location settings updated successfully.");
      setDraftRadius(null);
      setDraftLatitude(null);
      setDraftLongitude(null);
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update location settings.");
    }
  };

  if (loadingSettings) {
    return <ActivityIndicator size="small" color="#3b82f6" style={{ margin: 20 }} />;
  }

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/20">
          <MapPin size={18} className="text-blue-600 dark:text-blue-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Workspace Geofencing</Text>
          <Text className="text-xs font-semibold text-slate-500">Set boundaries for attendance.</Text>
        </View>
      </View>

      <View className="gap-y-4">
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Radius (Meters)</Text>
          <TextInput
            value={String(radius)}
            onChangeText={(val) => setDraftRadius(Number(val) || 0)}
            keyboardType="number-pad"
            className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
          />
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Latitude</Text>
            <TextInput
              value={String(latitude)}
              onChangeText={(val) => setDraftLatitude(Number(val))}
              keyboardType="numeric"
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Longitude</Text>
            <TextInput
              value={String(longitude)}
              onChangeText={(val) => setDraftLongitude(Number(val))}
              keyboardType="numeric"
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleFetchCurrentLocation}
          disabled={isFetchingLocation}
          className="flex-row items-center justify-center gap-2 py-3 mt-1 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 ">
          {isFetchingLocation ? <ActivityIndicator size="small" color="#3b82f6" /> : <MapPin size={16} className="text-blue-600 dark:text-blue-400" />}
          <Text className="font-bold text-blue-600 dark:text-blue-400 text-sm">Detect Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isUpdating || !hasChanges}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white   ${isUpdating || !hasChanges ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Geofencing</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
