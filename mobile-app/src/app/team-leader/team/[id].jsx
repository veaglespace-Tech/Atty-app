import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, ActivityIndicator, Switch, Alert, Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, Save, Trash2, Users, UserCheck, Search,
  Plus, X, ShieldCheck, Mail, User,
} from "lucide-react-native";
import { useSelector } from "react-redux";
import {
  useGetTeamLeaderTeamByIdQuery, useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation, useDeleteTeamLeaderTeamMutation,
} from "@/services/api/teamLeaderApi";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function TeamLeaderTeamDetailPage() {
  const { id } = useLocalSearchParams();
  const teamId = Number(id);
  const authUser = useSelector((state) => state.auth.user);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM_UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM_DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM_ASSIGN_MEMBERS);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", attendanceRadius: "25",
    isActive: true, leaderId: "", memberIds: [],
  });

  const { data: teamData, isLoading, isFetching, refetch } = useGetTeamLeaderTeamByIdQuery(teamId, { skip: !Number.isFinite(teamId) || teamId <= 0 });
  const { data: usersData } = useGetTeamLeaderUsersQuery(500, { skip: !canAssignMembers });
  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();
  const [deleteTeamMutation] = useDeleteTeamLeaderTeamMutation();

  const team = teamData?.item || null;
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const userMap = useMemo(() => { const m = new Map(); users.forEach((u) => m.set(String(u.id), u)); return m; }, [users]);

  const leaderOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.TEAM_LEADER, ROLES.SUB_ADMIN, ROLES.ORG_ADMIN].includes(r) && u.active;
  }), [users]);

  const memberOptions = useMemo(() => users.filter((u) => {
    const r = normalizeRole(u.role);
    return [ROLES.MEMBER, ROLES.TEAM_LEADER, ROLES.SUB_ADMIN].includes(r) && u.active;
  }), [users]);

  useEffect(() => {
    if (!team) return;
    setForm({
      name: team.name || "", description: team.description || "",
      attendanceRadius: String(team.attendanceRadius || 25),
      isActive: Boolean(team.isActive),
      leaderId: team.leaderId ? String(team.leaderId) : "",
      memberIds: Array.isArray(team.memberIds) ? team.memberIds.map((x) => String(x)) : [],
    });
  }, [team]);

  const selectedMembers = useMemo(
    () => form.memberIds.map((mid) => ({ id: mid, user: userMap.get(String(mid)) || null })).filter((x) => x.user),
    [form.memberIds, userMap]
  );

  const filteredAddMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return memberOptions.filter((u) => {
      if (form.memberIds.includes(String(u.id))) return false;
      if (!query) return true;
      return String(u.name || "").toLowerCase().includes(query) || String(u.email || "").toLowerCase().includes(query);
    });
  }, [memberOptions, memberSearch, form.memberIds]);

  const saveBasics = async () => {
    if (!form.name.trim()) { setError("Team name is required"); return; }
    try {
      setSavingBasics(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, name: form.name.trim(), description: form.description, attendanceRadius: Number(form.attendanceRadius || 25), isActive: form.isActive }).unwrap();
      setMessage("Team updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update")); } finally { setSavingBasics(false); }
  };

  const saveLeader = async () => {
    try {
      setSavingLeader(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, leaderId: form.leaderId ? Number(form.leaderId) : null }).unwrap();
      setMessage("Team leader updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update leader")); } finally { setSavingLeader(false); }
  };

  const saveMembers = async () => {
    try {
      setSavingMembers(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, memberIds: form.memberIds.map(Number) }).unwrap();
      setMessage("Members updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update members")); } finally { setSavingMembers(false); }
  };

  const deleteTeam = () => {
    Alert.alert("Delete Team", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            setDeleting(true); setError("");
            await deleteTeamMutation(teamId).unwrap();
            router.back();
          } catch (e) { setError(getErrorMessage(e, "Failed to delete")); setDeleting(false); }
        }
      },
    ]);
  };

  if (isLoading) {
    return <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!team) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-5">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-4"><ArrowLeft size={18} color="#64748b" /><Text className="text-sm font-bold text-slate-600">Back</Text></Pressable>
        <View className="p-5 rounded-2xl bg-amber-50 border border-amber-200"><Text className="text-sm font-semibold text-amber-700">Team not found.</Text></View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-3"><ArrowLeft size={18} color="#64748b" /><Text className="text-sm font-bold text-slate-600 dark:text-slate-400">Back</Text></Pressable>
        <Text className="text-xl font-black text-slate-900 dark:text-white">{team.name}</Text>
        <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{team.description || "No description"}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}>

        {error ? <View className="mb-3 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><Text className="text-sm text-red-700 dark:text-red-300">{error}</Text></View> : null}
        {message ? <View className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"><Text className="text-sm text-emerald-700 dark:text-emerald-300">{message}</Text></View> : null}

        {/* Team Details */}
        <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Team Details</Text>
          <View className="gap-3">
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Team Name</Text>
              <TextInput value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} editable={canUpdateTeams}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Description</Text>
              <TextInput value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} editable={canUpdateTeams}
                multiline numberOfLines={3}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Attendance Radius (m)</Text>
              <TextInput value={form.attendanceRadius} onChangeText={(v) => setForm((p) => ({ ...p, attendanceRadius: v.replace(/[^\d]/g, "") }))} editable={canUpdateTeams} keyboardType="number-pad"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
            </View>
            <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} disabled={!canUpdateTeams} trackColor={{ false: "#e2e8f0", true: "#2563eb" }} thumbColor="#fff" />
            </View>
            <Pressable onPress={saveBasics} disabled={!canUpdateTeams || savingBasics}
              className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${savingBasics ? "bg-blue-400" : "bg-blue-600"}`}>
              {savingBasics ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
              <Text className="text-white text-sm font-bold">Save Details</Text>
            </Pressable>
          </View>
        </View>

        {/* Team Leader */}
        {canAssignMembers && (
          <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Team Leader</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {leaderOptions.map((u) => {
                const selected = String(form.leaderId) === String(u.id);
                return (
                  <Pressable key={u.id} onPress={() => setForm((p) => ({ ...p, leaderId: selected ? "" : String(u.id) }))}
                    className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-2 ${selected ? "bg-blue-600 border-blue-600" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                    <Text className={`text-[13px] font-bold ${selected ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>{u.name || u.email}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={saveLeader} disabled={savingLeader}
              className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${savingLeader ? "bg-blue-400" : "bg-blue-600"}`}>
              {savingLeader ? <ActivityIndicator size="small" color="#fff" /> : <UserCheck size={16} color="#fff" />}
              <Text className="text-white text-sm font-bold">Save Leader</Text>
            </Pressable>
          </View>
        )}

        {/* Team Members */}
        {canAssignMembers && (
          <View className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-500">Members ({selectedMembers.length})</Text>
              <Pressable onPress={() => setAddMemberOpen(true)} className="flex-row items-center gap-1.5 bg-blue-600 px-3 py-2 rounded-2xl">
                <Plus size={14} color="#fff" />
                <Text className="text-white text-[12px] font-bold">Add</Text>
              </Pressable>
            </View>
            {selectedMembers.length === 0 ? (
              <View className="py-8 items-center"><Text className="text-sm font-semibold text-slate-500">No members assigned.</Text></View>
            ) : (
              <View className="gap-2">
                {selectedMembers.map(({ id: mid, user: u }) => (
                  <View key={mid} className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-800">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text>
                      <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{formatRoleLabel(u.role)}</Text>
                    </View>
                    <Pressable onPress={() => setForm((p) => ({ ...p, memberIds: p.memberIds.filter((x) => x !== mid) }))}
                      className="p-2 rounded-full bg-rose-50 dark:bg-rose-500/10">
                      <X size={14} color="#e11d48" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={saveMembers} disabled={savingMembers}
              className={`mt-3 w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${savingMembers ? "bg-blue-400" : "bg-blue-600"}`}>
              {savingMembers ? <ActivityIndicator size="small" color="#fff" /> : <Users size={16} color="#fff" />}
              <Text className="text-white text-sm font-bold">Save Members</Text>
            </Pressable>
          </View>
        )}

        {/* Delete */}
        {canDeleteTeams && (
          <Pressable onPress={deleteTeam} disabled={deleting}
            className="w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 bg-rose-500">
            {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Trash2 size={16} color="#fff" />}
            <Text className="text-white text-sm font-bold">Delete Team</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={addMemberOpen} animationType="slide" transparent={false} onRequestClose={() => setAddMemberOpen(false)}>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Add Members</Text>
            <Pressable onPress={() => setAddMemberOpen(false)} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800"><X size={18} color="#94a3b8" /></Pressable>
          </View>
          <View className="px-5 pt-4">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
              <Search size={18} color="#94a3b8" />
              <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search users..." placeholderTextColor="#94a3b8"
                className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white" />
            </View>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {filteredAddMembers.length === 0 ? (
              <View className="py-8 items-center"><Text className="text-sm font-semibold text-slate-500">No available users.</Text></View>
            ) : (
              <View className="gap-2">
                {filteredAddMembers.map((u) => (
                  <Pressable key={u.id} onPress={() => { setForm((p) => ({ ...p, memberIds: [...p.memberIds, String(u.id)] })); }}
                    className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 active:scale-[0.98]">
                    <View className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 items-center justify-center">
                      <Text className="text-base font-black text-blue-600 dark:text-blue-400">{(u.name || "?")[0]?.toUpperCase()}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text>
                      <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{u.email} • {formatRoleLabel(u.role)}</Text>
                    </View>
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
