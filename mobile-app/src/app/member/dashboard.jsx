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


      <View className="px-4 mb-10">
        <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
          <MyAttendanceCore isEmbedded={true} showActions={false} />
        </Animated.View>
      </View>
    </ScrollView>
  );
}
