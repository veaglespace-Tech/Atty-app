import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Megaphone, FileText, BarChart2, Trophy, Calendar, Paperclip } from "lucide-react-native";

const POST_TYPES = {
  NOTIFICATION: { label: 'Notification', icon: Megaphone, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-800/50' },
  ARTICLE: { label: 'Article', icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-800/50' },
  POLL: { label: 'Poll', icon: BarChart2, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-800/50' },
  TOURNAMENT_CARD: { label: 'Tournament', icon: Trophy, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-800/50' },
};

const NotificationCard = React.memo(({ note }) => {
  const config = POST_TYPES[note.type] || POST_TYPES.NOTIFICATION;
  const Icon = config.icon;

  return (
    <Pressable 
      onPress={() => router.push(`/member/notifications/${note.id}`)}
      className={`rounded-[28px] p-6 mb-5 shadow-sm border active:opacity-80 active:scale-[0.98] transition-transform ${
        !note.isRead 
          ? 'border-blue-200 dark:border-blue-800/50 bg-white dark:bg-slate-900/80' 
          : 'border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50'
      }`}
    >
      <View className="flex-row items-center gap-2 mb-4">
        <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg} ${config.border}`}>
          <Icon size={12} className={config.color.split(" ")[0]} />
          <Text className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
          <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
        <View className="flex-1" />
        {!note.isRead && (
          <View className="h-3 w-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200 dark:shadow-none" />
        )}
      </View>

      <Text className="text-xl font-black text-slate-900 dark:text-white mb-3 leading-tight">
        {note.title}
      </Text>

      <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4 leading-relaxed" numberOfLines={3}>
        {note.message || note.content}
      </Text>

      {note.metadata?.attachment && (
        <View className="flex-row items-center gap-2 mb-4 bg-slate-100/50 dark:bg-slate-800/30 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/50 self-start">
          <Paperclip size={14} className="text-blue-500 dark:text-blue-400" />
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{note.metadata.attachment.name || "Attached File"}</Text>
        </View>
      )}

      {note.type === "POLL" && note.metadata?.options && (
        <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 rounded-xl self-start">
          <BarChart2 size={14} className="text-amber-600 dark:text-amber-400" />
          <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">{note.metadata.options.length} Options</Text>
          {note.poll?.totalVotes > 0 && (
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">· {note.poll.totalVotes} Votes</Text>
          )}
        </View>
      )}
    </Pressable>
  );
});

export default NotificationCard;
