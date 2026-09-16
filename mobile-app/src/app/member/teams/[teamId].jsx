import React, { useMemo } from 'react';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetTeamLeaderTeamByIdQuery } from '@/services/api/teamLeaderApi';
import { ArrowLeft, Crown, User, Users, ShieldAlert, Shield, ShieldCheck } from 'lucide-react-native';

export default function MemberTeamDetail() {
  const { teamId } = useLocalSearchParams();
  const router = useRouter();

  const { data: teamData, isLoading, error } = useGetTeamLeaderTeamByIdQuery(teamId, {
    skip: !teamId,
  });

  const team = teamData?.item || null;
  const members = useMemo(() => team?.members || [], [team]);

  if (!teamId) {
    return (
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617] items-center justify-center p-6">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Invalid team id</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617] items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !team) {
    return (
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617] items-center justify-center p-6">
        <ShieldAlert size={48} className="text-amber-500 mb-4" />
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Team not found</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
          You may not have access to view this team's details.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-6 px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl active:bg-slate-200">
          <Text className="text-slate-600 dark:text-slate-300 font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="pt-8 pb-6 mb-5">
          {/* Back button removed */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-[32px] font-black tracking-tight text-slate-900 dark:text-white" numberOfLines={1}>
                {team.name}
              </Text>
              {team.description ? (
                <Text className="text-sm font-semibold text-slate-500 mt-1" numberOfLines={2}>
                  {team.description}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Leadership Section */}
        <Animated.View entering={FadeInUp.duration(400)} className="bg-white dark:bg-[#0F172A] rounded-[24px] p-5 mb-5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Leadership</Text>
          
          <View className="flex-row gap-3">
            <View className="flex-1 bg-slate-50 dark:bg-[#1E293B] p-4 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50">
              <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 items-center justify-center mb-2">
                <Shield size={16} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Leader</Text>
              <Text className="text-sm font-bold text-slate-900 dark:text-white mt-1" numberOfLines={1}>
                {team.leaderName || "Unassigned"}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 dark:bg-[#1E293B] p-4 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50">
              <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mb-2">
                <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
              </View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sub-Leader</Text>
              <Text className="text-sm font-bold text-slate-900 dark:text-white mt-1" numberOfLines={1}>
                {team.subLeaderName || "Unassigned"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Team Members */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} className="bg-white dark:bg-[#0F172A] rounded-[24px] p-5 mb-5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
          <View className="flex-row items-center mb-5 border-b border-slate-100 dark:border-slate-800/80 pb-3 gap-2">
            <Users size={16} className="text-amber-500" />
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Team Members ({members.length})</Text>
          </View>

          {members.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No members assigned.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {members.map((member, index) => (
                <View 
                  key={member.userId?._id || index} 
                  className="flex-row items-center bg-slate-50 dark:bg-[#1E293B] px-4 py-3.5 rounded-[20px] border border-slate-200/50 dark:border-slate-700/50"
                >
                  <View className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                      {(member.userId?.name || "U").charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {member.userId?.name || "Unknown User"}
                    </Text>
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                      {member.userId?.email}
                    </Text>
                  </View>
                  {member.userId?._id === team.leaderId && (
                    <View className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-md border border-amber-200/50 dark:border-amber-500/20">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                        Leader
                      </Text>
                    </View>
                  )}
                  {member.userId?._id === team.subLeaderId && (
                    <View className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-md border border-indigo-200/50 dark:border-indigo-500/20">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Sub
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Animated.View>

      </ScrollView>
    </View>
  );
}
