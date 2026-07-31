import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image, Platform } from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { 
  ChevronLeft, 
  ChevronRight,
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
  Link2,
  Calendar,
  FileText,
  UploadCloud,
  FileBox,
  Download
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout, setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, ROLES, getUserOrganizationId, hasPermission, PERMISSIONS } from "@/utils/roles";
import { useUpdateMeMutation, useForgotPasswordMutation } from "@/services/api/authApi";
import { useGetOrgAttendanceSettingsQuery, useUpdateOrgAttendanceSettingsMutation, useUpdateOrgLogoMutation, useUpdateOrgDetailsMutation, useGetOrgDepartmentsQuery } from "@/services/api/orgApi";
import { getCurrentCoordinates } from "@/utils/location";
import { getFullImageUrl } from "@/components/dashboard/MobileDashboardShell";
import ThemeToggle from "@/components/ThemeToggle";
import TimeSettings from "@/components/org/settings/TimeSettings";
import LocationSettings from "@/components/org/settings/LocationSettings";
import OrgLogoSettings from "@/components/org/settings/OrgLogoSettings";
import OrgDetailsSettings from "@/components/org/settings/OrgDetailsSettings";
import { getLocalPhoneNumber, formatPhoneNumberForSave } from "@/utils/phone";

// --- Main Settings Screen ---
export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: isResetting }] = useForgotPasswordMutation();
  const [activeTab, setActiveTab] = useState("personal");
  
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [documentDataUrl, setDocumentDataUrl] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [removeDocument, setRemoveDocument] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: getLocalPhoneNumber(user?.mobile),
    emergencyContact: getLocalPhoneNumber(user?.emergencyContact),
    currentAddress: user?.currentAddress || "",
    permanentAddress: user?.permanentAddress || "",
    dob: user?.dob ? user.dob.split("T")[0] : "",
    physicalFormNo: user?.physicalFormNo || "",
    bloodGroup: user?.bloodGroup || "",
    gender: user?.gender || "",
    existingMember: user?.existingMember || "",
    departmentId: user?.departmentId ? String(user.departmentId) : "",
  });

  const { data: deptData } = useGetOrgDepartmentsQuery(undefined, { skip: !user?.orgId });
  const departmentsList = deptData?.items || [];

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
        quality: 0.2,
        base64: true, // Need base64 to send to backend as data url
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfileImageDataUrl(base64Img);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let dataUrl;
        if (Platform.OS === "web") {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          const mimeType = asset.mimeType || "application/octet-stream";
          dataUrl = `data:${mimeType};base64,${base64}`;
        }

        setDocumentDataUrl(dataUrl);
        setDocumentName(asset.name);
        setRemoveDocument(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const toggleDocumentRemoval = () => {
    if (documentDataUrl) {
      setDocumentDataUrl("");
      setDocumentName("");
    } else if (user?.documentUrl) {
      setRemoveDocument(!removeDocument);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const isoStr = selectedDate.toISOString().split("T")[0];
      setFormData(prev => ({ ...prev, dob: isoStr }));
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {};
      if (formData.name !== user?.name) payload.name = formData.name;
      if (formData.mobile !== getLocalPhoneNumber(user?.mobile)) {
        payload.mobileCountryCode = "+91";
        payload.mobile = formatPhoneNumberForSave(formData.mobile);
      }
      if (formData.emergencyContact !== getLocalPhoneNumber(user?.emergencyContact)) {
        payload.emergencyContactCountryCode = "+91";
        payload.emergencyContact = formatPhoneNumberForSave(formData.emergencyContact);
      }
      if (formData.currentAddress !== user?.currentAddress) payload.currentAddress = formData.currentAddress;
      if (formData.permanentAddress !== user?.permanentAddress) payload.permanentAddress = formData.permanentAddress;
      if (formData.dob !== (user?.dob ? user.dob.split("T")[0] : "")) payload.dob = formData.dob || undefined;
      if (formData.physicalFormNo !== (user?.physicalFormNo || "")) payload.physicalFormNo = formData.physicalFormNo || undefined;
      if (formData.bloodGroup !== (user?.bloodGroup || "")) payload.bloodGroup = formData.bloodGroup || undefined;
      if (formData.gender !== (user?.gender || "")) payload.gender = formData.gender || undefined;
      if (formData.existingMember !== (user?.existingMember || "")) payload.existingMember = formData.existingMember || undefined;
      if (formData.departmentId !== (user?.departmentId ? String(user.departmentId) : "")) payload.departmentId = formData.departmentId ? Number(formData.departmentId) : null;
      if (profileImageDataUrl) payload.profileImageDataUrl = profileImageDataUrl;
      
      if (documentDataUrl) {
        payload.documentDataUrl = documentDataUrl;
        payload.documentName = documentName;
      } else if (removeDocument) {
        payload.documentDataUrl = null;
        payload.documentName = null;
      }

      if (Object.keys(payload).length === 0) {
        Alert.alert("Info", "No changes to save.");
        return;
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

  const currentProfileImageUrl = profileImageDataUrl || (user?.profileImageUrl ? getFullImageUrl(user.profileImageUrl) : null);

  return (
    
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-6 pt-12 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex-row items-center gap-3">
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/member/dashboard");
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

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-2xl w-full mx-auto">
        {/* Profile Header */}
        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800 items-center">
          <Pressable onPress={pickImage} className="relative mb-4 active:scale-95 transition-transform">
            {currentProfileImageUrl ? (
              <Image source={{ uri: currentProfileImageUrl }} resizeMode="contain" className="h-24 w-24 rounded-2xl border-4 border-white dark:border-slate-800 bg-white" />
            ) : (
              <View className="h-24 w-24 rounded-2xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center border-4 border-white dark:border-slate-800">
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
              <View className="flex-1 overflow-hidden pr-2">
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workspace</Text>
                <Text className="font-bold text-slate-700 dark:text-slate-200" numberOfLines={1} ellipsizeMode="tail">{organizationName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Tabs */}
        <View className="flex-row mb-6 bg-slate-200/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Pressable 
            onPress={() => setActiveTab("personal")}
            className={`flex-1 items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === "personal" ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800" : ""}`}
          >
            <Text className={`text-sm font-bold ${activeTab === "personal" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              Personal
            </Text>
          </Pressable>
          {canSeeAdminSettings && (
            <Pressable 
              onPress={() => setActiveTab("organization")}
              className={`flex-1 items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === "organization" ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800" : ""}`}
            >
              <Text className={`text-sm font-bold ${activeTab === "organization" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                Workspace
              </Text>
            </Pressable>
          )}
          <Pressable 
            onPress={() => setActiveTab("security")}
            className={`flex-1 items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === "security" ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800" : ""}`}
          >
            <Text className={`text-sm font-bold ${activeTab === "security" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              Security
            </Text>
          </Pressable>
        </View>

        {activeTab === "organization" && canSeeAdminSettings && (
          <View className="mb-6">
            <Pressable 
              onPress={() => router.push("/org/departments")}
              className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                  <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                </View>
                <View>
                  <Text className="text-base font-black text-slate-900 dark:text-white">Manage Departments</Text>
                  <Text className="text-xs font-semibold text-slate-500">Create departments and allocate users</Text>
                </View>
              </View>
              <ChevronRight size={20} className="text-slate-400" />
            </Pressable>

            <OrgLogoSettings />
            <OrgDetailsSettings />
            <LocationSettings />
            <TimeSettings />
          </View>
        )}

        {activeTab === "personal" && (
          <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
                  <Text className="text-sm font-semibold text-slate-900 dark:text-white mr-1">+91</Text>
                  <TextInput
                    value={formData.mobile}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, mobile: val.replace(/[^0-9]/g, '') }))}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                    maxLength={10}
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Emergency Contact</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                  <PhoneCall size={16} className="text-slate-400 mr-3" />
                  <Text className="text-sm font-semibold text-slate-900 dark:text-white mr-1">+91</Text>
                  <TextInput
                    value={getLocalPhoneNumber(formData.emergencyContact)}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, emergencyContact: val.replace(/[^0-9]/g, '') }))}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Enter emergency contact"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                    maxLength={10}
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

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Permanent Address</Text>
                <View className="flex-row bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                  <MapPin size={16} className="text-slate-400 mr-3 mt-0.5" />
                  <TextInput
                    value={formData.permanentAddress}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, permanentAddress: val }))}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Enter permanent address"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Gender</Text>
                <View className="flex-row bg-slate-100 dark:bg-[#0f172a] rounded-2xl p-1 w-full border border-slate-200 dark:border-slate-800/60">
                  {[{ label: "Male", value: "MALE" }, { label: "Female", value: "FEMALE" }, { label: "Other", value: "OTHER" }].map(opt => (
                    <Pressable key={opt.value} onPress={() => setFormData(p => ({ ...p, gender: opt.value }))}
                      className={`flex-1 items-center justify-center py-3 rounded-[12px] active:scale-[0.98] transition-transform ${formData.gender === opt.value ? "bg-white dark:bg-[#1e293b] shadow-sm border border-slate-200 dark:border-slate-700/50" : "border border-transparent"}`}>
                      <Text className={`text-[13px] font-bold ${formData.gender === opt.value ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Blood Group</Text>
                <View className="flex-row flex-wrap gap-2">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                    <Pressable key={bg} onPress={() => setFormData(p => ({ ...p, bloodGroup: bg }))}
                      className={`flex-1 min-w-[22%] py-3 rounded-2xl items-center justify-center border active:scale-95 transition-transform ${formData.bloodGroup === bg ? "bg-rose-500 border-rose-500 shadow-sm" : "bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800/80"}`}>
                      <Text className={`text-[14px] font-black ${formData.bloodGroup === bg ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>{bg}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Member Type</Text>
                <View className="flex-row bg-slate-100 dark:bg-[#0f172a] rounded-2xl p-1 w-full border border-slate-200 dark:border-slate-800/60">
                  {[{ label: "Senior", value: "SENIOR" }, { label: "Junior", value: "JUNIOR" }].map(opt => (
                    <Pressable key={opt.value} onPress={() => setFormData(p => ({ ...p, existingMember: opt.value }))}
                      className={`flex-1 items-center justify-center py-3 rounded-[12px] active:scale-[0.98] transition-transform ${formData.existingMember === opt.value ? "bg-white dark:bg-[#1e293b] shadow-sm border border-slate-200 dark:border-slate-700/50" : "border border-transparent"}`}>
                      <Text className={`text-[13px] font-bold ${formData.existingMember === opt.value ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Department</Text>
                <View className="flex-row items-center bg-slate-100 dark:bg-[#0f172a] rounded-2xl p-1 w-full border border-slate-200 dark:border-slate-800/60 overflow-hidden">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
                    {departmentsList.map(dept => (
                      <Pressable key={dept.id} onPress={() => setFormData(p => ({ ...p, departmentId: String(dept.id) }))}
                        className={`px-5 py-3 mx-1 rounded-[12px] active:scale-[0.98] transition-transform ${formData.departmentId === String(dept.id) ? "bg-white dark:bg-[#1e293b] shadow-sm border border-slate-200 dark:border-slate-700/50" : "border border-transparent"}`}>
                        <Text className={`text-[13px] font-bold ${formData.departmentId === String(dept.id) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>{dept.name}</Text>
                      </Pressable>
                    ))}
                    {departmentsList.length === 0 && (
                      <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">No departments available</Text>
                    )}
                  </ScrollView>
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Date of Birth</Text>
                {Platform.OS === "web" ? (
                  <View className="flex-row items-center bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3.5">
                    <Calendar size={18} className="text-slate-400 dark:text-slate-500 mr-3" />
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="flex-1 text-[14px] font-bold bg-transparent border-0 outline-none"
                      style={{ color: formData.dob ? (document.documentElement.classList.contains('dark') ? 'white' : '#0f172a') : "#94a3b8", width: "100%" }}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable onPress={() => setShowDatePicker(true)} className="flex-row items-center bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3.5">
                      <Calendar size={18} className="text-slate-400 dark:text-slate-500 mr-3" />
                      <Text className={`flex-1 text-[14px] font-bold ${formData.dob ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                        {formData.dob || "dd-mm-yyyy"}
                      </Text>
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.dob ? new Date(formData.dob) : new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </View>


              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Physical Form No.</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                  <FileText size={16} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.physicalFormNo}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, physicalFormNo: val }))}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Enter physical form number"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Document Uploader (Aadhar, PAN, etc.)</Text>
                <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Upload your identity or reference document (PDF, PNG, JPG). Max file size: 10 MB.
                  </Text>
                  
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    <Pressable onPress={handlePickDocument} className="flex-row items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3">
                      <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                      <Text className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {documentDataUrl || user?.documentUrl ? "Replace Document" : "Upload Document"}
                      </Text>
                    </Pressable>

                    {(removeDocument || documentDataUrl || user?.documentUrl) && (
                      <Pressable onPress={toggleDocumentRemoval} className="flex-row items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3">
                        <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                        <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                          {removeDocument ? "Keep Document" : documentDataUrl ? "Clear Selection" : "Remove"}
                        </Text>
                      </Pressable>
                    )}
                    
                    {user?.documentUrl && !removeDocument && !documentDataUrl && (
                      <Pressable onPress={() => WebBrowser.openBrowserAsync(user.documentUrl)} className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3">
                        <Link2 size={16} className="text-slate-600 dark:text-slate-300" />
                        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">View Current</Text>
                      </Pressable>
                    )}
                  </View>

                  <View className="bg-white dark:bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {removeDocument ? "Your document will be removed when you save." 
                        : documentDataUrl ? `Selected: ${documentName}. Click Save Changes.` 
                        : user?.documentUrl ? `Current: ${user.documentName || "Uploaded File"}` 
                        : "No document uploaded yet."}
                    </Text>
                  </View>
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
        )}

        {activeTab === "personal" && (
          <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <Text className="text-base font-black text-slate-900 dark:text-white mb-2">
              Help & Support
            </Text>
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-5">
              Need assistance? Reach out to our support team.
            </Text>
            
            <View className="flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-3">
              <View className="h-10 w-10 bg-blue-100 dark:bg-blue-500/20 rounded-full items-center justify-center">
                <Mail size={20} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Email Support</Text>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">support@veagle.com</Text>
              </View>
            </View>
            
            <View className="flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <View className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full items-center justify-center">
                <PhoneCall size={20} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Call Us</Text>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">+91 99999 99999</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "security" && (
          <View>
            {/* Referral Link */}
            {!isSuperAdmin && !!referralCode && (
              <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
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
            <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
          </View>
        )}
        </View>
      </ScrollView>
    </View>
    
  );
}
