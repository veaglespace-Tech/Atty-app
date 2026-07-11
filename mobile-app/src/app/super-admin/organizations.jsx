import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Building2, Search, ChevronDown, Check } from "lucide-react-native";
import { useGetSuperAdminOrganizationsQuery } from "@/services/api/superAdminApi";

const SUBSCRIPTION_OPTIONS = ["ALL", "TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID"];
const ACCESS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];
const BLOCK_OPTIONS = ["ALL", "BLOCKED", "UNBLOCKED"];

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("ALL");
  const [access, setAccess] = useState("ALL");
  const [block, setBlock] = useState("ALL");
  
  // Filter Modal State
  const [activeFilter, setActiveFilter] = useState(null); // 'subscription', 'access', 'block' or null

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminOrganizationsQuery({
    search,
    subscriptionStatus,
    access,
    block,
  });

  const organizations = useMemo(() => data?.items || [], [data]);
  const loading = isLoading || isFetching;

  const renderFilterOptions = () => {
    let options = [];
    let currentValue = "";
    let setValue = null;
    let title = "";

    if (activeFilter === "subscription") {
      options = SUBSCRIPTION_OPTIONS;
      currentValue = subscriptionStatus;
      setValue = setSubscriptionStatus;
      title = "Filter by Subscription";
    } else if (activeFilter === "access") {
      options = ACCESS_OPTIONS;
      currentValue = access;
      setValue = setAccess;
      title = "Filter by Access";
    } else if (activeFilter === "block") {
      options = BLOCK_OPTIONS;
      currentValue = block;
      setValue = setBlock;
      title = "Filter by Block State";
    }

    return (
      <Modal visible={!!activeFilter} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setActiveFilter(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">{title}</Text>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setValue(opt);
                  setActiveFilter(null);
                }}
                className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
              >
                <Text className={`text-base font-bold ${currentValue === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt === "ALL" ? "All Options" : opt.replace("_", " ")}
                </Text>
                {currentValue === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
              </Pressable>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Organizations</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700 mb-3">
          <Search size={16} className="text-slate-400" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search organizations..."
            placeholderTextColor="#94a3b8"
            className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
          />
        </View>

        {/* Filters Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <Pressable 
            onPress={() => setActiveFilter("subscription")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mr-2 bg-slate-50 dark:bg-slate-800/50"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Subscription</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{subscriptionStatus}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>

          <Pressable 
            onPress={() => setActiveFilter("access")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mr-2 bg-slate-50 dark:bg-slate-800/50"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Access</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{access}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>

          <Pressable 
            onPress={() => setActiveFilter("block")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Block</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{block}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && organizations.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        organizations.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Building2 size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No organizations found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {organizations.length} Workspaces Found
            </Text>
            {organizations.map((org) =>
          <View key={org.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{org.name}</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{org.code}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full border ${org.blocked ? 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50' : 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50'}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${org.blocked ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {org.blocked ? "BLOCKED" : "ACTIVE"}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Admin</Text>
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{org.adminName || "No Admin"}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Plan</Text>
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{org.planName}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                  <View className="flex-row gap-4">
                    <View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Users</Text>
                      <Text className="text-sm font-black text-slate-800 dark:text-slate-200">{org.users}</Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Teams</Text>
                      <Text className="text-sm font-black text-slate-800 dark:text-slate-200">{org.teams}</Text>
                    </View>
                  </View>
                  <Pressable
                    className="bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-xl"
                    onPress={() => router.push(`/super-admin/organization/${org.id}`)}>
                    <Text className="text-xs font-black text-blue-600 dark:text-blue-400">View</Text>
                  </Pressable>
                </View>
              </View>
          )}
          </View>
        }
      </ScrollView>
      
      {renderFilterOptions()}
    </View>
  );
}