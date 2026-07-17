import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Alert, Switch, Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ShieldAlert, UserRound, UserCog, UserCircle2 } from "lucide-react-native";
import { useGetSuperAdminUserByIdQuery, usePatchSuperAdminUserMutation } from "@/services/api/superAdminApi";
import { formatRoleLabel, ROLES, PERMISSION_GROUPS, formatPermissionLabel, getDefaultPermissionsForRole } from "@/utils/roles";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED", "BLOCKED"];
const ROLE_OPTIONS = [
  { value: "MEMBER", label: "Member" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "SUB_ADMIN", label: "Sub Admin" },
  { value: "ORG_ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const toDisplayText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toDateLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toPhoneLabel = (countryCode, number) => {
  const code = String(countryCode || "").trim();
  const mobile = String(number || "").trim();
  if (!code && !mobile) return "-";
  return `${code} ${mobile}`;
};

const toListLabel = (items = []) => {
  const values = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return values.length ? values.join(", ") : "-";
};

function DetailTile({ label, value }) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</Text>
      <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</Text>
    </View>
  );
}

export default function SuperAdminUserDetailScreen() {
  const { id } = useLocalSearchParams();
  const userId = Number(id);

  const { data: userData, isLoading, isFetching, refetch } = useGetSuperAdminUserByIdQuery(userId, {
    skip: !Number.isFinite(userId) || userId <= 0,
  });

  const [patchUserMutation] = usePatchSuperAdminUserMutation();

  const user = userData?.item || null;
  const organization = user?.organization || null;
  const attendanceSummary = user?.attendanceSummary || {};

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileCountryCode: "+91",
    mobile: "",
    emergencyContact: "",
    currentAddress: "",
    permanentAddress: "",
    role: "MEMBER",
    approvalStatus: "APPROVED",
    active: true,
    permissions: [],
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobileCountryCode: user.mobileCountryCode || "+91",
      mobile: user.mobile || "",
      emergencyContact: user.emergencyContact || "",
      currentAddress: user.currentAddress || "",
      permanentAddress: user.permanentAddress || "",
      role: user.role || "MEMBER",
      approvalStatus: user.approvalStatus || "APPROVED",
      active: Boolean(user.active || user.isActive),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
  }, [user]);

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
        <Text className="text-rose-500 font-bold">Invalid user ID.</Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="mt-4 bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl">
          <Text className="font-bold text-slate-800 dark:text-slate-200">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-sm font-semibold text-slate-500">Loading user details...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
        <Text className="text-amber-600 font-bold mb-4">User not found.</Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl">
          <Text className="font-bold text-slate-800 dark:text-slate-200">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert("Validation Error", "Name and email are required.");
      return;
    }

    try {
      setSavingProfile(true);
      await patchUserMutation({
        userId,
        name: form.name.trim(),
        email: form.email.trim(),
        mobileCountryCode: form.mobileCountryCode.trim(),
        mobile: form.mobile.trim(),
        role: form.role,
        status: form.approvalStatus,
        emergencyContact: form.emergencyContact.trim(),
        currentAddress: form.currentAddress.trim(),
        permanentAddress: form.permanentAddress.trim(),
      }).unwrap();
      Alert.alert("Success", "User profile updated successfully");
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update user profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePermissions = async () => {
    try {
      setSavingPermissions(true);
      await patchUserMutation({
        userId,
        permissions: form.permissions,
      }).unwrap();
      Alert.alert("Success", "User permissions updated successfully");
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleAccess = async () => {
    try {
      setTogglingAccess(true);
      await patchUserMutation({
        userId,
        isActive: !form.active,
      }).unwrap();
      Alert.alert("Success", !form.active ? "User unblocked successfully" : "User blocked successfully");
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update user access");
    } finally {
      setTogglingAccess(false);
    }
  };

  const onPermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const organizationAddress = [
    organization?.address,
    organization?.city,
    organization?.state,
    organization?.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">User Details</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        
        {/* Top Profile Card */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] p-5 mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <View className="flex-row items-center mb-5">
            {user.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} className="h-16 w-16 rounded-[16px] mr-4 bg-slate-100" />
            ) : (
              <View className="h-16 w-16 rounded-[16px] mr-4 bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <UserCircle2 size={32} className="text-slate-400" />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-black text-slate-900 dark:text-white mb-1" numberOfLines={1}>{form.name}</Text>
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{form.email}</Text>
              <View className={`self-start px-2 py-0.5 rounded-full border ${form.active ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50' : 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50'}`}>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${form.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {form.active ? "ACTIVE" : "BLOCKED"}
                </Text>
              </View>
            </View>
          </View>
          <Pressable 
            onPress={toggleAccess}
            disabled={togglingAccess}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-xl border ${form.active ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'} ${togglingAccess ? 'opacity-50' : ''}`}
          >
            {togglingAccess ? <ActivityIndicator size="small" color={form.active ? "#ef4444" : "#64748b"} /> : <ShieldAlert size={16} className={form.active ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"} />}
            <Text className={`text-sm font-bold ${form.active ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {form.active ? "Block User" : "Unblock User"}
            </Text>
          </Pressable>
        </View>

        {/* Details Grid Card */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] p-5 mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Complete Details</Text>
            <Text className="text-[9px] font-semibold text-slate-400">ID: ATTY-{toDisplayText(organization?.organizationCode, "GLOBAL")}-{user.id}</Text>
          </View>

          <View className="flex-row flex-wrap">
            <View className="w-1/2 pr-2"><DetailTile label="Database ID" value={toDisplayText(user.id)} /></View>
            <View className="w-1/2 pl-2"><DetailTile label="Role" value={formatRoleLabel(user.role)} /></View>
            <View className="w-1/2 pr-2"><DetailTile label="Approval" value={toDisplayText(user.approvalStatus)} /></View>
            <View className="w-1/2 pl-2"><DetailTile label="Mobile" value={toPhoneLabel(user.mobileCountryCode, user.mobile)} /></View>
            
            {!(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN) && (
              <View className="w-full"><DetailTile label="Emergency Contact" value={toDisplayText(user.emergencyContact)} /></View>
            )}
            
            <View className="w-full"><DetailTile label="Current Address" value={toDisplayText(user.currentAddress)} /></View>
            <View className="w-full"><DetailTile label="Permanent Address" value={toDisplayText(user.permanentAddress)} /></View>
            
            <View className="w-1/2 pr-2"><DetailTile label="Joined On" value={toDateLabel(user.createdAt)} /></View>
            <View className="w-1/2 pl-2"><DetailTile label="Last Login" value={toDateTimeLabel(user.lastLoginAt)} /></View>
            
            <View className="w-full h-px bg-slate-100 dark:bg-slate-800 my-2" />
            
            <View className="w-1/2 pr-2"><DetailTile label="Organization" value={toDisplayText(organization?.name)} /></View>
            <View className="w-1/2 pl-2"><DetailTile label="Org Code" value={toDisplayText(organization?.organizationCode)} /></View>
            <View className="w-full"><DetailTile label="Org Phone" value={toPhoneLabel(organization?.phoneCountryCode, organization?.phone)} /></View>
            <View className="w-full"><DetailTile label="Org Address" value={toDisplayText(organizationAddress)} /></View>
            
            <View className="w-full h-px bg-slate-100 dark:bg-slate-800 my-2" />
            
            <View className="w-full"><DetailTile label="Teams" value={toListLabel(user.teamNames)} /></View>
            <View className="w-full"><DetailTile label="Leads Teams" value={toListLabel(user.ledTeamNames)} /></View>
            
            <View className="w-1/2 pr-2"><DetailTile label="Att. Entries" value={toDisplayText(Number(attendanceSummary.totalEntries || 0))} /></View>
            <View className="w-1/2 pl-2"><DetailTile label="P / H / A" value={`${Number(attendanceSummary.presentDays || 0)} / ${Number(attendanceSummary.halfDays || 0)} / ${Number(attendanceSummary.absentDays || 0)}`} /></View>
            <View className="w-full"><DetailTile label="Worked Minutes" value={toDisplayText(Number(attendanceSummary.totalWorkedMinutes || 0))} /></View>
          </View>
        </View>

        {/* Profile Edit Form */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] p-5 mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Edit Profile & Access</Text>
          
          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Full Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Email</Text>
            <TextInput
              value={form.email}
              onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View className="mb-4 flex-row gap-2">
            <View className="w-24">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Code</Text>
              <TextInput
                value={form.mobileCountryCode}
                onChangeText={(text) => setForm((prev) => ({ ...prev, mobileCountryCode: text }))}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 text-center"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Mobile</Text>
              <TextInput
                value={form.mobile}
                onChangeText={(text) => setForm((prev) => ({ ...prev, mobile: text }))}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          
          {!(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN) && (
            <View className="mb-4">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Emergency Contact</Text>
              <TextInput
                value={form.emergencyContact}
                onChangeText={(text) => setForm((prev) => ({ ...prev, emergencyContact: text }))}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Current Address</Text>
            <TextInput
              value={form.currentAddress}
              onChangeText={(text) => setForm((prev) => ({ ...prev, currentAddress: text }))}
              multiline
              numberOfLines={2}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Permanent Address</Text>
            <TextInput
              value={form.permanentAddress}
              onChangeText={(text) => setForm((prev) => ({ ...prev, permanentAddress: text }))}
              multiline
              numberOfLines={2}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
            />
          </View>

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                {ROLE_OPTIONS.map(opt => (
                  <Pressable 
                    key={opt.value} 
                    onPress={() => setForm(prev => ({ ...prev, role: opt.value, permissions: getDefaultPermissionsForRole(opt.value) }))}
                    className={`px-4 py-3 border-r border-slate-200 dark:border-slate-800 ${form.role === opt.value ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  >
                    <Text className={`text-xs font-bold ${form.role === opt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Approval Status</Text>
            <View className="flex-row flex-wrap border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden">
              {STATUS_OPTIONS.map(opt => (
                <Pressable 
                  key={opt} 
                  onPress={() => setForm(prev => ({ ...prev, approvalStatus: opt }))}
                  className={`w-1/2 px-4 py-3 border-b border-r border-slate-200 dark:border-slate-800 ${form.approvalStatus === opt ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                >
                  <Text className={`text-xs font-bold ${form.approvalStatus === opt ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable 
            onPress={saveProfile}
            disabled={savingProfile}
            className={`flex-row items-center justify-center gap-2 py-3.5 bg-blue-600 rounded-xl shadow-sm shadow-blue-500/30 ${savingProfile ? 'opacity-70' : 'active:bg-blue-700'}`}
          >
            {savingProfile ? <ActivityIndicator size="small" color="#ffffff" /> : <UserRound size={16} color="#ffffff" />}
            <Text className="text-sm font-bold text-white">Update Profile</Text>
          </Pressable>
        </View>

        {/* Permissions Form */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Permissions</Text>
          
          <View className="gap-4 mb-6">
            {PERMISSION_GROUPS.map((group) => (
              <View key={group.key} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">{group.label}</Text>
                <View className="gap-3">
                  {group.items.map((permission) => (
                    <Pressable 
                      key={permission} 
                      onPress={() => onPermissionToggle(permission)}
                      className="flex-row items-center justify-between py-1"
                    >
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{formatPermissionLabel(permission)}</Text>
                      <View pointerEvents="none">
                        <Switch 
                          value={form.permissions.includes(permission)}
                          trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                          thumbColor="#ffffff"
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <Pressable 
            onPress={savePermissions}
            disabled={savingPermissions}
            className={`flex-row items-center justify-center gap-2 py-3.5 bg-blue-600 rounded-xl shadow-sm shadow-blue-500/30 ${savingPermissions ? 'opacity-70' : 'active:bg-blue-700'}`}
          >
            {savingPermissions ? <ActivityIndicator size="small" color="#ffffff" /> : <UserCog size={16} color="#ffffff" />}
            <Text className="text-sm font-bold text-white">Update Permissions</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
