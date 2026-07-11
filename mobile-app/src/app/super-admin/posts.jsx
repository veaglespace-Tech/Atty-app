import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Trash2, Building2, User } from "lucide-react-native";
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
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
            {posts.map((post) => (
              <View key={post.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-sm font-black text-slate-900 dark:text-white">{post.title || post.content?.substring(0, 50) + "..."}</Text>
                  </View>
                  <Pressable 
                    disabled={isDeleting}
                    onPress={() => handleDelete(post.id)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 -mt-1 -mr-1">
                    <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                  </Pressable>
                </View>

                {!!post.content && (
                  <Text className="text-sm text-slate-600 dark:text-slate-400 mb-4" numberOfLines={3}>
                    {post.content}
                  </Text>
                )}

                <View className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl space-y-2">
                  {post.organization?.name && (
                    <View className="flex-row items-center gap-2">
                      <Building2 size={14} className="text-slate-400" />
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {post.organization.name}
                      </Text>
                    </View>
                  )}
                  {post.author?.name && (
                    <View className="flex-row items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {post.author.name}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex-row items-center justify-between">
                  <View className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {post.type || "POST"}
                    </Text>
                  </View>
                  <Text className="text-xs font-medium text-slate-400 text-right">
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}