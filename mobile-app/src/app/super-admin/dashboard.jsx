import React, { useMemo } from "react";
import { View, Text, RefreshControl } from "react-native";
import { BarChart3, Building2, CreditCard, ShieldCheck, Users, CalendarCheck2, Book, Gift, MessageSquare, Bell, Database, Settings } from "lucide-react-native";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import { useGetSuperAdminDashboardQuery } from "@/services/api/superAdminApi";


export default function SuperAdminDashboard() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminDashboardQuery(undefined);

  const summary = useMemo(() => {
    const arr = data?.summary || [];
    const map = new Map();
    arr.forEach((item) => map.set(item.label, item.value));
    return map;
  }, [data]);

  return (
    <MobileDashboardShell
      title="Super Admin"
      subtitle="Review platform organizations, payments, plans, referrals, and system access."
      refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      groups={[
        {
          name: "Operations",
          actions: [
            { title: "Organizations", description: "Inspect registered workspaces and organization status.", icon: <Building2 size={22} color="#2563eb" />, href: "organizations" },
            { title: "Users", description: "Manage platform users.", icon: <Users size={22} color="#2563eb" />, href: "users" },
            { title: "Leads", description: "Manage sales leads and inquiries.", icon: <Users size={22} color="#2563eb" />, href: "leads" },
            { title: "Contacts", description: "Manage contacts and addresses.", icon: <Book size={22} color="#2563eb" />, href: "contacts" }
          ]
        },
        {
          name: "Financials",
          actions: [
            { title: "Payments", description: "Review orders, invoices, coupons, and subscription state.", icon: <CreditCard size={22} color="#2563eb" />, href: "payments" },
            { title: "Plans", description: "Manage subscription plans.", icon: <CreditCard size={22} color="#2563eb" />, href: "plans" },
            { title: "Coupons", description: "Manage referral and discount coupons.", icon: <Gift size={22} color="#2563eb" />, href: "coupons" },
            { title: "Referrals", description: "Manage referral partners and payouts.", icon: <Gift size={22} color="#2563eb" />, href: "referrals" }
          ]
        },
        {
          name: "System",
          actions: [
            { title: "Access", description: "Manage platform roles, permissions, and security.", icon: <ShieldCheck size={22} color="#2563eb" />, href: "access" },
            { title: "Analytics", description: "See platform usage and growth summaries.", icon: <BarChart3 size={22} color="#2563eb" />, href: "analytics" },
            { title: "Backup", description: "Manage system backups and exports.", icon: <Database size={22} color="#2563eb" />, href: "backup" },
            { title: "Attendance", description: "Review global attendance records.", icon: <CalendarCheck2 size={22} color="#2563eb" />, href: "attendance" },
            { title: "Posts", description: "Manage platform announcements.", icon: <MessageSquare size={22} color="#2563eb" />, href: "posts" },
            { title: "Notifications", description: "Manage system notifications.", icon: <Bell size={22} color="#2563eb" />, href: "notifications" }
          ]
        }
      ]}
      >
      
      <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
        <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Orgs</Text>
          <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>{summary.get("Organizations") || 0}</Text>
        </View>
        <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Active Orgs</Text>
          <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>{summary.get("Active Organizations") || 0}</Text>
        </View>
        <View className="w-[48%] bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-[24px] border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Revenue</Text>
          <Text className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{summary.get("Revenue") || 0}</Text>
        </View>
        <View className="w-[48%] bg-blue-50 dark:bg-blue-500/10 p-4 rounded-[24px] border border-blue-100 dark:border-blue-800/50 shadow-sm">
          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Users</Text>
          <Text className="text-2xl font-black text-blue-700 dark:text-blue-300">{summary.get("Users") || 0}</Text>
        </View>
      </View>
    </MobileDashboardShell>);
}