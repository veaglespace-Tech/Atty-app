import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CreditCard, Search, ChevronRight, RefreshCcw, DownloadCloud } from "lucide-react-native";
import { useGetSuperAdminPaymentsQuery } from "@/services/api/superAdminApi";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPaymentsQuery("");

  const loading = isLoading || isFetching;

  const payments = useMemo(() => data?.items || [], [data]);

  const metrics = useMemo(() => {
    let total = 0;
    let success = 0;
    let failed = 0;
    let revenue = 0;
    
    payments.forEach(p => {
      total++;
      if (p.status === 'SUCCESS') {
        success++;
        revenue += parseFloat(p.amount || 0);
      } else if (p.status === 'FAILED') {
        failed++;
      }
    });

    return {
      total,
      success,
      failed,
      revenue: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(revenue)
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        (p.organization && p.organization.toLowerCase().includes(q)) || 
        (p.orderId && p.orderId.toLowerCase().includes(q)) ||
        (p.planName && p.planName.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [payments, search]);

<<<<<<< HEAD
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, page, pageSize]);

  return (
    
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header Panel */}
      <View className="px-5 pt-12 pb-6 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm relative">
        <View className="flex-col gap-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20 flex-row items-center">
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.push("/super-admin/dashboard")} className="mr-1 py-1">
                  <ChevronLeft size={12} className="text-blue-500" />
                </Pressable>
                <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">PURCHASE LEDGER</Text>
              </View>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Payments</Text>
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">
                Keep the list lightweight here, then open any purchase to inspect and update the full payment and subscription record on its detail page.
              </Text>
            </View>
            
            <View className="items-end gap-3 mt-1">
              <View className="flex-row items-center gap-2">
                <Pressable 
                  onPress={refetch} 
                  disabled={loading} 
                  className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151E2F] shadow-sm"
                >
                  {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <RefreshCcw size={16} className="text-slate-600 dark:text-slate-300" />}
                </Pressable>
                <Pressable 
                  onPress={() => Alert.alert("Coming Soon", "Downloading CSV is coming soon")} 
                  className="h-10 px-4 flex-row items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151E2F] shadow-sm"
                >
                  <DownloadCloud size={16} className="text-slate-600 dark:text-slate-300 mr-2" />
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Download</Text>
                </Pressable>
              </View>
              <View className="items-end mt-2">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">LIVE VIEW</Text>
                <Text className="text-[10px] font-semibold text-slate-500 mt-1">{totalItems} of {metrics.total} purchases visible.</Text>
              </View>
            </View>
          </View>
=======
  const renderStatusModal = () => (
    <Modal visible={showStatusModal} transparent animationType="fade">
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => setShowStatusModal(false)}
        className="flex-1 bg-black/50 justify-end"
      >
        <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900/80 rounded-t-3xl p-6 pb-12 shadow-sm">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">Filter by Status</Text>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                setStatus(opt);
                setShowStatusModal(false);
              }}
              className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
            >
              <Text className={`text-base font-bold ${status === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {opt === "ALL" ? "All Payments" : opt}
              </Text>
              {status === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
            </Pressable>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Payments</Text>
          <View className="w-10" />
        </View>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)

          {/* Metric Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mt-2" contentContainerStyle={{ gap: 12 }}>
            <View className="min-w-[140px] bg-white dark:bg-[#151E2F] p-5 rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">PAYMENTS</Text>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.total}</Text>
            </View>
            <View className="min-w-[140px] bg-white dark:bg-[#151E2F] p-5 rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">SUCCESS</Text>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.success}</Text>
            </View>
            <View className="min-w-[140px] bg-white dark:bg-[#151E2F] p-5 rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">FAILED</Text>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.failed}</Text>
            </View>
            <View className="min-w-[160px] bg-white dark:bg-[#151E2F] p-5 rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">REVENUE</Text>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.revenue}</Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
<<<<<<< HEAD
        {/* Table Header Area */}
        <View className="mb-6">
          <View className="flex-col md:flex-row md:items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">PURCHASED PLANS</Text>
              <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                List view intentionally stays short: organization name, organization code, plan, amount, and status.
              </Text>
              {totalItems > 0 && (
                <Text className="text-[11px] font-bold text-blue-500/80">
                  Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-{Math.min(page * pageSize, totalItems)} of {totalItems} purchases
                </Text>
              )}
            </View>

            <View className="flex-row items-center bg-white dark:bg-[#151E2F] border border-slate-200 dark:border-[#1E293B] rounded-2xl px-4 h-12 shadow-sm min-w-[280px]">
              <Search size={16} className="text-slate-400 mr-2" />
              <TextInput
                value={search}
                onChangeText={(val) => { setSearch(val); setPage(1); }}
                placeholder="Search organization, code, plan, status"
                placeholderTextColor="#64748b"
                className="flex-1 text-xs font-semibold text-slate-900 dark:text-white p-0 m-0 outline-none"
              />
            </View>
          </View>
        </View>
        
        {isLoading && payments.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredPayments.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-[#151E2F] rounded-[32px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
            <CreditCard size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-2">No purchases found</Text>
            <Text className="text-sm text-slate-500 font-medium">Try adjusting your search filters.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {paginatedPayments.map((payment) => (
              <View key={payment.id} className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 shadow-sm">
                
                {/* Organization & Code */}
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ORGANIZATION</Text>
                    <Text className="text-sm font-black text-slate-900 dark:text-white leading-tight" numberOfLines={1}>{payment.organization}</Text>
=======
        {isLoading && payments.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        payments.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <CreditCard size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No payments found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {payments.length} Transactions Found
            </Text>
            {payments.map((payment) =>
          <View key={payment.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{payment.organization}</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{payment.userEmail}</Text>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ORG CODE</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">ORG-014</Text>
                  </View>
                </View>
                
                {/* Plan & Amount */}
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">PLAN</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{payment.planName}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">AMOUNT</Text>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{payment.currency} {payment.amount}</Text>
                  </View>
                </View>

                {/* Status & Details */}
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">STATUS</Text>
                    <View className="self-start">
                      <View className={`px-2.5 py-1 rounded-full border flex-row items-center justify-center ${payment.status === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : (payment.status === 'FAILED' ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20')}`}>
                        <Text className={`text-[9px] font-black uppercase tracking-[0.15em] ${payment.status === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-400' : (payment.status === 'FAILED' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}`}>
                          {payment.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 opacity-0">DETAILS</Text>
                    <Pressable 
                      onPress={() => router.push(`/super-admin/payment/${payment.id}`)}
                      className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl active:opacity-70"
                    >
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Open Detail</Text>
                    </Pressable>
                  </View>
                </View>

              </View>
            ))}
          </View>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <View className="bg-white dark:bg-[#151E2F] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 flex-row flex-wrap items-center justify-between mt-6 z-0">
            <View className="w-full md:w-auto mb-3 md:mb-0">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-{Math.min(page * pageSize, totalItems)} of {totalItems} purchases
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
      </ScrollView>
    </View>
    
  );
}