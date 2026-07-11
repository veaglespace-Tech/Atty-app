import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Users, UserCircle2, Search, ChevronDown, Check } from "lucide-react-native";
import { useGetOrgUsersQuery } from "@/services/api/orgApi";

const ROLES = ["ALL", "Team Leader", "Member"];
const STATUSES = ["ALL", "APPROVED", "PENDING", "REJECTED"];
const ACCESS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];

export default function OrgUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [access, setAccess] = useState("ALL");
  
  const [modalType, setModalType] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetOrgUsersQuery(undefined);
  const loading = isLoading || isFetching;

  const summary = useMemo(() => Array.isArray(data?.summary) ? data.summary : [], [data]);
  
  const users = useMemo(() => {
    let filtered = data?.items || [];

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    }

    if (role !== "ALL") {
      const roleEnum = role === "Team Leader" ? "TEAM_LEADER" : "MEMBER";
      filtered = filtered.filter(u => u.role === roleEnum);
    }

    if (status !== "ALL") {
      filtered = filtered.filter(u => u.status === status);
    }

    if (access === "ACTIVE") {
      filtered = filtered.filter(u => u.active);
    } else if (access === "INACTIVE") {
      filtered = filtered.filter(u => !u.active);
    }

    return filtered;
  }, [data, search, role, status, access]);

  const renderModal = () => {
    let options = [];
    let currentVal = "";
    let setVal = () => {};
    let title = "";

    if (modalType === "ROLE") {
      options = ROLES;
      currentVal = role;
      setVal = setRole;
      title = "Filter by Role";
    } else if (modalType === "STATUS") {
      options = STATUSES;
      currentVal = status;
      setVal = setStatus;
      title = "Filter by Status";
    } else if (modalType === "ACCESS") {
      options = ACCESS_OPTIONS;
      currentVal = access;
      setVal = setAccess;
      title = "Filter by Access";
    }

    return (
      <Modal visible={!!modalType} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setModalType(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">{title}</Text>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setVal(opt);
                  setModalType(null);
                }}
                className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
              >
                <Text className={`text-base font-bold ${currentVal === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt === "ALL" ? `All ${modalType === "ROLE" ? "Roles" : modalType === "STATUS" ? "Statuses" : "Access"}` : opt}
                </Text>
                {currentVal === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
              </Pressable>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Organization Users</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700 mb-3">
          <Search size={16} className="text-slate-400" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, mobile, email..."
            placeholderTextColor="#94a3b8"
            className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-1">
          <Pressable 
            onPress={() => setModalType("ROLE")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 mr-2"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Role</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{role}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
          <Pressable 
            onPress={() => setModalType("STATUS")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 mr-2"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Status</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{status}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
          <Pressable 
            onPress={() => setModalType("ACCESS")}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 mr-2"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Access</Text>
            <Text className="text-xs font-bold text-slate-900 dark:text-white mr-2">{access}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {/* SUMMARY CARDS */}
        {summary.length > 0 && (
          <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
            {summary.map((item, i) => (
              <View
                key={i}
                className="w-[48%] bg-[#0B1A3A] dark:bg-[#07122C] p-4 rounded-2xl border border-blue-500/20"
              >
                <Text
                  className="text-[9px] font-black uppercase tracking-widest text-blue-200/70 mb-2"
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text
                  className="text-xl font-black text-white tracking-tight"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isLoading && users.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : users.length === 0 ? (
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No users found.</Text>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              Showing {users.length} filtered users
            </Text>
            {users.map((user) => (
              <Pressable 
                key={user.id} 
                onPress={() => router.push(`/org/user/${user.id}`)}
                className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden flex-col gap-3 active:opacity-70"
              >
                <View className="flex-row items-center gap-4">
                  <View className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                    <UserCircle2 size={24} className="text-slate-400" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{user.email}</Text>
                    {user.phone ? (
                      <Text className="text-xs font-semibold text-slate-400 mt-0.5">{user.phoneCountryCode} {user.phone}</Text>
                    ) : null}
                  </View>
                </View>
                
                <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                  <View className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    <Text className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {user.role === 'TEAM_LEADER' ? 'Team Leader' : user.role === 'MEMBER' ? 'Member' : user.role}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-md border ${user.active ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/30'}`}>
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${user.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {user.active ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-md border ${
                    user.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30' : 
                    user.status === 'PENDING' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30' : 
                    'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${
                      user.status === 'APPROVED' ? 'text-emerald-700 dark:text-emerald-400' : 
                      user.status === 'PENDING' ? 'text-amber-700 dark:text-amber-400' : 
                      'text-slate-600 dark:text-slate-400'
                    }`}>
                      {user.status || 'UNKNOWN'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {renderModal()}
    </View>
  );
}
