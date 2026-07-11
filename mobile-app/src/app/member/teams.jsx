import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MapPin, Users } from "lucide-react-native";
import { useGetMemberDashboardQuery } from "@/services/api/memberApi";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyTeamsPage() {
  const { data: dashboardData, isLoading } = useGetMemberDashboardQuery();
  
  // Extract team info from the member's dashboard attendance items
  const firstItemWithTeam = dashboardData?.items?.find(item => item.teamId && item.teamName);
  const teams = firstItemWithTeam ? [{
    id: firstItemWithTeam.teamId,
    name: firstItemWithTeam.teamName,
    leaderName: "Assigned Leader", // Member endpoint doesn't return this
    isActive: true,
    memberCount: "-", // Member endpoint doesn't return this
    attendanceRadius: "-", // Member endpoint doesn't return this
    location: false
  }] : [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Native-style App Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <Pressable 
          onPress={() => router.back()} 
          className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900/80 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-95"
        >
          <ChevronLeft size={22} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">My Teams</Text>
        <View className="w-11" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : teams.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-6">
            <Users size={40} className="text-blue-400 dark:text-blue-500" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">No Teams</Text>
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            You haven't been assigned to any teams yet.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {teams.map((team) => (
            <Pressable 
              key={team.id} 
              className="bg-white dark:bg-slate-900/80 rounded-[28px] p-6 mb-5 shadow-sm border border-slate-100 dark:border-slate-800 active:opacity-90 active:scale-[0.98]"
            >
              <View className="flex-row items-start justify-between mb-5">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-1">{team.name}</Text>
                  <Text className="text-sm font-semibold text-slate-500">Leader: {team.leaderName}</Text>
                </View>
                <View className={`px-3 py-1.5 rounded-full ${team.isActive ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${team.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800/60">
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl">
                  <Users size={16} className="text-blue-500 dark:text-blue-400 mr-2" />
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{team.memberCount} Members</Text>
                </View>
                {team.location && (
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl">
                    <MapPin size={16} className="text-emerald-500 dark:text-emerald-400 mr-2" />
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Geo {team.attendanceRadius}m</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}