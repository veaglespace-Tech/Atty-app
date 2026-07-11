import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import { 
  ChevronLeft, 
  LogOut, 
  User, 
  Mail, 
  Smartphone, 
  MapPin,
  ShieldCheck,
  Building2,
  PhoneCall,
  Save,
  Clock,
  RotateCcw,
  Camera
} from "lucide-react-native";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout, setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, ROLES, getUserOrganizationId, hasPermission, PERMISSIONS } from "@/utils/roles";
import { useUpdateMeMutation, useForgotPasswordMutation } from "@/services/api/authApi";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation } from "@/services/api/orgApi";
import { getCurrentCoordinates } from "@/utils/location";

// --- Time Settings Component ---
function TimeSettings() {
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
    <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
          <Clock size={18} className="text-orange-600 dark:text-orange-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Time Settings</Text>
          <Text className="text-xs font-semibold text-slate-500">Configure workspace working hours.</Text>
        </View>
        {hasChanges && (
          <Pressable onPress={handleUndo} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <RotateCcw size={16} className="text-slate-500" />
          </Pressable>
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
        <Pressable
          onPress={handleSave}
          disabled={isUpdating || !hasChanges}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isUpdating || !hasChanges ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Time Settings</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// --- Location Settings Component ---
function LocationSettings() {
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
    <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
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

        <Pressable
          onPress={handleFetchCurrentLocation}
          disabled={isFetchingLocation}
          className="flex-row items-center justify-center gap-2 py-3 mt-1 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 active:scale-95">
          {isFetchingLocation ? <ActivityIndicator size="small" color="#3b82f6" /> : <MapPin size={16} className="text-blue-600 dark:text-blue-400" />}
          <Text className="font-bold text-blue-600 dark:text-blue-400 text-sm">Detect Location</Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={isUpdating || !hasChanges}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isUpdating || !hasChanges ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Geofencing</Text>}
        </Pressable>
      </View>
    </View>
  );
}


// --- Main Settings Screen ---
export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: isResetting }] = useForgotPasswordMutation();
  
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    emergencyContact: user?.emergencyContact || "",
    currentAddress: user?.currentAddress || "",
  });

  const onLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true, // Need base64 to send to backend as data url
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfileImageDataUrl(base64Img);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = { ...formData };
      if (profileImageDataUrl) {
        payload.profileImageDataUrl = profileImageDataUrl;
      }

      const result = await updateMe(payload).unwrap();
      dispatch(setCurrentUser(result.user));
      setProfileImageDataUrl("");
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update profile.");
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await forgotPassword({
        email: user.email,
        loginAs: user.currentRole || user.role,
        organizationId: user.organization?.id,
      }).unwrap();
      Alert.alert("Success", "Reset link sent to your registered email address.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to send reset email.");
    }
  };

  const effectiveRole = user?.currentRole || user?.role || ROLES.MEMBER;
  const isSuperAdmin = effectiveRole === ROLES.SUPER_ADMIN;
  const isAdmin = effectiveRole === ROLES.ORG_ADMIN;
  const roleLabel = formatRoleLabel(effectiveRole);
  const organizationName = user?.organization?.name || "Workspace";
  
  // Decide if this user can see the Admin panels
  const canSeeAdminSettings = isAdmin;

  const currentProfileImageUrl = profileImageDataUrl || user?.profileImageUrl;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-6 pt-12 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex-row items-center gap-3">
        <Pressable 
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 active:scale-95 transition-transform">
          <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 dark:text-white">
          Account Settings
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800 items-center">
          <Pressable onPress={pickImage} className="relative mb-4 active:scale-95 transition-transform">
            {currentProfileImageUrl ? (
              <Image source={{ uri: currentProfileImageUrl }} className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-800" />
            ) : (
              <View className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center border-4 border-white dark:border-slate-800">
                <User size={40} className="text-blue-600 dark:text-blue-400" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 h-8 w-8 bg-blue-600 rounded-full items-center justify-center border-2 border-white dark:border-slate-800">
              <Camera size={14} color="#fff" />
            </View>
          </Pressable>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center">
            {user?.name || "User"}
          </Text>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {user?.email}
          </Text>
          
          <View className="flex-row items-center gap-3 mt-5 w-full">
            <View className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex-row items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-500" />
              <View>
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role</Text>
                <Text className="font-bold text-slate-700 dark:text-slate-200">{roleLabel}</Text>
              </View>
            </View>
            <View className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex-row items-center gap-3">
              <Building2 size={18} className="text-blue-500" />
              <View flex={1}>
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workspace</Text>
                <Text className="font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>{organizationName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Admin Sections */}
        {canSeeAdminSettings && (
          <>
            <LocationSettings />
            <TimeSettings />
          </>
        )}

        {/* Edit Profile Form */}
        <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <Text className="text-base font-black text-slate-900 dark:text-white mb-5 flex-row items-center">
            Personal Details
          </Text>

          <View className="gap-y-4">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Full Name</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <User size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.name}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Email Address</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 opacity-70">
                <Mail size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.email}
                  editable={false}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Mobile Number</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <Smartphone size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.mobile}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, mobile: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Emergency Contact</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <PhoneCall size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.emergencyContact}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, emergencyContact: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter emergency contact"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Current Address</Text>
              <View className="flex-row bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <MapPin size={16} className="text-slate-400 mr-3 mt-0.5" />
                <TextInput
                  value={formData.currentAddress}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, currentAddress: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter current address"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            
            <Pressable
              onPress={handleUpdate}
              disabled={isLoading}
              className={`mt-4 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 active:bg-blue-700 ${isLoading ? 'opacity-70' : ''}`}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text className="font-bold text-white text-[15px]">Save Profile Changes</Text>
                </>
              )}
            </Pressable>

          </View>
        </View>

        {/* Advanced Security */}
        <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <Text className="text-base font-black text-slate-900 dark:text-white mb-2">
            Security
          </Text>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-5">
            Manage your account security and password.
          </Text>
          
          <Pressable
            onPress={handleResetPassword}
            disabled={isResetting}
            className={`flex-row items-center justify-center py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 ${isResetting ? 'opacity-70' : ''}`}>
            {isResetting ? (
              <ActivityIndicator color="#3b82f6" size="small" />
            ) : (
              <Text className="font-bold text-slate-900 dark:text-white text-[15px]">Request Password Reset</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
