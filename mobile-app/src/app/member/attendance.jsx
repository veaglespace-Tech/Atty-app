import React from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";


export default function MemberAttendancePage(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthSession();

  return (
<<<<<<< HEAD
    <>
=======
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">My Attendance</Text>
          <View className="w-10" />
        </View>
      </View>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
      <MyAttendanceCore user={user} />
    </>
  );
}