import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import {  ChevronLeft, Users, UserCircle2, Search, Plus, X  } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useGetTeamLeaderUsersQuery } from "@/services/api/teamLeaderApi";
import { useCreateOrgUserMutation } from "@/services/api/orgApi";
import { getDefaultPermissionsForRole } from "@/utils/roles";

export default function TeamLeaderUsersPage(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [modalVisible, setModalVisible] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "MEMBER"
  });

  const { data, isLoading, isFetching, refetch } = useGetTeamLeaderUsersQuery(1000);
  const [createUser, { isLoading: isCreating }] = useCreateOrgUserMutation();

  const users = useMemo(() => data?.items || [], [data]);
  
  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return users.filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(query) || 
        user.email?.toLowerCase().includes(query) ||
        user.mobile?.includes(query);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleCreateUser = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.replace(/\D/g, ""),
        mobileCountryCode: "+91",
        role: form.role,
        status: "APPROVED",
        permissions: getDefaultPermissionsForRole(form.role)
      };

      await createUser(payload).unwrap();
      Alert.alert("Success", "Team member added successfully!");
      setModalVisible(false);
      setForm({ name: "", email: "", mobile: "", role: "MEMBER" });
      refetch();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Failed to add team member");
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} color={isDark ? "#ffffff" : "#0f172a"} />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Team Members</Text>
          <Pressable onPress={() => setModalVisible(true)} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Plus size={20} color={isDark ? "#60a5fa" : "#2563eb"} />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
          <Search size={16} color={isDark ? "#94a3b8" : "#94a3b8"} style={{marginLeft:8}} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name, email..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900 dark:text-white font-medium p-1"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {["ALL", "MEMBER", "TEAM_LEADER"].map(role => (
            <Pressable 
              key={role}
              onPress={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-full mr-2 border ${roleFilter === role ? 'bg-slate-800 border-slate-800 dark:bg-white dark:border-white' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <Text className={`text-xs font-black uppercase tracking-widest ${roleFilter === role ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                {role === "ALL" ? "All Roles" : role.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {isLoading && users.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-xl font-black text-slate-900 dark:text-white mb-2">No members found</Text>
            <Text className="text-sm font-medium text-slate-500 text-center px-4">
              {users.length === 0 ? "You have no team members assigned to you." : "No members match your search criteria."}
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {filteredUsers.length} Members Found
            </Text>
            {filteredUsers.map((user) => (
              <View key={user.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm shadow-slate-200/50 dark:shadow-none flex-row items-center gap-4">
                <View className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center border border-blue-100 dark:border-blue-800/30">
                  <UserCircle2 size={24} className="text-blue-400 dark:text-blue-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{user.email}</Text>
                  {user.mobile ? (
                    <Text className="text-xs font-semibold text-slate-400 mt-0.5">{user.mobileCountryCode} {user.mobile}</Text>
                  ) : null}
                </View>
                <View className="items-end gap-2">
                  <View className={`px-2 py-1 rounded-full border ${user.active ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50'}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-[0.1em] ${user.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {user.active ? "ACTIVE" : "BLOCKED"}
                    </Text>
                  </View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-blue-500">{user.role.replace("_", " ")}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => {}}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white dark:bg-slate-900/80 rounded-t-[32px] p-6 pb-12 shadow-sm">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">Add Team Member</Text>
              <Pressable onPress={() => setModalVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Full Name</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Email Address</Text>
                  <TextInput
                    value={form.email}
                    onChangeText={(t) => setForm({ ...form, email: t })}
                    placeholder="e.g. john@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Mobile Number</Text>
                  <TextInput
                    value={form.mobile}
                    onChangeText={(t) => setForm({ ...form, mobile: t })}
                    placeholder="e.g. 9876543210"
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Assign Role</Text>
                  <View className="flex-row gap-3">
                    {["MEMBER", "TEAM_LEADER"].map(r => (
                      <Pressable 
                        key={r}
                        onPress={() => setForm({ ...form, role: r })}
                        className={`flex-1 p-4 rounded-xl items-center border ${form.role === r ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                      >
                        <Text className={`font-bold ${form.role === r ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {r.replace("_", " ")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Pressable 
                onPress={handleCreateUser} 
                disabled={isCreating}
                className="bg-blue-600 active:bg-blue-700 p-4 rounded-xl items-center justify-center mt-8 mb-4 shadow-sm shadow-blue-600/20"
              >
                {isCreating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Add User</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
