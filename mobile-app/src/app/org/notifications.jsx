import React from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Bell, CheckCheck, Clock, CircleDot } from "lucide-react-native";
import { useGetOrgNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from "@/services/api/orgApi";
import { formatTimeAgo } from "@/utils/date";

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
            {notifications.map((notif) => (
              <Pressable 
                key={notif.id}
                onPress={() => handleMarkAsRead(notif.id, notif.isRead)}
                className={`flex-row gap-4 p-5 rounded-[28px] border shadow-sm transition-colors ${
                  notif.isRead 
                    ? 'bg-white border-slate-200 dark:bg-slate-900/80 dark:border-slate-800' 
                    : 'bg-blue-50/80 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/80'
                }`}>
                
                <View className={`w-12 h-12 rounded-full items-center justify-center shrink-0 ${
                  notif.isRead ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-100 dark:bg-blue-900/50'
                }`}>
                  <Bell size={20} className={notif.isRead ? "text-slate-500 dark:text-slate-400" : "text-blue-600 dark:text-blue-400"} />
                </View>
                
                <View className="flex-1 pt-1">
                  <View className="flex-row items-start justify-between gap-2 mb-1">
                    <Text className={`flex-1 text-base font-bold ${
                      notif.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'
                    }`}>
                      {notif.title}
                    </Text>
                    {!notif.isRead && (
                      <CircleDot size={10} className="text-blue-600 dark:text-blue-500 mt-1.5" />
                    )}
                  </View>
                  
                  <Text className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {notif.message}
                  </Text>
                  
                  <View className="flex-row items-center gap-1.5 mt-3">
                    <Clock size={12} className="text-slate-400" />
                    <Text className="text-[11px] font-semibold text-slate-500">
                      {formatTimeAgo(notif.createdAt || new Date().toISOString())}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}