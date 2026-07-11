import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Gift, Tag, RefreshCcw } from "lucide-react-native";
import { useGetOrgCouponsQuery } from "@/services/api/orgApi";

export default function MyCouponsPage() {
  const { data: couponsResponse, isLoading, isFetching, refetch, error } = useGetOrgCouponsQuery();
  
  // The backend might return { success: true, data: [...] } or just [...]
  // Handle both standard RTK responses and custom wrappers safely.
  const coupons = Array.isArray(couponsResponse?.data) 
    ? couponsResponse.data 
    : (Array.isArray(couponsResponse) ? couponsResponse : []);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Assigned Coupons</Text>
          <View className="w-10" />
        </View>
      </View>
      
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] p-8 mb-6 shadow-md shadow-blue-600/20 relative overflow-hidden">
          <View className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
            <Gift size={120} className="text-white" />
          </View>
          
          <View className="bg-white/20 self-start px-3 py-1.5 rounded-full flex-row items-center gap-2 mb-4">
            <Tag size={12} className="text-white" />
            <Text className="text-[10px] font-black uppercase tracking-widest text-white">Discounts</Text>
          </View>
          
          <Text className="text-2xl font-black text-white mb-2 relative z-10">
            Active Offers
          </Text>
          <Text className="text-sm font-medium text-blue-100 relative z-10">
            View promotional codes specifically assigned to your workspace.
          </Text>
        </View>

        {error ? (
          <View className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl mb-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex-1 mr-4">
              {error?.data?.message || "Failed to load your coupons. Please try again."}
            </Text>
            <Pressable onPress={refetch} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
              <RefreshCcw size={16} className="text-rose-600 dark:text-rose-400" />
            </Pressable>
          </View>
        ) : null}

        {isLoading && coupons.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : coupons.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800">
            <View className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center mb-6">
              <Gift size={32} className="text-slate-300 dark:text-slate-600" />
            </View>
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">No active coupons</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center px-6">
              You do not have any active promotional codes assigned to your organization yet.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 ml-2 mb-2">Your Codes ({coupons.length})</Text>
            {coupons.map((c) => (
              <View 
                key={c.id} 
                className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none"
              >
                <View className="flex-row justify-between items-start mb-6">
                  <View>
                    <Text className="text-2xl font-black tracking-widest text-slate-900 dark:text-white mb-1 uppercase">
                      {c.code}
                    </Text>
                    <Text className="text-xs font-bold text-slate-400 tracking-wider">
                      REDEEM CODE
                    </Text>
                  </View>
                  <View className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                    <Text className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {c.discountValue}{c.discountType === 'PERCENTAGE' ? '%' : '₹'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</Text>
                    <View className="flex-row items-center gap-1.5">
                      <View className="h-2 w-2 rounded-full bg-emerald-500" />
                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Active</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Usage Count</Text>
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.usesCount} times</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}