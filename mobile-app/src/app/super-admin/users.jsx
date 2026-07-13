import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Search, ChevronDown, Check, RefreshCcw, Download, ChevronLeft, ChevronRight } from "lucide-react-native";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import { useGetAllSuperAdminUsersQuery, useExportAllSuperAdminUsersExcelMutation } from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";
import { formatRoleLabel, ROLES } from "@/utils/roles";

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [isRowsModalOpen, setIsRowsModalOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetAllSuperAdminUsersQuery();
  const [exportAllUsersExcel, { isLoading: downloadingExcel }] = useExportAllSuperAdminUsersExcelMutation();

  const loading = isLoading || isFetching;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const users = useMemo(() => data?.items || [], [data]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (debouncedSearch.trim() !== "") {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.organization?.name && u.organization.name.toLowerCase().includes(q)) ||
        (u.organization?.organizationCode && u.organization.organizationCode.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [users, debouncedSearch]);

  const activeUsersCount = useMemo(() => users.filter(u => u.isActive || u.active).length, [users]);
  const superAdminsCount = useMemo(() => users.filter(u => u.role === ROLES.SUPER_ADMIN).length, [users]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(page * rowsPerPage, totalItems);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  const handleDownload = async () => {
    try {
      const blob = await exportAllUsersExcel().unwrap();
      await downloadAndShareBlob(blob, "all-users-org-wise.xlsx");
    } catch (err) {
      Alert.alert("Download Failed", "There was an error downloading the user records.");
    }
  };

  const getStatusTone = (user) => {
    if (!(user.isActive || user.active)) {
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
  };

  return (
    <MobileDashboardShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* Header Block */}
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20">
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Platform Directory</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Users</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">View all users across the entire platform. Open a user's detail page to manage their profile and permissions.</Text>
          </View>
          
          <View className="items-end gap-3">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={refetch} disabled={loading} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <RefreshCcw size={14} className="text-slate-600 dark:text-slate-300" />}
              </Pressable>
              <Pressable 
                onPress={handleDownload} 
                disabled={downloadingExcel || users.length === 0}
                className={`h-9 px-3 flex-row items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${(downloadingExcel || users.length === 0) ? 'opacity-50' : ''}`}
              >
                {downloadingExcel ? <ActivityIndicator size="small" color="#64748b" className="mr-1" /> : <Download size={14} className="text-slate-600 dark:text-slate-300 mr-1" />}
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Export Excel</Text>
              </Pressable>
            </View>
            
            <View className="items-end mr-1 mt-1">
              <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Live View</Text>
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{totalItems} of {users.length} visible.</Text>
            </View>
          </View>
        </View>

        {/* Metric Cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total Users</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{users.length}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Active Users</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activeUsersCount}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Super Admins</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{superAdminsCount}</Text>
          </View>
        </View>

        {/* Data Container */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header Filters */}
          <View className="p-5 border-b border-slate-100 dark:border-slate-800/50">
            <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-2">Search Users</Text>
            <View className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex-row items-center gap-2">
              <Search size={16} className="text-slate-400 ml-1" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Name, email, organization name"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 p-0"
              />
            </View>
          </View>

          {/* Horizontal List Container */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[600px] p-2">
              {/* Table Header */}
              <View className="flex-row items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
                <Text className="w-48 text-[10px] font-black uppercase tracking-widest text-slate-400">User</Text>
                <Text className="w-28 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</Text>
                <Text className="w-48 text-[10px] font-black uppercase tracking-widest text-slate-400">Organization</Text>
                <Text className="w-24 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Text>
                <Text className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-2">Details</Text>
              </View>

              {/* Loading / Empty States */}
              {loading && filteredUsers.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text className="mt-3 text-xs font-semibold text-slate-400">Loading users...</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Text className="text-sm font-bold text-slate-500">No users found.</Text>
                </View>
              ) : (
                <View className="py-2">
                  {paginatedUsers.map((user) => (
                    <View key={user.id} className="flex-row items-center px-4 py-3 mb-1 rounded-2xl border border-transparent dark:border-transparent">
                      <View className="w-48 pr-4">
                        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                        <Text className="text-xs font-semibold text-slate-500 mt-0.5" numberOfLines={1}>{user.email}</Text>
                      </View>
                      
                      <View className="w-28 pr-2">
                        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatRoleLabel(user.role) || "-"}</Text>
                      </View>
                      
                      <View className="w-48 pr-4">
                        {user.organization ? (
                          <>
                            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>{user.organization.name}</Text>
                            <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">{user.organization.organizationCode}</Text>
                          </>
                        ) : (
                          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">-</Text>
                        )}
                      </View>
                      
                      <View className="w-24">
                        <View className={`self-start px-2 py-1 rounded-lg border ${getStatusTone(user)}`}>
                          <Text className="text-[9px] font-black uppercase tracking-widest">
                            {(user.isActive || user.active) ? "ACTIVE" : "INACTIVE"}
                          </Text>
                        </View>
                      </View>
                      
                      <View className="flex-1 items-end pr-2">
                        <Pressable 
                          onPress={() => router.push(`/super-admin/users/${user.id}`)}
                          className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 active:bg-slate-200"
                        >
                          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Open Detail</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Container */}
          <View className="p-5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/50">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Showing {startIndex}-{endIndex} of {totalItems} users
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-slate-400">Rows</Text>
                <Pressable 
                  onPress={() => setIsRowsModalOpen(true)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-2"
                >
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{rowsPerPage}</Text>
                  <ChevronDown size={14} className="text-slate-400" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable 
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-1 ${page === 1 ? 'opacity-50' : 'active:bg-slate-50'}`}
                >
                  <ChevronLeft size={14} className="text-slate-600 dark:text-slate-400" />
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Prev</Text>
                </Pressable>
                
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
                  {page} / {totalPages}
                </Text>

                <Pressable 
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-1 ${(page === totalPages || totalPages === 0) ? 'opacity-50' : 'active:bg-slate-50'}`}
                >
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Next</Text>
                  <ChevronRight size={14} className="text-slate-600 dark:text-slate-400" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Rows Per Page Modal */}
      <Modal visible={isRowsModalOpen} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setIsRowsModalOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900/80 rounded-t-3xl p-6 pb-12 shadow-sm">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">Rows per page</Text>
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setRowsPerPage(opt);
                  setPage(1);
                  setIsRowsModalOpen(false);
                }}
                className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
              >
                <Text className={`text-base font-bold ${rowsPerPage === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt} Rows
                </Text>
                {rowsPerPage === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
              </Pressable>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </MobileDashboardShell>
  );
}