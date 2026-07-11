import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Image, TextInput } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Image as ImageIcon, Send, Clock, Trash2, Shield } from "lucide-react-native";
import { useGetOrgPostsQuery, useCreatePostMutation, useDeletePostMutation } from "@/services/api/postApi";
import { formatTimeAgo } from "@/utils/date";

export default function OrgPostsPage() {
  const [content, setContent] = useState("");
  const { data, isLoading, isFetching, refetch } = useGetOrgPostsQuery("limit=50");
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [deletePost] = useDeletePostMutation();

  const posts = Array.isArray(data?.items) ? data.items : [];

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      await createPost({ content: content.trim(), type: "ANNOUNCEMENT" }).unwrap();
      setContent("");
    } catch (err) {
      console.error("Failed to post:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePost(id).unwrap();
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Organization Feed</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
          <TextInput
            multiline
            placeholder="Share an announcement..."
            placeholderTextColor="#94a3b8"
            value={content}
            onChangeText={setContent}
            className="text-base text-slate-900 dark:text-white min-h-[80px] px-2 py-1"
            textAlignVertical="top"
          />
          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Pressable className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
              <ImageIcon size={18} className="text-slate-500 dark:text-slate-400" />
            </Pressable>
            <Pressable 
              onPress={handlePost}
              disabled={isCreating || !content.trim()}
              className={`px-5 py-2.5 rounded-full flex-row items-center gap-2 ${content.trim() && !isCreating ? 'bg-blue-600 shadow-sm shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Send size={14} color={content.trim() && !isCreating ? "white" : "#94a3b8"} />
              <Text className={`font-bold ${content.trim() && !isCreating ? 'text-white' : 'text-slate-400'}`}>Post</Text>
            </Pressable>
          </View>
        </View>

        {posts.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No posts yet.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {posts.map((post) => (
              <View key={post.id} className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 items-center justify-center border border-blue-200 dark:border-blue-800">
                      <Text className="font-black text-blue-700 dark:text-blue-300 text-lg">
                        {post.authorName?.[0]?.toUpperCase() || "A"}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">{post.authorName || "Admin"}</Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-slate-400" />
                        <Text className="text-[11px] font-semibold text-slate-500">
                          {formatTimeAgo(post.createdAt || new Date().toISOString())}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center gap-2">
                    {post.type === "ANNOUNCEMENT" && (
                      <View className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md flex-row items-center gap-1">
                        <Shield size={10} className="text-amber-600 dark:text-amber-400" />
                        <Text className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Announcement</Text>
                      </View>
                    )}
                    <Pressable onPress={() => handleDelete(post.id)} className="p-2 -mr-2 opacity-50 hover:opacity-100">
                      <Trash2 size={16} className="text-rose-500" />
                    </Pressable>
                  </View>
                </View>
                
                <Text className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed mt-2">{post.content}</Text>
                
                {post.imageUrl && (
                  <Image 
                    source={{ uri: post.imageUrl }} 
                    className="w-full h-48 rounded-xl mt-4 bg-slate-100 dark:bg-slate-800" 
                    resizeMode="cover"
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}