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
  Camera,
  ImageUp,
  Trash2,
  Copy,
  CheckCircle2,
  Link2
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout, setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, ROLES, getUserOrganizationId, hasPermission, PERMISSIONS } from "@/utils/roles";
import { useUpdateMeMutation, useForgotPasswordMutation } from "@/services/api/authApi";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation, useUpdateOrgLogoMutation, useUpdateOrgDetailsMutation } from "@/services/api/orgApi";
import { getCurrentCoordinates } from "@/utils/location";
import ThemeToggle from "@/components/ThemeToggle";
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
          <Text className="text-xl font-black text-slate-900 dark:text-white">Workspace Settings</Text>
          <Text className="text-xs font-semibold text-slate-500">Configure global rules & profile</Text>
        </View>
        <ThemeToggle />
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


// --- Organization Logo Settings Component ---
function OrgLogoSettings() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateOrgLogo, { isLoading }] = useUpdateOrgLogoMutation();
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);

  const currentLogoUrl = user?.organization?.logoUrl || "";
  const previewLogoUrl = logoDataUrl || (removeLogo ? "" : currentLogoUrl);
  const hasPendingChange = Boolean(logoDataUrl) || removeLogo;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setLogoDataUrl(base64Img);
        setRemoveLogo(false);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const toggleLogoRemoval = () => {
    if (removeLogo) {
      setRemoveLogo(false);
      return;
    }
    if (logoDataUrl) {
      setLogoDataUrl("");
      return;
    }
    if (currentLogoUrl) {
      setRemoveLogo(true);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {};
      if (logoDataUrl) payload.logoDataUrl = logoDataUrl;
      else if (removeLogo) payload.removeLogo = true;

      const response = await updateOrgLogo(payload).unwrap();
      const updatedLogoUrl = response?.data?.logoUrl || null;
      
      if (user) {
        const updatedUser = {
          ...user,
          organization: {
            ...(user.organization || {}),
            logoUrl: updatedLogoUrl,
          }
        };
        dispatch(setCurrentUser(updatedUser));
      }
      
      setLogoDataUrl("");
      setRemoveLogo(false);
      Alert.alert("Success", response?.message || "Organization logo updated successfully.");
    } catch (error) {
      Alert.alert("Error", error?.data?.message || error?.message || "Failed to update organization logo.");
    }
  };

  return (
    <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/20">
          <ImageUp size={18} className="text-purple-600 dark:text-purple-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Organization Logo</Text>
          <Text className="text-xs font-semibold text-slate-500">Upload a logo for your workspace.</Text>
        </View>
      </View>

      <View className="gap-y-4">
        <View className="flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
          <View className="h-20 w-20 rounded-[16px] bg-slate-200 dark:bg-slate-800 overflow-hidden items-center justify-center border-2 border-white dark:border-slate-700">
            {previewLogoUrl ? (
              <Image source={{ uri: previewLogoUrl }} className="h-full w-full" />
            ) : (
              <Building2 size={32} className="text-slate-400" />
            )}
          </View>
          
          <View className="flex-1 gap-2">
            <Pressable
              onPress={pickImage}
              className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 active:scale-95">
              <ImageUp size={14} className="text-slate-700 dark:text-slate-300" />
              <Text className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                {previewLogoUrl ? "Change Logo" : "Upload Logo"}
              </Text>
            </Pressable>
            
            {(removeLogo || logoDataUrl || currentLogoUrl) ? (
              <Pressable
                onPress={toggleLogoRemoval}
                className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 active:scale-95">
                <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                <Text className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                  {removeLogo ? "Keep Current Logo" : logoDataUrl ? "Clear Selection" : "Remove Logo"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isLoading || !hasPendingChange}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isLoading || !hasPendingChange ? 'opacity-50' : ''}`}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Logo Update</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// --- Organization Details Settings Component ---
function OrgDetailsSettings() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateOrgDetails, { isLoading: isUpdating }] = useUpdateOrgDetailsMutation();
  const organization = user?.organization || {};

  const [form, setForm] = useState({
    name: organization.name || "",
    email: organization.email || "",
    phone: organization.phone || "",
    phoneCountryCode: organization.phoneCountryCode || "+91",
    address: organization.address || "",
    city: organization.city || "",
    state: organization.state || "",
    country: organization.country || "India",
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert("Error", "Organization Name and Email are required.");
      return;
    }
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        phoneCountryCode: form.phoneCountryCode,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
      };

      const result = await updateOrgDetails(payload).unwrap();
      const updatedUser = {
        ...user,
        organization: {
          ...user.organization,
          ...result.data,
        }
      };
      dispatch(setCurrentUser(updatedUser));
      Alert.alert("Success", "Organization details updated successfully.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update organization details.");
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, icon: Icon }) => (
    <View className="mb-4">
      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">{label}</Text>
      <View className={`flex-row ${multiline ? 'items-start' : 'items-center'} bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5`}>
        {Icon && <Icon size={16} className={`text-slate-400 mr-3 ${multiline ? 'mt-0.5' : ''}`} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 2 : 1}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
    </View>
  );

  return (
    <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Organization Details</Text>
          <Text className="text-xs font-semibold text-slate-500">Update your workspace identity.</Text>
        </View>
      </View>

      <View>
        <InputField label="Organization Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Acme Corp" icon={Building2} />
        <InputField label="Email Address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="e.g. admin@acme.com" keyboardType="email-address" icon={Mail} />
        
        <View className="flex-row gap-4 mb-4">
          <View className="w-1/3">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Code</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.phoneCountryCode} onChangeText={(v) => setForm({ ...form, phoneCountryCode: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="+91" keyboardType="phone-pad" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Phone Number</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <PhoneCall size={16} className="text-slate-400 mr-2" />
              <TextInput value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="e.g. 9876543210" keyboardType="phone-pad" />
            </View>
          </View>
        </View>

        <InputField label="Full Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="e.g. 123 Main St" multiline icon={MapPin} />
        
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">City</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="City" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">State</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="State" />
            </View>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Country</Text>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
            <TextInput value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="Country" />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isUpdating}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isUpdating ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Details</Text>}
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

  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  
  const referralCode = user?.organization?.referralCode || "";
  const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "https://attendee.veaglespace.com";
  const referralLink = referralCode ? `${APP_URL}/register/user?ref=${referralCode}` : "";

  const copyToClipboard = async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const copyCodeToClipboard = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCopiedReferralCode(true);
    setTimeout(() => setCopiedReferralCode(false), 2000);
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
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/org/dashboard");
            }
          }}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 active:scale-95 transition-transform">
          <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </Pressable>
        <View className="flex-1 flex-row items-center">
          <Text className="text-xl font-black text-slate-900 dark:text-white truncate">
            Settings
          </Text>
        </View>
        <ThemeToggle />
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
            <OrgLogoSettings />
            <OrgDetailsSettings />
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

        {/* Referral Link */}
        {!isSuperAdmin && !!referralCode && (
          <View className="bg-white dark:bg-[#0f172a] rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/20">
                <Link2 size={18} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-slate-900 dark:text-white">Referral Link</Text>
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invite members to your workspace</Text>
              </View>
            </View>
            <View className="flex-col gap-4">
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Referral Code</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 pl-4">
                  <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100" numberOfLines={1}>
                    {referralCode}
                  </Text>
                  <Pressable 
                    onPress={copyCodeToClipboard}
                    className="flex-row items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    {copiedReferralCode ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Copied</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Copy Code</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Link</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 pl-4">
                  <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300" numberOfLines={1} ellipsizeMode="tail">
                    {referralLink}
                  </Text>
                  <Pressable 
                    onPress={copyToClipboard}
                    className="flex-row items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
                  >
                    {copiedReferral ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Copied</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Copy Link</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

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
