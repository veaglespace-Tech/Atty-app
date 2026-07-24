import React from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Bell, CheckCheck, Clock, CircleDot, Megaphone, FileText, BarChart2, Trophy, Paperclip, User, Download, Image as ImageIcon } from "lucide-react-native";
import { useGetOrgNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from "@/services/api/orgApi";
import { formatTimeAgo } from "@/utils/date";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-200 dark:border-blue-800/50" },
  ARTICLE: { label: "Article", icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-200 dark:border-emerald-800/50" },
  POLL: { label: "Poll", icon: BarChart2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-200 dark:border-amber-800/50" },
  TOURNAMENT_CARD: { label: "Tournament", icon: Trophy, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/40", border: "border-rose-200 dark:border-rose-800/50" },
};

export default function OrgNotificationsPage() {
  const { data, isLoading, isFetching, refetch } = useGetOrgNotificationsQuery();
  const [markAsRead, { isLoading: isMarking }] = useMarkNotificationAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

  const notifications = Array.isArray(data?.items) ? data.items : [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markAsRead(id).unwrap();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Notifications</Text>
          <Pressable 
            onPress={handleMarkAll}
            disabled={isMarkingAll || unreadCount === 0}
            className={`h-10 w-10 items-center justify-center rounded-full ${unreadCount > 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-transparent'}`}>
            <CheckCheck size={18} className={unreadCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-300 dark:text-slate-700"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        {notifications.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 mt-2 shadow-sm">
            <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
              <Bell size={28} className="text-slate-400 dark:text-slate-600" />
            </View>
            <Text className="text-lg font-black text-slate-900 dark:text-white">All caught up!</Text>
            <Text className="text-slate-500 font-semibold mt-1">No new notifications.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {notifications.map((notif) => {
              const config = POST_TYPES[notif.type] || POST_TYPES.NOTIFICATION;
              const Icon = config.icon;
              
              return (
                <Pressable 
                  key={notif.id}
                  onPress={() => {
                  handleMarkAsRead(notif.id, notif.isRead);
                  router.push(`/org/notifications/${notif.id}`);
                }}
                  className={`p-5 rounded-[28px] border shadow-sm transition-colors ${
                    notif.isRead 
                      ? 'bg-white border-slate-200 dark:bg-slate-900/80 dark:border-slate-800' 
                      : 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/80'
                  }`}>
                  
                  <View className="flex-row items-start justify-between gap-3 mb-3">
                    <View className="flex-row items-center gap-2 flex-wrap flex-1">
                      <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg} ${config.border}`}>
                        <Icon size={12} className={config.color} />
                        <Text className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
                          {config.label}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {formatTimeAgo(notif.createdAt || new Date().toISOString())}
                        </Text>
                      </View>
                    </View>
                    
                    {!notif.isRead && (
                      <CircleDot size={10} className="text-blue-600 dark:text-blue-500 mt-1" />
                    )}
                  </View>

                  <Text className={`text-lg font-black mb-2 ${notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                    {notif.title}
                  </Text>
                  
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {notif.message || notif.content}
                  </Text>

                  {notif.metadata?.attachment && (
                    <View className="mb-4">
                      {notif.metadata.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) || (notif.metadata.attachment.resourceType === "image" && notif.metadata.attachment.format !== "pdf" && !notif.metadata.attachment.url?.match(/\.pdf/i)) ? (
                        <View className="h-40 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                          <Text className="absolute top-1/2 left-0 right-0 text-center text-slate-400 text-xs">Image Attached</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                          <View className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <Paperclip size={18} className="text-blue-500 dark:text-blue-400" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>{notif.metadata.attachment.name || "Attached File"}</Text>
                            <Text className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">Document</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {notif.type === "POLL" && notif.metadata?.options && (
                    <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5 flex-row justify-between items-center">
                      <View className="flex-row items-center gap-2">
                        <BarChart2 size={16} className="text-amber-600 dark:text-amber-400" />
                        <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {notif.metadata.options.length} options
                        </Text>
                        {notif.poll?.totalVotes > 0 && (
                          <Text className="text-xs font-semibold text-amber-500 dark:text-amber-400">
                            · {notif.poll.totalVotes} vote{notif.poll.totalVotes === 1 ? "" : "s"}
                          </Text>
                        )}
                      </View>
                      <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {notif.poll?.selectedOptionIndex != null ? "✓ Voted" : "Tap to vote"}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <User size={12} className="text-slate-400" />
                    <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      Posted by {notif.author?.role === 'SUPER_ADMIN' ? 'Super Admin' : (notif.author?.name || "System")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
