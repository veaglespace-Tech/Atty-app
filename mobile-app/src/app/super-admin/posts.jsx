import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, TextInput } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Trash2, Building2, User, Edit2, Plus, RefreshCcw, Search, Calendar, Globe, FileText, BarChart2, Trophy, Megaphone, ChevronRight, Check, X } from "lucide-react-native";
import { useGetSuperAdminPostsQuery, useDeleteSuperAdminPostMutation, useGetSuperAdminOrganizationsQuery } from "@/services/api/superAdminApi";

const POST_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "NOTIFICATION", label: "Announcement", icon: Megaphone, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
  { value: "NEWS", label: "News Feed", icon: Globe, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20" },
  { value: "ARTICLE", label: "Knowledge Article", icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
  { value: "POLL", label: "Interactive Poll", icon: BarChart2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  { value: "TOURNAMENT_CARD", label: "Tournament Card", icon: Trophy, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" },
];

export default function PostsPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPostsQuery();
  const [deletePost, { isLoading: isDeleting }] = useDeleteSuperAdminPostMutation();

  const posts = useMemo(() => data?.items || [], [data]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const metrics = useMemo(() => {
    const total = posts.length;
    const active = posts.filter((p) => p.isActive).length;
    const polls = posts.filter((p) => p.type === "POLL").length;
    const news = posts.filter((p) => p.type === "NEWS" || p.type === "NOTIFICATION").length;
    return { total, active, polls, news };
  }, [posts]);

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
      const matchesType = typeFilter === "ALL" || post.type === typeFilter;
      const matchesOrg = !selectedOrg || post.organization?.id === selectedOrg.id;
      return matchesSearch && matchesType && matchesOrg;
    });
  }, [posts, searchTerm, typeFilter, selectedOrg]);

  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, page, pageSize]);

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to permanently delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deletePost(id).unwrap();
              if (paginatedPosts.length === 1 && page > 1) {
                setPage(page - 1);
              }
            } catch (error) {
              Alert.alert("Error", error?.data?.message || "Failed to delete post");
            }
          } 
        }
      ]
    );
  };

  const getTypeInfo = (type) => {
    return POST_TYPES.find(t => t.value === type) || POST_TYPES[1]; // default to notification
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20 flex-row items-center">
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.push("/super-admin/dashboard")} className="mr-1 py-1">
                <ChevronLeft size={12} className="text-blue-500" />
              </Pressable>
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Posts</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Post Management</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Announcements & Polls System</Text>
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
              <Pressable 
                onPress={() => Alert.alert("Coming Soon", "Create post from mobile is coming soon")} 
                className="h-9 px-3 flex-row items-center justify-center rounded-xl bg-blue-500 active:bg-blue-600"
              >
                <Plus size={14} className="text-white mr-1" />
                <Text className="text-xs font-bold text-white">Create Post</Text>
              </Pressable>
            </View>
          </View>        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {/* Metric Cards */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total Posts</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{metrics.total}</Text>
            <Text className="text-[10px] font-medium text-slate-500">All published posts across orgs</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Active Posts</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{metrics.active}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Posts visible to members</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Interactive Polls</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{metrics.polls}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Feedback polls created</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Broadcasts</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{metrics.news}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Announcements & news feeds</Text>
          </View>
        </View>

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
            <View className="flex-1 z-40">
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
            
            {/* Type Filter */}
            <View className="flex-1 relative">
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Post Type</Text>
              <Pressable 
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex-row items-center justify-between bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-11"
              >
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {POST_TYPES.find(t => t.value === typeFilter)?.label || "All Types"}
                </Text>
                <ChevronRight size={16} className={`text-slate-400 transition-transform ${showTypeDropdown ? 'rotate-90' : ''}`} />
              </Pressable>

              {showTypeDropdown && (
                <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  {POST_TYPES.map((t) => (
                    <Pressable
                      key={t.value}
                      onPress={() => {
                        setTypeFilter(t.value);
                        setPage(1);
                        setShowTypeDropdown(false);
                      }}
                      className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex-row items-center"
                    >
                      {t.value !== "ALL" && t.icon && <t.icon size={14} className={`mr-2 ${t.color.split(' ')[0]}`} />}
                      <Text className={`text-xs font-bold ${typeFilter === t.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Post Listing */}
        {isLoading && posts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-lg font-black text-slate-900 dark:text-white text-center">No Posts Found</Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no announcements or posts matching the criteria.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 mb-6 z-0">
            {paginatedPosts.map((post) => {
              const typeInfo = getTypeInfo(post.type);
              const Icon = typeInfo.icon || MessageSquare;
              const isPoll = post.type === 'POLL';
              
              let pollStats = null;
              if (isPoll && post.metadata) {
                const options = post.metadata.options || [];
                const votes = post.metadata.votes || {};
                let totalVotes = 0;
                Object.values(votes).forEach(count => totalVotes += Number(count || 0));                
                pollStats = {
                  totalVotes,
                  options: options.map((opt, index) => {
                    const count = Number(votes[index] || 0);
                    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    return { label: opt, count, percentage };
                  })
                };
              }

              return (
                <View key={post.id} className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 shadow-sm overflow-hidden relative">
                  {/* Top Header */}
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-1.5 mb-1 text-slate-400 dark:text-slate-500">
                        <Building2 size={13} className="text-slate-400" />
                        <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500" numberOfLines={1}>
                          {post.organization?.name || "Global"}
                        </Text>
                      </View>
                      <Text className="text-[9px] font-bold text-slate-400 tracking-wider">
                        Code: {post.organization?.organizationCode || "N/A"}
                      </Text>
                    </View>
                    <View className={`px-2.5 py-0.5 rounded-full flex-row items-center gap-1 border ${typeInfo.bg}`}>
                      <Icon size={11} className={typeInfo.color.split(' ')[0]} />
                      <Text className={`text-[9px] font-black uppercase tracking-[0.15em] ${typeInfo.color}`}>
                        {typeInfo.label}
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

                  {/* Poll Section */}
                  {isPoll && pollStats && (
                    <View className="bg-amber-50/30 dark:bg-amber-500/5 rounded-2xl p-4 mb-4 border border-amber-100 dark:border-amber-500/10">
                      <View className="flex-row items-center justify-between mb-2 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">POLL RESPONSES</Text>
                        <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{pollStats.totalVotes} VOTES</Text>
                      </View>
                      {pollStats.options.map((opt, idx) => (
                        <View key={idx} className="mb-2.5 last:mb-0">
                          <View className="flex-row items-center justify-between mb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 pr-2" numberOfLines={1}>{opt.label}</Text>
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{opt.percentage}% ({opt.count})</Text>
                          </View>
                          <View className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex-row">
                            <View className="h-full bg-amber-500 rounded-full" style={{ width: `${opt.percentage}%` }} />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Footer */}
                  <View className="flex-row items-end justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <View className="flex flex-col gap-1">
                      <View className="flex-row items-center">
                        <User size={10} className="text-slate-400 mr-1" />
                        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[100px]" numberOfLines={1}>
                          {post.author?.name || 'Admin'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Calendar size={10} className="text-slate-400 mr-1" />
                        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center gap-2">
                      <View className={`px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest flex-row items-center gap-1 ${
                        post.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        <Text className={`text-[8px] font-black uppercase tracking-widest ${post.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {post.isActive ? "ACTIVE" : "PAUSED"}
                        </Text>
                      </View>
                      
                      <Pressable 
                        disabled={isDeleting}
                        onPress={() => handleDelete(post.id)}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 active:opacity-70"
                      >
                        <Trash2 size={12} className="text-rose-500" />
                      </Pressable>
                    </View>
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
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-{Math.min(page * pageSize, totalItems)} of {totalItems} posts
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
