import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import OrgLogoSettings from "@/components/settings/OrgLogoSettings";
import OrgDetailsSettings from "@/components/org/settings/OrgDetailsSettings";
import LocationSettings from "@/components/settings/LocationSettings";
import TimeSettings from "@/components/settings/TimeSettings";

export default function WorkspaceSettings() {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex-row items-center gap-3">
        <Pressable 
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
          <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 dark:text-white flex-1">
          Workspace Settings
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <OrgLogoSettings />
        <OrgDetailsSettings />
        <LocationSettings />
        <TimeSettings />
      </ScrollView>
    </View>
  );
}
