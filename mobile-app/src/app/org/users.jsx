import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, ActivityIndicator, Modal, Switch, Alert,
} from "react-native";
import { router } from "expo-router";
import {
  Search, User, ShieldCheck, Mail, Phone, Plus, X,
  ChevronDown, ChevronUp, RefreshCw, UserPlus, Loader2,
} from "lucide-react-native";
import { useSelector } from "react-redux";
import {
  useGetOrgUsersQuery,
  useCreateOrgUserMutation,
} from "@/services/api/orgApi";
import {
  ROLES, ORG_MANAGED_ROLE_OPTIONS, PERMISSION_GROUPS,
  formatRoleLabel, formatPermissionLabel, normalizeRole,
  getAssignablePermissionsByRole, getDefaultPermissionsForRole,
  getManagedRoleOptions,
} from "@/utils/roles";
import { DASHBOARD_FETCH_LIMITS } from "@/utils/dashboardLimits";
import {
  getErrorMessage, normalizeEmailInput, normalizeTextInput,
  toDigitsOnly, validateManagedUserForm,
} from "@/utils/formValidation";

const STATUS_TABS = ["ALL", "APPROVED", "PENDING", "REJECTED"];
const STATUS_OPTIONS = ["APPROVED", "PENDING"];

export default function OrgUsersPage() {
  const authUser = useSelector((state) => state.auth.user);
  const actorRole = normalizeRole(authUser?.currentRole);

  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileCountryCode: "+91",
    mobile: "",
    role: ROLES.MEMBER,
    status: "APPROVED",
    password: "",
    permissions: getDefaultPermissionsForRole(ROLES.MEMBER),
  });

  const { data: usersData, isLoading, isFetching, refetch } = useGetOrgUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS);
  const [createUserMutation] = useCreateOrgUserMutation();

  const users = Array.isArray(usersData?.items) ? usersData.items : [];
  const summary = Array.isArray(usersData?.summary) ? usersData.summary : [];

  const summaryMap = useMemo(() => {
    const map = new Map();
    for (const item of summary) {
      if (item?.label) map.set(item.label, item.value);
    }
    return map;
  }, [summary]);

  const manageableRoleOptions = useMemo(
    () => getManagedRoleOptions(authUser?.currentRole),
    [authUser?.currentRole]
  );

  const assignablePermissions = useMemo(
    () => getAssignablePermissionsByRole(actorRole),
    [actorRole]
  );

  const permissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((p) => assignablePermissions.includes(p)),
      })).filter((group) => group.items.length > 0),
    [assignablePermissions]
  );

  // Auto-set default permissions when role changes
  useEffect(() => {
    const role = normalizeRole(form.role);
    const defaults = getDefaultPermissionsForRole(role).filter((p) =>
      assignablePermissions.includes(p)
    );
    setForm((prev) => ({ ...prev, permissions: defaults }));
  }, [form.role, assignablePermissions]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (activeTab !== "ALL" && String(user.approvalStatus) !== activeTab) return false;
      if (roleFilter !== "ALL" && normalizeRole(user.role) !== roleFilter) return false;
      if (activeFilter === "ACTIVE" && !user.active) return false;
      if (activeFilter === "BLOCKED" && user.active) return false;
      if (query) {
        const haystack = [user.name, user.email, user.mobile]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [users, activeTab, searchQuery, roleFilter, activeFilter]);

  const onPermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      mobileCountryCode: "+91",
      mobile: "",
      role: ROLES.MEMBER,
      status: "APPROVED",
      password: "",
      permissions: getDefaultPermissionsForRole(ROLES.MEMBER),
    });
  };

  const createUser = async () => {
    const validationError = validateManagedUserForm({
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      password: form.password,
      passwordRequired: false,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await createUserMutation({
        name: normalizeTextInput(form.name),
        email: normalizeEmailInput(form.email),
        mobileCountryCode: form.mobileCountryCode,
        mobile: toDigitsOnly(form.mobile),
        role: form.role,
        status: form.status,
        permissions: form.permissions,
        ...(form.password ? { password: form.password } : {}),
      }).unwrap();

      setMessage(
        response?.tempPassword
          ? `User created. Temporary password: ${response.tempPassword}`
          : "User created successfully"
      );
      resetForm();
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Users</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setCreateOpen(true)}
              className="flex-row items-center gap-1.5 bg-blue-600 px-4 py-2.5 rounded-2xl">
              <Plus size={14} color="#fff" />
              <Text className="text-white text-[13px] font-bold">Create</Text>
            </Pressable>
            <Pressable
              onPress={refetch}
              className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl">
              <RefreshCw size={16} color="#64748b" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
          <Search size={18} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, or mobile..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white"
          />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-5 px-5"
          contentContainerStyle={{ gap: 8, paddingRight: 40 }}>
          {STATUS_TABS.map((tab) => {
            const isActive = tab === activeTab;
            const count = tab === "ALL" ? users.length : users.filter((u) => String(u.approvalStatus) === tab).length;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-full border flex-row items-center gap-2 ${
                  isActive
                    ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                    : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                }`}>
                <Text className={`text-[13px] font-bold tracking-wide ${isActive ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>
                  {tab}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <Text className={`text-[10px] font-black ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Role & Access Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2 -mx-5 px-5"
          contentContainerStyle={{ gap: 8, paddingRight: 40 }}>
          {[
            { label: "All Roles", value: "ALL", filter: roleFilter, set: setRoleFilter },
            ...ORG_MANAGED_ROLE_OPTIONS.map((r) => ({ label: r.label, value: r.value, filter: roleFilter, set: setRoleFilter })),
          ].map((item) => (
            <Pressable
              key={`role-${item.value}`}
              onPress={() => item.set(item.value)}
              className={`px-3 py-2 rounded-full border ${
                item.filter === item.value
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
              }`}>
              <Text className={`text-[12px] font-bold ${
                item.filter === item.value ? "text-white" : "text-slate-600 dark:text-slate-400"
              }`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          {["ALL", "ACTIVE", "BLOCKED"].map((val) => (
            <Pressable
              key={`access-${val}`}
              onPress={() => setActiveFilter(val)}
              className={`px-3 py-2 rounded-full border ${
                activeFilter === val
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
              }`}>
              <Text className={`text-[12px] font-bold ${
                activeFilter === val ? "text-white" : "text-slate-600 dark:text-slate-400"
              }`}>
                {val === "ALL" ? "All Access" : val}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* SUMMARY CARDS */}
      <View className="flex-row flex-wrap px-4 pt-4 gap-3">
        {[
          { label: "Total", value: summaryMap.get("Total Users") || 0 },
          { label: "Approved", value: summaryMap.get("Approved") || 0 },
          { label: "Pending", value: summaryMap.get("Pending") || 0 },
          { label: "Active", value: summaryMap.get("Active") || 0 },
        ].map((metric) => (
          <View key={metric.label} className="w-[47%] bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {metric.label}
            </Text>
            <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {metric.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Messages */}
      {error ? (
        <View className="mx-4 mt-3 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <Text className="text-sm text-emerald-700 dark:text-emerald-300">{message}</Text>
        </View>
      ) : null}

      {/* USER LIST */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>

        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
          {filteredUsers.length > 0
            ? `Showing ${filteredUsers.length} of ${users.length} users`
            : "No users match current filters"}
        </Text>

        {filteredUsers.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <User size={48} color="#cbd5e1" />
            <Text className="text-slate-500 font-semibold mt-4">No users found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredUsers.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => router.push(`/org/user/${user.id}`)}
                className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98]">
                <View className="flex-row items-start gap-4">
                  <View className="h-12 w-12 rounded-[18px] bg-blue-50 dark:bg-blue-500/10 items-center justify-center border border-blue-100 dark:border-blue-800/30">
                    <Text className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {user.name || "Unknown"}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1.5">
                      <Mail size={12} color="#94a3b8" />
                      <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                    {user.mobile && (
                      <View className="flex-row items-center gap-2 mt-1">
                        <Phone size={12} color="#94a3b8" />
                        <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                          {user.mobileCountryCode} {user.mobile}
                        </Text>
                      </View>
                    )}

                    {/* Badges */}
                    <View className="flex-row flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <View className="flex-row items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <ShieldCheck size={12} color="#64748b" />
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                          {formatRoleLabel(user.role)}
                        </Text>
                      </View>
                      <View className={`px-2 py-1 rounded-md border ${
                        user.approvalStatus === "APPROVED"
                          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800/50"
                          : user.approvalStatus === "PENDING"
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-800/50"
                            : "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-800/50"
                      }`}>
                        <Text className={`text-[10px] font-black uppercase tracking-widest ${
                          user.approvalStatus === "APPROVED"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : user.approvalStatus === "PENDING"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {user.approvalStatus}
                        </Text>
                      </View>
                      {!user.active && user.approvalStatus === "APPROVED" && (
                        <View className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50 px-2 py-1 rounded-md">
                          <Text className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                            BLOCKED
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CREATE USER MODAL */}
      <Modal visible={createOpen} animationType="slide" transparent={false} onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Create User</Text>
            <Pressable onPress={() => setCreateOpen(false)} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
              <X size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View className="gap-4">
              {/* Name */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Full Name</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Email */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Email</Text>
                <TextInput
                  value={form.email}
                  onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                  placeholder="Enter email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Mobile */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Mobile Number</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={form.mobileCountryCode}
                    onChangeText={(v) => setForm((p) => ({ ...p, mobileCountryCode: v }))}
                    className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                  <TextInput
                    value={form.mobile}
                    onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^\d]/g, "") }))}
                    placeholder="Mobile number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </View>
              </View>

              {/* Role */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {manageableRoleOptions.map((roleOpt) => (
                    <Pressable
                      key={roleOpt.value}
                      onPress={() => setForm((p) => ({ ...p, role: roleOpt.value }))}
                      className={`px-4 py-2.5 rounded-2xl border ${
                        form.role === roleOpt.value
                          ? "bg-blue-600 border-blue-600"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}>
                      <Text className={`text-[13px] font-bold ${
                        form.role === roleOpt.value ? "text-white" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {roleOpt.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Status */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Status</Text>
                <View className="flex-row gap-2">
                  {STATUS_OPTIONS.map((statusOpt) => (
                    <Pressable
                      key={statusOpt}
                      onPress={() => setForm((p) => ({ ...p, status: statusOpt }))}
                      className={`flex-1 py-2.5 rounded-2xl border items-center ${
                        form.status === statusOpt
                          ? "bg-blue-600 border-blue-600"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}>
                      <Text className={`text-[13px] font-bold ${
                        form.status === statusOpt ? "text-white" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {statusOpt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Password */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Password (Optional)</Text>
                <TextInput
                  value={form.password}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                  placeholder="Leave blank for auto-generated"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>

              {/* Permissions */}
              <View className="gap-3 bg-slate-50 dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
                <Text className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Permissions
                </Text>
                {permissionGroups.map((group) => (
                  <View key={group.key} className="bg-white dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 gap-2">
                    <Text className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {group.label}
                    </Text>
                    {group.items.map((permission) => (
                      <Pressable
                        key={permission}
                        onPress={() => onPermissionToggle(permission)}
                        className="flex-row items-center justify-between py-1.5">
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                          {formatPermissionLabel(permission)}
                        </Text>
                        <Switch
                          value={form.permissions.includes(permission)}
                          onValueChange={() => onPermissionToggle(permission)}
                          trackColor={{ false: "#e2e8f0", true: "#2563eb" }}
                          thumbColor="#fff"
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>

              {/* Error in modal */}
              {error ? (
                <View className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Create Button */}
          <View className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Pressable
              onPress={createUser}
              disabled={submitting}
              className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${
                submitting ? "bg-blue-400" : "bg-blue-600"
              }`}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <UserPlus size={16} color="#fff" />
              )}
              <Text className="text-white text-sm font-bold">Create User</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}