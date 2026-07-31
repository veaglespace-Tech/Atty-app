import React from "react";
import { View, Text, ScrollView, Pressable, Alert, Dimensions, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import * as Linking from 'expo-linking';
import { PhoneCall, Component, MessageSquare, FileBarChart, Bell, ChevronRight, CheckCircle2, Zap } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetDashboardStatsQuery } from "@/services/api/dashboardApi";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";

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



  return (
    <ScrollView 
      className="flex-1 bg-slate-50 dark:bg-[#020617]" 
      contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="max-w-2xl w-full mx-auto">
      {/* Welcome & Stats Hero Section */}
      <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
        <View className="p-5">
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                Member Workspace
              </Text>
              <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white mb-1">
                Hello, {user?.firstName || user?.name?.split(' ')[0] || "User"}!
              </Text>
              <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                Manage your attendance and track your activity.
              </Text>
            </View>
          </View>

          <View className="flex-row gap-4 mb-2">
            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center mb-4 justify-between">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Attendance</Text>
                <View className="h-8 w-8 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                  <CheckCircle2 size={14} color="#10b981" />
                </View>
              </View>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color="#10b981" className="self-start" />
              ) : (
                <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight" numberOfLines={1} adjustsFontSizeToFit>{stats?.myAttendance || "0/30"}</Text>
              )}
            </View>

            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center mb-4 justify-between">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Streak</Text>
                <View className="h-8 w-8 rounded-full items-center justify-center bg-amber-50 dark:bg-amber-500/10 shrink-0">
                  <Zap size={14} color="#f59e0b" />
                </View>
              </View>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color="#f59e0b" className="self-start" />
              ) : (
                <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight" numberOfLines={1} adjustsFontSizeToFit>{stats?.streak || 0}</Text>
              )}
            </View>
          </View>
        </View>
      </View>


      <View className="mb-10">
        <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
          <MyAttendanceCore isEmbedded={true} showActions={true} />
        </Animated.View>
      </View>
      </View>
    </ScrollView>
  );
}
