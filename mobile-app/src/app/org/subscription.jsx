import React from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Alert, Modal, SafeAreaView, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CreditCard, ShieldCheck, CalendarClock, Zap } from "lucide-react-native";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";
import { useGetPlansQuery } from "@/services/api/planApi";
import { useCreateRenewalOrderMutation } from "@/services/api/paymentApi";

export default function SubscriptionPage() {
  const { data: subData, isLoading, isFetching, refetch } = useGetOrgSubscriptionQuery();
  const { data: allPlans = [], isLoading: plansLoading } = useGetPlansQuery();
  const [createRenewalOrder] = useCreateRenewalOrderMutation();
  const params = useLocalSearchParams();

  React.useEffect(() => {
    if (params?.payustatus === "success") {
      Alert.alert("Success", "Your subscription has been renewed successfully!");
      refetch();
      router.setParams({ payustatus: null, reason: null });
    } else if (params?.payustatus === "failed") {
      Alert.alert("Payment Failed", params?.reason || "The transaction was failed or cancelled.");
      router.setParams({ payustatus: null, reason: null });
    }
  }, [params?.payustatus]);

  const [loading, setLoading] = React.useState(false);
  const [payuData, setPayuData] = React.useState(null);
  const [processingPlanCode, setProcessingPlanCode] = React.useState(null);

  const meta = subData?.meta || {};
  const currentPlanName = meta.currentPlanName || "No active plan";
  const status = String(meta.subscriptionStatus || "INACTIVE").toUpperCase();
  const isActive = status === "ACTIVE" || status === "TRIAL";
  const activeSub = Array.isArray(subData?.items) ? subData.items.find(item => item.status === "ACTIVE") : null;

  
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePurchase = (plan) => {
    Alert.alert("Purchase Plan", "Please purchase the plan from our website or contact Veagle Attendee support.");
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">

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
          <Text className="text-3xl font-black text-white mb-2">{currentPlanName}</Text>
          
          <View className="flex-row items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <ShieldCheck size={16} color="#bfdbfe" />
            <Text className="text-blue-100 font-semibold">{meta?.planLimits?.maxUsers ? `${meta.planLimits.maxUsers} Members limit` : (isActive ? "Unlimited Members" : "Access Restricted")}</Text>
          </View>
        </View>

        {!isActive && (
          <View className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-[24px] p-5 mb-6 flex-row items-start gap-4 shadow-sm">
            <View className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-full mt-0.5">
              <Zap size={20} className="text-rose-600 dark:text-rose-400" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-rose-900 dark:text-rose-300 mb-1">Activation Required</Text>
              <Text className="text-xs text-rose-700 dark:text-rose-400 font-medium leading-relaxed">
                Your workspace is currently inactive because the subscription has expired or payment is pending. Please log in to the <Text className="font-bold">Web Dashboard</Text> on your computer to securely renew or activate your plan.
              </Text>
            </View>
          </View>
        )}

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
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{formatDate(meta?.subscriptionExpiry || activeSub?.endDate)}</Text>
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
                    {activeSub?.currency || "INR"} {activeSub?.amount || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {allPlans?.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white mb-4">Plans Available to Purchase</Text>
            {allPlans.map((p, idx) => {
              if (String(p.code || "").toUpperCase().includes("FREE") || Number(p.price || 0) <= 0) return null;
              
              return (
                <View key={p.id || idx} className="bg-white dark:bg-slate-900/80 rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 mb-4 shadow-sm flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1">{p.name}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">{p.durationInDays ? `${p.durationInDays} Days` : "Lifetime"}</Text>
                    <Text className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{p.maxUsers ? `Up to ${p.maxUsers} Users` : "Unlimited Users"}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-black text-slate-900 dark:text-white">{p.currency || "INR"} {p.price}</Text>
                    <Pressable 
                      onPress={() => handlePurchase(p)} 
                      disabled={loading}
                      className={`mt-3 px-4 py-2 rounded-xl flex-row items-center justify-center ${loading && processingPlanCode === p.code ? 'bg-slate-400' : 'bg-blue-600'}`}>
                      {loading && processingPlanCode === p.code ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-[10px] font-black text-white uppercase tracking-widest">Select Plan</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>


    </View>
  );
}