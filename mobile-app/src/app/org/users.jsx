import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Search, User, ShieldCheck, Mail, Phone, MoreHorizontal, UserCheck, ShieldAlert, Ban } from "lucide-react-native";
import { useGetOrgUsersQuery } from "@/services/api/orgApi";
import { formatRoleLabel, normalizeRole } from "@/utils/roles";

const STATUS_TABS = ["ALL", "APPROVED", "PENDING", "REJECTED"];

export default function OrgUsersPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData, isLoading, isFetching, refetch } = useGetOrgUsersQuery(1000);
  const users = Array.isArray(usersData?.items) ? usersData.items : [];

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      // Status filter
      if (activeTab !== "ALL" && String(user.approvalStatus) !== activeTab) {
        return false;
      }
      
      // Search filter
      if (query) {
        const haystack = [user.name, user.email, user.mobile]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(query)) return false;
      }
      
      return true;
    });
  }, [users, activeTab, searchQuery]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Users</Text>
        </View>

        {/* Search Bar */}
        <View className="mt-5 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5">
          <Search size={18} className="text-slate-400 dark:text-slate-500" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, or mobile..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-[14px] font-semibold text-slate-900 dark:text-white"
          />
        </View>

        {/* Segmented Control / Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-4 -mx-5 px-5"
          contentContainerStyle={{ gap: 8, paddingRight: 40 }}>
          {STATUS_TABS.map((tab) => {
            const isActive = tab === activeTab;
            
            // Count logic for badge
            let count = 0;
            if (tab === "ALL") count = users.length;
            else count = users.filter(u => String(u.approvalStatus) === tab).length;

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-full border flex-row items-center gap-2 ${
                  isActive 
                    ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 shadow-sm shadow-blue-500/20" 
                    : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                }`}>
                <Text className={`text-[13px] font-bold tracking-wide ${
                  isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
                }`}>
                  {tab}
                </Text>
                
                <View className={`px-2 py-0.5 rounded-full ${
                  isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                }`}>
                  <Text className={`text-[10px] font-black ${
                    isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                  }`}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {filteredUsers.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-2">
            <User size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No users found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function UserCard({ user }) {
  const roleLabel = formatRoleLabel(user.role);
  const status = user.approvalStatus;
  
  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED": return "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400";
      case "PENDING": return "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-800/50 text-amber-600 dark:text-amber-400";
      case "REJECTED": return "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-800/50 text-rose-600 dark:text-rose-400";
      default: return "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <View className="flex-row items-start gap-4">
        {/* Avatar */}
        <View className="h-12 w-12 rounded-[18px] bg-blue-50 dark:bg-blue-500/10 items-center justify-center border border-blue-100 dark:border-blue-800/30 overflow-hidden">
          <Text className="text-lg font-black text-blue-600 dark:text-blue-400">
            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        
        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                {user.name || "Unknown"}
              </Text>
              
              <View className="flex-row items-center gap-2 mt-1.5">
                <Mail size={12} className="text-slate-400" />
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400" numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              {user.mobile && (
                <View className="flex-row items-center gap-2 mt-1">
                  <Phone size={12} className="text-slate-400" />
                  <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    {user.mobileCountryCode} {user.mobile}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Badges */}
          <View className="flex-row flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <View className="flex-row items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              <ShieldCheck size={12} className="text-slate-500 dark:text-slate-400" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {roleLabel}
              </Text>
            </View>

            <View className={`px-2 py-1 rounded-md border ${getStatusColor(status).split(" text-")[0]}`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${"text-" + getStatusColor(status).split(" text-")[1]}`}>
                {status}
              </Text>
            </View>
            
            {!user.active && status === "APPROVED" && (
              <View className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50 px-2 py-1 rounded-md">
                <Text className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  BLOCKED
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}