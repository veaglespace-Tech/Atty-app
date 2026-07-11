import React, { useState, useRef } from "react";
import { View, Text, Pressable, Modal, Animated, Dimensions, TouchableWithoutFeedback, ScrollView } from "react-native";
import { router, Link, Slot, usePathname } from "expo-router";
import { LogOut, Menu, X, ChevronRight, User, Users, Component, ClipboardCheck, CalendarCheck2, FileBarChart, CreditCard, MessageSquare, Bell } from "lucide-react-native";
import { useDispatch } from "react-redux";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

const TABS = [
  { title: "Dashboard", icon: <BarChart3 size={18} color="#2563eb" />, href: "dashboard" },
  { title: "Users", icon: <Users size={18} color="#2563eb" />, href: "users" },
  { title: "Teams", icon: <Component size={18} color="#2563eb" />, href: "teams" },
  { title: "Requests", icon: <ClipboardCheck size={18} color="#2563eb" />, href: "registration-requests" },
  { title: "My Attendance", icon: <CalendarCheck2 size={18} color="#2563eb" />, href: "my-attendance" },
  { title: "Attendance", icon: <CalendarCheck2 size={18} color="#2563eb" />, href: "attendance" },
  { title: "Reports", icon: <FileBarChart size={18} color="#2563eb" />, href: "reports" },
  { title: "Subscription", icon: <CreditCard size={18} color="#2563eb" />, href: "subscription" },
  { title: "Posts", icon: <MessageSquare size={18} color="#2563eb" />, href: "posts" },
  { title: "Notifications", icon: <Bell size={18} color="#2563eb" />, href: "notifications" }
];
import { BarChart3 } from "lucide-react-native";

export default function MobileDashboardShell() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const pathname = usePathname();
  const isSettingsPage = pathname === "/org/settings";
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      
      {/* Global Header Bar with Menu Button */}
      {!isSettingsPage && (
        <View className="flex-row items-center justify-between px-4 pt-3 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={openDrawer}
              className="h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm active:scale-95 transition-transform">
              <Menu size={22} className="text-slate-900 dark:text-white" />
            </Pressable>
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-500/30 overflow-hidden">
                {user?.organization?.logoUrl ? (
                  <Image 
                    source={{ uri: user.organization.logoUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-white font-black text-base">
                    {(user?.organization?.name || "V").charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View>
                <Text className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {user?.organization?.name || "Veagle"}
                </Text>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </Text>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => router.push('/org/settings')}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 active:scale-95 transition-transform">
            <User size={18} className="text-slate-700 dark:text-slate-300" />
          </Pressable>
        </View>
      )}

      {/* Renders the current tab's content */}
      <Slot />

      {/* Side Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View className="flex-1 flex-row">
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View 
              style={{ 
                opacity: fadeAnim, 
                backgroundColor: 'rgba(15, 23, 42, 0.65)'
              }}
              className="absolute inset-0"
            />
          </TouchableWithoutFeedback>

          {/* Sliding Drawer */}
          <Animated.View
            style={{ transform: [{ translateX: slideAnim }], width: DRAWER_WIDTH }}
            className="h-full shadow-2xl flex-col"
          >
            <View className="flex-1 bg-white dark:bg-[#020617] pt-12 pb-8 border-r border-slate-200 dark:border-slate-800">
              <View className="px-6 flex-row items-center justify-between mb-8">
                <View className="flex-row items-center gap-3">
                  {user?.organization?.logoUrl && (
                    <Image 
                      source={{ uri: user.organization.logoUrl }}
                      style={{ width: 36, height: 36, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  )}
                  <View>
                    <Text className="text-2xl font-black text-slate-900 dark:text-white">
                      {user?.organization?.name || "Veagle"}
                    </Text>
                    <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mt-1">
                      Workspace
                    </Text>
                  </View>
                </View>
                <Pressable 
                  onPress={closeDrawer}
                  className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-3">
                  Navigation
                </Text>
                
                <View className="gap-y-1">
                  {TABS.map((tab) => (
                    <Pressable
                      key={tab.title}
                      onPress={() => {
                        closeDrawer();
                        setTimeout(() => {
                          router.replace(`/org/${tab.href}`);
                        }, 200);
                      }}
                      className="flex-row items-center justify-between p-3 rounded-2xl active:bg-blue-50 dark:active:bg-slate-800 transition-colors">
                      <View className="flex-row items-center gap-4">
                        <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center">
                          {tab.icon}
                        </View>
                        <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-200">
                          {tab.title}
                        </Text>
                      </View>
                      <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View className="px-6 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <Pressable
                  onPress={onLogout}
                  className="flex-row items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 active:opacity-70">
                  <LogOut size={18} className="text-rose-600 dark:text-rose-400" />
                  <Text className="font-bold text-rose-600 dark:text-rose-400">Sign Out</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}