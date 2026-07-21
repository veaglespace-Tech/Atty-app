import React from "react";
import { View, Text, ScrollView, Pressable, Alert, Dimensions, Platform } from "react-native";
import { Link } from "expo-router";
import * as Linking from 'expo-linking';
import {  PhoneCall, Component, MessageSquare, FileBarChart, Bell, ChevronRight  } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";
import { useAuthSession } from "@/hooks/useAuthSession";

const { width } = Dimensions.get("window");

export default function MemberDashboard(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthSession();

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
      title: "Posts",
      description: "Company updates",
      icon: <MessageSquare size={26} color="#8b5cf6" strokeWidth={2.5} />,
      bg: "bg-purple-50 dark:bg-purple-900/30",
      border: "border-purple-100 dark:border-purple-800/50",
      href: "posts"
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
    <>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View className="px-6 mt-6 mb-4">
          <Text className="text-[13px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Welcome back
          </Text>
          <Text className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {user?.firstName || user?.name?.split(' ')[0] || "User"}
          </Text>        </View>

        {/* Hero Section: Attendance Core */}
        <View className="px-6 mb-8">
          <MyAttendanceCore user={user} isEmbedded={true} />
        </View>

        {/* SOS Emergency Button */}
        <View className="px-6 mb-10">
          <Pressable 
            onPress={handleSOS}
            className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-transform"
          >
            <View className="flex-row items-center p-1.5">
              <View className="bg-rose-50 dark:bg-rose-500/10 h-16 w-16 rounded-2xl items-center justify-center m-1">
                <PhoneCall size={26} color="#e11d48" strokeWidth={2.5} />
              </View>
              <View className="flex-1 px-4">
                <Text className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Emergency SOS</Text>
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">One-tap contact alert</Text>
              </View>
              <View className="px-4">
                <ChevronRight size={20} color="#cbd5e1" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* App Grid Navigation */}
        <View className="px-6">
          <Text className="text-[15px] font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4">
            Workspace Apps
          </Text>
          
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {menuItems.map((item, index) => (
              <Link key={index} href={`./${item.href}`} asChild>
                <Pressable 
                  style={{ width: (width - 48 - 16) / 2 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-[0.98]"
                >
                  <View className={`h-14 w-14 rounded-2xl ${item.bg} ${item.border} border items-center justify-center mb-5`}>                    {item.icon}
                  </View>
                  <View>
                    <Text className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight mb-1">
                      {item.title}
                    </Text>
                    <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      {item.description}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}