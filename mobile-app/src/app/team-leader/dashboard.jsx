import { formatName } from "@/utils/nameFormat";
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
  if (lbl.includes('permission')) return { icon: ShieldCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/20' };
  if (lbl.includes('member')) return { icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/20' };
  if (lbl.includes('present')) return { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/20' };
  if (lbl.includes('absent')) return { icon: UserX, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/20' };
  if (lbl.includes('pending') || lbl.includes('punch')) return { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/20' };
  return { icon: Component, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/20' };
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
    <ScrollView className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-6 bg-white dark:bg-[#020617] z-10">
        <View className="w-full max-w-5xl mx-auto">
          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1">
            Team Leader Workspace
          </Text>
          <Text className="text-[32px] font-black tracking-tight text-slate-900 dark:text-white leading-tight mb-2">
            {user?.organization?.name || "Workspace"}
          </Text>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage your assigned teams and track attendance.
          </Text>

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2 mt-6">
              {summary.map((item, index) => {
                const { icon: Icon, color, bg } = getIconForSummary(item.label);
                return (
                  <View key={index} className="w-1/2 px-2 mb-4">
                    <Animated.View entering={FadeInDown.duration(400).delay(index * 100).springify()}>
                      <View className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-[24px] border border-slate-200/50 dark:border-slate-700/50 shadow-sm min-h-[100px] justify-between">
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 mr-2 leading-tight" numberOfLines={2}>
                            {item.label}
                          </Text>
                          <View className={`h-8 w-8 rounded-full items-center justify-center ${bg}`}>
                            <Icon size={14} className={color} />
                          </View>
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none" adjustsFontSizeToFit numberOfLines={1}>
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

      <View className="w-full max-w-5xl mx-auto px-4 pt-6 pb-4">
        <View className="mb-6">
          <Animated.View entering={FadeInDown.duration(400).delay(150).springify()}>
            <MyAttendanceCore user={user} isEmbedded={true} isDashboard={true} showActions={true} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
          <View className="bg-white dark:bg-slate-900/80 rounded-[32px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-1 pr-4">
                <Text className="text-[14px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  Team Activity
                </Text>
                <Text className="text-[12px] font-medium text-slate-500 mt-1">
                  Real-time attendance logs
                </Text>
              </View>
              <View className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800/50">
                <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  {records.length} Entries
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
                  <View key={i} className="p-4 rounded-[24px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                    <View className="flex-row justify-between items-start mb-3">
                      <Text className="text-sm font-black text-slate-900 dark:text-white flex-1 mr-4">
                        {record.userName || record.member || "Team Member"}
                      </Text>
                      <View className={`px-2.5 py-1 rounded-full ${
                        record.status === 'PRESENT' ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20' :
                        record.status === 'ABSENT' ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20' :
                        'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <Text className={`text-[10px] font-black uppercase tracking-widest ${
                          record.status === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-400' :
                          record.status === 'ABSENT' ? 'text-rose-600 dark:text-rose-400' :
                          'text-slate-500 dark:text-slate-400'
                        }`}>
                          {record.status}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between items-center pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                      <View className="flex-1">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Punch In</Text>
                        <Text className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                          {record.punchInAt ? new Date(record.punchInAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Punch Out</Text>
                        <Text className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                          {record.punchOutAt ? new Date(record.punchOutAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
                        </Text>
                      </View>
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
