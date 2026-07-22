import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift, QrCode, ChevronRight } from "lucide-react-native";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function TeamLeaderDashboard() {
  const router = useRouter();

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

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-[#020617]" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Team Leader Dashboard</Text>
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Follow team attendance, live locations, requests, reports, and posts.</Text>
      </View>

      {groups.map((group, idx) => (
        <View key={idx} className="mb-6">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 ml-1">{group.name}</Text>
          <View className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {group.actions.map((action, actionIdx) => (
              <Pressable
                key={actionIdx}
                onPress={() => router.push(action.href)}
                className={`flex-row items-center p-4 ${actionIdx !== group.actions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''} active:bg-slate-50 dark:active:bg-slate-800`}
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-4">
                  {action.icon}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">{action.title}</Text>
                  <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{action.description}</Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}