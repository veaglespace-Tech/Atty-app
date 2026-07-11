import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Users, UserCircle2 } from "lucide-react-native";
import { useGetOrgUsersQuery } from "@/services/api/orgApi";

export default function OrgEmployeesPage() {
  const { data, isLoading, isFetching, refetch } = useGetOrgUsersQuery(undefined);

  const users = useMemo(() => data?.items || [], [data]);
  const loading = isLoading || isFetching;

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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && users.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        users.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No employees found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {users.length} Employees Found
            </Text>
            {users.map((user) =>
          <View key={user.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden flex-row items-center gap-4">
                <View className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <UserCircle2 size={24} className="text-slate-400" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{user.email}</Text>
                  {user.phone ?
              <Text className="text-xs font-semibold text-slate-400 mt-0.5">{user.phoneCountryCode} {user.phone}</Text> :
              null}
                </View>
                <View className={`px-2 py-1 rounded-full border ${user.active ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50' : 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${user.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {user.active ? "ACTIVE" : "INACTIVE"}
                  </Text>
                </View>
              </View>
          )}
          </View>
        }
      </ScrollView>
    </View>);

}