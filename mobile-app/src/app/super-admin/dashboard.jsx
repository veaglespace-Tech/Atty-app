import React, { useMemo, useState } from "react";
import { View, Text, RefreshControl, ScrollView, Modal, Pressable, TouchableOpacity } from "react-native";
import { BarChart3, Building2, CreditCard, ShieldCheck, Users, CalendarCheck2, Book, Gift, MessageSquare, Bell, Database, Settings, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react-native";
import { useGetSuperAdminDashboardQuery } from "@/services/api/superAdminApi";


export default function SuperAdminDashboard() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminDashboardQuery(undefined);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRowsModalOpen, setIsRowsModalOpen] = useState(false);

  const summary = useMemo(() => {
    const arr = data?.summary || [];
    const map = new Map();
    arr.forEach((item) => map.set(item.label, item.value));
    return map;
  }, [data]);

  const items = useMemo(() => data?.items || [], [data]);

  const totalPages = Math.ceil(items.length / rowsPerPage) || 1;
  const currentItems = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="mb-6">
          <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20">
            <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Platform Overview</Text>
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Super Admin Dashboard</Text>
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Global SaaS usage, subscription health, and revenue summary.</Text>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3 mb-8">
          <View className="w-full bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Organizations</Text>
            <Text className="text-3xl font-black text-slate-900 dark:text-white">{summary.get("Organizations") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Active Orgs</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>{summary.get("Active Organizations") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Blocked Orgs</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>{summary.get("Blocked Organizations") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Users</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Users") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Payments</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Successful Payments") || 0}</Text>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
          <View className="p-5 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center">
            <View>
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Records</Text>
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Detailed entries arranged in a roomy table for easier scanning.</Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{items.length} Entries</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="p-4">
              {/* Table Header */}
              <View className="flex-row items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-2 min-w-[800px]">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-40">Organization</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24">Org Code</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Plan</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-28 text-center">Subscription</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Users</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Teams</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Access</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Block</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-right">Created At</Text>
              </View>

              {/* Table Rows */}
              {currentItems.map((item, index) => (
                <View key={item.id || index} className="flex-row items-center py-4 border-b border-slate-100 dark:border-slate-800/50 min-w-[800px]">
                  <Text className="text-xs font-bold text-slate-900 dark:text-white w-40 pr-2" numberOfLines={1}>{item.organization}</Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-24">{item.code}</Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32">{item.planName}</Text>
                  <View className="w-28 items-center">
                    <View className={`px-2 py-1 rounded-full border ${item.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50'}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${item.subscriptionStatus === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{item.subscriptionStatus || 'N/A'}</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-16 text-center">{item.users}</Text>
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 w-16 text-center">{item.teams}</Text>
                  <View className="w-24 items-center">
                    <View className={`px-2 py-1 rounded-full border ${item.active ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${item.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.active ? 'ACTIVE' : 'INACTIVE'}</Text>
                    </View>
                  </View>
                  <View className="w-24 items-center">
                    <View className={`px-2 py-1 rounded-full border ${!item.blocked ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50'}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${!item.blocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{item.blocked ? 'BLOCKED' : 'UNBLOCKED'}</Text>
                    </View>
                  </View>
                  <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 w-32 text-right">
                    {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ))}
              {items.length === 0 && (
                <View className="py-8 items-center">
                  <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">No records found.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          {items.length > 0 && (
            <View className="p-5 border-t border-slate-200 dark:border-slate-800 flex-col md:flex-row md:items-center justify-between gap-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Page View</Text>
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Showing {items.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, items.length)} of {items.length} entries
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-medium text-slate-500">Rows</Text>
                  <Pressable 
                    onPress={() => setIsRowsModalOpen(true)}
                    className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"
                  >
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{rowsPerPage}</Text>
                  </Pressable>
                </View>

                <View className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                <View className="flex-row items-center gap-2">
                  <Pressable 
                    onPress={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === 1 ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                  >
                    <ChevronLeft size={14} className={page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                    <Text className={`text-xs font-bold ${page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Prev</Text>
                  </Pressable>

                  <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2">
                    {page} / {totalPages}
                  </Text>

                  <Pressable 
                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === totalPages ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                  >
                    <Text className={`text-xs font-bold ${page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Next</Text>
                    <ChevronRight size={14} className={page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Rows Per Page Modal */}
      <Modal visible={isRowsModalOpen} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/50 justify-center p-6" 
          onPress={() => setIsRowsModalOpen(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
            <View className="p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-black text-slate-900 dark:text-white">Rows Per Page</Text>
            </View>
            <View className="p-2">
              {[10, 25, 50].map((rows) => (
                <TouchableOpacity
                  key={rows}
                  className={`p-4 rounded-xl mb-1 flex-row items-center justify-between ${rowsPerPage === rows ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  onPress={() => {
                    setRowsPerPage(rows);
                    setIsRowsModalOpen(false);
                    setPage(1);
                  }}
                >
                  <Text className={`text-sm font-semibold ${rowsPerPage === rows ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{rows} Rows</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </>
  );
}