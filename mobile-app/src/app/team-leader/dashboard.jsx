import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift, ChevronRight, CheckCircle2, ShieldCheck, Clock, CheckCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useGetTeamLeaderDashboardQuery } from "@/services/api/teamLeaderApi";
import { useAuthSession } from "@/hooks/useAuthSession";

const getIconForSummary = (label) => {
  const lbl = label?.toLowerCase() || '';
  if (lbl.includes("permission")) return { icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" };
  if (lbl.includes("member")) return { icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" };
  if (lbl.includes("present")) return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" };
  if (lbl.includes("pending") || lbl.includes("punch")) return { icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" };
  return { icon: Component, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900" };
};

export default function TeamLeaderDashboard() {
  const router = useRouter();
  const { user } = useAuthSession();
  
  const { data, isLoading, error, refetch } = useGetTeamLeaderDashboardQuery();
  const summary = data?.summary || [];

  if (error?.status === 402) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-[#020617]">
        <ShieldCheck size={64} className="text-amber-500 mb-4" />
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

  const records = data?.items || [];

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-[#020617]" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      {/* Welcome & Stats Hero Section */}
      <View className="mb-6">
        <Animated.View entering={FadeInDown.duration(400).springify()} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full -translate-y-10 translate-x-10" />
          
          <Text className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Team Leader Workspace
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
                  <View key={index} className="w-[48%] bg-slate-800/60 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 justify-between">
                    <View className="flex-row items-center mb-2">
                      <View className={`p-1.5 rounded-lg ${bg} mr-2`}>
                        <Icon size={14} className={color} />
                      </View>
                      <Text className="text-[10px] font-bold text-slate-300 dark:text-slate-300 uppercase tracking-wider flex-1" numberOfLines={1} adjustsFontSizeToFit>{item.label}</Text>
                    </View>
                    <Text className="text-2xl font-black text-white">{item.value}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </View>

      {/* TEAM ATTENDANCE ACTIVITY RECORDS */}
      <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
        <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Today's Team Activity
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
    </ScrollView>
  );
}
