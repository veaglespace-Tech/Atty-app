import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, ActivityIndicator, Switch, Alert, Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, ShieldAlert, UserCog, UserRound, Loader2,
  Mail, Phone, Calendar, Building2, ShieldCheck, Clock,
  FileBox, FileText, Download
} from "lucide-react-native";
import { useSelector } from "react-redux";
import {
  useGetOrgUserByIdQuery,
  usePatchOrgUserMutation,
  useGetOrgUserAttendanceLogsQuery,
  useDownloadOrgUserProfilePdfMutation,
  useDownloadOrgUserAttendancePdfMutation,
  useDownloadOrgUserAttendanceExcelMutation,
} from "@/services/api/orgApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";
import {
  PERMISSIONS, PERMISSION_GROUPS, ROLES,
  formatPermissionLabel, formatRoleLabel,
  getAssignablePermissionsByRole, getDefaultPermissionsForRole,
  getManagedRoleOptions, hasPermission, normalizeRole,
} from "@/utils/roles";
import { getLocalPhoneNumber } from "@/utils/phone";
import {
  getErrorMessage, normalizeTextInput, toDigitsOnly, validateManagedUserForm,
} from "@/utils/formValidation";

const STATUS_OPTIONS = ["APPROVED", "PENDING", "REJECTED"];

const toDisplayText = (value, fallback = "-") => String(value ?? "").trim() || fallback;
const toDateLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const toDateTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};
const toTimeLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

function DetailTile({ label, value }) {
  return (
    <View className="w-[48%] rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</Text>
      <Text className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100" numberOfLines={3}>{value}</Text>
    </View>
  );
}

export default function OrgUserDetailPage() {
  const { id } = useLocalSearchParams();
  const userId = Number(id);
  const authUser = useSelector((state) => state.auth.user);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [form, setForm] = useState({
    name: "", mobileCountryCode: "+91", mobile: "",
    role: "MEMBER", approvalStatus: "APPROVED", active: true, permissions: [],
  });

  const { data: userData, isLoading, isFetching, refetch } = useGetOrgUserByIdQuery(userId, { skip: !Number.isFinite(userId) || userId <= 0 });
  const [patchUserMutation] = usePatchOrgUserMutation();
  const { data: logsData, isLoading: loadingLogs } = useGetOrgUserAttendanceLogsQuery(
    { userId, params: `period=${period}` },
    { skip: !Number.isFinite(userId) || userId <= 0 }
  );
  
  const [downloadProfilePdf, { isLoading: downloadingProfilePdf }] = useDownloadOrgUserProfilePdfMutation();
  const [downloadAttendancePdf, { isLoading: downloadingAttendancePdf }] = useDownloadOrgUserAttendancePdfMutation();
  const [downloadAttendanceExcel, { isLoading: downloadingAttendanceExcel }] = useDownloadOrgUserAttendanceExcelMutation();

  const user = userData?.item || null;
  const attendanceSummary = user?.attendanceSummary || {};
  const actorRole = normalizeRole(authUser?.currentRole);

  const manageableRoleOptions = useMemo(() => getManagedRoleOptions(actorRole), [actorRole]);
  const assignablePermissions = useMemo(() => getAssignablePermissionsByRole(actorRole), [actorRole]);
  const permissionGroups = useMemo(
    () => PERMISSION_GROUPS.map((g) => ({ ...g, items: g.items.filter((p) => assignablePermissions.includes(p)) })).filter((g) => g.items.length > 0),
    [assignablePermissions]
  );

  const canUpdateStatus = hasPermission(authUser, PERMISSIONS.USERS_STATUS_UPDATE);
  const canToggleAccess = hasPermission(authUser, PERMISSIONS.USERS_ACTIVE_TOGGLE);
  const canEditUser = hasPermission(authUser, PERMISSIONS.USERS_CREATE);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      mobileCountryCode: user.mobileCountryCode || "+91",
      mobile: getLocalPhoneNumber(user.mobile, user.mobileCountryCode),
      role: normalizeRole(user.role),
      approvalStatus: user.approvalStatus || "APPROVED",
      active: Boolean(user.active),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
  }, [user]);

  const saveProfile = async () => {
    const validationError = validateManagedUserForm({ name: form.name, email: user?.email, mobile: form.mobile, password: "", passwordRequired: false });
    if (validationError) { setError(validationError); return; }
    try {
      setSavingProfile(true); setError(""); setMessage("");
      await patchUserMutation({
        userId, name: normalizeTextInput(form.name),
        mobileCountryCode: form.mobileCountryCode, mobile: toDigitsOnly(form.mobile),
        role: form.role, ...(canUpdateStatus ? { status: form.approvalStatus } : {}),
      }).unwrap();
      setMessage("User profile updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update user")); } finally { setSavingProfile(false); }
  };

  const savePermissions = async () => {
    try {
      setSavingPermissions(true); setError(""); setMessage("");
      await patchUserMutation({ userId, permissions: form.permissions }).unwrap();
      setMessage("Permissions updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update permissions")); } finally { setSavingPermissions(false); }
  };

  const toggleAccess = async () => {
    try {
      setTogglingAccess(true); setError(""); setMessage("");
      await patchUserMutation({ userId, isActive: !form.active }).unwrap();
      setMessage(!form.active ? "User unblocked" : "User blocked"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to toggle access")); } finally { setTogglingAccess(false); }
  };

  const onPermissionToggle = (perm) => {
    if (!canEditUser) return;
    setForm((p) => ({ ...p, permissions: p.permissions.includes(perm) ? p.permissions.filter((x) => x !== perm) : [...p.permissions, perm] }));
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-sm font-semibold text-slate-500">Loading user...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-5">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-4">
          <ArrowLeft size={18} color="#64748b" />
          <Text className="text-sm font-bold text-slate-600 dark:text-slate-400">Back to Users</Text>
        </Pressable>
        <View className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">User not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-3">
          <ArrowLeft size={18} color="#64748b" />
          <Text className="text-sm font-bold text-slate-600 dark:text-slate-400">Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-4">
          {user.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={{ width: 56, height: 56, borderRadius: 20 }} resizeMode="cover" />
          ) : (
            <View className="h-14 w-14 rounded-[20px] bg-blue-50 dark:bg-blue-500/10 items-center justify-center border border-blue-100 dark:border-blue-800/30">
              <Text className="text-2xl font-black text-blue-600 dark:text-blue-400">{(form.name || "?")[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>{form.name}</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
        <View className="flex-row gap-2 mt-3">
          <Pressable
            onPress={toggleAccess}
            disabled={!canToggleAccess || togglingAccess}
            className={`flex-1 py-3 rounded-2xl items-center flex-row justify-center gap-2 ${form.active ? "bg-rose-500" : "bg-emerald-500"}`}>
            {togglingAccess ? <ActivityIndicator size="small" color="#fff" /> : <ShieldAlert size={15} color="#fff" />}
            <Text className="text-white text-sm font-bold">{form.active ? "Block" : "Unblock"}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}>

        {error ? <View className="mb-3 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><Text className="text-sm text-red-700 dark:text-red-300">{error}</Text></View> : null}
        {message ? <View className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><Text className="text-sm text-emerald-700 dark:text-emerald-300">{message}</Text></View> : null}

        {/* User Details */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Complete Details</Text>
            <Pressable 
              onPress={async () => {
                try {
                  const blob = await downloadProfilePdf(userId).unwrap();
                  await downloadAndShareBlob(blob, `user-profile-${userId}.pdf`);
                } catch (e) { Alert.alert("Error", "Failed to download PDF"); }
              }}
              disabled={downloadingProfilePdf}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-800/30"
            >
              {downloadingProfilePdf ? <ActivityIndicator size="small" color="#2563eb" /> : <FileBox size={12} color="#2563eb" />}
              <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Download PDF</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <DetailTile label="User ID" value={toDisplayText(user.id)} />
            <DetailTile label="Role" value={formatRoleLabel(user.role)} />
            <DetailTile label="Status" value={toDisplayText(user.approvalStatus)} />
            <DetailTile label="Access" value={user.active ? "Active" : "Blocked"} />
            <DetailTile label="Email" value={toDisplayText(user.email)} />
            <DetailTile label="Mobile" value={`${user.mobileCountryCode || ""} ${user.mobile || "-"}`} />
            <DetailTile label="Joined On" value={toDateLabel(user.membership?.joinedAt || user.joinedAt)} />
            <DetailTile label="Last Login" value={toDateTimeLabel(user.lastLoginAt)} />
            <DetailTile label="Organization" value={toDisplayText(user.organization?.name)} />
            <DetailTile label="Org Code" value={toDisplayText(user.organization?.organizationCode)} />
            <DetailTile label="Present" value={String(attendanceSummary.presentDays || 0)} />
            <DetailTile label="Absent" value={String(attendanceSummary.absentDays || 0)} />
          </View>
        </View>

        {/* Edit Profile */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Profile & Access</Text>
          <View className="gap-3">
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Name</Text>
              <TextInput value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} editable={canEditUser}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Mobile</Text>
              <View className="flex-row gap-2">
                <TextInput value={form.mobileCountryCode} onChangeText={(v) => setForm((p) => ({ ...p, mobileCountryCode: v }))} editable={canEditUser}
                  className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
                <TextInput value={form.mobile} onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^\d]/g, "") }))} editable={canEditUser} keyboardType="phone-pad"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {manageableRoleOptions.map((r) => (
                  <Pressable key={r.value} onPress={() => { if (!canEditUser) return; setForm((p) => ({ ...p, role: r.value, permissions: getDefaultPermissionsForRole(r.value) })); }}
                    className={`px-4 py-2.5 rounded-2xl border ${form.role === r.value ? "bg-blue-600 border-blue-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                    <Text className={`text-[13px] font-bold ${form.role === r.value ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>{r.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {canUpdateStatus && (
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Approval Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable key={s} onPress={() => setForm((p) => ({ ...p, approvalStatus: s }))}
                      className={`px-4 py-2.5 rounded-2xl border ${form.approvalStatus === s ? "bg-blue-600 border-blue-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                      <Text className={`text-[13px] font-bold ${form.approvalStatus === s ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>{s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <Pressable onPress={saveProfile} disabled={!canEditUser || savingProfile}
              className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${savingProfile ? "bg-blue-400" : "bg-blue-600"}`}>
              {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : <UserRound size={16} color="#fff" />}
              <Text className="text-white text-sm font-bold">Update Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Permissions */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Permissions</Text>
          <View className="gap-3">
            {permissionGroups.map((group) => (
              <View key={group.key} className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 gap-2">
                <Text className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{group.label}</Text>
                {group.items.map((perm) => (
                  <Pressable key={perm} onPress={() => onPermissionToggle(perm)} className="flex-row items-center justify-between py-1.5">
                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">{formatPermissionLabel(perm)}</Text>
                    <View pointerEvents="none">
                      <Switch value={form.permissions.includes(perm)} trackColor={{ false: "#e2e8f0", true: "#2563eb" }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable onPress={savePermissions} disabled={!canEditUser || savingPermissions}
              className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${savingPermissions ? "bg-blue-400" : "bg-blue-600"}`}>
              {savingPermissions ? <ActivityIndicator size="small" color="#fff" /> : <UserCog size={16} color="#fff" />}
              <Text className="text-white text-sm font-bold">Update Permissions</Text>
            </Pressable>
          </View>
        </View>

        {/* Attendance Logs */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Attendance Logs</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={async () => {
                  try {
                    const blob = await downloadAttendancePdf({ userId, params: `period=${period}` }).unwrap();
                    await downloadAndShareBlob(blob, `user-attendance-${userId}-${period}.pdf`);
                  } catch (e) { Alert.alert("Error", "Failed to download PDF"); }
                }}
                disabled={downloadingAttendancePdf}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {downloadingAttendancePdf ? <ActivityIndicator size="small" /> : <FileBox size={14} color="#64748b" />}
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    const blob = await downloadAttendanceExcel({ userId, params: `period=${period}` }).unwrap();
                    await downloadAndShareBlob(blob, `user-attendance-${userId}-${period}.xlsx`);
                  } catch (e) { Alert.alert("Error", "Failed to download Excel"); }
                }}
                disabled={downloadingAttendanceExcel}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {downloadingAttendanceExcel ? <ActivityIndicator size="small" /> : <FileText size={14} color="#64748b" />}
              </Pressable>
            </View>
          </View>
          <Text className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-4">Day-by-day punch records</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
            {["weekly", "monthly", "custom"].map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)}
                className={`px-4 py-2 rounded-full border ${period === p ? "bg-blue-600 border-blue-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                <Text className={`text-[12px] font-bold capitalize ${period === p ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {loadingLogs ? (
            <View className="py-8 items-center"><ActivityIndicator size="large" color="#2563eb" /></View>
          ) : logsData?.items?.length ? (
            <View className="gap-3">
              {logsData.items.map((log) => (
                <View key={log.id} className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{log.date}</Text>
                    <View className={`px-2 py-0.5 rounded-full ${
                      log.status === "PRESENT" ? "bg-emerald-100 dark:bg-emerald-500/10" :
                      log.status === "ABSENT" ? "bg-rose-100 dark:bg-rose-500/10" :
                      "bg-amber-100 dark:bg-amber-500/10"
                    }`}>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${
                        log.status === "PRESENT" ? "text-emerald-600 dark:text-emerald-400" :
                        log.status === "ABSENT" ? "text-rose-600 dark:text-rose-400" :
                        "text-amber-600 dark:text-amber-400"
                      }`}>{log.status}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In</Text>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{toTimeLabel(log.punchInAt)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Out</Text>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{toTimeLabel(log.punchOutAt)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hours</Text>
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{Number(log.workedHours || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="py-8 items-center">
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">No records for this period.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
