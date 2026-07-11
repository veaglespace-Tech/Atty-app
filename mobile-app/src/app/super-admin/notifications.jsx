import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Bell, Send, Users, Megaphone, Calendar } from "lucide-react-native";
import { useCreateSuperAdminPostMutation, useGetSuperAdminPostsQuery } from "@/services/api/superAdminApi";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { data: postsData, isLoading: isLoadingPosts, refetch } = useGetSuperAdminPostsQuery({ limit: 20 });
  const [createPost, { isLoading: isCreating }] = useCreateSuperAdminPostMutation();

  const recentBroadcasts = useMemo(() => {
    const allPosts = postsData?.items || [];
    return allPosts.filter(p => p.type === "NOTIFICATION").slice(0, 10);
  }, [postsData]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      return Alert.alert("Validation Error", "Title and message body are required to send a broadcast.");
    }

    try {
      await createPost({
        title: title.trim(),
        content: message.trim(),
        type: "NOTIFICATION",
        orgId: "ALL",
        isActive: true,
      }).unwrap();
      
      Alert.alert("Success", "System-wide push notification broadcasted successfully!");
      setTitle("");
      setMessage("");
      refetch();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Failed to send notification");
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Push Notifications</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 mb-6">
          <View className="flex-row items-center gap-3 mb-6">
            <View className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center border border-blue-100 dark:border-blue-800/50">
              <Bell size={24} className="text-blue-600 dark:text-blue-400" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">Broadcast Message</Text>
              <Text className="text-xs font-semibold text-slate-500">Send a system-wide push notification to all platform users.</Text>
            </View>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Notification Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="E.g., System Maintenance"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </View>
            
            <View>
              <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Message Body *</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Enter your message here..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium h-32"
              />
            </View>

            <Pressable 
              onPress={handleSend}
              disabled={isCreating}
              className="bg-blue-600 active:bg-blue-700 p-4 rounded-xl flex-row items-center justify-center mt-2 shadow-sm"
            >
              {isCreating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Send size={18} className="text-white mr-2" />
                  <Text className="text-white font-bold text-base">Send Notification</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-3 ml-2">Recent Broadcasts</Text>
        
        {isLoadingPosts ? (
          <View className="p-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : recentBroadcasts.length === 0 ? (
          <View className="bg-white dark:bg-slate-900 p-8 rounded-[24px] border border-slate-200 dark:border-slate-800 items-center justify-center">
            <Users size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
            <Text className="text-base font-bold text-slate-900 dark:text-white text-center">No Recent Broadcasts</Text>
            <Text className="text-xs text-slate-500 text-center mt-1">Previous system notifications will appear here.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {recentBroadcasts.map((broadcast) => (
              <View key={broadcast.id} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <Megaphone size={14} className="text-blue-600 dark:text-blue-400" />
                    </View>
                    <Text className="font-black text-slate-900 dark:text-white text-base max-w-[85%]">{broadcast.title}</Text>
                  </View>
                </View>
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {broadcast.content}
                </Text>
                <View className="flex-row items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Calendar size={12} className="text-slate-400" />
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(broadcast.createdAt).toLocaleDateString()} at {new Date(broadcast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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