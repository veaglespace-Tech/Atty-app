import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, BarChart3, TrendingUp, Building2, Users, CreditCard } from "lucide-react-native";
import { useGetSuperAdminAnalyticsQuery } from "@/services/api/superAdminApi";

export default function AnalyticsPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminAnalyticsQuery();

  const analytics = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(() => data?.summary || [], [data]);

  const getSummaryValue = (label) => {
    const item = summary.find(s => s.label === label);
    return item ? item.value : 0;
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Platform Analytics</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && analytics.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : analytics.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <BarChart3 size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center">No Analytics Data</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There is not enough data to generate analytics yet.
            </Text>
          </View>
        ) : (
          <View className="space-y-6">
            
            {/* Total Summary Row */}
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <View className="w-full bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">                <View className="flex-row items-center gap-2 mb-2">
                  <Building2 size={16} className="text-blue-500" />
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500">Organizations</Text>
                </View>
                <Text className="text-3xl font-black text-slate-900 dark:text-white">{getSummaryValue("Organizations")}</Text>
              </View>
              <View className="w-[48%] bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">                <View className="flex-row items-center gap-2 mb-2">
                  <Users size={14} className="text-indigo-500" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Users</Text>
                </View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Users")}</Text>
              </View>
              <View className="w-[48%] bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">                <View className="flex-row items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-amber-500" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payments</Text>
                </View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{getSummaryValue("Payments")}</Text>              </View>
            </View>

            {/* Monthly Trend Data */}
            <View>
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4 ml-2">Monthly Trends (6 Months)</Text>
              
              <View className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {/* Header Row */}
                <View className="flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-16">Month</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-1 text-center">Orgs</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-1 text-center">Users</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex-1 text-center">Pays</Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 w-16 text-right">Rev</Text>
                </View>
                
                {/* Data Rows */}
                {analytics.map((item, index) => (
                  <View 
                    key={item.month || index} 
                    className={`flex-row items-center justify-between p-4 ${index !== analytics.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <Text className="text-[11px] font-bold text-slate-900 dark:text-white w-16">{item.month}</Text>
                    <View className="flex-1 items-center">
                      <View className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30">
                        <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-400">{item.organizations}</Text>
                      </View>
                    </View>
                    <View className="flex-1 items-center">
                      <View className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30">
                        <Text className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">{item.users}</Text>
                      </View>
                    </View>
                    <View className="flex-1 items-center">
                      <View className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30">
                        <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{item.payments}</Text>
                      </View>
                    </View>
                    <Text className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 w-16 text-right" numberOfLines={1}>₹{item.revenue}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}