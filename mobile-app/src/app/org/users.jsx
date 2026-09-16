import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, Alert, Platform
} from "react-native";
import { router } from "expo-router";
import {
  Search, User, ShieldCheck, Mail, Phone, Plus, RefreshCw, Download, Archive, CheckSquare, Square, Trash2, Power, ShieldAlert
} from "lucide-react-native";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSelector } from "react-redux";
import {
  useGetOrgUsersQuery,
  useCreateOrgUserMutation,
  useDownloadOrgUsersExcelMutation,
  useDownloadOrgUsersPdfMutation,
  usePatchOrgUserMutation,
  useDeleteOrgUserMutation,
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
import { downloadAndShareBlob } from "@/utils/downloadMobile";

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
  const [memberTypeFilter, setMemberTypeFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

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
  const [downloadPdf, { isLoading: downloadingPdf }] = useDownloadOrgUsersPdfMutation();
  const [downloadExcel, { isLoading: downloadingExcel }] = useDownloadOrgUsersExcelMutation();
  const [patchOrgUserMutation] = usePatchOrgUserMutation();
  const [deleteOrgUserMutation] = useDeleteOrgUserMutation();

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
      
      const userMemberType = user.existingMember === "SENIOR" ? "EXISTING" : user.existingMember === "JUNIOR" ? "NEW" : (user.existingMember || "NEW");
      if (memberTypeFilter !== "ALL" && userMemberType !== memberTypeFilter.toUpperCase()) return false;
      
      const userGender = user.gender ? user.gender.toUpperCase() : "OTHER";
      if (genderFilter !== "ALL" && userGender !== genderFilter.toUpperCase()) return false;
      
      if (query) {
        const haystack = [user.name, user.email, user.mobile]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [users, activeTab, searchQuery, roleFilter, activeFilter, memberTypeFilter, genderFilter]);

  const onPermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleSelectUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkBlock = async () => {
    if (!selectedUserIds.length) return;
    try {
      setBulkLoading(true);
      await Promise.all(
        selectedUserIds.map((id) => patchOrgUserMutation({ userId: id, active: false }).unwrap())
      );
      setMessage(`Successfully blocked ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to block selected users"));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (!selectedUserIds.length) return;
    try {
      setBulkLoading(true);
      await Promise.all(
        selectedUserIds.map((id) => patchOrgUserMutation({ userId: id, active: true }).unwrap())
      );
      setMessage(`Successfully unblocked ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to unblock selected users"));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length) return;
    Alert.alert("Confirm Delete", `Are you sure you want to delete/archive ${selectedUserIds.length} selected user(s)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setBulkLoading(true);
            await Promise.all(
              selectedUserIds.map((id) => deleteOrgUserMutation({ userId: id, reason: "Bulk deleted by Admin" }).unwrap())
            );
            setMessage(`Successfully archived ${selectedUserIds.length} user(s).`);
            setSelectedUserIds([]);
            refetch();
          } catch (err) {
            setError(getErrorMessage(err, "Failed to delete selected users"));
          } finally {
            setBulkLoading(false);
          }
        },
      },
    ]);
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
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {/* HEADER */}
        <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organization Users</Text>
          </View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
            Directory keeps core fields simple. Click a user row to open full profile and actions.
          </Text>
          <View className="flex-row flex-wrap items-center gap-3">
            {/* Primary Actions */}
            <View className="flex-row items-center gap-3 flex-1 min-w-[240px]">
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="flex-1 h-11 flex-row items-center justify-center gap-2 bg-blue-500 dark:bg-blue-600 rounded-[18px] shadow-sm shadow-blue-500/20 active:scale-95 transition-transform">
                <Plus size={18} color="#fff" />
                <Text className="text-white text-sm font-bold" numberOfLines={1}>New Member</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const next = !bulkMode;
                  setBulkMode(next);
                  if (!next) setSelectedUserIds([]);
                }}
                className={`flex-1 h-11 flex-row items-center justify-center border rounded-[18px] active:scale-95 transition-transform gap-2 ${
                  bulkMode || selectedUserIds.length > 0
                    ? "bg-blue-500 border-blue-500"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <CheckSquare size={18} className={bulkMode || selectedUserIds.length > 0 ? "text-white" : "text-blue-600 dark:text-blue-400"} />
                <Text className={`text-sm font-bold ${bulkMode || selectedUserIds.length > 0 ? "text-white" : "text-blue-600 dark:text-blue-400"}`} numberOfLines={1}>
                  {bulkMode || selectedUserIds.length > 0 ? "Exit Bulk" : "Bulk Select"}
                </Text>
              </Pressable>
            </View>

            {/* Secondary/Icon Actions */}
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={refetch}
                className="h-11 w-11 items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[18px] active:scale-95 transition-transform">
                <RefreshCw size={18} className="text-slate-700 dark:text-slate-300" />
              </Pressable>
              <Pressable
                onPress={() => router.push("/org/users/archived")}
                className="h-11 w-11 items-center justify-center bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-[18px] active:scale-95 transition-transform">
                <Archive size={18} className="text-rose-600 dark:text-rose-400" />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (filteredUsers.length === 0) {
                    Alert.alert("No Data", "There are no users to export.");
                    return;
                  }
                  
                  Alert.alert(
                    "Export Users",
                    "Choose export format:",
                    [
                      {
                        text: "PDF",
                        onPress: async () => {
                          try {
                            const blob = await downloadPdf().unwrap();
                            await downloadAndShareBlob(blob, 'users.pdf');
                          } catch (err) {
                            Alert.alert("Export Failed", "Could not generate PDF.");
                          }
                        }
                      },
                      {
                        text: "Excel",
                        onPress: async () => {
                          try {
                            const blob = await downloadExcel().unwrap();
                            await downloadAndShareBlob(blob, 'users.xlsx');
                          } catch (err) {
                            Alert.alert("Export Failed", "Could not generate Excel.");
                          }
                        }
                      },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                }}
                disabled={downloadingPdf || downloadingExcel}
                className={`h-11 w-11 items-center justify-center border rounded-[18px] active:scale-95 transition-transform ${downloadingPdf || downloadingExcel ? 'bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <Download size={18} className={downloadingPdf || downloadingExcel ? "text-slate-400" : "text-slate-700 dark:text-slate-300"} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        <OrgUsersMetrics summaryMap={summaryMap} />

        {/* USER DIRECTORY SECTION */}
        <View className="mt-6 mx-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden">
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
            <DropdownFilter 
              label="Filter by Member Type"
              value={memberTypeFilter}
              onSelect={setMemberTypeFilter}
              options={[
                { label: "All Types", value: "ALL" },
                { label: "New Member", value: "NEW" },
                { label: "Existing Member", value: "EXISTING" }
              ]}
            />
            <DropdownFilter 
              label="Filter by Gender"
              value={genderFilter}
              onSelect={setGenderFilter}
              options={[
                { label: "All Genders", value: "ALL" },
                { label: "Male", value: "MALE" },
                { label: "Female", value: "FEMALE" },
                { label: "Other", value: "OTHER" }
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

        {selectedUserIds.length > 0 && (
          <View className="mx-4 mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-slate-800 dark:text-white">
                {selectedUserIds.length} user(s) selected
              </Text>
              <Pressable
                onPress={() => setSelectedUserIds([])}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">Clear</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={handleBulkUnblock}
                disabled={bulkLoading}
                className="flex-row items-center gap-1.5 bg-blue-600 px-3 py-2 rounded-xl"
              >
                <Power size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Unblock</Text>
              </Pressable>
              <Pressable
                onPress={handleBulkBlock}
                disabled={bulkLoading}
                className="flex-row items-center gap-1.5 bg-rose-600 px-3 py-2 rounded-xl"
              >
                <ShieldAlert size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Block</Text>
              </Pressable>
              <Pressable
                onPress={handleBulkDelete}
                disabled={bulkLoading}
                className="flex-row items-center gap-1.5 bg-red-600 px-3 py-2 rounded-xl"
              >
                <Trash2 size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* USER LIST */}
        <View className="mt-8 mb-8">
          {filteredUsers.length === 0 ? (
            <View className="py-16 items-center justify-center">
              <User size={48} className="text-slate-200 dark:text-slate-700" />
              <Text className="text-slate-500 font-semibold mt-4">No users found.</Text>
            </View>
          ) : (
            <View>
              {filteredUsers.map((user, idx) => (
                <OrgUserTableRow 
                  key={user.id} 
                  user={user} 
                  index={idx} 
                  bulkMode={bulkMode}
                  isSelected={selectedUserIds.includes(user.id)}
                  onSelect={() => toggleSelectUser(user.id)}
                />
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
