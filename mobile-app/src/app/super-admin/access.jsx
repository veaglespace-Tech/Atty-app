import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Alert, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Plus, ShieldCheck, Key } from "lucide-react-native";
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
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
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
        </View>

        {/* Segmented Control */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveTab("PERMISSIONS")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg transition-all ${activeTab === "PERMISSIONS" ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-transparent"}`}
          >
            <Key size={14} className={activeTab === "PERMISSIONS" ? "text-indigo-600 dark:text-indigo-400 mr-2" : "text-slate-500 mr-2"} />
            <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === "PERMISSIONS" ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
              Permissions
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("ROLES")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg transition-all ${activeTab === "ROLES" ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-transparent"}`}
          >
            <ShieldCheck size={14} className={activeTab === "ROLES" ? "text-indigo-600 dark:text-indigo-400 mr-2" : "text-slate-500 mr-2"} />
            <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === "ROLES" ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
              Role Matrix
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
          <PermissionsTab 
            permissions={displayedPermissions} 
            readOnlyFallback={readOnlyFallback} 
            loading={loading}
            onEdit={setEditingPermission} 
            onDelete={handleDelete} 
          />
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