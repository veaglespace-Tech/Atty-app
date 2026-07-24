import React, { useState, useMemo } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, Modal, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Search, Users, Plus, User, ShieldCheck, X, UsersRound, RefreshCw, Power, Trash2 } from "lucide-react-native";
import { useSelector } from "react-redux";
import { useGetOrgTeamsQuery, useGetOrgUsersQuery, useCreateOrgTeamMutation, usePatchOrgTeamMutation, useDeleteOrgTeamMutation } from "@/services/api/orgApi";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";

const getErrorMessage = (error, fallback) => error?.data?.message || error?.error || fallback;

export default function OrgTeamsPage() {
  const authUser = useSelector((state) => state.auth.user);
  const canCreateTeams = hasPermission(authUser, PERMISSIONS.TEAM_CREATE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM_ASSIGN_MEMBERS);

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [addLeaderOpen, setAddLeaderOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", attendanceRadius: "",
    leaderId: "", memberIds: [],
  });

  const { data: teamsData, isLoading, isFetching, refetch: refetchTeams } = useGetOrgTeamsQuery(1000);
  const { data: usersData, refetch: refetchUsers } = useGetOrgUsersQuery(1000, { skip: !canCreateTeams });
  const [createTeamMutation] = useCreateOrgTeamMutation();

  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];
  const users = Array.isArray(usersData?.items) ? usersData.items : [];

  const leaderOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(r) && u.active;
  }), [users]);

  const memberOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.MEMBER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(r) && u.active;
  }), [users]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => {
      const haystack = [team.name, team.teamLeader?.name].map((value) => String(value || "").toLowerCase()).join(" ");
      return haystack.includes(query);
    });
  }, [teams, searchQuery]);

  const filteredLeaders = useMemo(() => {
    const query = leaderSearch.trim().toLowerCase();
    return leaderOptions.filter((u) => {
      if (String(u.id) === String(form.leaderId)) return false;
      if (!query) return true;
      return String(u.name || "").toLowerCase().includes(query) || String(u.email || "").toLowerCase().includes(query);
    });
  }, [leaderOptions, leaderSearch, form.leaderId]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return memberOptions.filter((u) => {
      if (form.memberIds.includes(String(u.id))) return false;
      if (!query) return true;
      return String(u.name || "").toLowerCase().includes(query) || String(u.email || "").toLowerCase().includes(query);
    });
  }, [memberOptions, memberSearch, form.memberIds]);

  const userMap = useMemo(() => { const m = new Map(); users.forEach((u) => m.set(String(u.id), u)); return m; }, [users]);

  const selectedLeader = useMemo(() => form.leaderId ? userMap.get(String(form.leaderId)) : null, [form.leaderId, userMap]);
  const selectedMembers = useMemo(() => form.memberIds.map(id => userMap.get(String(id))).filter(Boolean), [form.memberIds, userMap]);

  const resetForm = () => {
    setForm({ name: "", description: "", attendanceRadius: "", leaderId: "", memberIds: [] });
    setLeaderSearch(""); setMemberSearch(""); setAddLeaderOpen(false); setAddMemberOpen(false);
  };

  const createTeam = async () => {
    if (!form.name.trim()) { Alert.alert("Error", "Team name is required"); return; }
    try {
      setSubmitting(true);
      await createTeamMutation({
        name: form.name.trim(), description: form.description.trim(), attendanceRadius: Number(form.attendanceRadius || 25),
        ...(canAssignMembers ? { leaderId: form.leaderId ? Number(form.leaderId) : null, memberIds: form.memberIds.map(Number) } : {})
      }).unwrap();
      Alert.alert("Success", "Team created successfully");
      resetForm(); setCreateOpen(false); await refetchTeams();
    } catch (e) { Alert.alert("Error", getErrorMessage(e, "Failed to create team")); } finally { setSubmitting(false); }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organization Teams</Text>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
          Create teams, assign leader and members, and open each team for full management.
        </Text>
        <View className="flex-row items-center gap-3">
          {canCreateTeams && (
            <Pressable
              onPress={() => setCreateOpen(true)}
              className="flex-1 h-11 flex-row items-center justify-center gap-2 bg-blue-500 dark:bg-blue-600 rounded-[18px] shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-transform">
              <Plus size={18} color="#fff" />
              <Text className="text-white text-sm font-bold">New Team</Text>
            </Pressable>
          )}
          <Pressable
            onPress={refetchTeams}
            className="h-11 w-11 items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[18px] active:scale-95 transition-transform">
            <RefreshCw size={18} className="text-slate-700 dark:text-slate-300" />
          </Pressable>
        </View>
      </View>

      {/* TEAM DIRECTORY SECTION */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetchTeams} tintColor="#2563eb" />}>

        <View className="mt-6 mx-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-8">
          <View className="px-5 pt-5 pb-3">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Team Directory
            </Text>
          </View>
          
          {/* Search Bar */}
          <View className="px-5 pb-4">
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3">
              <Search size={18} className="text-slate-400 dark:text-slate-500" />
              <TextInput
                value={searchQuery} onChangeText={setSearchQuery} placeholder="Search teams..." placeholderTextColor="#94a3b8"
                className="flex-1 ml-3 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>
          </View>

          <View className="px-5 pb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {filteredTeams.length > 0
                ? `Showing ${filteredTeams.length} of ${teams.length} teams`
                : "No teams found"}
            </Text>
          </View>

          <View>
            {filteredTeams.length === 0 ? (
               <View className="py-16 items-center justify-center">
                 <Users size={48} className="text-slate-200 dark:text-slate-700" />
                 <Text className="text-slate-500 font-semibold mt-4">No teams match your search.</Text>
               </View>
            ) : (
              filteredTeams.map((team, index) => <TeamCard key={team.id} team={team} index={index} />)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create Team Modal */}
      <Modal visible={createOpen} animationType="slide" transparent={false} onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Create Team</Text>
            <Pressable onPress={() => { resetForm(); setCreateOpen(false); }} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800"><X size={18} color="#94a3b8" /></Pressable>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View className="gap-4">
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Team Name *</Text>
                <TextInput value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
              </View>
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Attendance Radius (m)</Text>
                <TextInput value={form.attendanceRadius} onChangeText={(v) => setForm((p) => ({ ...p, attendanceRadius: v.replace(/[^\d]/g, "") }))} keyboardType="number-pad" placeholder="25" placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
              </View>
              <View className="gap-1.5">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Description</Text>
                <TextInput value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} multiline numberOfLines={3}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
              </View>

              {canAssignMembers && (
                <>
                  <View className="gap-1.5 mt-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Team Leader</Text>
                      <Pressable onPress={() => setAddLeaderOpen(true)} className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                        <Plus size={12} className="text-blue-600 dark:text-blue-400" />
                        <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Select</Text>
                      </Pressable>
                    </View>
                    {selectedLeader ? (
                      <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
                        <View className="flex-1"><Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{selectedLeader.name || selectedLeader.email}</Text></View>
                        <Pressable onPress={() => setForm((p) => ({ ...p, leaderId: "" }))} className="p-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10"><X size={14} color="#e11d48" /></Pressable>
                      </View>
                    ) : (
                      <Text className="text-xs text-slate-400">No leader selected</Text>
                    )}
                  </View>

                  <View className="gap-1.5 mt-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Team Members ({selectedMembers.length})</Text>
                      <Pressable onPress={() => setAddMemberOpen(true)} className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                        <Plus size={12} className="text-blue-600 dark:text-blue-400" />
                        <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Add</Text>
                      </Pressable>
                    </View>
                    {selectedMembers.length > 0 ? (
                      <View className="gap-2">
                        {selectedMembers.map((m) => (
                          <View key={m.id} className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2">
                            <View className="flex-1"><Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>{m.name || m.email}</Text></View>
                            <Pressable onPress={() => setForm((p) => ({ ...p, memberIds: p.memberIds.filter(id => id !== String(m.id)) }))} className="p-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10"><X size={12} color="#e11d48" /></Pressable>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-xs text-slate-400">No members selected</Text>
                    )}
                  </View>
                </>
              )}

              <Pressable onPress={createTeam} disabled={submitting}
                className={`w-full mt-4 py-4 rounded-2xl items-center flex-row justify-center gap-2 active:scale-[0.98] transition-transform ${submitting ? "bg-blue-400" : "bg-blue-600 shadow-sm"}`}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <UsersRound size={18} color="#fff" />}
                <Text className="text-white text-[15px] font-bold">Create Team</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Select Leader Modal */}
      <Modal visible={addLeaderOpen} animationType="slide" transparent={false} onRequestClose={() => setAddLeaderOpen(false)}>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Select Leader</Text>
            <Pressable onPress={() => setAddLeaderOpen(false)} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800"><X size={18} color="#94a3b8" /></Pressable>
          </View>
          <View className="px-5 pt-4">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
              <Search size={18} color="#94a3b8" />
              <TextInput value={leaderSearch} onChangeText={setLeaderSearch} placeholder="Search leader..." placeholderTextColor="#94a3b8" className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white" />
            </View>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {filteredLeaders.length === 0 ? <View className="py-8 items-center"><Text className="text-sm font-semibold text-slate-500">No available leaders.</Text></View> : (
              <View className="gap-2">
                {filteredLeaders.map((u) => (
                  <Pressable key={u.id} onPress={() => { setForm((p) => ({ ...p, leaderId: String(u.id) })); setAddLeaderOpen(false); }} className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800">
                    <View className="flex-1"><Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text><Text className="text-[11px] font-medium text-slate-500">{formatRoleLabel(u.role)}</Text></View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Members Modal */}
      <Modal visible={addMemberOpen} animationType="slide" transparent={false} onRequestClose={() => setAddMemberOpen(false)}>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Add Members</Text>
            <Pressable onPress={() => setAddMemberOpen(false)} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800"><X size={18} color="#94a3b8" /></Pressable>
          </View>
          <View className="px-5 pt-4">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
              <Search size={18} color="#94a3b8" />
              <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search members..." placeholderTextColor="#94a3b8" className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white" />
            </View>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {filteredMembers.length === 0 ? <View className="py-8 items-center"><Text className="text-sm font-semibold text-slate-500">No available members.</Text></View> : (
              <View className="gap-2">
                {filteredMembers.map((u) => (
                  <Pressable key={u.id} onPress={() => setForm((p) => ({ ...p, memberIds: [...p.memberIds, String(u.id)] }))} className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800">
                    <View className="flex-1"><Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text><Text className="text-[11px] font-medium text-slate-500">{formatRoleLabel(u.role)}</Text></View>
                    <Plus size={18} color="#2563eb" />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function TeamCard({ team, index = 0 }) {
  const [deleteTeam] = useDeleteOrgTeamMutation();
  const [patchTeam] = usePatchOrgTeamMutation();

  const handleDeactivate = () => {
    const actionText = team.isActive ? 'deactivate' : 'activate';
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to ${actionText} this team?`)) {
        patchTeam({ teamId: team.id, isActive: !team.isActive });
      }
      return;
    }
    Alert.alert("Confirm", `Are you sure you want to ${actionText} this team?`, [
      { text: "Cancel", style: "cancel" },
      { text: team.isActive ? "Deactivate" : "Activate", onPress: () => patchTeam({ teamId: team.id, isActive: !team.isActive }), style: team.isActive ? "destructive" : "default" }
    ]);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to permanently delete this team?")) {
        deleteTeam(team.id);
      }
      return;
    }
    Alert.alert("Delete Team", "Are you sure you want to permanently delete this team?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: () => deleteTeam(team.id), style: "destructive" }
    ]);
  };

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 50).springify()}>
      <Pressable onPress={() => router.push(`/org/team/${team.id}`)} className="p-5 mb-3 mx-4 bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/80 active:scale-[0.98] transition-all">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
            {team.name}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${team.isActive ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-slate-200 dark:bg-slate-800'}`}>
          <Text className={`text-[10px] font-black uppercase tracking-widest ${team.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-400'}`}>
            {team.isActive ? 'Active' : 'Blocked'}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-y-4 gap-x-2">
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Leader</Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>{team.teamLeader?.name || "-"}</Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Members</Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{team.membersCount || 0}</Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Radius</Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{team.attendanceRadius ? `${team.attendanceRadius}m` : "-"}</Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Created</Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>{new Date(team.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <View className="mt-5 flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <Pressable 
          onPress={handleDeactivate} 
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-rose-900/30 bg-rose-500/5 active:bg-rose-500/10">
          <Power size={12} className="text-rose-400" />
          <Text className="text-[11px] font-bold tracking-wide text-rose-300">
            {team.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </Pressable>
        <Pressable 
          onPress={handleDelete} 
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-rose-900/30 bg-rose-500/5 active:bg-rose-500/10">
          <Trash2 size={12} className="text-rose-400" />
          <Text className="text-[11px] font-bold tracking-wide text-rose-300">
            Delete
          </Text>
        </Pressable>
      </View>
      </Pressable>
    </Animated.View>
  );
}
