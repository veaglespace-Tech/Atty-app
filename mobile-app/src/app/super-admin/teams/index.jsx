import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, Pressable, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGetSuperAdminAllTeamsQuery, useDeleteSuperAdminTeamMutation } from '@/services/api/superAdminApi';
import { Users, Search, X, Trash2, Edit2, ShieldAlert, Building2 } from 'lucide-react-native';

export default function SuperAdminTeamsPage() {
  const router = useRouter();
  const { data, isLoading, isFetching, error, refetch } = useGetSuperAdminAllTeamsQuery();
  const teams = data?.data || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTeam, { isLoading: isDeleting }] = useDeleteSuperAdminTeamMutation();

  const handleDelete = (team) => {
    Alert.alert(
      "Delete Team",
      `Are you sure you want to delete "${team.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTeam(team.id).unwrap();
              Alert.alert("Success", "Team deleted successfully.");
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to delete team.");
            }
          }
        }
      ]
    );
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.organizationName.toLowerCase().includes(q) ||
        t.organizationCode.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  return (
    <View className="flex-1">
      {error ? (
        <View className="m-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded-2xl flex-row items-center">
          <ShieldAlert className="text-red-500 mr-3" size={24} />
          <Text className="text-red-600 dark:text-red-400 font-medium flex-1">Failed to load teams. Please try again.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View className="px-5 pt-4 pb-4">
              <Text className="text-[32px] font-black text-slate-900 dark:text-white tracking-tight mb-1">
                Global Teams
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 font-medium text-xs mb-6">
                Manage all teams across organizations.
              </Text>

              <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 shadow-sm">
                <Search size={16} className="text-slate-400" />
                <TextInput 
                  value={searchQuery} 
                  onChangeText={setSearchQuery} 
                  placeholder="Search team or org..." 
                  placeholderTextColor="#94a3b8" 
                  className="flex-1 ml-2 text-sm text-slate-900 dark:text-white"
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={14} color="#94a3b8" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading || isFetching}
              onRefresh={refetch}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            !isLoading && !isFetching && (
              <View className="py-12 items-center justify-center">
                <Text className="text-slate-500 dark:text-slate-400 font-medium text-sm">No teams found.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View className="px-5">
              <Pressable
                onPress={() => router.push(`/super-admin/teams/${item.id}`)}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95"
              >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center mb-1">
                    <Users size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                    <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Building2 size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400" numberOfLines={1}>
                      {item.organizationName} ({item.organizationCode})
                    </Text>
                  </View>
                </View>
                <View className={`px-2 py-1 rounded-md border ${item.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${item.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row justify-between items-end mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <View>
                  <Text className="text-xs text-slate-600 dark:text-slate-300">
                    <Text className="font-bold text-slate-400">Leader:</Text> {item.leaderName}
                  </Text>
                  <Text className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    <Text className="font-bold text-slate-400">Members:</Text> {item.memberCount}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => router.push(`/super-admin/teams/${item.id}`)}
                    className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 active:bg-blue-50"
                  >
                    <Edit2 size={16} color="#64748b" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(item)}
                    disabled={isDeleting}
                    className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 active:bg-red-50"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
