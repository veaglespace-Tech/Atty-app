import { formatName } from "@/utils/nameFormat";
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import * as Linking from "expo-linking";
import {
  PhoneCall,
  Component,
  MessageSquare,
  FileBarChart,
  Bell,
  ChevronRight,
  CheckCircle2,
  Zap,
} from "lucide-react-native";
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

  const {
    data: stats,
    isLoading: isStatsLoading,
    error,
    refetch,
  } = useGetDashboardStatsQuery();

  if (error?.status === 402) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-[#020617]">
        <Component size={64} className="text-amber-500 mb-4" />
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">
          Access Restricted
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-6">
          Your organization's access is currently restricted. Please contact
          your administrator.
        </Text>
        <Pressable
          onPress={refetch}
          className="bg-blue-600 px-6 py-3 rounded-xl active:opacity-80"
        >
          <Text className="text-white font-bold text-center">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const handleSOS = () => {
    if (user?.emergencyContact) {
      Linking.openURL(`tel:${user.emergencyContact}`);
    } else {
      Alert.alert(
        "No Contact Found",
        "Please set your emergency contact in your profile settings first.",
      );
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
                  Hello,{" "}
                  {formatName(user?.name) || "User"}!
                </Text>
                <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                  Manage your attendance and track your activity.
                </Text>
              </View>
            </View>


          </View>
        </View>

        <View className="mb-10">
          <Animated.View
            entering={FadeInDown.duration(400).delay(200).springify()}
          >
            <MyAttendanceCore user={user} isEmbedded={true} isDashboard={true} showActions={true} />
          </Animated.View>
        </View>
      </View>
    </ScrollView>
  );
}
