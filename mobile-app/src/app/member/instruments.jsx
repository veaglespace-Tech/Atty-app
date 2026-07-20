import React from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useGetMemberInstrumentsQuery } from "@/services/api/memberApi";
import { Box, Calendar, Hash } from "lucide-react-native";

export default function MemberInstrumentsPage() {
  const { data, isLoading, isFetching, refetch } = useGetMemberInstrumentsQuery();

  const instruments = data?.data || [];

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <FlatList
        data={instruments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
        ListEmptyComponent={
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
            <Box size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <Text className="text-slate-500 font-medium">No instruments assigned to you.</Text>
          </View>
        }
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">My Instruments</Text>
            <Text className="text-sm font-medium text-slate-500">Assets assigned to you by your organization</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-slate-900 p-4 rounded-[20px] mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.name}</Text>
                {item.description ? (
                  <Text className="text-xs text-slate-500">{item.description}</Text>
                ) : null}
              </View>
              <View className={`px-2 py-1 rounded-md ${
                item.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                item.status === 'MAINTENANCE' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-slate-100 dark:bg-slate-800'
              }`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${
                  item.status === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-400' :
                  item.status === 'MAINTENANCE' ? 'text-amber-700 dark:text-amber-400' :
                  'text-slate-600 dark:text-slate-400'
                }`}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <View className="flex-row items-center">
                <Hash size={14} className="text-slate-400 mr-1.5" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {item.serialNumber || "N/A"}
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <Calendar size={14} className="text-slate-400 mr-1.5" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {new Date(item.assignedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
