import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, ToastAndroid, Platform, TextInput, Modal, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, UserCircle2, Download, ShieldAlert, Mail, Phone, Calendar, Briefcase, MapPin, Check, UserCog, UserRound, ChevronDown } from "lucide-react-native";
import { 
  useGetOrgUserByIdQuery, 
  usePatchOrgUserMutation, 
  useDownloadOrgUserProfilePdfMutation 
} from "@/services/api/orgApi";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSelector } from "react-redux";
import {
  PERMISSION_GROUPS,
  formatPermissionLabel,
  getAssignablePermissionsByRole,
  getManagedRoleOptions,
  hasPermission,
  PERMISSIONS,
  normalizeRole,
  getDefaultPermissionsForRole
} from "@/utils/roles";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED"];

const DetailTile = ({ label, value, icon: Icon }) => (
  <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex-1 min-w-[45%] mb-3">
    <View className="flex-row items-center gap-2 mb-2">
      {Icon && <Icon size={14} className="text-slate-400" />}
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Text>
    </View>
    <Text className="text-sm font-semibold text-slate-900 dark:text-white">{value || "-"}</Text>
  </View>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <Pressable 
    onPress={onChange} 
    disabled={disabled}
    className="flex-row items-center gap-3 py-2"
  >
    <View className={`h-5 w-5 rounded border items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 bg-transparent'} ${disabled ? 'opacity-50' : ''}`}>
      {checked && <Check size={14} color="#fff" />}
    </View>
    <Text className={`text-xs font-semibold ${disabled ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</Text>
  </Pressable>
);

export default function OrgUserDetailPage() {
  const { id } = useLocalSearchParams();
  const userId = Number(id);

  const authUser = useSelector((state) => state.auth.user);
  
  const { data, isLoading, isFetching, refetch } = useGetOrgUserByIdQuery(userId, { skip: !userId });
  const [patchUser, { isLoading: patching }] = usePatchOrgUserMutation();
  const [downloadPdf, { isLoading: downloadingPdf }] = useDownloadOrgUserProfilePdfMutation();

  const user = data?.item;
  const attendanceSummary = user?.attendanceSummary || {};

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    role: "MEMBER",
    approvalStatus: "APPROVED",
    permissions: [],
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [modalType, setModalType] = useState(null); // "ROLE" or "STATUS"

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        mobile: user.mobile || "",
        role: normalizeRole(user.role),
        approvalStatus: user.approvalStatus || user.status || "APPROVED",
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
      });
    }
  }, [user]);

  const actorRole = normalizeRole(authUser?.currentRole);
  const manageableRoleOptions = useMemo(() => getManagedRoleOptions(actorRole), [actorRole]);
  const assignablePermissions = useMemo(() => getAssignablePermissionsByRole(actorRole), [actorRole]);
  const permissionGroups = useMemo(() => 
    PERMISSION_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((p) => assignablePermissions.includes(p)),
    })).filter((group) => group.items.length > 0), 
  [assignablePermissions]);

  const canEditUser = hasPermission(authUser, PERMISSIONS.USERS_CREATE);
  const canUpdateStatus = hasPermission(authUser, PERMISSIONS.USERS_STATUS_UPDATE);

  const handleToggleAccess = async () => {
    if (!user) return;
    try {
      await patchUser({ userId, isActive: !user.active }).unwrap();
      if (Platform.OS === 'android') {
        ToastAndroid.show(user.active ? "User blocked" : "User unblocked", ToastAndroid.SHORT);
      }
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update user access");
    }
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await patchUser({
        userId,
        name: form.name,
        mobile: form.mobile,
        role: form.role,
        ...(canUpdateStatus ? { status: form.approvalStatus } : {}),
      }).unwrap();
      if (Platform.OS === 'android') ToastAndroid.show("Profile updated", ToastAndroid.SHORT);
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePermissions = async () => {
    try {
      setSavingPermissions(true);
      await patchUser({
        userId,
        permissions: form.permissions,
      }).unwrap();
      if (Platform.OS === 'android') ToastAndroid.show("Permissions updated", ToastAndroid.SHORT);
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadPdf(userId).unwrap();
      const fr = new FileReader();
      fr.onload = async () => {
        const base64data = fr.result.split(',')[1];
        const safeName = (user?.name || "user").replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileUri = FileSystem.documentDirectory + `${safeName}-profile.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", "PDF generated, but sharing is not available on this device.");
        }
      };
      fr.readAsDataURL(blob);
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to download PDF");
    }
  };

  const onPermissionToggle = (permission) => {
    if (!canEditUser) return;
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const onRoleSelect = (roleValue) => {
    setForm((prev) => ({
      ...prev,
      role: roleValue,
      permissions: getDefaultPermissionsForRole(roleValue),
    }));
    setModalType(null);
  };

  const renderDropdownModal = () => (
    <Modal visible={!!modalType} transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} onPress={() => setModalType(null)} className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">
            {modalType === "ROLE" ? "Select Role" : "Select Status"}
          </Text>
          {(modalType === "ROLE" ? manageableRoleOptions : STATUS_OPTIONS.map(s => ({label: s, value: s}))).map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => modalType === "ROLE" ? onRoleSelect(opt.value) : (setForm(p => ({...p, approvalStatus: opt.value})), setModalType(null))}
              className="py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
            >
              <Text className={`text-base font-bold ${(modalType === "ROLE" ? form.role : form.approvalStatus) === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {opt.label}
              </Text>
              {(modalType === "ROLE" ? form.role : form.approvalStatus) === opt.value && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
            </Pressable>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (isLoading && !user) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
        <Text className="text-slate-500 font-medium">User not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-blue-600 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex-1 text-center mr-10" numberOfLines={1}>
          {user.name}
        </Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* TOP CARD */}
        <View className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 mb-6 shadow-sm shadow-slate-200/50 dark:shadow-none items-center">
          <View className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center mb-4 border-4 border-white dark:border-slate-900 shadow-sm">
            <UserCircle2 size={48} className="text-blue-500" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-1">{user.name}</Text>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">{user.email}</Text>
          
          <View className="flex-row items-center gap-2 mb-6 flex-wrap justify-center">
            <View className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {user.role === 'TEAM_LEADER' ? 'Team Leader' : user.role === 'MEMBER' ? 'Member' : user.role}
              </Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full border ${user.active ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20'}`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${user.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {user.active ? "ACTIVE" : "BLOCKED"}
              </Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full border ${
              user.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' : 
              user.status === 'PENDING' ? 'bg-amber-50 border-amber-200' : 
              'bg-slate-100 border-slate-200'
            }`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${
                user.status === 'APPROVED' ? 'text-emerald-700' : 
                user.status === 'PENDING' ? 'text-amber-700' : 
                'text-slate-600'
              }`}>
                {user.status || 'UNKNOWN'}
              </Text>
            </View>
          </View>

          <View className="flex-col w-full gap-3 mt-4">
            <Pressable 
              onPress={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full bg-blue-600 dark:bg-blue-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-70"
            >
              {downloadingPdf ? <ActivityIndicator size="small" color="#ffffff" /> : <Download size={16} className="text-white" />}
              <Text className="text-sm font-bold text-white">Download User Details PDF</Text>
            </Pressable>

            <Pressable 
              onPress={handleToggleAccess}
              disabled={patching}
              className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-70 ${
                user.active ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
              }`}
            >
              {patching && !savingProfile && !savingPermissions ? (
                <ActivityIndicator size="small" color={user.active ? "#e11d48" : "#059669"} />
              ) : (
                <ShieldAlert size={16} className={user.active ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"} />
              )}
              <Text className={`text-sm font-bold ${user.active ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {user.active ? "Block User" : "Unblock User"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* PROFILE & ACCESS EDIT FORM */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Profile & Access</Text>
        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 mb-6">
          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Name</Text>
            <TextInput 
              value={form.name}
              onChangeText={(text) => setForm(p => ({...p, name: text}))}
              editable={canEditUser}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
            />
          </View>
          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mobile Number</Text>
            <TextInput 
              value={form.mobile}
              onChangeText={(text) => setForm(p => ({...p, mobile: text}))}
              editable={canEditUser}
              keyboardType="phone-pad"
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
            />
          </View>
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Role</Text>
              <Pressable 
                onPress={() => canEditUser && setModalType("ROLE")}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">{manageableRoleOptions.find(r => r.value === form.role)?.label || form.role}</Text>
                {canEditUser && <ChevronDown size={14} className="text-slate-400" />}
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</Text>
              <Pressable 
                onPress={() => canUpdateStatus && setModalType("STATUS")}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-sm font-semibold text-slate-900 dark:text-white">{form.approvalStatus}</Text>
                {canUpdateStatus && <ChevronDown size={14} className="text-slate-400" />}
              </Pressable>
            </View>
          </View>

          <Pressable 
            onPress={saveProfile}
            disabled={!canEditUser || savingProfile}
            className="w-full bg-blue-600 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70 disabled:opacity-50"
          >
            {savingProfile ? <ActivityIndicator size="small" color="#ffffff" /> : <UserRound size={16} className="text-white" />}
            <Text className="text-sm font-bold text-white">Update Profile</Text>
          </Pressable>
        </View>

        {/* PERMISSIONS */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Permissions</Text>
        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 mb-6">
          {permissionGroups.map((group, index) => (
            <View key={group.key} className={index !== permissionGroups.length - 1 ? "border-b border-slate-100 dark:border-slate-800 mb-4 pb-4" : "mb-6"}>
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">{group.label}</Text>
              <View className="flex-row flex-wrap gap-x-6 gap-y-1">
                {group.items.map((permission) => (
                  <View key={permission} className="min-w-[45%]">
                    <Checkbox 
                      label={formatPermissionLabel(permission)} 
                      checked={form.permissions.includes(permission)}
                      onChange={() => onPermissionToggle(permission)}
                      disabled={!canEditUser}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          
          <Pressable 
            onPress={savePermissions}
            disabled={!canEditUser || savingPermissions}
            className="w-full bg-blue-600 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70 disabled:opacity-50"
          >
            {savingPermissions ? <ActivityIndicator size="small" color="#ffffff" /> : <UserCog size={16} className="text-white" />}
            <Text className="text-sm font-bold text-white">Update Permissions</Text>
          </Pressable>
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Contact Details</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          <DetailTile label="Email" value={user.email} icon={Mail} />
          <DetailTile label="Emergency" value={user.emergencyContact} icon={ShieldAlert} />
          <DetailTile label="Address" value={user.currentAddress} icon={MapPin} />
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Platform Details</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          <DetailTile label="Joined On" value={user.membership?.joinedAt || user.joinedAt ? new Date(user.membership?.joinedAt || user.joinedAt).toLocaleDateString() : "-"} icon={Calendar} />
          <DetailTile label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "-"} icon={Calendar} />
          <DetailTile label="Assigned Teams" value={user.teamNames?.length ? user.teamNames.join(", ") : "-"} icon={Briefcase} />
          <DetailTile label="Leads Teams" value={user.ledTeamNames?.length ? user.ledTeamNames.join(", ") : "-"} icon={Briefcase} />
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Attendance Summary</Text>
        <View className="bg-[#0f172a] dark:bg-[#020617] rounded-[24px] p-5 border border-slate-800">
          <View className="flex-row items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Entries</Text>
              <Text className="text-xl font-black text-white">{attendanceSummary.totalEntries || 0}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Worked</Text>
              <Text className="text-xl font-black text-white">{attendanceSummary.totalWorkedMinutes ? Math.round(attendanceSummary.totalWorkedMinutes / 60) : 0} hrs</Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Present</Text>
              <Text className="text-lg font-bold text-white">{attendanceSummary.presentDays || 0}</Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Half Day</Text>
              <Text className="text-lg font-bold text-white">{attendanceSummary.halfDays || 0}</Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Absent</Text>
              <Text className="text-lg font-bold text-white">{attendanceSummary.absentDays || 0}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
      {renderDropdownModal()}
    </View>
  );
}
