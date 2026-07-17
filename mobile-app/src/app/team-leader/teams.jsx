import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import {  ChevronLeft, Component, Users, MapPin, ShieldCheck, ShieldAlert  } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useGetTeamLeaderTeamsQuery } from "@/services/api/teamLeaderApi";

export default function TeamLeaderTeamsPage(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data, isLoading, isFetching, refetch } = useGetTeamLeaderTeamsQuery(100);

  const teams = useMemo(() => data?.items || data?.teams || [], [data]);
  const loading = isLoading || isFetching;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} color={isDark ? "#ffffff" : "#0f172a"} />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">My Teams</Text>
          <View className="w-10" />
        </View>
      </View>
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && teams.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : teams.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Component size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-xl font-black text-slate-900 dark:text-white mb-2">No teams found</Text>
            <Text className="text-sm font-medium text-slate-500 text-center px-4">
              You are not assigned as a leader to any active teams yet.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {teams.length} Teams Managed
            </Text>
            
            {teams.map((team) => (
              <View key={team.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>
                      {team.name}
                    </Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      Leader: {team.leaderName || "Unassigned"}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full border ${team.isActive ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${team.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {team.isActive ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center border border-blue-100 dark:border-blue-800/30">
                      <Users size={14} className="text-blue-500" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Members</Text>
                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{team.memberCount || 0}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center border border-indigo-100 dark:border-indigo-800/30">
                      <MapPin size={14} className="text-indigo-500" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Radius</Text>
                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{team.attendanceRadius || 25}m</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}