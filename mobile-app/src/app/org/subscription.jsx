import React from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { CreditCard, Sparkles, Users, Component } from "lucide-react-native";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";
import { formatCalendarDate } from "@/utils/date";

function InfoCard({ label, value, helper = "" }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-5 mb-4 shadow-sm">
      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">
        {label}
      </Text>
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-1">
        {value}
      </Text>
      {helper ? (
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export default function OrgSubscriptionPage() {
  const { data, isLoading, isFetching, refetch, error } = useGetOrgSubscriptionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const meta = data?.meta || {};
  const usage = meta.usage || {};
  const subscriptions = Array.isArray(data?.items) ? data.items : [];

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#020617] items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading subscription...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#020617]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        <View className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
          <View className="flex-row items-center gap-2 bg-blue-50 dark:bg-blue-900/30 self-start px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
            <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
            <Text className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">
              Subscription
            </Text>
          </View>
          
          <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            Current Plan Overview
          </Text>
          <Text className="text-sm text-slate-600 dark:text-slate-400 leading-5">
            Review your active workspace plan here. Please visit our web portal if you wish to renew or manage your subscription plan.
          </Text>

          {error && (
            <View className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <Text className="text-sm text-red-700 dark:text-red-400 font-medium">
                {error?.data?.message || error?.message || "Unable to load subscription details."}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap justify-between">
          <View className="w-[48%]">
            <InfoCard label="Current Plan" value={meta.currentPlanName || "No active plan"} />
          </View>
          <View className="w-[48%]">
            <InfoCard label="Status" value={meta.subscriptionStatus || "TRIAL"} />
          </View>
          <View className="w-[48%]">
            <InfoCard label="Start Date" value={formatCalendarDate(meta.subscriptionStartDate)} />
          </View>
          <View className="w-[48%]">
            <InfoCard label="End Date" value={formatCalendarDate(meta.subscriptionEndDate || meta.subscriptionExpiry)} />
          </View>
        </View>
        
        <InfoCard label="Workspace Code" value={meta.organizationCode || "--"} helper="Your unique organization identifier" />

        <View className="mt-4 mb-6">
          <Text className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4 ml-2">
            Usage Metrics
          </Text>
          <View className="flex-row justify-between">
            <View className="w-[48%] bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex-row items-center gap-4">
              <View className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl">
                <Users size={20} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">{Number(usage.users || 0)}</Text>
                <Text className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Users</Text>
              </View>
            </View>
            <View className="w-[48%] bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex-row items-center gap-4">
              <View className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-2xl">
                <Component size={20} className="text-purple-600 dark:text-purple-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">{Number(usage.teams || 0)}</Text>
                <Text className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Teams</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm mt-2">
          <Text className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
            Subscription History
          </Text>
          
          {subscriptions.length === 0 ? (
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              No subscription records found.
            </Text>
          ) : (
            <View className="mt-3">
              {subscriptions.slice(0, 5).map((sub, idx) => (
                <View key={sub.id} className={`py-4 ${idx !== subscriptions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-bold text-slate-900 dark:text-white">
                      {sub.planName || sub.planCode || "-"}
                    </Text>
                    <View className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      <Text className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                        {sub.status || "-"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatCalendarDate(sub.startDate)} - {formatCalendarDate(sub.endDate)}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {Number(sub.amount || 0).toLocaleString("en-IN")} {sub.currency || "INR"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
