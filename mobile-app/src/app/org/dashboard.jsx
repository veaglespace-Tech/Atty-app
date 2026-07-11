import React from "react";
import { View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { Building2, CalendarCheck2, FileBarChart, Users, Bell, ClipboardCheck, MessageSquare, Component, Gift, CreditCard } from "lucide-react-native";


import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import { useGetOrgDashboardQuery } from "@/services/api/orgApi";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function OrgDashboard() {
  const { data, isLoading, isFetching, refetch } = useGetOrgDashboardQuery(undefined);
  const { user } = useAuthSession();

  const summary = data?.summary || [];
  const records = data?.items || [];

  return (
    <MobileDashboardShell
      title={`${user?.organization?.name || "Organization"} Dashboard`}
      subtitle="Workspace summary for users, teams, attendance, and subscription usage."
      refreshControl={
      <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />
      }
      actions={[
      {
        title: "My Attendance",
        description: "Mark your attendance with live GPS.",
        icon: <CalendarCheck2 size={22} color="#2563eb" />,
        href: "my-attendance"
      },
      {
        title: "Notifications",
        description: "View important alerts and organization updates.",
        icon: <Bell size={22} color="#2563eb" />,
        href: "notifications"
      },
      {
        title: "Requests",
        description: "Manage pending member and regularization requests.",
        icon: <ClipboardCheck size={22} color="#2563eb" />,
        href: "registration-requests"
      },
      {
        title: "Users",
        description: "Review members, roles, and organization access.",
        icon: <Users size={22} color="#2563eb" />,
        href: "users"
      },
      {
        title: "Teams",
        description: "Manage teams, groups, and department structures.",
        icon: <Component size={22} color="#2563eb" />,
        href: "teams"
      },
      {
        title: "Attendance",
        description: "Configure organization geofence and monitor team attendance logs.",
        icon: <CalendarCheck2 size={22} color="#2563eb" />,
        href: "attendance"
      },
      {
        title: "Reports",
        description: "Generate attendance and member reports for the workspace.",
        icon: <FileBarChart size={22} color="#2563eb" />,
        href: "reports"
      },
      {
        title: "Posts",
        description: "Manage organization announcements and feeds.",
        icon: <MessageSquare size={22} color="#2563eb" />,
        href: "posts"
      },
      {
        title: "Subscription",
        description: "Manage your organization subscription plan.",
        icon: <CreditCard size={22} color="#2563eb" />,
        href: "subscription"
      }
      ]}>
      
      {isLoading ?
      <View className="py-8 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View> :

      <View>
          {/* STATS OVERVIEW (Same as Website's Top Cards) */}
          <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
            {summary.map((item, i) =>
          <View
            key={i}
            className="w-[48%] bg-[#0B1A3A] dark:bg-[#07122C] p-5 rounded-[20px] border border-blue-500/20"
            style={{
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 2
            }}>
            
                <Text
              className="text-[9px] font-black uppercase tracking-widest text-blue-200/70 mb-3"
              numberOfLines={1}>
              
                  {item.label}
                </Text>
                <Text
              className="text-2xl font-black text-white tracking-tight"
              numberOfLines={1}
              adjustsFontSizeToFit>
              
                  {item.value}
                </Text>
              </View>
          )}
          </View>

          {/* RECORDS TABLE (Same as Website's Records Table) */}
          <View className="bg-[#0f172a]/95 dark:bg-[#020617]/95 rounded-[24px] border border-slate-800 p-5 overflow-hidden">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                  Records
                </Text>
                <Text className="text-[10px] text-slate-500 mt-1">
                  Detailed entries arranged for easy scanning.
                </Text>
              </View>
              <View className="px-2 py-1 bg-slate-800 rounded-md">
                <Text className="text-[9px] font-black tracking-widest text-slate-400">
                  {records.length} ENTRIES
                </Text>
              </View>
            </View>
            
            {records.length === 0 ?
          <Text className="text-sm text-slate-500 py-4">No recent activity.</Text> :

          <View className="gap-0">
                {records.slice(0, 5).map((record, idx) =>
            <View key={idx} className="flex-row items-center justify-between border-b border-slate-800/80 py-4 last:border-0 last:pb-0">
                    <View className="flex-1 pr-3">
                      <Text className="text-[13px] font-bold text-slate-200 mb-1" numberOfLines={1}>
                        {record.member || "Unknown"}
                      </Text>
                      <Text className="text-[11px] text-slate-500 font-medium">
                        {record.date} • {record.role}
                      </Text>
                    </View>
                    <View
                className={`px-2.5 py-1 rounded-full border ${
                record.status === 'PRESENT' ?
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                record.status === 'ABSENT' ?
                'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                'bg-slate-800 border-slate-700 text-slate-300'}`
                }>
                
                      <Text className="text-[9px] font-black uppercase tracking-[0.15em]">
                        {record.status}
                      </Text>
                    </View>
                  </View>
            )}
              </View>
          }
          </View>
        </View>
      }
    </MobileDashboardShell>);

}