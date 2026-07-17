import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, Star, Zap, Building2 } from 'lucide-react-native';
import { useGetPlansQuery } from '@/services/api/planApi';

const { width } = Dimensions.get('window');

export default function PricingPage() {
  const router = useRouter();
  const { data: plans, isLoading, error } = useGetPlansQuery();

  const getPlanIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('pro') || n.includes('premium')) return <Star size={24} color="#fff" fill="#fff" />;
    if (n.includes('enterprise') || n.includes('business')) return <Building2 size={24} color="#fff" />;
    return <Zap size={24} color="#fff" />;
  };

  const getPlanColors = (index) => {
    const colors = [
      { bg: 'bg-blue-600', text: 'text-blue-600', badge: 'bg-blue-100', border: 'border-blue-200' },
      { bg: 'bg-indigo-600', text: 'text-indigo-600', badge: 'bg-indigo-100', border: 'border-indigo-200' },
      { bg: 'bg-purple-600', text: 'text-purple-600', badge: 'bg-purple-100', border: 'border-purple-200' },
    ];
    return colors[index % colors.length];
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between z-10 bg-slate-50 dark:bg-slate-950">
        <Pressable 
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95"
        >
          <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Link href="/login" asChild>
          <Pressable className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-full active:scale-95">
            <Text className="text-sm font-bold text-slate-900 dark:text-white">Sign In</Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
          <View className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 border border-blue-200 dark:border-blue-800">
            <Text className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Simple Pricing</Text>
          </View>
          <Text className="text-4xl font-black text-slate-900 dark:text-white text-center mb-3">
            Choose the right plan for your team
          </Text>
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center px-4">
            Unlock advanced attendance management, geo-fencing, and analytics.
          </Text>
        </View>

        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-4 font-semibold text-slate-500">Loading plans...</Text>
          </View>
        ) : error ? (
          <View className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <Text className="text-sm font-semibold text-rose-700 text-center">Failed to load pricing plans. Please try again later.</Text>
          </View>
        ) : (
          <View className="gap-6">
            {plans?.map((plan, index) => {
              const isPopular = plan.name.toLowerCase().includes("pro");
              const colors = getPlanColors(index);
              
              return (
                <View 
                  key={plan.id}
                  className={`bg-white dark:bg-slate-900 rounded-[32px] p-6 border shadow-sm ${
                    isPopular 
                      ? 'border-blue-500 dark:border-blue-400 shadow-[0_8px_30px_rgb(59,130,246,0.12)] scale-[1.02]' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isPopular && (
                    <View className="absolute top-0 right-6 -translate-y-1/2 bg-blue-500 px-3 py-1 rounded-full border-2 border-white dark:border-slate-900">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-white">Most Popular</Text>
                    </View>
                  )}

                  <View className="flex-row items-center gap-4 mb-5">
                    <View className={`h-12 w-12 rounded-2xl ${colors.bg} items-center justify-center shadow-sm`}>
                      {getPlanIcon(plan.name)}
                    </View>
                    <View>
                      <Text className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</Text>
                      <Text className="text-xs font-semibold text-slate-500">{plan.maxUsers} Users Limit</Text>
                    </View>
                  </View>

                  <View className="flex-row items-end gap-1 mb-6">
                    <Text className="text-4xl font-black text-slate-900 dark:text-white">₹{plan.price}</Text>
                    <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      / {plan.durationInDays} days
                    </Text>
                  </View>

                  <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
                    <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                      Features Included
                    </Text>
                    <View className="gap-3">
                      {plan.features?.map((feature, idx) => (
                        <View key={idx} className="flex-row items-start gap-3">
                          <CheckCircle2 size={16} className={colors.text} />
                          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{feature}</Text>
                        </View>
                      ))}
                      {!plan.features?.length && (
                        <>
                          <View className="flex-row items-start gap-3">
                            <CheckCircle2 size={16} className={colors.text} />
                            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Basic Attendance Logging</Text>
                          </View>
                          <View className="flex-row items-start gap-3">
                            <CheckCircle2 size={16} className={colors.text} />
                            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Detailed Reports</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <Pressable 
                    onPress={() => Alert.alert("Purchase Plan", "Please purchase the plan from our website or contact Veagle Space support.")}
                    className={`w-full py-4 rounded-2xl items-center justify-center active:scale-95 transition-transform ${
                      isPopular ? 'bg-blue-600' : 'bg-slate-900 dark:bg-white'
                    }`}
                  >
                    <Text className={`font-black text-base ${isPopular ? 'text-white' : 'text-white dark:text-slate-900'}`}>
                      Get Started with {plan.name}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
