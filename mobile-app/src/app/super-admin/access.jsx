import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Alert, RefreshControl, TextInput } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Plus, ShieldCheck, Key, RefreshCcw, ChevronRight } from "lucide-react-native";
import {
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from "@/services/api/superAdminApi";
import { ALL_PERMISSIONS, formatPermissionLabel, getDefaultPermissionsForRole, ROLES } from "@/utils/roles";

import PermissionsTab from "@/components/super-admin/access/PermissionsTab";
import RolesTab from "@/components/super-admin/access/RolesTab";
import PermissionFormModal from "@/components/super-admin/access/PermissionFormModal";

const ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.SUB_ADMIN, ROLES.TEAM_LEADER, ROLES.MEMBER];

export default function AccessPage() {
  const [activeTab, setActiveTab] = useState("PERMISSIONS");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  // API Hooks
  const { 
    data: permissionsData, 
    error: permissionsError, 
    isLoading: loadingPermissions,
    isFetching: fetchingPermissions,
    refetch: refetchPermissions 
  } = useGetPermissionsQuery();
  
  const { 
    data: rolePermissionsData, 
    error: rolePermissionsError, 
    isLoading: loadingRolePermissions,
    isFetching: fetchingRolePermissions,
    refetch: refetchRolePermissions 
  } = useGetRolePermissionsQuery();

  const [createPermission, { isLoading: creating }] = useCreatePermissionMutation();
  const [updatePermission, { isLoading: updating }] = useUpdatePermissionMutation();
  const [deletePermission, { isLoading: deleting }] = useDeletePermissionMutation();
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();

  const permissions = useMemo(() => permissionsData?.items || [], [permissionsData]);
  const roleMappings = useMemo(() => rolePermissionsData?.items || [], [rolePermissionsData]);
  
  const fallbackPermissions = useMemo(() => ALL_PERMISSIONS.map((key, index) => ({
    id: `fallback-${index}-${key}`, 
    key, 
    name: formatPermissionLabel(key), 
    description: `Permission to ${String(key).toLowerCase().replace(/_/g, " ")}`,
  })), []);
  
  const fallbackRoleMappings = useMemo(() => ACCESS_ROLES.map((role) => ({
    role, 
    permissions: fallbackPermissions.filter((permission) => getDefaultPermissionsForRole(role).includes(permission.key)),
  })), [fallbackPermissions]);

  const loading = loadingPermissions || loadingRolePermissions;
  const fetching = fetchingPermissions || fetchingRolePermissions;
  const hasLiveAccessCatalog = permissions.length > 0 || roleMappings.length > 0;
  const usingFallbackCatalog = !loading && !hasLiveAccessCatalog;
  const readOnlyFallback = usingFallbackCatalog || Boolean(permissionsError) || Boolean(rolePermissionsError);
  
  const displayedPermissions = readOnlyFallback ? fallbackPermissions : permissions;
  const displayedRoleMappings = readOnlyFallback ? fallbackRoleMappings : roleMappings;

  // Pagination Logic for Permissions
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const totalPermissions = displayedPermissions.length;
  const totalPages = Math.ceil(totalPermissions / pageSize) || 1;
  const paginatedPermissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedPermissions.slice(start, start + pageSize);
  }, [displayedPermissions, page, pageSize]);

  const accessWarningMessage = permissionsError || rolePermissionsError
    ? "Live permissions data could not be loaded. Showing default access rules in read-only mode."
    : usingFallbackCatalog
      ? "Permissions data is not configured yet. Showing default access rules."
      : "";

  const handleRefresh = async () => {
    await Promise.all([refetchPermissions(), refetchRolePermissions()]);
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingPermission) {
        await updatePermission({ 
          id: editingPermission.id, 
          name: formData.name, 
          description: formData.description 
        }).unwrap();
        setEditingPermission(null);
      } else {
        await createPermission(formData).unwrap();
        setShowAddModal(false);
      }
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to save permission");
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Permission",
      "Are you sure you want to delete this permission? This will remove it from all roles.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deletePermission(id).unwrap();
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to delete permission");
            }
          }
        }
      ]
    );
  };

  const handleToggleRolePermission = async (role, pId, currentPermissions) => {
    if (readOnlyFallback) return;
    
    const currentIds = currentPermissions.map((p) => p.id);
    const nextIds = currentIds.includes(pId) 
      ? currentIds.filter((id) => id !== pId) 
      : [...currentIds, pId];
      
    try {
      await updateRolePermissions({ role, permissionIds: nextIds }).unwrap();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update role mapping");
    }
  };

  return (
<<<<<<< HEAD
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      <View className="px-5 pt-12 pb-0 bg-white dark:bg-[#0A0F1C] z-10 shadow-sm border-b border-slate-200 dark:border-slate-800">
        
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20 flex-row items-center">
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="mr-1 py-1">
                <ChevronLeft size={12} className="text-blue-500" />
              </Pressable>
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Access Control</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Roles & Permissions</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Manage the security architecture of the system. Define granular permissions and map them to standard user roles to control platform access.</Text>
          </View>
          
          <View className="items-end gap-3 mt-1">
            <View className="flex-row items-center gap-2">
              <Pressable 
                onPress={handleRefresh} 
                disabled={fetching && !loading} 
                className="h-9 px-3 flex-row items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <RefreshCcw size={14} className="text-slate-600 dark:text-slate-300 mr-2" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Refresh</Text>
              </Pressable>
              <Pressable 
                onPress={() => setShowAddModal(true)} 
                disabled={readOnlyFallback}
                className={`h-9 px-3 flex-row items-center justify-center rounded-xl bg-blue-500 active:bg-blue-600 ${readOnlyFallback ? 'opacity-50' : ''}`}
              >
                <Plus size={14} className="text-white mr-1" />
                <Text className="text-xs font-bold text-white">New Permission</Text>
              </Pressable>
            </View>
          </View>
=======
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Access Control</Text>
          <Pressable 
            onPress={() => setShowAddModal(true)} 
            disabled={readOnlyFallback}
            className={`h-10 w-10 items-center justify-center rounded-full ${readOnlyFallback ? 'bg-slate-100 dark:bg-slate-800 opacity-50' : 'bg-blue-50 dark:bg-blue-900/30'}`}
          >
            <Plus size={20} className={readOnlyFallback ? "text-slate-400" : "text-blue-600 dark:text-blue-400"} />
          </Pressable>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
        </View>

        {/* Segmented Control - Tab Style */}
        <View className="flex-row border-b border-slate-200 dark:border-slate-800">
          <Pressable
            onPress={() => setActiveTab("PERMISSIONS")}
<<<<<<< HEAD
            className={`mr-6 pb-3 flex-row items-center ${activeTab === "PERMISSIONS" ? "border-b-2 border-blue-500" : ""}`}
=======
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg transition-all ${activeTab === "PERMISSIONS" ? "bg-white dark:bg-slate-900/80 shadow-sm" : "bg-transparent"}`}
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
          >
            <Key size={14} className={activeTab === "PERMISSIONS" ? "text-blue-500 mr-2" : "text-slate-500 mr-2"} />
            <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === "PERMISSIONS" ? "text-blue-500" : "text-slate-500"}`}>
              Permissions
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("ROLES")}
<<<<<<< HEAD
            className={`pb-3 flex-row items-center ${activeTab === "ROLES" ? "border-b-2 border-blue-500" : ""}`}
=======
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg transition-all ${activeTab === "ROLES" ? "bg-white dark:bg-slate-900/80 shadow-sm" : "bg-transparent"}`}
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
          >
            <ShieldCheck size={14} className={activeTab === "ROLES" ? "text-blue-500 mr-2" : "text-slate-500 mr-2"} />
            <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === "ROLES" ? "text-blue-500" : "text-slate-500"}`}>
              Role Access
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={fetching && !loading} onRefresh={handleRefresh} tintColor="#2563eb" />}
      >
        {accessWarningMessage ? (
          <View className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800/30 mb-6">
            <Text className="text-xs font-medium text-amber-800 dark:text-amber-500">{accessWarningMessage}</Text>
          </View>
        ) : null}

        {activeTab === "PERMISSIONS" ? (
          <View>
            <PermissionsTab 
              permissions={paginatedPermissions} 
              totalItems={totalPermissions}
              readOnlyFallback={readOnlyFallback} 
              loading={loading}
              onEdit={setEditingPermission} 
              onDelete={handleDelete} 
            />
            {totalPermissions > 0 && (
              <View className="bg-white dark:bg-[#151E2F] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 flex-row flex-wrap items-center justify-between mb-6">
                <View className="w-full md:w-auto mb-3 md:mb-0">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
                  <Text className="text-xs font-semibold text-slate-500">
                    Showing {Math.min((page - 1) * pageSize + 1, totalPermissions)}-{Math.min(page * pageSize, totalPermissions)} of {totalPermissions} permissions
                  </Text>
                </View>
                
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rows</Text>
                    <View className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-slate-50 dark:bg-[#0A0F1C]">
                      <TextInput
                        value={String(pageSize)}
                        onChangeText={(val) => {
                          const num = parseInt(val, 10);
                          if (num > 0) {
                            setPageSize(num);
                            setPage(1);
                          }
                        }}
                        keyboardType="numeric"
                        className="text-xs font-bold text-slate-900 dark:text-white p-0 m-0 w-8 text-center"
                      />
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable 
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === 1 ? 'opacity-50' : ''}`}
                    >
                      <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300 mr-1" />
                      <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Prev</Text>
                    </Pressable>
                    
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {page} / {totalPages}
                    </Text>

                    <Pressable 
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === totalPages ? 'opacity-50' : ''}`}
                    >
                      <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-1">Next</Text>
                      <ChevronRight size={14} className="text-slate-600 dark:text-slate-300" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <RolesTab 
            roleMappings={displayedRoleMappings} 
            allPermissions={displayedPermissions} 
            readOnlyFallback={readOnlyFallback} 
            onToggleRolePermission={handleToggleRolePermission} 
          />
        )}
      </ScrollView>

      <PermissionFormModal 
        visible={showAddModal || !!editingPermission}
        initialData={editingPermission}
        onClose={() => { setShowAddModal(false); setEditingPermission(null); }}
        onSubmit={handleCreateOrUpdate}
        isLoading={creating || updating}
      />
    </View>
  );
}