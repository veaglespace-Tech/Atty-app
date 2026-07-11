import React from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CreditCard, ShieldCheck, CalendarClock, Zap } from "lucide-react-native";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";

export default function SubscriptionPage() {
  const { data: subData, isLoading, isFetching, refetch } = useGetOrgSubscriptionQuery();

  const plan = subData?.plan || {};
  const status = String(subData?.status || "INACTIVE").toUpperCase();
  const isActive = status === "ACTIVE";
  
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Subscription</Text>
        </View>
      </View>
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        <View className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 rounded-[24px] p-6 shadow-xl shadow-blue-900/20 mb-6 overflow-hidden relative">
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
          
          <View className="flex-row justify-between items-start mb-6">
            <View className="bg-white/20 p-3 rounded-2xl">
              <Zap size={28} color="white" />
            </View>
            <View className={`px-3 py-1.5 rounded-full border ${isActive ? 'bg-emerald-500/20 border-emerald-400/30' : 'bg-rose-500/20 border-rose-400/30'}`}>
              <Text className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-emerald-100' : 'text-rose-100'}`}>
                {status}
              </Text>
            </View>
          </View>
          
          <Text className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-1">Current Plan</Text>
          <Text className="text-3xl font-black text-white mb-2">{plan.name || "Free Tier"}</Text>
          
          <View className="flex-row items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <ShieldCheck size={16} color="#bfdbfe" />
            <Text className="text-blue-100 font-semibold">{plan.maxUsers || "Unlimited"} Members limit</Text>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-6 border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white mb-4">Billing Details</Text>
          
          <View className="gap-y-4">
            <View className="flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <CalendarClock size={18} className="text-slate-500 dark:text-slate-400" />
                </View>
                <View>
                  <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400">Valid Until</Text>
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{formatDate(subData?.validUntil)}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row justify-between items-center pb-2">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <CreditCard size={18} className="text-slate-500 dark:text-slate-400" />
                </View>
                <View>
                  <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400">Amount Paid</Text>
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                    {subData?.currency || "INR"} {subData?.amount || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}