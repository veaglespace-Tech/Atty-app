import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetSuperAdminTeamByIdQuery, usePatchSuperAdminTeamMutation } from '@/services/api/superAdminApi';
import { Users, Building2, Save, ArrowLeft, ShieldAlert } from 'lucide-react-native';

export default function SuperAdminTeamDetail() {
  const { teamId } = useLocalSearchParams();
  const router = useRouter();
  
  const { data, isLoading, error } = useGetSuperAdminTeamByIdQuery(teamId);
  const team = data?.data;
  
  const [updateTeam, { isLoading: isUpdating }] = usePatchSuperAdminTeamMutation();
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [hasInitialized, setHasInitialized] = useState(false);

  if (team && !hasInitialized) {
    setFormData({ name: team.name || "", description: team.description || "" });
    setHasInitialized(true);
  }

  const handleUpdate = async () => {
    try {
      await updateTeam({ teamId, ...formData }).unwrap();
      Alert.alert("Success", "Team updated successfully.");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update team.");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !team) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ShieldAlert size={48} color="#ef4444" className="mb-4" />
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Team not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Text className="text-slate-600 dark:text-slate-300 font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
        <View className="flex-1">
          <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>
            {team.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Building2 size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">{team.organizationName}</Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-md border ml-2 ${team.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          <Text className={`text-[10px] font-black uppercase tracking-widest ${team.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {team.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <Text className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Edit Details</Text>
          
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Team Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              placeholder="Team Name"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-medium"
            />
          </View>

          <View className="mb-6">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Description (Optional)</Text>
            <TextInput
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              placeholder="Team description..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: "top" }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-medium min-h-[80px]"
            />
          </View>

          <Pressable 
            onPress={handleUpdate}
            disabled={isUpdating}
            className={`flex-row items-center justify-center rounded-xl py-3.5 ${isUpdating ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-sm">Save Changes</Text>
              </>
            )}
          </Pressable>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400">Team Members ({team.members?.length || 0})</Text>
          </View>

          {(!team.members || team.members.length === 0) ? (
            <View className="py-6 items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <Users size={24} color="#94a3b8" className="mb-2" />
              <Text className="text-slate-500 dark:text-slate-400 font-medium text-xs">No members in this team.</Text>
            </View>
          ) : (
            <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {team.members.map((member, index) => (
                <View 
                  key={member.userId?._id || index} 
                  className={`flex-row items-center p-3 ${index !== team.members.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}
                >
                  <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {(member.userId?.name || "U").charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {member.userId?.name || "Unknown User"}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                      {member.userId?.email}
                    </Text>
                  </View>
                  <View className={`px-2 py-1 rounded-md border ${
                    member.isLeader 
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' 
                      : member.isSubLeader 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${
                      member.isLeader 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : member.isSubLeader 
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {member.isLeader ? 'Leader' : member.isSubLeader ? 'Sub-Leader' : 'Member'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
