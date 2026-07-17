import React from "react";
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { X, Users } from "lucide-react-native";
import { useGetPostPollResultsQuery } from "@/services/api/postApi";

export default function PollResultsModal({ postId, open, onClose }) {
  const { data, isLoading, error } = useGetPostPollResultsQuery(postId, {
    skip: !open,
  });

  const results = data?.items || [];

  return (
    <Modal visible={open} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable 
        style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)' }} 
        className="justify-center p-5"
        onPress={onClose}
      >
        <Pressable 
          onPress={(e) => e.stopPropagation()} 
          className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl max-h-[80%]"
        >
          <View className="flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">Poll Results</Text>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                Detailed Voter Breakdown
              </Text>
            </View>
            <Pressable 
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <X size={20} className="text-slate-500 dark:text-slate-400" />
            </Pressable>
          </View>

          <ScrollView className="p-6" contentContainerStyle={{ paddingBottom: 40 }}>
            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-sm font-bold text-slate-400">Loading results...</Text>
              </View>
            ) : error ? (
              <View className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl items-center mb-6">
                <Text className="text-sm font-bold text-red-600 dark:text-red-400 text-center">
                  Failed to load poll results. You might not have permission.
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                <Text className="text-sm font-bold text-slate-400 text-center">No votes have been cast yet.</Text>
              </View>
            ) : (
              <View className="space-y-6">
                {results.map((result) => (
                  <View key={result.index} className="mb-6">
                    <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                      <Text className="text-sm font-black text-slate-800 dark:text-slate-200 flex-1">
                        {result.option}
                      </Text>
                      <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        <Text className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                          {result.voters.length} {result.voters.length === 1 ? "Vote" : "Votes"}
                        </Text>
                      </View>
                    </View>
                    
                    {result.voters.length === 0 ? (
                      <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        No one selected this option.
                      </Text>
                    ) : (
                      <View className="gap-2">
                        {result.voters.map((voter) => (
                          <View
                            key={voter.id}
                            className="flex-row items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3"
                          >
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                              <Text className="text-sm font-black uppercase text-blue-700 dark:text-blue-400">
                                {voter.name?.charAt(0) || "U"}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>
                                {voter.name}
                              </Text>
                              <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-500 mt-0.5" numberOfLines={1}>
                                {voter.role === "TEAM_LEADER" ? "Team Leader" : voter.role === "MEMBER" ? "Member" : voter.role}{voter.teams ? ` • ${voter.teams}` : ""}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
