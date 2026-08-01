// Team Leader Dashboard Component
import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift, ChevronRight, CheckCircle2, ShieldCheck, Clock, CheckCircle, UserX } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useGetTeamLeaderDashboardQuery } from "@/services/api/teamLeaderApi";
import { useAuthSession } from "@/hooks/useAuthSession";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";

const getIconForSummary = (label) => {
  const lbl = label?.toLowerCase() || '';
  if (lbl.includes("permission")) return { icon: ShieldCheck, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" };
  if (lbl.includes("member")) return { icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" };
  if (lbl.includes("present")) return { icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (lbl.includes("absent")) return { icon: UserX, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" };
  if (lbl.includes("pending") || lbl.includes("punch")) return { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" };
  return { icon: Component, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10" };
};

export default function TeamLeaderDashboard() {
  const router = useRouter();
  const { user } = useAuthSession();
  
  const { data, isLoading, error, refetch } = useGetTeamLeaderDashboardQuery();
  let summary = [...(data?.summary || [])].filter(item => !item.label?.toLowerCase().includes('permission'));
  const hasAbsent = summary.some(item => item.label?.toLowerCase().includes('absent'));
  if (!hasAbsent && summary.length > 0) {
    let totalMembers = 0;
    let presentCount = 0;
    summary.forEach(item => {
      const lbl = item.label?.toLowerCase() || '';
      if (lbl.includes('member') || lbl.includes('user') || lbl.includes('total')) {
        totalMembers = parseInt(String(item.value).split('/')[0], 10) || 0;
      } else if (lbl.includes('present')) {
        presentCount = parseInt(String(item.value), 10) || 0;
      }
    });
    const absentCount = Math.max(0, totalMembers - presentCount);
    summary.push({
      label: "Absent Today",
      value: absentCount
    });
  }

  if (error?.status === 402) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-[#020617]">
        <ShieldCheck size={64} className="text-amber-500 mb-4" />
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Access Restricted</Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-6">
          {"Your organization's access is currently restricted. Please contact your administrator."}
        </Text>
        <Pressable onPress={refetch} className="bg-blue-600 px-6 py-3 rounded-xl active:opacity-80">
          <Text className="text-white font-bold text-center">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const records = data?.items || [];

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-[#020617]" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View className="max-w-2xl w-full mx-auto">
      {/* Welcome & Stats Hero Section */}
      <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
        <View className="p-5">
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                Team Leader Workspace
              </Text>
              <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white mb-1">
                {user?.organization?.name || "Workspace"}
              </Text>
              <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                Manage your assigned teams and track attendance.
              </Text>
            </View>
          </View>

          {isLoading ? (
             <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563eb" />
             </View>
          ) : (
            <View className="flex-row flex-wrap mx-[-6px] mb-2">
              {summary.map((item, index) => {
                const { icon: Icon, color, bg } = getIconForSummary(item.label);
                return (
                  <View key={index} style={{ width: '50%', paddingHorizontal: 6, paddingBottom: 12 }}>
                    <Animated.View
                      entering={FadeInDown.duration(400).delay(index * 100).springify()}
                      className="w-full">
                    <View className="bg-white dark:bg-[#1E293B] p-4 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm justify-between min-h-[96px]">
                      <View className="flex-row items-start justify-between mb-3">
                        <Text
                          className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 mr-2"
                          numberOfLines={2}>
                          {item.label}
                        </Text>
                        <View className={`h-7 w-7 rounded-full items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={12} className={color} />
                        </View>
                      </View>
                      <Text
                        className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {item.value}
                      </Text>
                    </View>
                    </Animated.View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* MY ATTENDANCE ACTIONS & STATS */}
      <View className="mb-6">
        <Animated.View entering={FadeInDown.duration(400).delay(150).springify()}>
          <MyAttendanceCore isEmbedded={true} showActions={false} />
        </Animated.View>
      </View>

      {/* TEAM ATTENDANCE ACTIVITY RECORDS */}
      <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
        <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Today&apos;s Team Activity
              </Text>
              <Text className="text-[10px] text-slate-500 mt-1">
                Real-time team member attendance and punch logs.
              </Text>
            </View>
            <View className="px-2.5 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-md border border-blue-500/20">
              <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {records.length} ENTRIES
              </Text>
            </View>
          </View>

          {records.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-slate-400 dark:text-slate-500 font-medium">No team activity recorded today.</Text>
            </View>
          ) : (
            <View className="gap-y-3">
              {records.map((record, i) => (
                <View
                  key={i}
                  className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white flex-1 mr-4">
                      {record.userName || record.member || "Team Member"}
                    </Text>
                    <View className={`px-2.5 py-0.5 rounded-full ${
                      record.status === 'PRESENT' ? 'bg-emerald-100/50 dark:bg-emerald-950/40 border border-emerald-500/30' :
                      record.status === 'ABSENT' ? 'bg-rose-100/50 dark:bg-rose-950/40 border border-rose-500/30' :
                      'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                        record.status === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-400' :
                        record.status === 'ABSENT' ? 'text-rose-600 dark:text-rose-400' :
                        'text-slate-500 dark:text-slate-400'
                      }`}>
                        {record.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      In: {record.punchInAt ? new Date(record.punchInAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Out: {record.punchOutAt ? new Date(record.punchOutAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
      </View>
    </ScrollView>
  );
}
