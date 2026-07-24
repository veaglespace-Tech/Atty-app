import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from "react-native";
import { router } from "expo-router";
import {  ChevronLeft, MapPin, Users, X, User  } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useGetTeamLeaderTeamsQuery, useGetTeamLeaderTeamByIdQuery } from "@/services/api/teamLeaderApi";

function TeamDetailsModal({ team, visible, onClose }) {
  const { data, isLoading } = useGetTeamLeaderTeamByIdQuery(team?.id, { skip: !team });
  const members = Array.isArray(data?.members) ? data.members : [];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] h-[80%] shadow-lg">
          <View className="p-6 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
            <View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">{team?.name}</Text>
              <Text className="text-sm font-semibold text-slate-500 mt-1">Leader: {team?.leaderName}</Text>
            </View>
            <Pressable onPress={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <X size={20} className="text-slate-500" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : members.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Users size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                <Text className="text-slate-500 font-medium">No members found in this team.</Text>
              </View>
            ) : (
              <View className="pb-10">
                <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Team Members ({members.length})</Text>
                {members.map(member => (
                  <View key={member.id} className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800/60">
                    <View className="h-10 w-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl items-center justify-center mr-3">
                      <User size={18} className="text-blue-600 dark:text-blue-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-900 dark:text-white">{member.member}</Text>
                      <Text className="text-xs font-semibold text-slate-500 mt-0.5">{member.role}</Text>
                    </View>
                    {member.id === team?.leaderId && (
                      <View className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                        <Text className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-500">Leader</Text>
                      </View>
                    )}
                  </View>
                ))}
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
  const { data: teamsData, isLoading } = useGetTeamLeaderTeamsQuery("limit=50");
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];

  return (
    <>      {isLoading ? (
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
              onPress={() => setSelectedTeam(team)}              className="bg-white dark:bg-slate-900/80 rounded-[28px] p-6 mb-5 shadow-sm border border-slate-100 dark:border-slate-800 active:opacity-90 active:scale-[0.98]"
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

      <TeamDetailsModal 
        team={selectedTeam} 
        visible={!!selectedTeam} 
        onClose={() => setSelectedTeam(null)} 
      />
    </>
  );
}
