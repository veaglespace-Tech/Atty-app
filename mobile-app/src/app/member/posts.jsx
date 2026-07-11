import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Megaphone, FileText, BarChart2, Trophy, Clock, Paperclip } from "lucide-react-native";
import { useGetOrgPostsQuery, useVoteOnPostMutation } from "@/services/api/postApi";
import { useAuthSession } from "@/hooks/useAuthSession";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-400" },
  ARTICLE: { label: "Article", icon: FileText, color: "bg-emerald-100 dark:bg-emerald-900/30", textColor: "text-emerald-700 dark:text-emerald-400" },
  POLL: { label: "Poll", icon: BarChart2, color: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-700 dark:text-amber-400" },
  TOURNAMENT_CARD: { label: "Tournament", icon: Trophy, color: "bg-rose-100 dark:bg-rose-900/30", textColor: "text-rose-700 dark:text-rose-400" }
};

export default function PostsPage() {
  const { user } = useAuthSession();
  const { data: postsData, isLoading } = useGetOrgPostsQuery({ authorId: user?.id });
  const [voteOnPost] = useVoteOnPostMutation();
  const [activeVoteId, setActiveVoteId] = useState(null);

  const posts = Array.isArray(postsData?.items) ? postsData.items : [];

  const handleVote = async (postId, optionIndex) => {
    try {
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
    } catch (err) {
      // Error handled implicitly or can add alert
    } finally {
      setActiveVoteId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Native-style App Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <Pressable 
          onPress={() => router.back()} 
          className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900/80 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-95"
        >
          <ChevronLeft size={22} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Posts</Text>
        <View className="w-11" />
      </View>

      {isLoading ? (
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
        <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {posts.map((post) => {
            const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
            const Icon = config.icon;

            return (
              <View 
                key={post.id} 
                className="bg-white dark:bg-slate-900/80 rounded-[32px] p-6 mb-6 shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className={`flex-row items-center px-4 py-2 rounded-full ${config.color}`}>
                    <Icon size={14} className={config.textColor} />
                    <Text className={`text-[10px] font-black uppercase tracking-widest ml-2 ${config.textColor}`}>
                      {config.label}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Clock size={12} className="text-slate-400 mr-1.5" />
                    <Text className="text-[11px] font-bold text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>

                <Text className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{post.title}</Text>
                <Text className="text-base font-medium text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">{post.content}</Text>

                {post.metadata?.attachment && (post.metadata.attachment.resourceType === 'image' || post.metadata.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
                  <View className="h-56 w-full rounded-[24px] overflow-hidden mb-5 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <Image source={{ uri: post.metadata.attachment.url }} className="h-full w-full" resizeMode="cover" />
                  </View>
                ) : post.metadata?.attachment && (
                  <Pressable className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[24px] mb-5 border border-slate-200 dark:border-slate-700 active:opacity-70 active:scale-[0.98]">
                    <View className="h-10 w-10 bg-white dark:bg-slate-700 rounded-xl items-center justify-center shadow-sm mr-3">
                      <Paperclip size={20} className="text-blue-500 dark:text-blue-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>
                        {post.metadata.attachment.name || "Attached File"}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Tap to view</Text>
                    </View>
                  </Pressable>
                )}

                {post.type === "POLL" && post.metadata?.options && (
                  <View className="mt-2 space-y-3">
                    {post.metadata.options.map((option, index) => {
                      const isVoted = post.poll?.selectedOptionIndex === index;
                      const pct = post.poll?.totalVotes > 0 
                        ? ((post.poll?.results?.[index] || 0) / post.poll.totalVotes * 100)
                        : 0;
                        
                      return (
                        <Pressable 
                          key={index}
                          onPress={() => handleVote(post.id, index)}
                          disabled={activeVoteId === post.id || post.poll?.selectedOptionIndex != null}
                          className={`relative overflow-hidden rounded-[24px] border p-4 mb-3 active:scale-[0.98] transition-all ${
                            isVoted ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {post.poll?.selectedOptionIndex != null && (
                            <View 
                              className={`absolute left-0 top-0 bottom-0 ${isVoted ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-slate-100 dark:bg-slate-700/50'}`} 
                              style={{ width: `${pct}%` }} 
                            />
                          )}
                          <View className="relative flex-row items-center justify-between">
                            <Text className={`text-base font-bold ${isVoted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {option}
                            </Text>
                            {post.poll?.selectedOptionIndex != null && (
                              <Text className={`text-sm font-black ${isVoted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                {Math.round(pct)}%
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                    <Text className="text-xs font-bold text-slate-400 mt-2 text-right tracking-wide">
                      {post.poll?.totalVotes || 0} Total Votes
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}