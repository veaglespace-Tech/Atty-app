import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Users } from "lucide-react-native";

export default function OrgEmployeesPage() {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Employees</Text>
          <View className="w-10" />
        </View>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Users size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
        <Text className="text-xl font-black text-slate-900 dark:text-white text-center">Employees Coming Soon</Text>
        <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
          This section is currently under development for mobile.
        </Text>
      </View>
    </View>);

}