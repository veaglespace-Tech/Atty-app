import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Building2, User, Search, Calendar, Globe, FileText, BarChart2, Trophy, Megaphone, ChevronRight, RefreshCcw, Check, X } from "lucide-react-native";
import { useGetSuperAdminPostsQuery, useGetSuperAdminOrganizationsQuery } from "@/services/api/superAdminApi";

const POST_TYPES = {
  NOTIFICATION: {
    label: "Notification",
    icon: Megaphone,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  },
  NEWS: {
    label: "News Feed",
    icon: Globe,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20",
  },
  ARTICLE: {
    label: "Article",
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  },
  POLL: {
    label: "Poll",
    icon: BarChart2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  },
  TOURNAMENT_CARD: {
    label: "Tournament",
    icon: Trophy,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
  },
};

export default function NotificationsPage() {
  const { data: postsData, isLoading, isFetching, refetch } = useGetSuperAdminPostsQuery({ limit: 1000 });

  const posts = useMemo(() => postsData?.items || [], [postsData]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { data: orgData, isFetching: isFetchingOrgs } = useGetSuperAdminOrganizationsQuery(
    { search: orgSearchTerm, limit: 10 },
    { skip: !showOrgDropdown }
  );
  const organizations = useMemo(() => orgData?.items || [], [orgData]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        (post.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.content || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrg = !selectedOrg || post.organization?.id === selectedOrg.id;
      return matchesSearch && matchesOrg;
    });
  }, [posts, searchTerm, selectedOrg]);

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, page, pageSize]);

  return (
<<<<<<< HEAD
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20 flex-row items-center">
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.push("/super-admin/dashboard")} className="mr-1 py-1">
                <ChevronLeft size={12} className="text-blue-500" />
              </Pressable>
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Notifications</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Notifications Feed</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">View all organization notifications</Text>
          </View>
          
          <View className="items-end gap-3 mt-1">
            <View className="flex-row items-center gap-2">
              <Pressable 
                onPress={refetch} 
                disabled={isLoading || isFetching} 
                className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {isLoading || isFetching ? <ActivityIndicator size="small" color="#2563eb" /> : <RefreshCcw size={14} className="text-slate-600 dark:text-slate-300" />}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* Filter Container */}
        <View className="bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm mb-6 z-20">
          <View className="flex-col gap-4">
            {/* Organization Search Input */}
            <View className="flex-1 z-50">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Organization</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-11 relative z-50">
                <Building2 size={16} className="text-slate-400 mr-2" />
                <TextInput
                  value={orgSearchTerm}
                  onFocus={() => setShowOrgDropdown(true)}
                  onChangeText={(val) => { 
                    setOrgSearchTerm(val); 
                    setShowOrgDropdown(true);
                    if (selectedOrg && val !== selectedOrg.name) {
                      setSelectedOrg(null);
                    }
                  }}
                  placeholder="Search and select organization"
                  placeholderTextColor="#64748b"
                  className="flex-1 text-xs font-semibold text-slate-900 dark:text-white p-0 m-0"
                />
                {selectedOrg ? (
                  <Pressable onPress={() => { setSelectedOrg(null); setOrgSearchTerm(""); setPage(1); }} className="p-1">
                    <X size={14} className="text-slate-400" />
                  </Pressable>
                ) : null}
              </View>
=======
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Push Notifications</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        <View className="bg-white dark:bg-slate-900/80 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
          <View className="flex-row items-center gap-3 mb-6">
            <View className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center border border-blue-100 dark:border-blue-800/50">
              <Bell size={24} className="text-blue-600 dark:text-blue-400" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">Broadcast Message</Text>
              <Text className="text-xs font-semibold text-slate-500">Send a system-wide push notification to all platform users.</Text>
            </View>
          </View>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)

              {/* Organization Dropdown */}
              {showOrgDropdown && (
                <View className="absolute top-[64px] left-0 right-0 bg-white dark:bg-[#151E2F] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-72 overflow-hidden">
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 8 }}>
                    {isFetchingOrgs ? (
                      <View className="p-4 items-center justify-center">
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    ) : organizations.length === 0 ? (
                      <View className="p-4 items-center justify-center">
                        <Text className="text-xs font-semibold text-slate-500">No organizations found</Text>
                      </View>
                    ) : (
                      organizations.map((org, idx) => {
                        const isSelected = selectedOrg?.id === org.id;
                        return (
                          <Pressable
                            key={org.id}
                            onPress={() => {
                              setSelectedOrg(org);
                              setOrgSearchTerm(org.name);
                              setShowOrgDropdown(false);
                              setPage(1);
                            }}
                            className={`px-4 py-3 ${idx !== organizations.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''} flex-row items-center justify-between ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          >
                            <View className="flex-1 pr-4">
                              <Text className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{org.name}</Text>
                              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{org.organizationCode}</Text>
                              {(org.city || org.state || org.country) && (
                                <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-600 mt-0.5">
                                  {[org.city, org.state, org.country].filter(Boolean).join(', ')}
                                </Text>
                              )}
                            </View>
                            {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                  <Pressable 
                    onPress={() => setShowOrgDropdown(false)}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-slate-500">Close Dropdown</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Search Input */}
            <View className="flex-1">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Search Keywords</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-11">
                <Search size={16} className="text-slate-400 mr-2" />
                <TextInput
                  value={searchTerm}
                  onChangeText={(val) => { setSearchTerm(val); setPage(1); }}
                  placeholder="Search title, content..."
                  placeholderTextColor="#64748b"
                  className="flex-1 text-xs font-semibold text-slate-900 dark:text-white p-0 m-0"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Post Listing */}
        {isLoading && posts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
<<<<<<< HEAD
        ) : filteredPosts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Megaphone size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-lg font-black text-slate-900 dark:text-white text-center">No Notifications Found</Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              Try adjusting your search criteria.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 mb-6 z-0">
            {paginatedPosts.map((post) => {
              const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
              const Icon = config.icon;
              const authorName = post.author?.role === "SUPER_ADMIN" ? "Super Admin" : post.author?.name || "System";

              return (
                <View key={post.id} className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 shadow-sm overflow-hidden relative">
                  
                  {/* Top Pills Row */}
                  <View className="flex-row items-center flex-wrap gap-2 mb-4">
                    <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 border ${config.bg}`}>
                      <Icon size={10} className={config.color.split(' ')[0]} />
                      <Text className={`text-[9px] font-black uppercase tracking-[0.15em] ${config.color}`}>
                        {config.label}
                      </Text>
=======
        ) : recentBroadcasts.length === 0 ? (
          <View className="bg-white dark:bg-slate-900/80 p-8 rounded-[24px] border border-slate-200 dark:border-slate-800 items-center justify-center shadow-sm">
            <Users size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
            <Text className="text-base font-bold text-slate-900 dark:text-white text-center">No Recent Broadcasts</Text>
            <Text className="text-xs text-slate-500 text-center mt-1">Previous system notifications will appear here.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {recentBroadcasts.map((broadcast) => (
              <View key={broadcast.id} className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <Megaphone size={14} className="text-blue-600 dark:text-blue-400" />
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
                    </View>

                    <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                      <User size={10} className="text-slate-400" />
                      <Text className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300" numberOfLines={1}>
                        {authorName}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1 ml-auto">
                      <Calendar size={10} className="text-slate-400" />
                      <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                        {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>

                  {/* Content block */}
                  <View className="mb-4">
                    <Text className="text-base font-black text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {post.title}
                    </Text>
                    <Text className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
                      {post.content}
                    </Text>
                  </View>

                  {/* Organization badge if available */}
                  {post.organization && (
                    <View className="flex-row items-center gap-1.5 mb-4 text-slate-400 dark:text-slate-500">
                      <Building2 size={12} className="text-slate-400" />
                      <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500" numberOfLines={1}>
                        Organization: {post.organization.name}
                      </Text>
                    </View>
                  )}
                  
                  {/* Footer */}
                  <View className="flex-row items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <View className="flex-row items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                      <User size={12} className="text-slate-400" />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Posted by {authorName}
                      </Text>
                    </View>
                    <Pressable onPress={() => router.push(`/super-admin/notifications/${post.id}`)}>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-blue-500">VIEW DETAILS</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <View className="bg-white dark:bg-[#151E2F] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 flex-row flex-wrap items-center justify-between mb-6 z-0">
            <View className="w-full md:w-auto mb-3 md:mb-0">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-{Math.min(page * pageSize, totalItems)} of {totalItems} notifications
              </Text>
            </View>
            
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rows</Text>
                <View className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-slate-50 dark:bg-[#0A0F1C]">
                  <TextInput
                    value={String(pageSize)}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (num > 0) {
                        setPageSize(num);
                        setPage(1);
                      }
                    }}
                    keyboardType="numeric"
                    className="text-xs font-bold text-slate-900 dark:text-white p-0 m-0 w-8 text-center"
                  />
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable 
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === 1 ? 'opacity-50' : ''}`}
                >
                  <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300 mr-1" />
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Prev</Text>
                </Pressable>
                
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {page} / {totalPages}
                </Text>

                <Pressable 
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === totalPages ? 'opacity-50' : ''}`}
                >
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-1">Next</Text>
                  <ChevronRight size={14} className="text-slate-600 dark:text-slate-300" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}