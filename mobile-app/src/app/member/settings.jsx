import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, AlertCircle, HeartPulse, ShieldCheck, Lock, Building2, Users, Camera } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUpdateMeMutation, useForgotPasswordMutation } from "@/services/api/authApi";
import { setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, resolveUserPermissions, hasPermission, PERMISSIONS, ROLES } from "@/utils/roles";
import LocationSettings from "@/components/settings/LocationSettings";
import TimeSettings from "@/components/settings/TimeSettings";
import OrgLogoSettings from "@/components/settings/OrgLogoSettings";
import ThemeToggle from "@/components/ThemeToggle";
export default function MemberSettings() {
  const { user } = useAuthSession();
  const dispatch = useDispatch();
  
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: sendingReset }] = useForgotPasswordMutation();

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    emergencyContact: user?.emergencyContact || "",
    currentAddress: user?.currentAddress || "",
    permanentAddress: user?.permanentAddress || "",
    bloodGroup: user?.bloodGroup || "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabel = formatRoleLabel(user?.currentRole || user?.role);
  const permissionsCount = resolveUserPermissions(user).length;
  const workspaceCode = user?.organizationCode || user?.organization?.organizationCode || "N/A";
  
  const effectiveRole = user?.currentRole || user?.role || ROLES.MEMBER;
  const canManageLocationSettings = hasPermission(user, PERMISSIONS.LOCATION_SET);
  const canManageOrgSettings = effectiveRole === ROLES.ORG_ADMIN || effectiveRole === ROLES.SUB_ADMIN;

  const completionState = useMemo(() => {
    if (!user) return { percentage: 0, missing: [] };
    const fields = [
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "mobile", label: "Mobile Number" },
      { key: "emergencyContact", label: "Emergency Contact" },
      { key: "currentAddress", label: "Current Address" },
      { key: "permanentAddress", label: "Permanent Address" },
      { key: "bloodGroup", label: "Blood Group" },
    ];
    let filled = 0;
    const missing = [];
    for (const field of fields) {
      if (user[field.key]) filled++;
      else missing.push(field.label);
    }
    return {
      percentage: Math.round((filled / fields.length) * 100),
      missing,
    };
  }, [user]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and Email are required.");
      return;
    }
    try {
      const result = await updateMe(form).unwrap();
      dispatch(setCurrentUser(result.user));
      setSuccess("Personal details updated successfully!");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to update personal details.");
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return Alert.alert("Error", "No email associated with this account.");
    try {
      const payload = {
        email: user.email,
        loginAs: user?.currentRole || user?.role || "MEMBER",
      };
      if (user?.organizationId) payload.organizationId = user.organizationId;
      
      const result = await forgotPassword(payload).unwrap();
      Alert.alert("Success", result?.message || "Password reset link sent successfully!");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to send reset link.");
    }
  };

  const InputField = ({ label, icon: Icon, value, onChangeText, placeholder, keyboardType = "default" }) => (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider ml-1">
        {label}
      </Text>
      <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <Icon size={20} color="#64748b" className="mr-3" />
        <TextInput
          className="flex-1 text-base font-medium text-slate-900 dark:text-white"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  const SectionCard = ({ title, children, description }) => (
    <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
      <Text className="text-lg font-black text-slate-900 dark:text-white">{title}</Text>
      {description && <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-4">{description}</Text>}
      {children}
    </View>
  );

  const StaticField = ({ label, value, icon: Icon, color = "blue" }) => (
    <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[24px] mb-3 border border-slate-100 dark:border-slate-800">
      <View className={`h-10 w-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/20 items-center justify-center mr-3`}>
        <Icon size={18} className={`text-${color}-600 dark:text-${color}-400`} color="#2563eb" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</Text>
        <Text className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{value}</Text>
      </View>
    </View>
  );

  return (
    
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="px-5 pt-4 pb-4 flex-row items-center bg-slate-100 dark:bg-slate-950">
            <Pressable onPress={() => router.back()}><View className="h-10 w-10 rounded-full bg-white dark:bg-slate-900/80 items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 mr-4 ">
              <ArrowLeft size={20} className="text-slate-700 dark:text-white" />
            </View></Pressable>
            <View className="flex-1 flex-row items-center">
              <Text className="text-xl font-black text-slate-900 dark:text-white truncate">Settings</Text>
            </View>
            <ThemeToggle />
          </View>

          <View className="px-5">
            {/* Profile Header */}
            <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800 items-center">
              <Pressable onPress={() => Alert.alert("Notice", "Profile image updates are coming soon.")} className="relative mb-4 active:scale-95 transition-transform">
                {user?.profileImageUrl ? (
                  <Image source={{ uri: user?.profileImageUrl }} resizeMode="contain" className="h-24 w-24 rounded-2xl border-4 border-white dark:border-slate-800 bg-white" />
                ) : (
                  <View className="h-24 w-24 rounded-2xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center border-4 border-white dark:border-slate-800">
                    <Text className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      {user?.name?.charAt(0)?.toUpperCase() || "M"}
                    </Text>
                  </View>
                )}
                <View className="absolute bottom-0 right-0 h-8 w-8 bg-blue-600 rounded-full items-center justify-center border-2 border-white dark:border-slate-800">
                  <Camera size={14} color="#fff" />
                </View>
              </Pressable>
              <Text className="text-2xl font-black text-slate-900 dark:text-white text-center">
                {user?.name || "Workspace User"}
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
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workspace</Text>
                    <Text className="font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>{user?.organization?.name || workspaceCode || "N/A"}</Text>
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
              <Pressable 
                onPress={() => setActiveTab("security")}
                className={`flex-1 items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === "security" ? "bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800" : ""}`}
              >
                <Text className={`text-sm font-bold ${activeTab === "security" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                  Security
                </Text>
              </Pressable>
            </View>

            {error ? (
              <View className="mb-6 flex-row items-center bg-rose-50 dark:bg-rose-500/10 p-4 rounded-[24px] border border-rose-200">
                <AlertCircle size={20} color="#e11d48" className="mr-3" />
                <Text className="flex-1 text-sm font-semibold text-rose-700">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="mb-6 flex-row items-center bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-[24px] border border-emerald-200">
                <AlertCircle size={20} color="#10b981" className="mr-3" />
                <Text className="flex-1 text-sm font-semibold text-emerald-700">{success}</Text>
              </View>
            ) : null}

            {activeTab === "personal" && (
              <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <Text className="text-base font-black text-slate-900 dark:text-white mb-5 flex-row items-center">
                  Personal Details
                </Text>
                
                <View className="gap-y-4">
                  <InputField label="Full Name" icon={User} value={form.name} onChangeText={(text) => setForm({ ...form, name: text })} placeholder="e.g. John Doe" />
                  <InputField label="Email Address" icon={Mail} value={form.email} onChangeText={(text) => setForm({ ...form, email: text })} placeholder="e.g. john@example.com" keyboardType="email-address" />
                  <InputField label="Mobile Number" icon={Phone} value={form.mobile} onChangeText={(text) => setForm({ ...form, mobile: text })} placeholder="e.g. 9876543210" keyboardType="phone-pad" />
                  <InputField label="Emergency Contact" icon={HeartPulse} value={form.emergencyContact} onChangeText={(text) => setForm({ ...form, emergencyContact: text })} placeholder="e.g. 1234567890" keyboardType="phone-pad" />
                  <InputField label="Current Address" icon={MapPin} value={form.currentAddress} onChangeText={(text) => setForm({ ...form, currentAddress: text })} placeholder="e.g. 123 Main St, City" />
                  <InputField label="Permanent Address" icon={MapPin} value={form.permanentAddress} onChangeText={(text) => setForm({ ...form, permanentAddress: text })} placeholder="e.g. 456 Home St, City" />
                  <InputField label="Blood Group" icon={HeartPulse} value={form.bloodGroup} onChangeText={(text) => setForm({ ...form, bloodGroup: text })} placeholder="e.g. O+" />
                  
                  <Button variant="primary" size="lg" className="w-full mt-2" onPress={handleSave} disabled={isLoading} rightIcon={!isLoading && <Save size={20} color="white" />}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </View>
              </View>
            )}

            {activeTab === "security" && (
              <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <Text className="text-base font-black text-slate-900 dark:text-white mb-5 flex-row items-center">
                  Security
                </Text>
                <Button variant="secondary" size="lg" className="w-full" onPress={handleResetPassword} disabled={sendingReset} rightIcon={!sendingReset && <Lock size={20} color="#64748b" />}>
                  {sendingReset ? "Sending..." : "Send Reset Password Link"}
                </Button>
                <Text className="text-xs font-medium text-slate-400 mt-3 text-center">
                  A secure reset link will be sent to {user?.email || "your registered email"}.
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    
  );
}
