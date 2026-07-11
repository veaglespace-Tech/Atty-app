import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Bell, CheckCircle2, Megaphone, FileText, BarChart2, Trophy, Image as ImageIcon } from "lucide-react-native";
import { useGetOrgNotificationsQuery, useMarkAllNotificationsAsReadMutation } from "@/services/api/orgApi";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30" },
  ARTICLE: { label: "Article", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  POLL: { label: "Poll", icon: BarChart2, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30" },
  TOURNAMENT_CARD: { label: "Tournament", icon: Trophy, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/30" },
  NEWS: { label: "News", icon: Megaphone, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/30" }
};

export default function NotificationsPage() {
  const { data: notificationsData, isLoading, isFetching, refetch } = useGetOrgNotificationsQuery(50);
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const notifications = Array.isArray(notificationsData?.items) ? notificationsData.items : [];
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Notifications</Text>
          <View className="w-10 items-end">
            {unreadCount > 0 && (
              <Pressable 
                onPress={() => markAllAsRead()} 
                className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30"
              >
                <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 mt-4">
            <View className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 items-center justify-center mb-6">
              <Bell size={32} className="text-slate-300 dark:text-slate-600" />
            </View>
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">You're caught up!</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
              No new alerts or announcements.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {notifications.map((note) => {
              const typeInfo = POST_TYPES[note.type] || POST_TYPES.NOTIFICATION;
              const Icon = typeInfo.icon;
              
              return (
                <View 
                  key={note.id} 
                  className={`rounded-[24px] p-5 shadow-sm border ${
                    !note.isRead 
                      ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
                  }`}
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className={`px-2 py-1 rounded-md flex-row items-center gap-1 ${typeInfo.bg}`}>
                          <Icon size={10} className={typeInfo.color} />
                          <Text className={`text-[9px] font-black uppercase tracking-widest ${typeInfo.color}`}>{typeInfo.label}</Text>
                        </View>
                        <Text className="text-[10px] font-bold text-slate-400">
                          {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {note.title}
                      </Text>
                    </View>
                    {!note.isRead && (
                      <View className="h-3 w-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200 dark:shadow-none mt-1" />
                    )}
                  </View>
                  
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {note.message || note.content}
                  </Text>

                  {note.metadata?.attachment && (
                    <View className="mt-4 flex-row items-center gap-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                      <ImageIcon size={16} className="text-slate-500" />
                      <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-1" numberOfLines={1}>
                        {note.metadata.attachment.name || "Attachment File"}
                      </Text>
                    </View>
                  )}
                  
                  {note.type === "POLL" && note.metadata?.options && (
                    <View className="mt-4 flex-row items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30">
                      <BarChart2 size={16} className="text-amber-500" />
                      <Text className="text-xs font-bold text-amber-700 dark:text-amber-400 flex-1">
                        View poll in Posts to vote
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}