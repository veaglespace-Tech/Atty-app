import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, Alert, Platform
} from "react-native";
import { router } from "expo-router";
import {
  Search, User, ShieldCheck, Mail, Phone, Plus, RefreshCw, Download
} from "lucide-react-native";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSelector } from "react-redux";
import {
  useGetOrgUsersQuery,
  useCreateOrgUserMutation,
} from "@/services/api/orgApi";
import {
  ROLES, ORG_MANAGED_ROLE_OPTIONS, PERMISSION_GROUPS,
  normalizeRole, getAssignablePermissionsByRole, getDefaultPermissionsForRole,
  getManagedRoleOptions,
} from "@/utils/roles";
import { DASHBOARD_FETCH_LIMITS } from "@/utils/dashboardLimits";
import {
  getErrorMessage, normalizeEmailInput, normalizeTextInput,
  toDigitsOnly, validateManagedUserForm,
} from "@/utils/formValidation";

// Extracted Components
import DropdownFilter from "@/components/org/users/DropdownFilter";
import OrgUsersMetrics from "@/components/org/users/OrgUsersMetrics";
import OrgUserTableRow from "@/components/org/users/OrgUserTableRow";
import CreateOrgUserModal from "@/components/org/users/CreateOrgUserModal";
const STATUS_TABS = ["ALL", "APPROVED", "PENDING", "REJECTED"];

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
      setCreateOpen(false); // Auto-close on success
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {/* HEADER */}
        <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organization Users</Text>
          </View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
            Directory keeps core fields simple. Click a user row to open full profile and actions.
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <Pressable
              onPress={() => setCreateOpen(true)}
              className="flex-row items-center gap-2 bg-blue-500 dark:bg-blue-600 px-5 py-2.5 rounded-full shadow-sm shadow-blue-500/20 active:opacity-80">
              <Plus size={16} color="#fff" />
              <Text className="text-white text-sm font-bold">Create Member</Text>
            </Pressable>
            <Pressable
              onPress={refetch}
              className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full active:opacity-80">
              <RefreshCw size={14} className="text-slate-700 dark:text-slate-300" />
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-bold">Refresh</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                try {
                  if (filteredUsers.length === 0) {
                    Alert.alert("No Data", "There are no users to export.");
                    return;
                  }
                  
                  const header = "Name,Email,Mobile,Role,Status\n";
                  const csvData = filteredUsers.map(u => 
                    `"${u.name || ''}","${u.email || ''}","${u.mobileCountryCode || ''}${u.mobile || ''}","${u.role || ''}","${u.approvalStatus || ''}"`
                  ).join("\n");
                  const csvString = header + csvData;

                  if (Platform.OS === 'web') {
                    // Web-specific download logic
                    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'Organization_Users.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    // Mobile-specific (iOS/Android) download logic
                    const fileUri = FileSystem.documentDirectory + "Organization_Users.csv";
                    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
                    
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export Users" });
                    } else {
                      Alert.alert("Error", "Sharing is not available on this device.");
                    }
                  }
                } catch (err) {
                  Alert.alert("Export Failed", "Could not generate the export file.");
                }
              }}
              className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full active:opacity-80">
              <Download size={14} className="text-slate-700 dark:text-slate-300" />
              <Text className="text-slate-700 dark:text-slate-300 text-sm font-bold">Export</Text>
            </Pressable>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        <OrgUsersMetrics summaryMap={summaryMap} />

        {/* USER DIRECTORY SECTION */}
        <View className="mt-6 mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <View className="px-5 pt-5 pb-3">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              User Directory
            </Text>
          </View>

          {/* Search */}
          <View className="px-5 pb-4">
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
              <Search size={18} className="text-slate-400 dark:text-slate-500" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, mobile, email..."
                placeholderTextColor="#64748b"
                className="flex-1 ml-3 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>
          </View>

          {/* Filter Dropdowns */}
          <View className="px-5 pb-5 flex-row flex-wrap gap-3">
            <DropdownFilter 
              label="Filter by Role"
              value={roleFilter}
              onSelect={setRoleFilter}
              options={[
                { label: "All Roles", value: "ALL" },
                ...ORG_MANAGED_ROLE_OPTIONS
              ]}
            />
            <DropdownFilter 
              label="Filter by Status"
              value={activeTab}
              onSelect={setActiveTab}
              options={[
                { label: "All Status", value: "ALL" },
                ...STATUS_TABS.filter(t => t !== "ALL").map(t => ({ label: t, value: t }))
              ]}
            />
            <DropdownFilter 
              label="Filter by Access"
              value={activeFilter}
              onSelect={setActiveFilter}
              options={[
                { label: "All Access", value: "ALL" },
                { label: "Active", value: "ACTIVE" },
                { label: "Blocked", value: "BLOCKED" }
              ]}
            />
          </View>

          <View className="px-5 pb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {filteredUsers.length > 0
                ? `Showing ${filteredUsers.length} of ${users.length} filtered users`
                : "No users match current filters"}
            </Text>
          </View>
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
        <View className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mx-4 mt-8 mb-8">
          {filteredUsers.length === 0 ? (
            <View className="py-16 items-center justify-center">
              <User size={48} className="text-slate-200 dark:text-slate-700" />
              <Text className="text-slate-500 font-semibold mt-4">No users found.</Text>
            </View>
          ) : (
            <View className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.map((user) => (
                <OrgUserTableRow key={user.id} user={user} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* CREATE USER MODAL */}
      <CreateOrgUserModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        form={form}
        setForm={setForm}
        error={error}
        submitting={submitting}
        createUser={createUser}
        manageableRoleOptions={manageableRoleOptions}
        permissionGroups={permissionGroups}
        onPermissionToggle={onPermissionToggle}
      />
    </View>
    
  );
}