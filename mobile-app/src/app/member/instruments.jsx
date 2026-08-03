import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGetMemberInstrumentsQuery } from "@/services/api/memberApi";
import { Music, Calendar, Hash, Music4 } from "lucide-react-native";

export default function MemberInstrumentsPage() {
  const { data, isLoading, isError, isFetching, refetch } =
    useGetMemberInstrumentsQuery();

  const instruments = useMemo(() => data?.items || [], [data]);

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
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">
              My Assigned Instruments
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View the physical instruments and assets that have been assigned
              to you by the organization admin.
            </Text>
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <View className="p-4 rounded-xl bg-rose-50 border border-rose-200 mt-4">
              <Text className="text-sm font-medium text-rose-600 text-center">
                Failed to load your assigned instruments.
              </Text>
            </View>
          ) : (
            <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
              <View className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-4">
                <Music size={32} className="text-blue-500" />
              </View>
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                No Instruments Assigned
              </Text>
              <Text className="text-sm text-slate-500 text-center px-6">
                You currently do not have any instruments assigned to you. If
                you believe this is a mistake, please contact your organization
                admin.
              </Text>
            </View>
          )
        }
        renderItem={({ item: inst }) => (
          <View className="bg-white dark:bg-slate-900 p-5 rounded-[20px] mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center shrink-0">
                <Music4 size={24} className="text-blue-500" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {inst.name}
                </Text>
                {inst.description ? (
                  <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {inst.description}
                  </Text>
                ) : (
                  <View className="mb-4" />
                )}

                <View className="flex-row flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {inst.assetId ? (
                    <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <Hash size={14} className="text-slate-400 mr-1.5" />
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ID: {inst.assetId}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <Calendar size={14} className="text-slate-400 mr-1.5" />
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Assigned{" "}
                      {new Date(
                        inst.assignedAt || Date.now(),
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
