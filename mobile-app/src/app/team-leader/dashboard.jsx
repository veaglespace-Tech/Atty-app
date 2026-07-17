import React from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { Link } from "expo-router";
import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift, QrCode } from "lucide-react-native";

import { useAuthSession } from "@/hooks/useAuthSession";
const { width } = Dimensions.get("window");

export default function TeamLeaderDashboard() {
  const { user } = useAuthSession();

  const menuItems = [
    { title: "Team Members", description: "Review users.", icon: <Users size={26} color="#2563eb" />, bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-100", href: "members" },
    { title: "Teams", description: "Manage assigned teams.", icon: <Component size={26} color="#8b5cf6" />, bg: "bg-purple-50 dark:bg-purple-900/30", border: "border-purple-100", href: "teams" },
    { title: "Requests", description: "Manage requests.", icon: <ClipboardCheck size={26} color="#10b981" />, bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-100", href: "requests" },
    { title: "Team Attendance", description: "View today's status.", icon: <CalendarCheck2 size={26} color="#f59e0b" />, bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-100", href: "attendance" },
    { title: "Live Location", description: "Active members.", icon: <MapPinned size={26} color="#ef4444" />, bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-100", href: "location" },
    { title: "Reports", description: "Team summaries.", icon: <FileBarChart size={26} color="#6366f1" />, bg: "bg-indigo-50 dark:bg-indigo-900/30", border: "border-indigo-100", href: "reports" },
    { title: "Posts", description: "Announcements.", icon: <MessageSquare size={26} color="#ec4899" />, bg: "bg-pink-50 dark:bg-pink-900/30", border: "border-pink-100", href: "posts" },
    { title: "Notifications", description: "Alerts & updates.", icon: <Bell size={26} color="#f97316" />, bg: "bg-orange-50 dark:bg-orange-900/30", border: "border-orange-100", href: "notifications" }
  ];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View className="px-6 mt-6 mb-6">
        <Text className="text-[13px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Welcome back</Text>
        <Text className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
          {user?.firstName || user?.name?.split(' ')[0] || "Leader"}
        </Text>
      </View>

      <View className="px-6">
        <Text className="text-[15px] font-black uppercase tracking-wider text-slate-900 dark:text-white mb-4">Team Management</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {menuItems.map((item, index) => (
            <Link key={index} href={`./${item.href}`} asChild>
              <Pressable 
                style={{ width: (width - 48 - 16) / 2 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-[0.98]"
              >
                <View className={`h-14 w-14 rounded-2xl ${item.bg} ${item.border} border items-center justify-center mb-5`}>
                  {item.icon}
                </View>
                <View>
                  <Text className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight mb-1">{item.title}</Text>
                  <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">{item.description}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}