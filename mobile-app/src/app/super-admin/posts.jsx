import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Trash2, Building2, User, Edit2 } from "lucide-react-native";
import { useGetSuperAdminPostsQuery, useDeleteSuperAdminPostMutation } from "@/services/api/superAdminApi";

export default function PostsPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPostsQuery();
  const [deletePost, { isLoading: isDeleting }] = useDeleteSuperAdminPostMutation();

  const posts = useMemo(() => data?.items || [], [data]);

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
            } catch (error) {
              Alert.alert("Error", error?.data?.message || "Failed to delete post");
            }
          } 
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Posts</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && posts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : posts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <MessageSquare size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center">No Posts</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no announcements or posts to display.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {posts.map((post) => {
              const isPoll = post.type === 'POLL';
              const typeLabel = isPoll ? 'INTERACTIVE POLL' : 'NEWS FEED';
              const typeColorClass = isPoll ? 'text-amber-500' : 'text-blue-500';
              const typeBgClass = isPoll ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20' : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20';
              
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
                <View key={post.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  {/* Top Header */}
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center mb-1">
                        <Building2 size={12} className="text-slate-400 mr-1.5" />
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400" numberOfLines={1}>
                          {post.organization?.name || "Global Post"}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        Code: {post.organization?.organizationCode || "ALL"}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-md ${typeBgClass}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${typeColorClass}`}>
                        {typeLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Content block */}
                  <View className="mb-4">
                    <Text className="text-base font-black text-slate-900 dark:text-white mb-2">
                      {post.title}
                    </Text>
                    <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {post.content}
                    </Text>
                  </View>

                  {/* Poll Section */}
                  {isPoll && pollStats && (
                    <View className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                      <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">POLL RESPONSES</Text>
                        <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">{pollStats.totalVotes} VOTES</Text>
                      </View>
                      {pollStats.options.map((opt, idx) => (
                        <View key={idx} className="mb-3 last:mb-0">
                          <View className="flex-row items-center justify-between mb-1.5">
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 pr-2" numberOfLines={1}>{opt.label}</Text>
                            <Text className="text-[10px] font-black text-slate-500 dark:text-slate-400">{opt.percentage}% ({opt.count})</Text>
                          </View>
                          <View className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex-row">
                            <View className="h-full bg-amber-500 rounded-full" style={{ width: `${opt.percentage}%` }} />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Footer */}
                  <View className="flex-row items-end justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <View>
                      <View className="flex-row items-center mb-1">
                        <User size={12} className="text-slate-400 mr-1.5" />
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {post.author?.name || 'Admin'}
                        </Text>
                      </View>
                      <View className="flex-row items-center pl-4">
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-900/20 mr-2">
                        <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">ACTIVE</Text>
                      </View>
                      <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 active:opacity-70">
                        <Edit2 size={12} className="text-slate-600 dark:text-slate-400" />
                      </Pressable>
                      <Pressable 
                        disabled={isDeleting}
                        onPress={() => handleDelete(post.id)}
                        className="h-8 w-8 items-center justify-center rounded-full border border-rose-200 dark:border-rose-800/30 bg-rose-50 dark:bg-rose-900/20 active:opacity-70"
                      >
                        <Trash2 size={12} className="text-rose-600 dark:text-rose-400" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}