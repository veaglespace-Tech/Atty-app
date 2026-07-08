
import { ScrollView, Text, View, Pressable } from "react-native";
import { router, Link } from "expo-router";
import { LogOut, Settings, BarChart3, CalendarCheck2, Bell } from "lucide-react-native";
import { useDispatch } from "react-redux";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";
import { formatRoleLabel } from "@/utils/roles";
















const defaultActions = [
{
  title: "Attendance",
  description: "Check today's attendance status and recent activity.",
  icon: <CalendarCheck2 size={22} color="#2563eb" />,
  href: "attendance"
},
{
  title: "Reports",
  description: "Review summaries, trends, and attendance exports.",
  icon: <BarChart3 size={22} color="#2563eb" />,
  href: "reports"
},
{
  title: "Notifications",
  description: "Read updates from your organization workspace.",
  icon: <Bell size={22} color="#2563eb" />,
  href: "notifications"
},
{
  title: "Settings",
  description: "Manage profile, workspace, and app preferences.",
  icon: <Settings size={22} color="#2563eb" />,
  href: "settings"
}];


export default function MobileDashboardShell({
  title,
  subtitle,
  actions = defaultActions,
  children,
  refreshControl
}) {
  const dispatch = useDispatch();
  const { user } = useAuthSession();

  const onLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerStyle={{ padding: 16, paddingTop: 36, paddingBottom: 40 }}
      refreshControl={refreshControl}>
      
      <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
        <View className="p-5">
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                {formatRoleLabel(user?.currentRole) || "Workspace"}
              </Text>
              <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
              </Text>
              <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                {subtitle}
              </Text>
            </View>
            <Pressable
              onPress={onLogout}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
              
              <LogOut size={18} color="#e11d48" />
            </Pressable>
          </View>

          <View className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400">
              Signed in as
            </Text>
            <Text className="mt-1 text-base font-black text-slate-900 dark:text-white">
              {user?.name || "Team Member"}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
              {user?.email || user?.organization?.name || "Veagle Attendee"}
            </Text>
          </View>
        </View>
      </View>

      {children && <View className="mb-6">{children}</View>}

      <View className="gap-4">
        {actions.map((action) => {
          const ActionContent =
          <View
            className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                {action.icon}
              </View>
              <Text className="text-lg font-black text-slate-950 dark:text-white">
                {action.title}
              </Text>
              <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                {action.description}
              </Text>
            </View>;


          if (action.href) {
            // Using absolute paths or relative paths. If href is provided without leading slash,
            // it will navigate relative to the current route (e.g. from /member/dashboard to /member/attendance).
            // However, Expo router relative paths can be tricky from nested stacks without _layout, 
            // so we will just use Link with the href directly. 
            // The route path string will be appended, e.g. `<Link href={"./attendance"} ...>`
            return (
              <Link key={action.title} href={`./${action.href}`} asChild>
                <Pressable className="active:opacity-70">{ActionContent}</Pressable>
              </Link>);

          }

          return <View key={action.title}>{ActionContent}</View>;
        })}
      </View>
    </ScrollView>);

}