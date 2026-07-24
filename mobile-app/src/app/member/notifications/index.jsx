import React, { useCallback } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCircle2 } from "lucide-react-native";
import { useGetOrgNotificationsQuery, useMarkAllNotificationsAsReadMutation } from "@/services/api/orgApi";

import NotificationCard from "@/components/notifications/NotificationCard";

export default function NotificationsPage() {
  const { data: notificationsData, isLoading } = useGetOrgNotificationsQuery(50);
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const notifications = Array.isArray(notificationsData?.items) ? notificationsData.items : [];
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <View className="px-6 pt-4 pb-4 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Feed & Updates</Text>
        {unreadCount > 0 && (
          <Pressable 
            onPress={() => markAllAsRead()} 
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 active:opacity-70 active:scale-95"
          >
            <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
            <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-900/80 items-center justify-center mb-6">
            <Bell size={40} className="text-slate-300 dark:text-slate-700" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">Caught Up</Text>
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            You have no new notifications.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <NotificationCard note={item} />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}
    </>
  );
}
