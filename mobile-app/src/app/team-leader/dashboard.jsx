import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift, QrCode, ChevronRight, CheckCircle2, ShieldCheck, Clock, CheckCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useGetTeamLeaderDashboardQuery } from "@/services/api/teamLeaderApi";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function TeamLeaderDashboard() {
  const router = useRouter();
  const { user } = useAuthSession();
  
  const { data, isLoading } = useGetTeamLeaderDashboardQuery();
  const summary = data?.summary || [];

  const groups = [
    {
      name: "Team",
      actions: [
        { title: "Team Members", description: "Review assigned users and team structure.", icon: <Users size={22} color="#2563eb" />, href: "members" },
        { title: "Teams", description: "Manage your assigned teams.", icon: <Component size={22} color="#2563eb" />, href: "teams" },
        { title: "Requests", description: "Manage member requests.", icon: <ClipboardCheck size={22} color="#2563eb" />, href: "requests" }
      ]
    },
    {
      name: "Attendance",
      actions: [
        { title: "QR Scanner", description: "Scan QR codes for verification.", icon: <QrCode size={22} color="#2563eb" />, href: "/scanner" },
        { title: "Team Attendance", description: "View today status and member attendance details.", icon: <CalendarCheck2 size={22} color="#2563eb" />, href: "attendance" },
        { title: "Live Location", description: "Open location context for active team members.", icon: <MapPinned size={22} color="#2563eb" />, href: "location" },
        { title: "Reports", description: "Check team summaries and performance reports.", icon: <FileBarChart size={22} color="#2563eb" />, href: "reports" }
      ]
    },
    {
      name: "Settings",
      actions: [
        { title: "Posts", description: "Manage team announcements.", icon: <MessageSquare size={22} color="#2563eb" />, href: "posts" },
        { title: "Notifications", description: "View team alerts and updates.", icon: <Bell size={22} color="#2563eb" />, href: "notifications" },
        { title: "Coupons", description: "Manage referral and discount coupons.", icon: <Gift size={22} color="#2563eb" />, href: "coupons" }
      ]
    }
  ];

  const getIconForSummary = (label) => {
    const lbl = label?.toLowerCase() || '';
    if (lbl.includes("permission")) return { icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" };
    if (lbl.includes("member")) return { icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" };
    if (lbl.includes("present")) return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" };
    if (lbl.includes("pending") || lbl.includes("punch")) return { icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" };
    return { icon: Component, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900" };
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-[#020617]" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      {/* Welcome & Stats Hero Section */}
      <View className="mb-8">
        <Animated.View entering={FadeInDown.duration(400).springify()} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full -translate-y-10 translate-x-10" />
          
          <Text className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Team Leader
          </Text>
          <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            {user?.organization?.name || "Workspace"}
          </Text>
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
            Manage your assigned teams and track attendance.
          </Text>

          {isLoading ? (
             <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563eb" />
             </View>
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {summary.map((item, index) => {
                const { icon: Icon, color, bg } = getIconForSummary(item.label);
                return (
                  <View key={index} className={`w-[48%] ${bg} p-3 rounded-2xl border border-slate-100 dark:border-slate-800`}>
                    <View className="flex-row items-center mb-1">
                      <Icon size={14} className={`${color} mr-1.5`} />
                      <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" numberOfLines={1}>{item.label}</Text>
                    </View>
                    <Text className="text-xl font-black text-slate-900 dark:text-white">{item.value}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </View>

      {/* Action Groups */}
      {groups.map((group, idx) => (
        <Animated.View key={idx} entering={FadeInDown.duration(400).delay(idx * 150 + 100).springify()} className="mb-6">
          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 ml-2">{group.name}</Text>
          <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {group.actions.map((action, actionIdx) => (
              <Pressable
                key={actionIdx}
                onPress={() => router.push(action.href)}
                className={`flex-row items-center p-4 ${actionIdx !== group.actions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''} active:bg-slate-50 dark:active:bg-slate-800/80 active:scale-[0.98] transition-all`}
              >
                <View className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 items-center justify-center mr-4 shrink-0 border border-slate-100 dark:border-slate-800/80">
                  {action.icon}
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[16px] font-black text-slate-900 dark:text-white mb-1">{action.title}</Text>
                  <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{action.description}</Text>
                </View>
                <ChevronRight size={20} color="#cbd5e1" className="shrink-0" />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
