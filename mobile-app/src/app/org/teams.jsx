import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Search, Users, Plus, User, ShieldCheck } from "lucide-react-native";
import { useGetOrgTeamsQuery } from "@/services/api/orgApi";

export default function OrgTeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: teamsData, isLoading, isFetching, refetch } = useGetOrgTeamsQuery(1000);
  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => {
      const haystack = [team.name, team.teamLeader?.name]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [teams, searchQuery]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Teams</Text>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 active:scale-95 transition-transform">
            <Plus size={20} className="text-blue-600 dark:text-blue-400" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="mt-5 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5">
          <Search size={18} className="text-slate-400 dark:text-slate-500" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search teams..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {filteredTeams.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-2">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No teams found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TeamCard({ team }) {
  return (
    <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">
            {team.name}
          </Text>
          
          <View className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 self-start px-2 py-1 rounded-md mt-1">
            <ShieldCheck size={12} className="text-slate-500 dark:text-slate-400" />
            <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Leader: {team.teamLeader?.name || "Unassigned"}
            </Text>
          </View>
        </View>

        <View className="items-center justify-center bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <View className="flex-row items-center gap-1.5">
            <User size={14} className="text-blue-600 dark:text-blue-400" />
            <Text className="text-sm font-black text-blue-600 dark:text-blue-400">
              {team.membersCount || 0}
            </Text>
          </View>
          <Text className="text-[9px] font-bold text-blue-500 dark:text-blue-500/80 uppercase tracking-wider mt-0.5">
            Members
          </Text>
        </View>
      </View>
    </View>
  );
}