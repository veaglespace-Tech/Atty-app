import React, { useState, useMemo, useEffect } from "react";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import {
  View, Text, Pressable, ScrollView, RefreshControl,
  TextInput, ActivityIndicator, Switch, Alert, Modal, Platform
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, Save, Trash2, Users, UserCheck, Search,
  Plus, X, ShieldCheck, Mail, User, Shield, Info, MapPin, 
  Settings2, Activity, LocateFixed
} from "lucide-react-native";
import { useSelector } from "react-redux";
import {
  useGetTeamLeaderTeamByIdQuery, useGetTeamLeaderUsersQuery,
  usePatchTeamLeaderTeamMutation, useDeleteTeamLeaderTeamMutation,
} from "@/services/api/teamLeaderApi";
import { PERMISSIONS, ROLES, formatRoleLabel, hasPermission, normalizeRole } from "@/utils/roles";
import { getCurrentCoordinates } from "@/utils/location";

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function TeamLeaderTeamDetailPage() {
  const { id } = useLocalSearchParams();
  const teamId = Number(id);
  const authUser = useSelector((state) => state.auth.user);
  const canUpdateTeams = hasPermission(authUser, PERMISSIONS.TEAM.UPDATE);
  const canDeleteTeams = hasPermission(authUser, PERMISSIONS.TEAM.DELETE);
  const canAssignMembers = hasPermission(authUser, PERMISSIONS.TEAM.ASSIGN_MEMBERS);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingSubLeader, setSavingSubLeader] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingGeo, setSettingGeo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const [memberSearch, setMemberSearch] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [subLeaderSearch, setSubLeaderSearch] = useState("");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addLeaderOpen, setAddLeaderOpen] = useState(false);
  const [addSubLeaderOpen, setAddSubLeaderOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", attendanceRadius: "25",
    isActive: true, leaderId: "", subLeaderId: "", memberIds: [],
  });

  const { data: teamData, isLoading, isFetching, refetch } = useGetTeamLeaderTeamByIdQuery(teamId, { skip: !Number.isFinite(teamId) || teamId <= 0 });
  const { data: usersData, isLoading: usersLoading } = useGetTeamLeaderUsersQuery({ limit: 1000, assignable: true }, { skip: !canAssignMembers });
  const [patchTeamMutation] = usePatchTeamLeaderTeamMutation();
  const [deleteTeamMutation] = useDeleteTeamLeaderTeamMutation();

  const team = teamData?.item || null;
  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const userMap = useMemo(() => { const m = new Map(); users.forEach((u) => m.set(String(u.id), u)); return m; }, [users]);

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

  useEffect(() => {
    if (!team) return;
    setForm({
      name: team.name || "", description: team.description || "",
      attendanceRadius: String(team.attendanceRadius || 25),
      isActive: Boolean(team.isActive),
      leaderId: team.leaderId ? String(team.leaderId) : "",
      subLeaderId: team.subLeaderId ? String(team.subLeaderId) : "",
      memberIds: Array.isArray(team.memberIds) ? team.memberIds.map((x) => String(x)) : [],
    });
  }, [team]);

  const selectedLeader = useMemo(() => form.leaderId ? userMap.get(String(form.leaderId)) : null, [form.leaderId, userMap]);
  const selectedSubLeader = useMemo(() => form.subLeaderId ? userMap.get(String(form.subLeaderId)) : null, [form.subLeaderId, userMap]);
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

  const saveBasics = async () => {
    if (!form.name.trim()) { setError("Team name is required"); return; }
    try {
      setSavingBasics(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, name: form.name.trim(), description: form.description, attendanceRadius: Number(form.attendanceRadius || 25), isActive: form.isActive }).unwrap();
      setMessage("Team details updated successfully"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update details")); } finally { setSavingBasics(false); }
  };

  const setGeo = async () => {
    try {
      setSettingGeo(true); setError(""); setMessage("");
      const coords = await getCurrentCoordinates();
      await patchTeamMutation({ teamId, punchInCoordinates: [coords.longitude, coords.latitude] }).unwrap();
      setMessage("Team location updated successfully"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to set location")); } finally { setSettingGeo(false); }
  };

  const saveLeader = async (uid) => {
    try {
      setSavingLeader(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, leaderId: uid ? Number(uid) : null }).unwrap();
      setMessage("Team leader updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update leader")); } finally { setSavingLeader(false); }
  };

  const saveSubLeader = async (uid) => {
    try {
      setSavingSubLeader(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, subLeaderId: uid ? Number(uid) : null }).unwrap();
      setMessage("Sub-Team leader updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update sub-leader")); } finally { setSavingSubLeader(false); }
  };

  const saveMembers = async (newIds) => {
    try {
      setSavingMembers(true); setError(""); setMessage("");
      await patchTeamMutation({ teamId, memberIds: newIds.map(Number) }).unwrap();
      setMessage("Team members updated"); await refetch();
    } catch (e) { setError(getErrorMessage(e, "Failed to update members")); } finally { setSavingMembers(false); }
  };

  const deleteTeam = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to permanently delete this team?")) {
        (async () => {
          try {
            setDeleting(true); setError("");
            await deleteTeamMutation(teamId).unwrap();
            router.back();
          } catch (e) { setError(getErrorMessage(e, "Failed to delete")); setDeleting(false); }
        })();
      }
      return;
    }
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
    return <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617] items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!team) {
    return (
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
        <View className="px-5 pt-14 pb-4 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800">
          {/* Back button removed */}
        </View>
        <View className="p-5 flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
            <Info size={24} className="text-slate-400 dark:text-slate-500" />
          </View>
          <Text className="text-base font-bold text-slate-700 dark:text-slate-300">Team not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {/* HEADER */}
        <View className="mb-6 pt-4">
          <View className="px-5 w-full max-w-3xl mx-auto">
            {/* Back button removed */}
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[32px] font-black tracking-tight text-slate-900 dark:text-white" numberOfLines={2}>{team.name}</Text>
                <Text className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed" numberOfLines={2}>{team.description || "No description provided"}</Text>
              </View>
              <View className={`px-4 py-2 rounded-full mt-1 ${team.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
                <Text className={`text-[11px] font-black uppercase tracking-widest ${team.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {team.isActive ? 'Active' : 'Blocked'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="w-full max-w-3xl mx-auto px-5">

        {error ? (
          <Animated.View entering={FadeInUp.duration(300)} className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex-row items-center gap-3 shadow-sm shadow-rose-100 dark:shadow-none">
            <Info size={20} className="text-rose-600 dark:text-rose-400" />
            <Text className="text-[15px] font-semibold text-rose-700 dark:text-rose-300 flex-1 leading-relaxed">{error}</Text>
          </Animated.View>
        ) : null}
        
        {message ? (
          <Animated.View entering={FadeInUp.duration(300)} className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex-row items-center gap-3 shadow-sm shadow-emerald-100 dark:shadow-none">
            <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-300 flex-1 leading-relaxed">{message}</Text>
          </Animated.View>
        ) : null}

        {/* Location / Radius Settings */}
        <Animated.View entering={FadeInUp.duration(400).delay(50)} className="bg-white dark:bg-[#0F172A] rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 p-6 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center border border-indigo-100 dark:border-indigo-800/50">
                <LocateFixed size={18} className="text-indigo-600 dark:text-indigo-400" />
              </View>
              <Text className="text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Location Settings</Text>
            </View>
          </View>
          
          <View className="bg-slate-50 dark:bg-[#1E293B] p-5 rounded-[24px] border border-slate-200 dark:border-slate-700/50 mb-5">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Current Status</Text>
            {team.punchInCoordinates?.length === 2 ? (
              <View className="flex-row items-center gap-3">
                <View className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <Text className="text-[16px] font-bold text-slate-700 dark:text-slate-300">Geo-fence Active</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-3">
                <View className="h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <Text className="text-[16px] font-bold text-slate-700 dark:text-slate-300">Location Not Set</Text>
              </View>
            )}
          </View>

          {canUpdateTeams && (
            <Pressable onPress={setGeo} disabled={settingGeo}
              className={`w-full h-[56px] rounded-[20px] items-center flex-row justify-center gap-2.5 active:scale-[0.98] transition-transform ${settingGeo ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-indigo-600 dark:bg-indigo-500 shadow-md shadow-indigo-500/20'}`}>
              {settingGeo ? <ActivityIndicator size="small" color="#4f46e5" /> : <LocateFixed size={20} color={settingGeo ? "#4f46e5" : "#fff"} />}
              <Text className={`text-[16px] font-bold tracking-wide ${settingGeo ? 'text-indigo-600 dark:text-indigo-400' : 'text-white'}`}>
                {settingGeo ? 'Acquiring...' : 'Update Location using GPS'}
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Team Details Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} className="bg-white dark:bg-[#0F172A] rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 p-6 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <View className="flex-row items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <View className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center border border-blue-100 dark:border-blue-800/50">
              <Settings2 size={18} className="text-blue-600 dark:text-blue-400" />
            </View>
            <Text className="text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Team Details</Text>
          </View>
          
          <View className="gap-6">
            <View className="gap-2.5">
              <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Team Name *</Text>
              <TextInput value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} editable={canUpdateTeams}
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-[20px] px-5 py-4 text-[16px] font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-[#0F172A]" />
            </View>
            <View className="gap-2.5">
              <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Description</Text>
              <TextInput value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} editable={canUpdateTeams}
                multiline numberOfLines={3}
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-[20px] px-5 py-4 text-[16px] font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-[#0F172A] min-h-[120px]" style={{textAlignVertical: 'top'}} />
            </View>
            <View className="gap-2.5">
              <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Attendance Radius (m)</Text>
              <TextInput value={form.attendanceRadius} onChangeText={(v) => setForm((p) => ({ ...p, attendanceRadius: v.replace(/[^\d]/g, "") }))} editable={canUpdateTeams} keyboardType="number-pad"
                className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-[20px] px-5 py-4 text-[16px] font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-[#0F172A]" />
            </View>
            <View className="flex-row items-center justify-between bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/50 rounded-[20px] px-5 py-4 mt-2">
              <View className="flex-row items-center gap-3">
                <Activity size={20} className="text-slate-500 dark:text-slate-400" />
                <Text className="text-[16px] font-semibold text-slate-700 dark:text-slate-300">Team Status (Active)</Text>
              </View>
              <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} disabled={!canUpdateTeams} trackColor={{ false: "#e2e8f0", true: "#2563eb" }} thumbColor="#fff" />
            </View>
            
            {canUpdateTeams && (
              <Pressable onPress={saveBasics} disabled={savingBasics}
                className={`w-full mt-4 h-[56px] rounded-[20px] items-center flex-row justify-center gap-2.5 active:scale-[0.98] transition-transform ${savingBasics ? "bg-blue-400" : "bg-blue-600 shadow-md shadow-blue-500/20"}`}>
                {savingBasics ? <ActivityIndicator size="small" color="#fff" /> : <Save size={20} color="#fff" />}
                <Text className="text-white text-[16px] font-bold tracking-wide">Save Details</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Roles Section */}
        {canAssignMembers && (
          <Animated.View entering={FadeInUp.duration(400).delay(200)} className="bg-white dark:bg-[#0F172A] rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 p-6 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <View className="h-10 w-10 rounded-full bg-violet-50 dark:bg-violet-900/20 items-center justify-center border border-violet-100 dark:border-violet-800/50">
                <ShieldCheck size={18} className="text-violet-600 dark:text-violet-400" />
              </View>
              <Text className="text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Leadership</Text>
            </View>
            
            {/* Team Leader */}
            <View className="gap-4 mb-8">
              <View className="flex-row items-center justify-between">
                <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Team Leader</Text>
                <Pressable onPress={() => setAddLeaderOpen(true)} className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 active:bg-blue-100 dark:active:bg-blue-900/50">
                  <Text className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Change</Text>
                </Pressable>
              </View>
              {selectedLeader ? (
                <View className="flex-row items-center justify-between bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-[20px] px-5 py-4 shadow-sm shadow-blue-100/50 dark:shadow-none">
                  <View className="flex-1 flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center border border-blue-200 dark:border-blue-800/50">
                      <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{selectedLeader.name || selectedLeader.email}</Text>
                      <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Primary Leader</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => { setForm(p => ({...p, leaderId: ""})); saveLeader(null); }} className="p-2.5 rounded-full bg-white dark:bg-rose-900/20 border border-slate-200 dark:border-rose-800/30 shadow-sm active:bg-slate-50"><X size={16} className="text-rose-600 dark:text-rose-400" /></Pressable>
                </View>
              ) : (
                <View className="py-5 px-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[20px] bg-slate-50 dark:bg-[#1E293B]/50 items-center justify-center">
                  <Text className="text-[14px] font-semibold text-slate-400 dark:text-slate-500 text-center">No leader assigned</Text>
                </View>
              )}
            </View>

            {/* Sub-Team Leader */}
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Sub-Team Leader</Text>
                <Pressable onPress={() => setAddSubLeaderOpen(true)} className="flex-row items-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 px-3 py-2 rounded-xl border border-violet-100 dark:border-violet-800/50 active:bg-violet-100 dark:active:bg-violet-900/50">
                  <Text className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">Change</Text>
                </Pressable>
              </View>
              {selectedSubLeader ? (
                <View className="flex-row items-center justify-between bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-[20px] px-5 py-4 shadow-sm shadow-violet-100/50 dark:shadow-none">
                  <View className="flex-1 flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 items-center justify-center border border-violet-200 dark:border-violet-800/50">
                      <ShieldCheck size={18} className="text-violet-600 dark:text-violet-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{selectedSubLeader.name || selectedSubLeader.email}</Text>
                      <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Secondary Leader</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => { setForm(p => ({...p, subLeaderId: ""})); saveSubLeader(null); }} className="p-2.5 rounded-full bg-white dark:bg-rose-900/20 border border-slate-200 dark:border-rose-800/30 shadow-sm active:bg-slate-50"><X size={16} className="text-rose-600 dark:text-rose-400" /></Pressable>
                </View>
              ) : (
                <View className="py-5 px-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[20px] bg-slate-50 dark:bg-[#1E293B]/50 items-center justify-center">
                  <Text className="text-[14px] font-semibold text-slate-400 dark:text-slate-500 text-center">No sub-leader assigned</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Team Members Section */}
        {canAssignMembers && (
          <Animated.View entering={FadeInUp.duration(400).delay(300)} className="bg-white dark:bg-[#0F172A] rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 p-6 mb-8 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-900/20 items-center justify-center border border-amber-100 dark:border-amber-800/50">
                  <Users size={18} className="text-amber-500" />
                </View>
                <Text className="text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Members ({selectedMembers.length})</Text>
              </View>
              <Pressable onPress={() => setAddMemberOpen(true)} className="flex-row items-center gap-1.5 bg-blue-600 dark:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/30 active:bg-blue-700">
                <Plus size={16} color="#fff" />
                <Text className="text-white text-[13px] font-bold tracking-wide">Add</Text>
              </Pressable>
            </View>
            
            {selectedMembers.length === 0 ? (
              <View className="py-12 items-center">
                <View className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                  <Users size={24} className="text-slate-300 dark:text-slate-600" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-400 dark:text-slate-500">No members assigned.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {selectedMembers.map(({ id: mid, user: u }) => (
                  <View key={mid} className="flex-row items-center justify-between bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-700/50 rounded-[20px] px-5 py-4">
                    <View className="flex-1 flex-row items-center gap-4">
                      <View className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center border border-slate-300 dark:border-slate-600">
                        <User size={16} className="text-slate-600 dark:text-slate-300" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{u.name || u.email}</Text>
                        <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-1">{formatRoleLabel(u.role)}</Text>
                      </View>
                    </View>
                    <Pressable 
                      onPress={() => {
                        const newIds = form.memberIds.filter(x => x !== mid);
                        setForm(p => ({ ...p, memberIds: newIds }));
                        saveMembers(newIds);
                      }}
                      className="p-2.5 rounded-full bg-white dark:bg-rose-900/10 border border-slate-200 dark:border-slate-700/50 active:bg-rose-50 dark:active:bg-rose-900/30">
                      <X size={16} className="text-rose-500" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Danger Zone */}
        {canDeleteTeams && (
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Pressable onPress={deleteTeam} disabled={deleting}
              className="w-full h-[56px] rounded-[20px] items-center flex-row justify-center gap-2.5 bg-white dark:bg-rose-500/10 border-2 border-rose-100 dark:border-rose-900/30 active:bg-rose-50 shadow-sm shadow-rose-100/50 dark:shadow-none">
              {deleting ? <ActivityIndicator size="small" color="#e11d48" /> : <Trash2 size={20} className="text-rose-600 dark:text-rose-400" />}
              <Text className="text-rose-600 dark:text-rose-400 text-[16px] font-bold tracking-wide">Delete Team</Text>
            </Pressable>
          </Animated.View>
        )}
        </View>
      </ScrollView>

      {/* Select Leader Modal */}
      <SelectionModal 
        title="Select Leader" visible={addLeaderOpen} onClose={() => setAddLeaderOpen(false)} 
        search={leaderSearch} setSearch={setLeaderSearch} 
        items={filteredLeaders} isLoading={usersLoading}
        onSelect={(u) => { 
          setForm(p => ({ ...p, leaderId: String(u.id) })); 
          saveLeader(String(u.id));
          setAddLeaderOpen(false); 
        }} 
      />

      {/* Select Sub-Leader Modal */}
      <SelectionModal 
        title="Select Sub-Leader" visible={addSubLeaderOpen} onClose={() => setAddSubLeaderOpen(false)} 
        search={subLeaderSearch} setSearch={setSubLeaderSearch} 
        items={filteredSubLeaders} isLoading={usersLoading}
        onSelect={(u) => { 
          setForm(p => ({ ...p, subLeaderId: String(u.id) })); 
          saveSubLeader(String(u.id));
          setAddSubLeaderOpen(false); 
        }} 
      />

      {/* Add Members Modal */}
      <SelectionModal 
        title="Add Members" visible={addMemberOpen} onClose={() => setAddMemberOpen(false)} 
        search={memberSearch} setSearch={setMemberSearch} 
        items={filteredAddMembers} multi isLoading={usersLoading}
        onSelect={(u) => {
          const newIds = [...form.memberIds, String(u.id)];
          setForm(p => ({ ...p, memberIds: newIds }));
          saveMembers(newIds);
        }} 
      />
    </View>
  );
}

function SelectionModal({ title, visible, onClose, search, setSearch, items, onSelect, multi, isLoading }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-[#F8FAFC] dark:bg-[#020617]">
        <View className="bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 z-10">
          <View className="w-full max-w-2xl mx-auto flex-row items-center justify-between px-5 pt-14 pb-4">
            <Text className="text-xl font-black text-slate-900 dark:text-white">{title}</Text>
            <Pressable onPress={onClose} className="rounded-full p-2.5 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"><X size={20} className="text-slate-600 dark:text-slate-400" /></Pressable>
          </View>
        </View>
        <View className="bg-[#F8FAFC] dark:bg-[#020617]">
          <View className="w-full max-w-2xl mx-auto px-5 pt-5 pb-2">
            <View className="flex-row items-center bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 shadow-sm shadow-slate-100 dark:shadow-none">
              <Search size={18} className="text-slate-400" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search users..." placeholderTextColor="#94a3b8" className="flex-1 ml-3 text-[15px] font-semibold text-slate-900 dark:text-white" />
            </View>
          </View>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <View className="w-full max-w-2xl mx-auto">
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-[15px] font-semibold text-slate-500 mt-4">Loading users...</Text>
            </View>
          ) : items.length === 0 ? (
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
