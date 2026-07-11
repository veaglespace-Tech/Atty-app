import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Users, UserCircle2, Search, ChevronDown, Check } from "lucide-react-native";
import { useGetAllSuperAdminUsersQuery } from "@/services/api/superAdminApi";

const ACCESS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [access, setAccess] = useState("ALL");
  const [showAccessModal, setShowAccessModal] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetAllSuperAdminUsersQuery(undefined);

  const loading = isLoading || isFetching;

  const users = useMemo(() => {
    let filtered = data?.items || [];

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (access === "ACTIVE") {
      filtered = filtered.filter(u => u.active || u.isActive);
    } else if (access === "INACTIVE") {
      filtered = filtered.filter(u => !u.active && !u.isActive);
    }

    return filtered;
  }, [data, search, access]);

  const renderAccessModal = () => (
    <Modal visible={showAccessModal} transparent animationType="fade">
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => setShowAccessModal(false)}
        className="flex-1 bg-black/50 justify-end"
      >
        <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900/80 rounded-t-3xl p-6 pb-12 shadow-sm">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">Filter by Access</Text>
          {ACCESS_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                setAccess(opt);
                setShowAccessModal(false);
              }}
              className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
            >
              <Text className={`text-base font-bold ${access === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {opt === "ALL" ? "All Users" : opt}
              </Text>
              {access === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
            </Pressable>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Users</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700 mb-3">
          <Search size={16} className="text-slate-400" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or email..."
            placeholderTextColor="#94a3b8"
            className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <Pressable 
            onPress={() => setShowAccessModal(true)}
            className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50"
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
        
        {isLoading && users.length === 0 ?
        <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View> :
        users.length === 0 ?
        <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No users found.</Text>
          </View> :

        <View className="gap-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {users.length} Platform Users Found
            </Text>
            {users.map((user) =>
          <View key={user.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden flex-row items-center gap-4 shadow-sm">
                <View className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <UserCircle2 size={24} className="text-slate-400" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{user.email}</Text>
                  {user.phone || user.mobile ?
              <Text className="text-xs font-semibold text-slate-400 mt-0.5">{user.phoneCountryCode || user.mobileCountryCode} {user.phone || user.mobile}</Text> :
              null}
                </View>
                <View className={`px-2 py-1 rounded-full border ${(user.active || user.isActive) ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-800/50' : 'bg-rose-100 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/50'}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${(user.active || user.isActive) ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {(user.active || user.isActive) ? "ACTIVE" : "INACTIVE"}
                  </Text>
                </View>
              </View>
          )}
          </View>
        }
      </ScrollView>

      {renderAccessModal()}
    </View>
  );
}