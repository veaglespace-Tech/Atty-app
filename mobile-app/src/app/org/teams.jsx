import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Component } from "lucide-react-native";
import { useGetOrgTeamsQuery } from "@/services/api/orgApi";

export default function OrgTeamsPage() {
  const { data, isLoading, isFetching, refetch } = useGetOrgTeamsQuery(undefined);

  const teams = useMemo(() => data?.items || [], [data]);
  const loading = isLoading || isFetching;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Teams</Text>
          <View className="w-10" />
        </View>
      </View>
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && teams.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        teams.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Component size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No teams found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {teams.length} Teams Found
            </Text>
            {teams.map((team) =>
          <View key={team.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden flex-row items-center gap-4">
                <View className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center">
                  <Component size={24} className="text-indigo-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{team.name}</Text>
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{team.description || "No description"}</Text>
                </View>
              </View>
          )}
          </View>
        }
      </ScrollView>
    </View>);

}