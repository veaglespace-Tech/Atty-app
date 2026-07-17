import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, AlertCircle, ShieldCheck, Lock, Globe, Users } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUpdateMeMutation, useForgotPasswordMutation } from "@/services/api/authApi";
import { setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, resolveUserPermissions } from "@/utils/roles";
import ThemeToggle from "@/components/ThemeToggle";
export default function SuperAdminSettings() {
  const { user } = useAuthSession();
  const dispatch = useDispatch();
  
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: sendingReset }] = useForgotPasswordMutation();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    emergencyContact: user?.emergencyContact || "",
    currentAddress: user?.currentAddress || "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabel = formatRoleLabel(user?.currentRole || user?.role);
  const permissionsCount = resolveUserPermissions(user).length;

  const completionState = useMemo(() => {
    if (!user) return { percentage: 0, missing: [] };
    const fields = [
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "mobile", label: "Mobile Number" },
      { key: "currentAddress", label: "Current Address" },
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
        loginAs: user?.currentRole || user?.role || "SUPER_ADMIN",
      };
      
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="px-5 pt-4 pb-4 flex-row items-center bg-slate-100 dark:bg-slate-950">
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="h-10 w-10 rounded-full bg-white dark:bg-slate-900/80 items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 mr-4 active:opacity-70">
              <ArrowLeft size={20} color="#334155" />
            </Pressable>
            <View className="flex-1 flex-row items-center">
              <Text className="text-xl font-black text-slate-900 dark:text-white truncate">Settings</Text>
            </View>
            <ThemeToggle />
          </View>

          <View className="px-5">
            {/* Hero Profile Completion Card */}
            <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex-row items-center">
              <View className="relative">
                <View className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center border-4 border-blue-50 dark:border-blue-900">
                  <Text className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {user?.name?.charAt(0)?.toUpperCase() || "S"}
                  </Text>
                </View>
                {completionState.percentage === 100 ? (
                  <View className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-blue-500 border-2 border-white items-center justify-center">
                    <ShieldCheck size={12} color="white" />
                  </View>
                ) : null}
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-black text-slate-900 dark:text-white">{user?.name || "Super Admin"}</Text>
                <View className="bg-slate-100 dark:bg-slate-800 self-start px-2 py-1 rounded-md mt-1 mb-2">
                  <Text className="text-[10px] font-black uppercase text-slate-500">{roleLabel}</Text>
                </View>
                <View className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <View 
                    className={`h-full ${completionState.percentage === 100 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                    style={{ width: `${completionState.percentage}%` }}
                  />
                </View>
                <Text className="text-[10px] font-bold text-slate-500 mt-1">Profile {completionState.percentage}% Complete</Text>
              </View>
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

            {/* Editable Form */}
            <SectionCard title="Editable Profile" description="Update your personal details here. Changes appear across the dashboard right away.">
              <InputField label="Full Name" icon={User} value={form.name} onChangeText={(text) => setForm({ ...form, name: text })} placeholder="e.g. John Doe" />
              <InputField label="Email Address" icon={Mail} value={form.email} onChangeText={(text) => setForm({ ...form, email: text })} placeholder="e.g. john@example.com" keyboardType="email-address" />
              <InputField label="Mobile Number" icon={Phone} value={form.mobile} onChangeText={(text) => setForm({ ...form, mobile: text })} placeholder="e.g. 9876543210" keyboardType="phone-pad" />
              <InputField label="Current Address" icon={MapPin} value={form.currentAddress} onChangeText={(text) => setForm({ ...form, currentAddress: text })} placeholder="e.g. 123 Main St, City" />
              
              <Button variant="primary" size="lg" className="w-full mt-2" onPress={handleSave} disabled={isLoading} rightIcon={!isLoading && <Save size={20} color="white" />}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </SectionCard>

            {/* Workspace & Permissions details */}
            <SectionCard title="Access Details" description="Your administrative scope and permissions.">
              <StaticField label="Access Scope" value="Platform-wide" icon={Globe} color="blue" />
              <StaticField label="Permissions" value={`${permissionsCount} Features Enabled`} icon={Users} color="purple" />
              <View className="mt-2">
                <Button variant="secondary" size="lg" className="w-full" onPress={() => router.push("/super-admin/roles")} rightIcon={<ShieldCheck size={20} color="#64748b" />}>
                  Manage System Roles
                </Button>
              </View>
            </SectionCard>

            {/* Security Settings */}
            <SectionCard title="Security" description="Your account is protected by secure sessions.">
              <Button variant="secondary" size="lg" className="w-full" onPress={handleResetPassword} disabled={sendingReset} rightIcon={!sendingReset && <Lock size={20} color="#64748b" />}>
                {sendingReset ? "Sending..." : "Send Reset Password Link"}
              </Button>
              <Text className="text-xs font-medium text-slate-400 mt-3 text-center">
                A secure reset link will be sent to {user?.email || "your registered email"}.
              </Text>
            </SectionCard>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    
  );
}
