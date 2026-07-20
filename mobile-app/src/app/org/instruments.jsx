import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Wrench, ArrowLeft, Plus, Hash, Clock } from "lucide-react-native";
import { useGetOrgInstrumentsQuery } from "@/services/api/orgApi";

export default function OrgInstruments() {
  const { data, isFetching, refetch } = useGetOrgInstrumentsQuery();

  const instrumentsList = data?.items || data?.data || [];

  const getStatusColor = (status) => {
    return status === 'Available' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';
  };

  const getStatusBg = (status) => {
    return status === 'Available' ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : 'bg-blue-100/50 dark:bg-blue-900/30';
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <View className="px-4 py-4 pt-12 flex-row items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Pressable 
          onPress={() => router.back()} 
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 mr-3"
        >
          <ArrowLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900 dark:text-white flex-1">Instrument Assets</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 active:bg-blue-200 dark:active:bg-blue-800/50">
          <Plus size={20} className="text-blue-600 dark:text-blue-400" />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* DASHBOARD SUMMARY CARD */}
        <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
          <View className="p-5">
            <View className="mb-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                  Asset Management
                </Text>
                <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  Instruments
                </Text>
                <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                  Track assigned gear, asset IDs, and equipment descriptions across the organization.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Wrench size={20} className="text-slate-900 dark:text-white" />
              </View>
            </View>
          </View>
        </View>

        {/* INSTRUMENT LIST */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Inventory
              </Text>
            </View>
            <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {instrumentsList.length} ITEMS
              </Text>
            </View>
          </View>

          <View className="gap-y-3">
            {instrumentsList.map((inst) => {
              const name = inst.name || inst.title || 'Unknown Instrument';
              const assetId = inst.assetId || 'N/A';
              const description = inst.description || 'No description available.';
              const assignedTo = inst.assignedUser?.name || inst.assignedTo || 'Unassigned';
              const status = (inst.assignedUser || inst.assignedTo) && assignedTo !== 'Unassigned' ? 'Assigned' : 'Available';
              const assignedAt = inst.assignedAt ? new Date(inst.assignedAt).toLocaleDateString() : '-';
              
              return (
                <View key={inst.id} className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white flex-1 mr-4">
                      {name}
                    </Text>
                    <View className={`px-2 py-0.5 rounded ${getStatusBg(status)}`}>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                        {status}
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                    {description}
                  </Text>

                  <View className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Hash size={12} className="text-slate-400 mr-1" />
                      <Text className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400">
                        {assetId}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Clock size={12} className="text-slate-400 mr-1" />
                      <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {assignedAt !== '-' ? assignedAt : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="mt-3 flex-row items-center">
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Assigned To: <Text className="font-normal text-slate-500 dark:text-slate-400">{assignedTo}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
