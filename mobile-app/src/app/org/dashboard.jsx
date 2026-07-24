import React from "react";
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Pressable, Share } from "react-native";
import { useGetOrgDashboardQuery } from "@/services/api/orgApi";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatRoleLabel } from "@/utils/roles";
import { Link } from "expo-router";
import { Copy, Share2, Users, FileText, Component, ShieldAlert, CheckCircle, Activity, Bell } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const getIconForLabel = (label) => {
  const lbl = label?.toLowerCase() || '';
  if (lbl.includes("user") || lbl.includes("member")) return { icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" };
  if (lbl.includes("team")) return { icon: Component, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" };
  if (lbl.includes("active")) return { icon: Activity, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (lbl.includes("block")) return { icon: ShieldAlert, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" };
  if (lbl.includes("approve")) return { icon: CheckCircle, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" };
  if (lbl.includes("notice") || lbl.includes("notification")) return { icon: Bell, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" };
  return { icon: FileText, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10" };
};

export default function OrgDashboard() {
  const { data, isLoading, isFetching, refetch } = useGetOrgDashboardQuery(undefined);
  const { user } = useAuthSession();

  const summary = (data?.summary || []).filter(item => !item.label.toLowerCase().includes('subscription') && !item.label.toLowerCase().includes('payment'));
  const records = data?.items || [];
  const referralCode = user?.organization?.referralCode || "";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${user?.organization?.name} on Veagle Attendee! Use my referral code: ${referralCode}`,
      });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

  return (
    
      <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />
          }
        >
          
          {/* DASHBOARD WELCOME CARD */}
          <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
            <View className="p-5">
              <View className="mb-5 flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                    {formatRoleLabel(user?.currentRole) || "Workspace"}
                  </Text>
                  <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {`${user?.organization?.name || "Organization"} Dashboard`}
                  </Text>
                  <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                    Workspace summary for users, teams, and attendance.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* REFERRAL CODE SECTION */}
          {referralCode ? (
            <View className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm p-4">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">My Org Referral Code</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">{referralCode}</Text>
                <Pressable onPress={handleShare} className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <Share2 size={16} className="text-slate-700 dark:text-slate-300" />
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Share</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <View>
              {/* STATS OVERVIEW */}
              <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
                {summary.map((item, index) => {
                  const { icon: Icon, color, bg } = getIconForLabel(item.label);
                  return (
                    <Animated.View
                      entering={FadeInDown.duration(400).delay(index * 100).springify()}
                      key={index}
                      className="w-[48%] bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <View className="flex-row items-start justify-between mb-4">
                        <Text
                          className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 mr-3"
                          numberOfLines={2}>
                          {item.label}
                        </Text>
                        <View className={`h-8 w-8 rounded-full items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={14} className={color} />
                        </View>
                      </View>
                      <Text
                        className="text-3xl font-black text-slate-900 dark:text-white tracking-tight"
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {item.value}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>

              {/* RECORDS TABLE */}
              <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Records
                    </Text>
                    <Text className="text-[10px] text-slate-500 mt-1">
                      Detailed entries arranged for easy scanning.
                    </Text>
                  </View>
                  <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {records.length} ENTRIES
                    </Text>
                  </View>
                </View>

                {records.length === 0 ? (
                  <View className="py-12 items-center justify-center">
                    <Text className="text-slate-400 dark:text-slate-500 font-medium">No recent activity.</Text>
                  </View>
                ) : (
                  <View className="gap-y-3">
                    {records.map((record, i) => (
                      <View
                        key={i}
                        className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-sm font-bold text-slate-900 dark:text-white flex-1 mr-4">
                            {record.title || "Record"}
                          </Text>
                          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {record.date || "Today"}
                          </Text>
                        </View>
                        
                        <View className="flex-row justify-between items-end mt-1">
                          <Text className="text-xs text-slate-500 dark:text-slate-400 flex-1">
                            {record.member || "Unknown"}
                          </Text>
                          {record.status && (
                            <View className={`px-2 py-0.5 rounded ${
                              record.status === 'Active' ? 'bg-emerald-100/50 dark:bg-emerald-900/30' :
                              record.status === 'Pending' ? 'bg-amber-100/50 dark:bg-amber-900/30' :
                              'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                                record.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' :
                                record.status === 'Pending' ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-500 dark:text-slate-400'
                              }`}>
                                {record.status}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
      </ScrollView>
    
  );
}
