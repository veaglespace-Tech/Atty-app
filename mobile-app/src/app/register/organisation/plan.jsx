import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Check, ArrowRight, Zap, Star, Crown } from "lucide-react-native";

import RegisterStepBack from "@/components/register/RegisterStepBack";
import { useGetPlansQuery } from "@/services/api/planApi";
import { filterVisiblePlans, formatPlanDurationLong, formatPlanDurationShort, formatPlanPrice } from "@/utils/plans";
import { getRegistrationDraft, getRegistrationDraftRaw, REGISTRATION_DRAFT_KEYS, setRegistrationDraft } from "@/utils/registerDraft";

const emptySubscribe = () => () => {};

export default function Plans() {
  const router = useRouter();
  const { data: rawPlans, isLoading, error, refetch } = useGetPlansQuery(undefined);
  const [selectedDurationOverride, setSelectedDurationOverride] = useState(null);

  const storedSelectedPlan = useSyncExternalStore(
    emptySubscribe,
    () => getRegistrationDraftRaw(REGISTRATION_DRAFT_KEYS.selectedPlan),
    () => null
  );

  const selectedDuration = useMemo(() => {
    if (selectedDurationOverride) return selectedDurationOverride;
    try {
      const parsedPlan = JSON.parse(storedSelectedPlan || "null");
      const storedDuration = Number(parsedPlan?.durationInDays || 0);
      return storedDuration > 0 ? storedDuration : 90;
    } catch (_) {
      return 90;
    }
  }, [selectedDurationOverride, storedSelectedPlan]);

  useEffect(() => {
    const storedOrganization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    const storedAdmin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);

    if (!storedOrganization) {
      router.replace("/register/organisation");
      return;
    }

    if (!storedAdmin) {
      router.replace("/register/organisation/admin");
    }
  }, [router]);

  const tiers = useMemo(() => {
    const plans = filterVisiblePlans(rawPlans);
    if (plans.length === 0) return [];

    const grouped = plans.reduce((acc, plan) => {
      const tierName = plan.name.split(" - ")[0] || "Standard";
      if (!acc[tierName]) {
        acc[tierName] = {
          name: tierName,
          options: [],
          users: plan.memberLimit || plan.maxUsers || "N/A",
          features: plan.features || [],
          icon: tierName.includes("1") ? <Zap size={24} color="white" /> : tierName.includes("2") ? <Star size={24} color="white" /> : <Crown size={24} color="white" />,
          popular: tierName.includes("2")
        };
      }
      acc[tierName].options.push(plan);
      return acc;
    }, {});

    return Object.values(grouped).map((tier) => {
      tier.options.sort((a, b) => a.durationInDays - b.durationInDays);
      return tier;
    });
  }, [rawPlans]);

  const durations = [
  { value: 7, label: "7 Days Trial" },
  { value: 90, label: "3 Months" },
  { value: 180, label: "6 Months" },
  { value: 365, label: "12 Months" }];


  const handleSelectPlan = (plan) => {
    const planData = {
      name: plan.name,
      code: plan.code,
      price: plan.price,
      features: plan.features,
      durationInDays: plan.durationInDays
    };
    setRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan, planData);
    router.push("/register/organisation/payment");
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" className="mb-4" />
        <Text className="text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest text-[10px]">
          Fetching Plans...
        </Text>
      </View>);

  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-4">
        <View className="p-8 bg-red-50 dark:bg-rose-500/10 rounded-3xl border border-red-100 dark:border-rose-500/20 max-w-sm w-full items-center shadow-xl">
          <View className="w-16 h-16 bg-red-100 dark:bg-rose-500/15 rounded-2xl flex items-center justify-center mb-6">
            <Check size={32} color="#dc2626" className="dark:text-rose-300 rotate-45" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white mb-3 text-center">
            Oops! Error
          </Text>
          <Text className="text-slate-600 dark:text-slate-300 font-medium text-center mb-6">
            We couldn't load the subscription plans.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="w-full py-4 bg-slate-900 dark:bg-blue-400 rounded-2xl items-center">
            
            <Text className="text-white dark:text-slate-950 font-black uppercase tracking-widest text-xs">
              Retry Again
            </Text>
          </Pressable>
        </View>
      </View>);

  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 40, paddingTop: 60 }}>
      <RegisterStepBack href="/register/organisation/admin" label="Back to Admin Details" className="mb-8" />

      <View className="items-center mb-10">
        <View className="py-1.5 px-4 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20 mb-4">
          <Text className="text-blue-600 dark:text-blue-200 text-[10px] font-black uppercase tracking-widest">
            Step 3 of 4
          </Text>
        </View>
        <Text className="text-3xl font-black text-slate-900 dark:text-white mb-2 text-center">
          Select Your Growth Plan
        </Text>
        <Text className="text-slate-500 dark:text-slate-300 font-medium text-sm text-center mb-8 px-4">
          Pick the scale that matches your organization's ambition.
        </Text>

        <View className="flex-row flex-wrap justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl p-1 mb-2">
          {durations.map((d) =>
          <Pressable
            key={d.value}
            onPress={() => setSelectedDurationOverride(d.value)}
            className={`px-4 py-2.5 rounded-xl m-1 ${
            selectedDuration === d.value ? "bg-slate-900 dark:bg-blue-400" : "bg-transparent"}`
            }>
            
              <Text
              className={`text-[10px] font-black uppercase tracking-widest ${
              selectedDuration === d.value ? "text-white dark:text-slate-950" : "text-slate-400 dark:text-slate-300"}`
              }>
              
                {d.label}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="gap-6">
        {tiers.map((tier) => {
          const isFreeTier = Number(tier.options[0]?.price || 0) === 0;
          const planOption = isFreeTier ?
          tier.options[0] :
          tier.options.find((option) => option.durationInDays === selectedDuration) || tier.options[0];
          const isDurationAvailable = isFreeTier || planOption.durationInDays === selectedDuration;

          return (
            <View
              key={tier.name}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border ${
              tier.popular ? "border-blue-200 dark:border-blue-500/30" : "border-slate-100 dark:border-white/10"} shadow-sm`
              }>
              
              <View className="flex-row justify-between items-center mb-6">
                <View className="h-12 w-12 rounded-xl bg-blue-600 dark:bg-blue-400 items-center justify-center">
                  {tier.icon}
                </View>
                {tier.popular &&
                <View className="bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">
                    <Text className="text-[10px] font-black text-blue-600 dark:text-blue-300 uppercase tracking-widest">Most Popular</Text>
                  </View>
                }
              </View>

              <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1">{tier.name}</Text>
              
              <View className="flex-row mb-6">
                <View className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Text className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                    {tier.users} Users Limit
                  </Text>
                </View>
              </View>

              <View className="flex-row items-baseline gap-1 mb-6">
                <Text className="text-4xl font-black text-slate-900 dark:text-white">
                  Rs. {formatPlanPrice(planOption.price)}
                </Text>
                <Text className="text-slate-500 dark:text-slate-300 font-black text-xs uppercase tracking-widest">
                  / {formatPlanDurationShort(planOption.durationInDays)}
                </Text>
              </View>

              {!isDurationAvailable &&
              <View className="mb-6 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20">
                  <Text className="text-[10px] text-amber-600 dark:text-amber-300 font-black text-center">
                    * Defaulting to {formatPlanDurationLong(planOption.durationInDays)}
                  </Text>
                </View>
              }

              <View className="gap-3 mb-8">
                {tier.features.map((feature) =>
                <View key={feature} className="flex-row items-center gap-3">
                    <View className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center border border-blue-100 dark:border-blue-500/20">
                      <Check size={12} color="#2563eb" className="dark:text-blue-300" />
                    </View>
                    <Text className="text-slate-600 dark:text-slate-300 font-bold text-xs flex-1 leading-tight">{feature}</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => handleSelectPlan(planOption)}
                className="flex-row w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 py-4 active:scale-95">
                
                <Text className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white">
                  Activate {tier.name}
                </Text>
                <ArrowRight size={16} className="text-slate-900 dark:text-white" />
              </Pressable>
            </View>);

        })}
      </View>
    </ScrollView>);

}