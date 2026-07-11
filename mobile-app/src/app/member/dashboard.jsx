import React from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Link } from "expo-router";
import { useDispatch } from "react-redux";
import { LogOut, CalendarCheck2, Component, MessageSquare, FileBarChart, Bell, User, Settings } from "lucide-react-native";

import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";

export default function MemberDashboard() {
  const { user } = useAuthSession();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const menuItems = [
    {
      title: "My Teams",
      description: "Colleagues & groups",
      icon: <Component size={24} color="#3b82f6" />,
      bg: "bg-blue-50 dark:bg-blue-500/10",
      href: "teams"
    },
    {
      title: "Posts",
      description: "Company updates",
      icon: <MessageSquare size={24} color="#8b5cf6" />,
      bg: "bg-purple-50 dark:bg-purple-500/10",
      href: "posts"
    },
    {
      title: "Reports",
      description: "Analytics & history",
      icon: <FileBarChart size={24} color="#10b981" />,
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      href: "reports"
    },
    {
      title: "Alerts",
      description: "Notifications",
      icon: <Bell size={24} color="#f59e0b" />,
      bg: "bg-amber-50 dark:bg-amber-500/10",
      href: "notifications"
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Header */}
        <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-4 shadow-sm border border-blue-200 dark:border-blue-800">
              <User size={28} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {getGreeting()}
              </Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {user?.name?.split(' ')[0] || "Member"}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-3">
            <Link href="./settings" asChild>
              <Pressable className="h-11 w-11 rounded-full bg-white dark:bg-slate-900 items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70">
                <Settings size={20} color="#64748b" />
              </Pressable>
            </Link>
            
            <Pressable 
              onPress={handleLogout}
              className="h-11 w-11 rounded-full bg-rose-50 dark:bg-rose-500/10 items-center justify-center shadow-sm border border-rose-100 dark:border-rose-500/20 active:opacity-70"
            >
              <LogOut size={18} color="#e11d48" />
            </Pressable>
          </View>
        </View>

        {/* Hero Section: Attendance Core */}
        <View className="px-6 mb-8">
          <MyAttendanceCore user={user} isEmbedded={true} />
        </View>

        {/* App Grid Navigation */}
        <View className="px-6">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">
            Quick Actions
          </Text>
          
          <View className="flex-row flex-wrap justify-between">
            {menuItems.map((item, index) => (
              <Link key={index} href={`./${item.href}`} asChild>
                <Pressable className="w-[48%] bg-white dark:bg-slate-900 rounded-[28px] p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800 active:opacity-70 active:scale-95">
                  <View className={`h-14 w-14 rounded-[20px] ${item.bg} items-center justify-center mb-4`}>
                    {item.icon}
                  </View>
                  <Text className="text-lg font-black text-slate-900 dark:text-white mb-1">
                    {item.title}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.description}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}