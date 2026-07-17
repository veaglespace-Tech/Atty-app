import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, Linking, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, BarChart2, Clock, User, FileText, Megaphone, Trophy, Paperclip, CheckCircle2, Download } from "lucide-react-native";
import { useGetOrgNotificationByIdQuery } from "@/services/api/orgApi";
import { useVoteOnPostMutation } from "@/services/api/postApi";
import { formatTimeAgo } from "@/utils/date";
import { useSelector } from "react-redux";
import PollResultsModal from "@/components/posts/PollResultsModal";
import { normalizeRole } from "@/utils/roles";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-200 dark:border-blue-800/50" },
  ARTICLE: { label: "Article", icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-200 dark:border-emerald-800/50" },
  POLL: { label: "Poll", icon: BarChart2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-200 dark:border-amber-800/50" },
  TOURNAMENT_CARD: { label: "Tournament", icon: Trophy, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/40", border: "border-rose-200 dark:border-rose-800/50" },
};

export default function NotificationDetailPage() {
  const { id } = useLocalSearchParams();
  const [activeVoteIndex, setActiveVoteIndex] = useState(null);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const { data: post, isLoading, isFetching, refetch } = useGetOrgNotificationByIdQuery(id);
  const [voteOnPost] = useVoteOnPostMutation();
  const user = useSelector((state) => state.auth?.user);

  const getPollResults = (post) => {
    if (Array.isArray(post?.poll?.results) && post.poll.results.length > 0) {
      return post.poll.results;
    }
    return (Array.isArray(post?.metadata?.options) ? post.metadata.options : []).map(
      (option, index) => ({
        index,
        option,
        votes: 0,
        percentage: 0,
      })
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Text className="text-slate-500 font-bold">Notification not found</Text>
      </View>
    );
  }

  const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
  const Icon = config.icon;

  const handleVote = async (optionIndex) => {
    try {
      setActiveVoteIndex(optionIndex);
      await voteOnPost({ id: post.id, optionIndex }).unwrap();
      refetch();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Failed to vote");
    } finally {
      setActiveVoteIndex(null);
    }
  };

  const handleDownload = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this file type natively");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred while opening the file");
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/org/notifications");
              }
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 transition-colors active:bg-slate-200"
          >
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Back to Notifications</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="bg-white dark:bg-slate-900/80 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <View className="flex-row items-center gap-2 flex-wrap mb-4">
            <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.bg} ${config.border}`}>
              <Icon size={14} className={config.color} />
              <Text className={`text-[11px] font-black uppercase tracking-widest ${config.color}`}>
                {config.label}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 ml-2">
              <Clock size={12} className="text-slate-400" />
              <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {post.title}
          </Text>

          <View className="flex-row items-center gap-2 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <View className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
              <User size={12} className="text-slate-500 dark:text-slate-400" />
            </View>
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Posted by {post.author?.role === 'SUPER_ADMIN' ? 'Super Admin' : (post.author?.name || "System")}
            </Text>
          </View>

          <Text className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            {post.message || post.content}
          </Text>

          {post.metadata?.attachment && (
            <View className="mb-6">
              {post.metadata.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) || (post.metadata.attachment.resourceType === "image" && post.metadata.attachment.format !== "pdf" && !post.metadata.attachment.url?.match(/\.pdf/i)) ? (
                <View className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <Image 
                    source={{ uri: post.metadata.attachment.url }} 
                    className="w-full h-64 bg-slate-100 dark:bg-slate-900"
                    resizeMode="cover"
                  />
                  {post.metadata.attachment.allowDownload !== false && (
                    <Pressable 
                      onPress={() => handleDownload(post.metadata.attachment.url)}
                      className="absolute bottom-3 right-3 flex-row items-center gap-2 bg-black/60 px-4 py-2 rounded-full"
                    >
                      <Download size={14} color="white" />
                      <Text className="text-white text-xs font-bold">Download</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable 
                  onPress={() => post.metadata.attachment.allowDownload !== false && handleDownload(post.metadata.attachment.url)}
                  className={`flex-row items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 ${post.metadata.attachment.allowDownload === false ? 'opacity-80' : 'active:bg-slate-100 dark:active:bg-slate-800'}`}>
                  <View className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <Paperclip size={20} className="text-blue-500 dark:text-blue-400" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>{post.metadata.attachment.name || "Attached File"}</Text>
                    <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                      {post.metadata.attachment.allowDownload === false ? 'Download Disabled' : 'Tap to download'}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          {post.type === "POLL" && post.metadata?.options && (() => {
            const pollResults = getPollResults(post);
            const totalVotes = post.poll?.totalVotes || 0;
            const selectedOptionIndex = post.poll?.selectedOptionIndex;
            const hasVoted = selectedOptionIndex != null;

            return (
              <View className="mt-2">
                <View className="flex-row items-center justify-between mb-4 px-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {hasVoted ? "Poll Results" : "Poll"}
                  </Text>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {hasVoted ? `${totalVotes} Votes` : ""}
                  </Text>
                </View>

                <View className="gap-3">
                  {pollResults.map((result) => {
                    const isSelected = result.index === selectedOptionIndex;
                    const fillWidth = result.percentage > 0 ? result.percentage : isSelected ? 6 : 0;
                    const isVotingThis = activeVoteIndex === result.index;

                    if (!hasVoted) {
                      return (
                        <Pressable
                          key={result.index}
                          onPress={() => handleVote(result.index)}
                          disabled={isVotingThis || activeVoteIndex != null}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors active:border-slate-300 active:bg-white dark:border-slate-800 dark:bg-slate-900/70"
                        >
                          <View className="flex-row items-center justify-between gap-3">
                            <Text className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1">
                              {result.option}
                            </Text>
                            {isVotingThis ? (
                              <ActivityIndicator size="small" color="#f59e0b" />
                            ) : (
                              <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                Tap to vote
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    }

                    return (
                      <View
                        key={result.index}
                        className={`w-full rounded-2xl border p-4 transition-colors ${
                          isSelected
                            ? "border-amber-300 bg-amber-50/80 dark:border-amber-400/40 dark:bg-amber-500/10"
                            : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70"
                        }`}
                      >
                        <View className="flex-row items-center justify-between gap-3 mb-2">
                          <Text className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1">
                            {result.option}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Text className={`text-[11px] font-bold ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                              {result.votes} vote{result.votes === 1 ? "" : "s"}
                            </Text>
                            <Text className={`text-sm font-black ${isSelected ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-300"}`}>
                              {result.percentage}%
                            </Text>
                          </View>
                        </View>

                        <View className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                          <View
                            className={`h-full rounded-full ${isSelected ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"}`}
                            style={{ width: `${fillWidth}%` }}
                          />
                        </View>

                        {isSelected && (
                          <View className="mt-2 flex-row items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <View />
                            <Text className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">Selected</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                
                {["ORG_ADMIN", "SUPER_ADMIN", "SUB_ADMIN", "TEAM_LEADER"].includes(normalizeRole(user?.currentRole || user?.role)) && (
                  <Pressable 
                    onPress={() => setIsPollModalOpen(true)}
                    className="mt-6 self-center flex-row items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 dark:bg-slate-800"
                  >
                    <User size={14} className="text-slate-500 dark:text-slate-400" />
                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">View Results</Text>
                  </Pressable>
                )}
              </View>
            );
          })()}

        </View>
      </ScrollView>

      {isPollModalOpen && post && (
        <PollResultsModal 
          postId={post.id} 
          open={isPollModalOpen} 
          onClose={() => setIsPollModalOpen(false)} 
        />
      )}
    </View>
  );
}
