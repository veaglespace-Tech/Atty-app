import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Sparkles, Calendar, Users, Building2, CreditCard, ExternalLink } from "lucide-react-native";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";

const formatCalendarDate = (val) => {
  if (!val) return "--";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function SubscriptionPage() {
  const { data, isLoading, isFetching, error, refetch } = useGetOrgSubscriptionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const meta = data?.meta || {};
  const usage = meta.usage || {};
  const subscriptions = useMemo(() => Array.isArray(data?.items) ? data.items : [], [data]);

  const handleUpgrade = () => {
    Alert.alert("Upgrade Plan", "Please visit the web dashboard at attendee.veagle.app/pricing to securely upgrade or renew your organization's subscription.");
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Subscription</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="bg-white dark:bg-slate-900 rounded-[32px] p-6 mb-6 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
          <View className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} className="text-blue-500" />
          </View>
          
          <View className="flex-row items-center gap-2 bg-blue-50 dark:bg-blue-900/30 self-start px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
            <Text className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Workspace Plan</Text>
          </View>
          
          <Text className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {meta.currentPlanName || "No Active Plan"}
          </Text>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Review your active workspace plan and usage limits.
          </Text>

          <Pressable 
            onPress={handleUpgrade}
            className="bg-blue-600 active:bg-blue-700 flex-row items-center justify-center gap-2 p-4 rounded-xl"
          >
            <Text className="text-white font-bold">Upgrade Plan</Text>
            <ExternalLink size={16} className="text-white" />
          </Pressable>

          {error && (
            <View className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl">
              <Text className="text-xs text-rose-700 dark:text-rose-400 font-medium">Failed to load subscription details.</Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
          <InfoCard label="Status" value={meta.subscriptionStatus || "TRIAL"} />
          <InfoCard label="Workspace Code" value={meta.organizationCode || "--"} />
          <InfoCard label="Start Date" value={formatCalendarDate(meta.subscriptionStartDate)} />
          <InfoCard label="Expiry Date" value={formatCalendarDate(meta.subscriptionExpiry)} />
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3 mb-8">
          <UsageCard label="Live Users" value={usage.users || 0} icon={<Users size={16} className="text-indigo-500" />} />
          <UsageCard label="Live Teams" value={usage.teams || 0} icon={<Building2 size={16} className="text-emerald-500" />} />
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Subscription History</Text>
        
        {isLoading && subscriptions.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : subscriptions.length === 0 ? (
          <View className="py-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 items-center justify-center">
            <CreditCard size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
            <Text className="text-sm font-medium text-slate-500">No subscription records found.</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {subscriptions.map((sub) => (
              <View key={sub.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <View className="flex-row items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Text className="text-lg font-black text-slate-900 dark:text-white">
                    {sub.planName || sub.planCode || "-"}
                  </Text>
                  <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{sub.status}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-4">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start</Text>
                    <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCalendarDate(sub.startDate)}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-right">End</Text>
                    <Text className="text-xs font-bold text-slate-800 dark:text-slate-200 text-right">{formatCalendarDate(sub.endDate)}</Text>
                  </View>
                </View>

                <View className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-slate-500">Amount Paid</Text>
                  <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {Number(sub.amount || 0).toLocaleString("en-IN")} {sub.currency || "INR"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoCard({ label, value }) {
  return (
    <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</Text>
      <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function UsageCard({ label, value, icon }) {
  return (
    <View className="w-[48%] bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-[20px] border border-indigo-100 dark:border-indigo-800/30">
      <View className="flex-row items-center gap-2 mb-2">
        {icon}
        <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-400">{label}</Text>
      </View>
      <Text className="text-2xl font-black text-indigo-900 dark:text-indigo-300">{value}</Text>
    </View>
  );
}