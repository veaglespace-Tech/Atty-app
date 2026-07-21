import React, { useState, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {  Megaphone  } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useGetOrgPostsQuery, useVoteOnPostMutation } from "@/services/api/postApi";
import { useAuthSession } from "@/hooks/useAuthSession";

import PostCard from "@/components/posts/PostCard";

export default function PostsPage(props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthSession();
  const { data: postsData, isLoading } = useGetOrgPostsQuery({ authorId: user?.id });
  const [voteOnPost] = useVoteOnPostMutation();
  const [activeVoteId, setActiveVoteId] = useState(null);

  const posts = Array.isArray(postsData?.items) ? postsData.items : [];

  const handleVote = useCallback(async (postId, optionIndex) => {
    try {
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
    } catch (err) {
      // Error handled implicitly or can add alert
    } finally {
      setActiveVoteId(null);
    }
  }, [voteOnPost]);

  const handleDownload = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  }, []);

  return (
    <>      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-6">
            <Megaphone size={40} className="text-blue-400 dark:text-blue-500" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">No Posts</Text>
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            There are no organization announcements.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              handleVote={handleVote}
              activeVoteId={activeVoteId}
              handleDownload={handleDownload}
            />
          )}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
        />      )}
    </>
  );
}