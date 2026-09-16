import React, { useState } from "react";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MapPin, Users, X, User, Shield, ShieldCheck, RefreshCcw } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import {
  useGetTeamLeaderTeamsQuery,
  useGetTeamLeaderTeamByIdQuery,
} from "@/services/api/teamLeaderApi";

function TeamDetailsModal({ team, visible, onClose }) {
  const { data, isLoading } = useGetTeamLeaderTeamByIdQuery(team?.id, {
    skip: !team,
  });
  const members = Array.isArray(data?.members) ? data.members : [];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-slate-900/40">
        <View className="bg-[#F8FAFC] dark:bg-[#020617] rounded-t-[32px] h-[85%] shadow-lg border-t border-slate-200/50 dark:border-slate-800/50">
          {/* Header */}
          <View className="p-6 bg-white dark:bg-[#0B1120] rounded-t-[32px] border-b border-slate-100 dark:border-slate-800/50 flex-row justify-between items-center shadow-sm z-10">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
                {team?.name}
              </Text>
              <Text className="text-sm font-semibold text-slate-500 mt-1" numberOfLines={1}>
                {team?.description || "Team Details"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full active:bg-slate-200"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <View>
                {/* Leadership Section */}
                <View className="bg-white dark:bg-[#0F172A] rounded-[24px] p-5 mb-5 shadow-sm border border-slate-200 dark:border-slate-800/80">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Leadership</Text>
                  
                  <View className="flex-row gap-3">
                    <View className="flex-1 bg-slate-50 dark:bg-[#1E293B] p-4 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50">
                      <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 items-center justify-center mb-2">
                        <Shield size={16} className="text-blue-600 dark:text-blue-400" />
                      </View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Leader</Text>
                      <Text className="text-sm font-bold text-slate-900 dark:text-white mt-1" numberOfLines={1}>
                        {team?.leaderName || "Unassigned"}
                      </Text>
                    </View>

                    <View className="flex-1 bg-slate-50 dark:bg-[#1E293B] p-4 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50">
                      <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mb-2">
                        <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                      </View>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sub-Leader</Text>
                      <Text className="text-sm font-bold text-slate-900 dark:text-white mt-1" numberOfLines={1}>
                        {team?.subLeaderName || "Unassigned"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Members Section */}
                <View className="bg-white dark:bg-[#0F172A] rounded-[24px] p-5 mb-5 shadow-sm border border-slate-200 dark:border-slate-800/80">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">
                    Team Members ({members.length})
                  </Text>
                  
                  {members.length === 0 ? (
                    <View className="py-8 items-center justify-center">
                      <Users size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                      <Text className="text-slate-500 font-semibold text-sm">No members found.</Text>
                    </View>
                  ) : (
                    <View className="gap-2.5">
                      {members.map((member, index) => (
                        <Animated.View key={member.id || index} entering={FadeInUp.duration(300).delay(index * 30)}>
                          <View className="flex-row items-center bg-slate-50 dark:bg-[#1E293B] px-4 py-3.5 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50">
                            <View className="h-10 w-10 bg-blue-50 dark:bg-blue-500/10 rounded-full items-center justify-center mr-3">
                              <User size={18} className="text-blue-500" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-[14px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                {member.member || member.name}
                              </Text>
                              <Text className="text-xs font-semibold text-slate-500 mt-0.5" numberOfLines={1}>
                                {member.role || "Member"}
                              </Text>
                            </View>
                            {member.id === team?.leaderId && (
                              <View className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-md border border-amber-200/50 dark:border-amber-500/20">
                                <Text className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                  Leader
                                </Text>
                              </View>
                            )}
                            {member.id === team?.subLeaderId && (
                              <View className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-md border border-indigo-200/50 dark:border-indigo-500/20">
                                <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                  Sub
                                </Text>
                              </View>
                            )}
                          </View>
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MyTeamsPage(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: teamsData, isLoading, isFetching, refetch } = useGetTeamLeaderTeamsQuery(50);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];

  return (
    <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
      {/* HEADER */}
      <View className="px-5 pt-6 pb-2 z-10">
        <View className="bg-white dark:bg-[#0B1120] rounded-[24px] p-5 shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800/80">
          <Text className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white mb-1">My Teams</Text>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
            Teams you are part of in your organization.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            disabled={isLoading || isFetching}
            className="w-full flex-row items-center justify-center bg-slate-50 dark:bg-[#1E293B] py-3.5 rounded-[16px] border border-slate-200/60 dark:border-slate-700/50 active:bg-slate-100 dark:active:bg-slate-800"
          >
            {isLoading || isFetching ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <RefreshCcw size={16} className="text-slate-600 dark:text-slate-300" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : teams.length === 0 ? (
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View className="bg-white dark:bg-[#0B1120] rounded-[24px] p-8 items-center shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800/80">
              <View className="h-16 w-16 rounded-full bg-slate-50 dark:bg-[#1E293B] items-center justify-center mb-4">
                <Users size={28} className="text-slate-400 dark:text-slate-500" />
              </View>
              <Text className="text-base font-bold text-slate-700 dark:text-slate-200 text-center mb-1.5">
                No team assigned yet
              </Text>
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                You will see your teams here once an admin or team leader adds you.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-5"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {teams.map((team, index) => (
            <Animated.View key={team.id} entering={FadeInUp.duration(400).delay(index * 50).springify()}>
              <TouchableOpacity
                onPress={() => setSelectedTeam(team)}
                className="bg-white dark:bg-[#0F172A] rounded-[28px] overflow-hidden mb-4 shadow-sm border border-slate-200/80 dark:border-slate-800/80 active:opacity-90 active:scale-[0.98]"
              >
                <View className="px-5 pt-5 pb-4 bg-gradient-to-b from-slate-50 to-white dark:from-[#131B2F] dark:to-[#0F172A]">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-[18px] font-black text-slate-900 dark:text-white leading-tight mb-1" numberOfLines={1}>
                        {team.name}
                      </Text>
                      {team.description ? (
                        <Text className="text-sm font-semibold text-slate-500" numberOfLines={1}>
                          {team.description}
                        </Text>
                      ) : null}
                    </View>
                    <View className={`px-3 py-1.5 rounded-full ${team.isActive ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"}`}>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${team.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {team.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Info Bar */}
                <View className="flex-row flex-wrap gap-y-4 gap-x-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800/80">
                  <View className="w-[45%]">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Shield size={12} className="text-blue-500 dark:text-blue-400" />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Leader</Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>{team.leaderName || "Unassigned"}</Text>
                  </View>
                  <View className="w-[45%]">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <ShieldCheck size={12} className="text-indigo-500 dark:text-indigo-400" />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sub-Leader</Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>{team.subLeaderName || "Unassigned"}</Text>
                  </View>
                  <View className="w-[45%]">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Users size={12} className="text-amber-500 dark:text-amber-400" />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Members</Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">{team.memberCount ?? 0}</Text>
                  </View>
                  <View className="w-[45%]">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <MapPin size={12} className="text-rose-500 dark:text-rose-400" />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Location</Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">{team.attendanceRadius ? `Geo ${team.attendanceRadius}m` : "-"}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}
      <TeamDetailsModal
        team={selectedTeam}
        visible={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </View>
  );
}
