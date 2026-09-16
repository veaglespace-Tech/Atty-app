import React, { useState, useMemo } from "react";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, Modal, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { Search, Users, Plus, User, ShieldCheck, X, UsersRound, RefreshCw, Power, Trash2, Shield, MapPin, CalendarDays, LocateFixed, ShieldAlert } from "lucide-react-native";
import { useSelector } from "react-redux";
import { useGetTeamLeaderTeamsQuery, useGetTeamLeaderUsersQuery, useCreateTeamLeaderTeamMutation, usePatchTeamLeaderTeamMutation, useDeleteTeamLeaderTeamMutation } from "@/services/api/teamLeaderApi";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";
import { getCurrentCoordinates } from "@/utils/location";

const getErrorMessage = (error, fallback) => error?.data?.message || error?.error || fallback;

export default function TeamLeaderTeamsPage() {
  // force rebuild
  const authUser = useSelector((state) => state.auth.user);
  const canCreateTeams = hasPermission(authUser, PERMISSIONS.TEAM.CREATE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM.ASSIGN_MEMBERS);

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [leaderSearch, setLeaderSearch] = useState("");
  const [subLeaderSearch, setSubLeaderSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  
  const [addLeaderOpen, setAddLeaderOpen] = useState(false);
  const [addSubLeaderOpen, setAddSubLeaderOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", attendanceRadius: "",
    leaderId: "", subLeaderId: "", memberIds: [],
  });

  const { data: teamsData, isLoading, isFetching, refetch: refetchTeams } = useGetTeamLeaderTeamsQuery(1000);
  const { data: usersData, refetch: refetchUsers } = useGetTeamLeaderUsersQuery(1000, { skip: !canCreateTeams });
  const [createTeamMutation] = useCreateTeamLeaderTeamMutation();

  const teams = Array.isArray(teamsData?.items) ? teamsData.items : [];
  const users = Array.isArray(usersData?.items) ? usersData.items : [];

  const leaderOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(r) && u.active;
  }), [users]);

  const subLeaderOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.SUB_TEAM_LEADER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(r) && u.active;
  }), [users]);

  const memberOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.MEMBER, ROLES.LIFE_MEMBER, ROLES.SUB_TEAM_LEADER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(r) && u.active;
  }), [users]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => {
      const haystack = [team.name, team.leaderName, team.subLeaderName].map((value) => String(value || "").toLowerCase()).join(" ");
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

  const filteredSubLeaders = useMemo(() => {
    const query = subLeaderSearch.trim().toLowerCase();
    return subLeaderOptions.filter((u) => {
      if (String(u.id) === String(form.subLeaderId)) return false;
      if (!query) return true;
      return String(u.name || "").toLowerCase().includes(query) || String(u.email || "").toLowerCase().includes(query);
    });
  }, [subLeaderOptions, subLeaderSearch, form.subLeaderId]);

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
  const selectedSubLeader = useMemo(() => form.subLeaderId ? userMap.get(String(form.subLeaderId)) : null, [form.subLeaderId, userMap]);
  const selectedMembers = useMemo(() => form.memberIds.map(id => userMap.get(String(id))).filter(Boolean), [form.memberIds, userMap]);

  const resetForm = () => {
    setForm({ name: "", description: "", attendanceRadius: "", leaderId: "", subLeaderId: "", memberIds: [] });
    setLeaderSearch(""); setSubLeaderSearch(""); setMemberSearch(""); 
    setAddLeaderOpen(false); setAddSubLeaderOpen(false); setAddMemberOpen(false);
  };

  const createTeam = async () => {
    if (!form.name.trim()) { Alert.alert("Error", "Team name is required"); return; }
    try {
      setSubmitting(true);
      await createTeamMutation({
        name: form.name.trim(), 
        description: form.description.trim(), 
        attendanceRadius: Number(form.attendanceRadius || 25),
        ...(canAssignMembers ? { 
          leaderId: form.leaderId ? Number(form.leaderId) : null, 
          subLeaderId: form.subLeaderId ? Number(form.subLeaderId) : null,
          memberIds: form.memberIds.map(Number) 
        } : {})
      }).unwrap();
      Alert.alert("Success", "Team created successfully");
      resetForm(); setCreateOpen(false); await refetchTeams();
    } catch (e) { Alert.alert("Error", getErrorMessage(e, "Failed to create team")); } finally { setSubmitting(false); }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
      {/* TEAM DIRECTORY SECTION */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetchTeams} tintColor="#2563eb" />}>
        
        {/* HEADER */}
        <View className="px-5 pt-8 pb-6 w-full max-w-5xl mx-auto">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[32px] font-black tracking-tight text-slate-900 dark:text-white">Teams</Text>
          </View>
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">
            My Managed Teams
          </Text>
          <View className="flex-row items-center gap-3">
            {canCreateTeams && (
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="flex-1 h-[48px] flex-row items-center justify-center gap-2 bg-blue-600 dark:bg-blue-500 rounded-2xl active:scale-[0.98] transition-transform shadow-sm shadow-blue-500/20">
                <Plus size={20} color="#fff" />
                <Text className="text-white text-[15px] font-bold tracking-wide">New Team</Text>
              </Pressable>
            )}
            <Pressable
              onPress={refetchTeams}
              className="h-[48px] w-[48px] items-center justify-center bg-white dark:bg-slate-800 rounded-2xl active:scale-95 transition-transform border border-slate-200/80 dark:border-slate-700/50 shadow-sm shadow-slate-200/50 dark:shadow-none">
              <RefreshCw size={18} className="text-slate-700 dark:text-slate-300" />
            </Pressable>
          </View>
        </View>

        <View className="w-full max-w-5xl mx-auto">

        {/* Search Bar */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 shadow-sm shadow-slate-100 dark:shadow-none rounded-[20px] px-4 py-3.5">
            <Search size={18} className="text-slate-400 dark:text-slate-500" />
            <TextInput
              value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name, leader..." placeholderTextColor="#94a3b8"
              className="flex-1 ml-3 text-[15px] font-semibold text-slate-900 dark:text-white"
            />
          </View>
        </View>

        <View className="px-5 pb-3">
          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {filteredTeams.length > 0
              ? `Showing ${filteredTeams.length} ${filteredTeams.length === 1 ? 'Team' : 'Teams'}`
              : "No Teams Found"}
          </Text>
        </View>

        <View className="px-4 gap-4">
          {filteredTeams.length === 0 ? (
             <Animated.View entering={FadeIn.duration(400)} className="py-20 items-center justify-center">
               <View className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
                 <Users size={32} className="text-slate-300 dark:text-slate-600" />
               </View>
               <Text className="text-slate-500 font-semibold text-base">No teams match your search.</Text>
             </Animated.View>
          ) : (
            filteredTeams.map((team, index) => <TeamCard key={team.id} team={team} index={index} currentUserId={authUser?.id} />)
          )}
        </View>
        </View>
      </ScrollView>

      {/* Create Team Modal */}
      <Modal visible={createOpen} animationType="slide" transparent={false} onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
            <Text className="text-xl font-black text-slate-900 dark:text-white">Create Team</Text>
            <Pressable onPress={() => { resetForm(); setCreateOpen(false); }} className="rounded-full p-2.5 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"><X size={20} className="text-slate-600 dark:text-slate-400" /></Pressable>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            <View className="w-full max-w-3xl mx-auto bg-white dark:bg-[#0F172A] rounded-[24px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none gap-5">
              
              <View className="gap-2">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Team Name *</Text>
                <TextInput value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white focus:border-blue-500" />
              </View>
              
              <View className="gap-2">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Attendance Radius (m)</Text>
                <TextInput value={form.attendanceRadius} onChangeText={(v) => setForm((p) => ({ ...p, attendanceRadius: v.replace(/[^\d]/g, "") }))} keyboardType="number-pad" placeholder="e.g. 25" placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white focus:border-blue-500" />
              </View>
              
              <View className="gap-2">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Description</Text>
                <TextInput value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} multiline numberOfLines={3}
                  className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white focus:border-blue-500 min-h-[100px] text-top" />
              </View>

              {canAssignMembers && (
                <View className="mt-2 pt-5 border-t border-slate-100 dark:border-slate-800/80 gap-6">
                  {/* Leader */}
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Team Leader</Text>
                      <Pressable onPress={() => setAddLeaderOpen(true)} className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                        <Text className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Select</Text>
                      </Pressable>
                    </View>
                    {selectedLeader ? (
                      <View className="flex-row items-center justify-between bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl px-4 py-3.5">
                        <View className="flex-1 flex-row items-center gap-3">
                          <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 items-center justify-center">
                            <Shield size={14} className="text-blue-600 dark:text-blue-400" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{selectedLeader.name || selectedLeader.email}</Text>
                          </View>
                        </View>
                        <Pressable onPress={() => setForm((p) => ({ ...p, leaderId: "" }))} className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 active:bg-rose-200"><X size={14} className="text-rose-600 dark:text-rose-400" /></Pressable>
                      </View>
                    ) : (
                      <View className="py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/50">
                        <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500 text-center">No leader assigned</Text>
                      </View>
                    )}
                  </View>

                  {/* Sub-Leader */}
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Sub-Team Leader</Text>
                      <Pressable onPress={() => setAddSubLeaderOpen(true)} className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                        <Text className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Select</Text>
                      </Pressable>
                    </View>
                    {selectedSubLeader ? (
                      <View className="flex-row items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl px-4 py-3.5">
                        <View className="flex-1 flex-row items-center gap-3">
                          <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center">
                            <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{selectedSubLeader.name || selectedSubLeader.email}</Text>
                          </View>
                        </View>
                        <Pressable onPress={() => setForm((p) => ({ ...p, subLeaderId: "" }))} className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 active:bg-rose-200"><X size={14} className="text-rose-600 dark:text-rose-400" /></Pressable>
                      </View>
                    ) : (
                      <View className="py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/50">
                        <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500 text-center">No sub-leader assigned</Text>
                      </View>
                    )}
                  </View>

                  {/* Members */}
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Team Members ({selectedMembers.length})</Text>
                      <Pressable onPress={() => setAddMemberOpen(true)} className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                        <Text className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Add</Text>
                      </Pressable>
                    </View>
                    {selectedMembers.length > 0 ? (
                      <View className="gap-2.5">
                        {selectedMembers.map((m) => (
                          <View key={m.id} className="flex-row items-center justify-between bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
                            <View className="flex-1 flex-row items-center gap-3">
                              <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center">
                                <User size={14} className="text-slate-600 dark:text-slate-300" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-[14px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{m.name || m.email}</Text>
                              </View>
                            </View>
                            <Pressable onPress={() => setForm((p) => ({ ...p, memberIds: p.memberIds.filter(id => id !== String(m.id)) }))} className="p-2 rounded-full bg-rose-50 dark:bg-rose-500/10"><X size={14} className="text-rose-500" /></Pressable>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/50">
                        <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500 text-center">No members assigned</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            <Pressable onPress={createTeam} disabled={submitting}
              className={`w-full mt-6 h-[56px] rounded-2xl items-center flex-row justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg ${submitting ? "bg-blue-400 shadow-blue-400/20" : "bg-blue-600 shadow-blue-600/30"}`}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <UsersRound size={20} color="#fff" />}
              <Text className="text-white text-base font-bold tracking-wide">Create Team</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Select Leader Modal */}
      <SelectionModal 
        title="Select Leader" visible={addLeaderOpen} onClose={() => setAddLeaderOpen(false)} 
        search={leaderSearch} setSearch={setLeaderSearch} 
        items={filteredLeaders} 
        onSelect={(u) => { setForm((p) => ({ ...p, leaderId: String(u.id) })); setAddLeaderOpen(false); }} 
      />

      {/* Select Sub-Leader Modal */}
      <SelectionModal 
        title="Select Sub-Leader" visible={addSubLeaderOpen} onClose={() => setAddSubLeaderOpen(false)} 
        search={subLeaderSearch} setSearch={setSubLeaderSearch} 
        items={filteredSubLeaders} 
        onSelect={(u) => { setForm((p) => ({ ...p, subLeaderId: String(u.id) })); setAddSubLeaderOpen(false); }} 
      />

      {/* Add Members Modal */}
      <SelectionModal 
        title="Add Members" visible={addMemberOpen} onClose={() => setAddMemberOpen(false)} 
        search={memberSearch} setSearch={setMemberSearch} 
        items={filteredMembers} multi 
        onSelect={(u) => setForm((p) => ({ ...p, memberIds: [...p.memberIds, String(u.id)] }))} 
      />
    </View>
  );
}

function SelectionModal({ title, visible, onClose, search, setSearch, items, onSelect, multi }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
        <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 z-10">
          <Text className="text-xl font-black text-slate-900 dark:text-white">{title}</Text>
          <Pressable onPress={onClose} className="rounded-full p-2.5 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"><X size={20} className="text-slate-600 dark:text-slate-400" /></Pressable>
        </View>
        <View className="px-5 pt-5 pb-2 bg-[#F8FAFC] dark:bg-[#020617]">
          <View className="flex-row items-center bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 shadow-sm shadow-slate-100 dark:shadow-none">
            <Search size={18} className="text-slate-400" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search users..." placeholderTextColor="#94a3b8" className="flex-1 ml-3 text-[15px] font-semibold text-slate-900 dark:text-white" />
          </View>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {items.length === 0 ? (
            <View className="py-12 items-center">
              <User size={40} className="text-slate-300 dark:text-slate-700 mb-4" />
              <Text className="text-[15px] font-semibold text-slate-500">No users found.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {items.map((u, i) => (
                <Animated.View key={u.id} entering={FadeInUp.duration(300).delay(i * 30)}>
                  <Pressable onPress={() => onSelect(u)} className="flex-row items-center gap-4 bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-100 dark:shadow-none active:scale-[0.98] transition-transform">
                    <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                      <User size={16} className="text-slate-600 dark:text-slate-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text>
                      <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{formatRoleLabel(u.role)}</Text>
                    </View>
                    {multi && <Plus size={20} className="text-blue-600 dark:text-blue-500" />}
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TeamCard({ team, index = 0, currentUserId }) {
  const [deleteTeam] = useDeleteTeamLeaderTeamMutation();
  const [patchTeam] = usePatchTeamLeaderTeamMutation();
  const [settingGeo, setSettingGeo] = useState(false);

  const isMine = String(team.leaderId) === String(currentUserId);

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

  const setGeo = async () => {
    try {
      setSettingGeo(true);
      const coords = await getCurrentCoordinates();
      await patchTeam({ teamId: team.id, punchInCoordinates: [coords.longitude, coords.latitude] }).unwrap();
      if (Platform.OS === 'web') {
        window.alert(`Team geofence updated for ${team.name}`);
      } else {
        Alert.alert("Success", `Team geofence updated for ${team.name}`);
      }
    } catch (err) {
      const msg = err?.data?.message || err?.error || "Failed to update team location";
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSettingGeo(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(index * 60).springify().damping(14)}>
      <Pressable 
        onPress={() => router.push(`/team-leader/team/${team.id}`)} 
        className="bg-white dark:bg-[#111827] rounded-[24px] overflow-hidden border border-slate-200/60 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all p-5">
        
        {/* Header Area */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
                {team.name}
              </Text>
              {isMine && (
                <View className="bg-blue-600/10 dark:bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-600/20 dark:border-blue-500/20">
                  <Text className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Mine</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className={`w-2 h-2 rounded-full ${team.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <Text className={`text-[11px] font-bold uppercase tracking-widest ${team.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {team.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="bg-slate-50 dark:bg-[#1E293B]/40 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-white/[0.02]">
          <View className="flex-row mb-4">
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Leader</Text>
              <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>{team.leaderName || team.teamLeader?.name || "Unassigned"}</Text>
            </View>
            <View className="flex-1 border-l border-slate-200 dark:border-slate-700/50 pl-3">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Members</Text>
              <View className="flex-row items-center gap-1.5">
                <UsersRound size={12} className="text-blue-500 dark:text-blue-400" />
                <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{team.memberCount ?? team.membersCount ?? team._count?.members ?? 0}</Text>
              </View>
            </View>
          </View>
          
          <View className="flex-row pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Radius</Text>
              <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{team.attendanceRadius ? `${team.attendanceRadius}m` : "Unlimited"}</Text>
            </View>
            <View className="flex-1 border-l border-slate-200 dark:border-slate-700/50 pl-3">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Geo Location</Text>
              <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>
                {team.punchInCoordinates?.length === 2 ? `${team.punchInCoordinates[1].toFixed(5)}, ${team.punchInCoordinates[0].toFixed(5)}` : "Not Set"}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Actions Footer */}
        <View className="flex-row items-center justify-between">
          <Pressable 
            onPress={(e) => { e.stopPropagation(); setGeo(); }} 
            disabled={settingGeo}
            className="flex-1 mr-2 h-10 bg-slate-100 dark:bg-slate-800/80 rounded-xl items-center justify-center flex-row gap-2 active:bg-slate-200 dark:active:bg-slate-700 transition-colors">
            {settingGeo ? <ActivityIndicator size="small" color="#64748b" /> : <LocateFixed size={14} className="text-slate-700 dark:text-slate-300" />}
            <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{settingGeo ? "Updating..." : "Set Geofence"}</Text>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable 
              onPress={(e) => { e.stopPropagation(); handleDeactivate(); }} 
              className="w-10 h-10 items-center justify-center bg-amber-50 dark:bg-amber-500/10 rounded-xl active:bg-amber-100 dark:active:bg-amber-500/20 transition-colors">
              <Power size={16} className="text-amber-600 dark:text-amber-400" />
            </Pressable>
            <Pressable 
              onPress={(e) => { e.stopPropagation(); handleDelete(); }} 
              className="w-10 h-10 items-center justify-center bg-rose-50 dark:bg-rose-500/10 rounded-xl active:bg-rose-100 dark:active:bg-rose-500/20 transition-colors">
              <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
            </Pressable>
          </View>
        </View>
        
      </Pressable>
    </Animated.View>
  );
}
