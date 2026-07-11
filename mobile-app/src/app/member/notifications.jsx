import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Bell, CheckCircle2 } from "lucide-react-native";
import { useGetOrgNotificationsQuery, useMarkAllNotificationsAsReadMutation } from "@/services/api/orgApi";

export default function NotificationsPage() {
  const { data: notificationsData, isLoading } = useGetOrgNotificationsQuery(50);
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const notifications = Array.isArray(notificationsData?.items) ? notificationsData.items : [];
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Native-style App Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <Pressable 
          onPress={() => router.back()} 
          className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 active:opacity-70 active:scale-95"
        >
          <ChevronLeft size={22} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Alerts</Text>
        <View className="w-11 items-end">
          {unreadCount > 0 && (
            <Pressable 
              onPress={() => markAllAsRead()} 
              className="h-11 w-11 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 active:opacity-70 active:scale-95"
            >
              <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-900 items-center justify-center mb-6">
            <Bell size={40} className="text-slate-300 dark:text-slate-700" />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">Caught Up</Text>
          <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            You have no new notifications.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-2" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {notifications.map((note) => (
            <Pressable 
              key={note.id} 
              className={`rounded-[28px] p-6 mb-5 shadow-sm border active:opacity-80 active:scale-[0.98] transition-transform ${
                !note.isRead 
                  ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
              }`}
            >
              <View className="flex-row justify-between items-start mb-3">
                <Text className="text-lg font-black text-slate-900 dark:text-white flex-1 mr-4 leading-tight">
                  {note.title}
                </Text>
                {!note.isRead && (
                  <View className="h-3 w-3 rounded-full bg-blue-500 mt-1.5 shadow-sm shadow-blue-200 dark:shadow-none" />
                )}
              </View>
              <Text className="text-base font-medium text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {note.message || note.content}
              </Text>
              <Text className="text-[11px] font-bold text-slate-400 tracking-wide">
                {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}