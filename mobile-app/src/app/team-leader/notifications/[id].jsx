import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking, Alert, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Calendar, FileText, Megaphone, BarChart2, Trophy, Building2, Paperclip, Download, ExternalLink } from 'lucide-react-native';
import { useGetOrgNotificationByIdQuery, useMarkNotificationAsReadMutation } from '@/services/api/orgApi';
import { useVoteOnPostMutation } from '@/services/api/postApi';

const POST_TYPES = {
  NOTIFICATION: { label: 'Notification', icon: Megaphone, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800' },
  ARTICLE: { label: 'Article', icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
  NEWS: { label: 'News', icon: Megaphone, color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-800' },
  POLL: { label: 'Poll', icon: BarChart2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800' },
  TOURNAMENT_CARD: { label: 'Tournament', icon: Trophy, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800' },
};

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, refetch } = useGetOrgNotificationByIdQuery(id);
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [voteOnPost] = useVoteOnPostMutation();
  const [activeVoteId, setActiveVoteId] = useState(null);
  const notification = data?.data || data;

  useEffect(() => {
    if (id) {
      markAsRead(id);
    }
  }, [id, markAsRead]);

  const handleVote = async (postId, optionIndex) => {
    try {
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
      refetch();
    } catch (err) {
      // Ignore or show alert
    } finally {
      setActiveVoteId(null);
    }
  };

  const handleDownload = async (url) => {
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
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Content...</Text>
      </View>
    );
  }

  if (!notification) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C] items-center justify-center p-6">
        <FileText size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
        <Text className="text-xl font-black text-slate-900 dark:text-white mb-2">Not Found</Text>
        <Text className="text-sm font-medium text-slate-500 text-center mb-8">
          The notification may have been deleted or you don't have access.
        </Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/team-leader/dashboard')} className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center">
          <ChevronLeft size={16} className="text-white mr-2" />
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const config = POST_TYPES[notification.type] || POST_TYPES.NOTIFICATION;
  const Icon = config.icon;
  const attachment = notification.metadata?.attachment;
  const isImageAttachment = attachment?.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) || (attachment?.resourceType === 'image' && attachment?.format !== 'pdf' && !attachment?.url?.match(/\.pdf/i));

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 flex-row items-center">
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/team-leader/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mr-3">
          <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Notification Details</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden">
          <View className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <View className="flex-row flex-wrap gap-2 mb-4">
              <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color}`}>
                <Icon size={12} />
                <Text className={`text-[10px] font-black uppercase tracking-widest ${config.color.split(' ')[0]}`}>{config.label}</Text>
              </View>
              {notification.organization?.name && (
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <Building2 size={12} className="text-slate-400" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {notification.organization.name}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              {notification.title}
            </Text>

            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center">
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {notification.authorName?.charAt(0).toUpperCase() || "S"}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {notification.authorName || "System"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Calendar size={12} className="text-slate-400" />
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          <View className="p-6">
            <Text className="text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {notification.content || notification.message}
            </Text>

            {notification.type === "POLL" && notification.metadata?.options && (
              <View className="mt-6 space-y-3">
                {notification.metadata.options.map((option, index) => {
                  const isVoted = notification.poll?.selectedOptionIndex === index;
                  const pct = notification.poll?.totalVotes > 0 
                    ? ((notification.poll?.results?.[index] || 0) / notification.poll.totalVotes * 100)
                    : 0;
                    
                  return (
                    <Pressable 
                      key={index}
                      onPress={() => handleVote(notification.id, index)}
                      disabled={activeVoteId === notification.id || notification.poll?.selectedOptionIndex != null}
                      className={`relative overflow-hidden rounded-[24px] border p-4 mb-3 active:scale-[0.98] transition-all ${
                        isVoted ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {notification.poll?.selectedOptionIndex != null && (
                        <View 
                          className={`absolute left-0 top-0 bottom-0 ${isVoted ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-slate-100 dark:bg-slate-700/50'}`} 
                          style={{ width: `${pct}%` }} 
                        />
                      )}
                      <View className="relative flex-row items-center justify-between">
                        <Text className={`text-base font-bold ${isVoted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {option}
                        </Text>
                        {notification.poll?.selectedOptionIndex != null ? (
                          <Text className={`text-sm font-black ${isVoted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            {Math.round(pct)}%
                          </Text>
                        ) : (
                          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">Tap to vote</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
                <Text className="text-xs font-bold text-slate-400 mt-2 text-right tracking-wide">
                  {notification.poll?.totalVotes || 0} Total Votes
                </Text>
              </View>
            )}

            {attachment && (
              <View className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Attachments</Text>
                
                {isImageAttachment ? (
                  <View className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <Image 
                      source={{ uri: attachment.url }} 
                      className="w-full h-64 bg-slate-100 dark:bg-slate-800" 
                      resizeMode="contain" 
                    />
                    {attachment.allowDownload !== false && (
                      <Pressable 
                        onPress={() => handleDownload(attachment.url)}
                        className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex-row items-center justify-center"
                      >
                        <Download size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                        <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">Download Image</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View className="flex-row items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <View className="h-12 w-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 items-center justify-center mr-4">
                      <Paperclip size={20} className="text-blue-500 dark:text-blue-400" />
                    </View>
                    <View className="flex-1 mr-4">
                      <Text className="text-sm font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>
                        {attachment.name || "Attached File"}
                      </Text>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {attachment.allowDownload !== false ? "Document" : "Restricted"}
                      </Text>
                    </View>
                    {attachment.allowDownload !== false && (
                      <Pressable 
                        onPress={() => handleDownload(attachment.url)}
                        className="h-10 w-10 bg-blue-600 rounded-lg items-center justify-center"
                      >
                        <ExternalLink size={16} className="text-white" />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
