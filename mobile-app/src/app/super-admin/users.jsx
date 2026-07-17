import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity, Alert, Pressable } from "react-native";
import { Search, Check } from "lucide-react-native";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import { useGetAllSuperAdminUsersQuery, useExportAllSuperAdminUsersExcelMutation } from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";
import { ROLES } from "@/utils/roles";

// Import extracted components
import UsersHeader from "@/components/super-admin/users/UsersHeader";
import UsersMetrics from "@/components/super-admin/users/UsersMetrics";
import UserTableRow from "@/components/super-admin/users/UserTableRow";
import PaginationFooter from "@/components/super-admin/users/PaginationFooter";

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

  const handleDownload = useCallback(async () => {
    try {
      const blob = await exportAllUsersExcel().unwrap();
      await downloadAndShareBlob(blob, "all-users-org-wise.xlsx");
    } catch (err) {
      Alert.alert("Download Failed", "There was an error downloading the user records.");
    }
  }, [exportAllUsersExcel]);

  return (
    <MobileDashboardShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <UsersHeader 
          loading={loading}
          downloadingExcel={downloadingExcel}
          usersLength={users.length}
          totalItems={totalItems}
          refetch={refetch}
          handleDownload={handleDownload}
        />

        <UsersMetrics 
          totalUsers={users.length}
          activeUsersCount={activeUsersCount}
          superAdminsCount={superAdminsCount}
        />

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
                    <UserTableRow key={user.id} user={user} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <PaginationFooter 
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            rowsPerPage={rowsPerPage}
            setIsRowsModalOpen={setIsRowsModalOpen}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
          />
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