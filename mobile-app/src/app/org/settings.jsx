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
import TimeSettings from "@/components/org/settings/TimeSettings";
import LocationSettings from "@/components/org/settings/LocationSettings";
import OrgLogoSettings from "@/components/org/settings/OrgLogoSettings";
import OrgDetailsSettings from "@/components/org/settings/OrgDetailsSettings";
// --- Main Settings Screen ---
export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: isResetting }] = useForgotPasswordMutation();
  const [activeTab, setActiveTab] = useState("personal");
  
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
        quality: 0.2,
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
      const payload = {};
      if (formData.name && formData.name !== user?.name) payload.name = formData.name;
      if (formData.mobile && formData.mobile !== user?.mobile) payload.mobile = formData.mobile;
      if (formData.emergencyContact !== user?.emergencyContact) payload.emergencyContact = formData.emergencyContact;
      if (formData.currentAddress !== user?.currentAddress) payload.currentAddress = formData.currentAddress;

      if (profileImageDataUrl) {
        payload.profileImageDataUrl = profileImageDataUrl;
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
              <View flex={1}>
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workspace</Text>
                <Text className="font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>{organizationName}</Text>
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
      </ScrollView>
    </View>
    
  );
}
