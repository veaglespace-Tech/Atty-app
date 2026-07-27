import React from "react";
import { View, Text, ScrollView, Pressable, Alert, Dimensions, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import * as Linking from 'expo-linking';
import { PhoneCall, Component, MessageSquare, FileBarChart, Bell, ChevronRight, CheckCircle2, Zap } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetDashboardStatsQuery } from "@/services/api/dashboardApi";

const { width } = Dimensions.get("window");

export default function MemberDashboard(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthSession();
  
  const { data: stats, isLoading: isStatsLoading, error, refetch } = useGetDashboardStatsQuery();

  if (error?.status === 402) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-[#020617]">
        <Component size={64} className="text-amber-500 mb-4" />
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Access Restricted</Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-6">
          Your organization's access is currently restricted. Please contact your administrator.
        </Text>
        <Pressable onPress={refetch} className="bg-blue-600 px-6 py-3 rounded-xl active:opacity-80">
          <Text className="text-white font-bold text-center">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const handleSOS = () => {
    if (user?.emergencyContact) {
      Linking.openURL(`tel:${user.emergencyContact}`);
    } else {
      Alert.alert("No Contact Found", "Please set your emergency contact in your profile settings first.");
    }
  };

  const menuItems = [
    {
      title: "My Teams",
      description: "Colleagues & groups",
      icon: <Component size={26} color="#3b82f6" strokeWidth={2.5} />,
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-100 dark:border-blue-800/50",
      href: "teams"
    },
    {
      title: "Reports",
      description: "Analytics & history",
      icon: <FileBarChart size={26} color="#10b981" strokeWidth={2.5} />,
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      border: "border-emerald-100 dark:border-emerald-800/50",
      href: "reports"
    },
    {
      title: "Alerts",
      description: "Notifications",
      icon: <Bell size={26} color="#f59e0b" strokeWidth={2.5} />,
      bg: "bg-amber-50 dark:bg-amber-900/30",
      border: "border-amber-100 dark:border-amber-800/50",
      href: "notifications"
    }
  ];

  return (
    <ScrollView 
      className="flex-1 bg-slate-50 dark:bg-[#020617]" 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome & Stats Hero Section */}
      <View className="px-6 mt-6 mb-8">
        <Animated.View entering={FadeInDown.duration(400).springify()} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full -translate-y-10 translate-x-10" />
          
          <Text className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Member Workspace
          </Text>
          <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Hello, {user?.firstName || user?.name?.split(' ')[0] || "User"}!
          </Text>

          <View className="flex-row gap-4">
            <View className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center mb-2">
                <CheckCircle2 size={16} color="#10b981" className="mr-1.5" />
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Attendance</Text>
              </View>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color="#10b981" className="self-start" />
              ) : (
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{stats?.myAttendance || "0/30"}</Text>
              )}
            </View>

            <View className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center mb-2">
                <Zap size={16} color="#f59e0b" className="mr-1.5" />
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Streak</Text>
              </View>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color="#f59e0b" className="self-start" />
              ) : (
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{stats?.streak || 0} <Text className="text-sm font-bold text-slate-500">days</Text></Text>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* SOS Emergency Button */}
      <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} className="px-6 mb-10">
        <Pressable 
          onPress={handleSOS}
          className="overflow-hidden rounded-[28px] bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 shadow-sm active:bg-rose-100 dark:active:bg-rose-900/50 active:scale-[0.98] transition-all"
        >
          <View className="flex-row items-center p-2">
            <View className="bg-rose-500 dark:bg-rose-600 h-14 w-14 rounded-2xl items-center justify-center shrink-0 shadow-sm shadow-rose-500/30">
              <PhoneCall size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View className="flex-1 px-4">
              <Text className="text-[17px] font-black text-rose-900 dark:text-rose-100 tracking-tight">Emergency SOS</Text>
              <Text className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80 mt-0.5">One-tap contact alert</Text>
            </View>
            <View className="px-4 shrink-0">
              <ChevronRight size={20} color="#f43f5e" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
