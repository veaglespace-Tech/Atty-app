import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CreditCard, Search, ChevronDown, Check } from "lucide-react-native";
import { useGetSuperAdminPaymentsQuery } from "@/services/api/superAdminApi";

const STATUS_OPTIONS = ["ALL", "SUCCESS", "FAILED", "PENDING"];

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPaymentsQuery("");

  const loading = isLoading || isFetching;

  const payments = useMemo(() => {
    let filtered = data?.items || [];

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        (p.organization && p.organization.toLowerCase().includes(q)) || 
        (p.userEmail && p.userEmail.toLowerCase().includes(q)) ||
        (p.orderId && p.orderId.toLowerCase().includes(q))
      );
    }

    if (status !== "ALL") {
      filtered = filtered.filter(p => p.status === status);
    }

    return filtered;
  }, [data, search, status]);

  const renderStatusModal = () => (
    <Modal visible={showStatusModal} transparent animationType="fade">
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => setShowStatusModal(false)}
        className="flex-1 bg-black/50 justify-end"
      >
        <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
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
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Payments</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700 mb-3">
          <Search size={16} className="text-slate-400" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search org, email, or order ID..."
            placeholderTextColor="#94a3b8"
            className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <Pressable 
            onPress={() => setShowStatusModal(true)}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Status</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{status}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && payments.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        payments.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <CreditCard size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No payments found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {payments.length} Transactions Found
            </Text>
            {payments.map((payment) =>
          <View key={payment.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{payment.organization}</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{payment.userEmail}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full border ${payment.status === 'SUCCESS' ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50' : (payment.status === 'FAILED' ? 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50' : 'bg-amber-100 border-amber-200 dark:bg-amber-900/40 dark:border-amber-800/50')}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${payment.status === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-400' : (payment.status === 'FAILED' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}`}>
                      {payment.status}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Plan</Text>
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{payment.planName}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Amount</Text>
                    <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{payment.currency} {payment.amount}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Gateway / Order ID</Text>
                    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400">{payment.gateway} / {payment.orderId}</Text>
                  </View>
                </View>
              </View>
          )}
          </View>
        }
      </ScrollView>
      
      {renderStatusModal()}
    </View>
  );
}