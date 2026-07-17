import React, { useState, useRef } from "react";
import { View, Text, Pressable, Modal, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, Image } from "react-native";
import { router, Link, Slot, usePathname } from "expo-router";
import { LogOut, Menu, X, ChevronRight, User, Users, Component, ClipboardCheck, CalendarCheck2, FileBarChart, CreditCard, MessageSquare, Bell } from "lucide-react-native";
import { useDispatch } from "react-redux";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";
import { ROLES, DASHBOARD_ROOT_BY_ROLE, ROLE_ALIASES } from "@/utils/roles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

import { BarChart3, Building2, Book, Gift, Database, Inbox, Settings, Shield } from "lucide-react-native";

const getTabsForRole = (rawRole) => {
  const role = ROLE_ALIASES[rawRole?.toUpperCase()] || rawRole;
  const commonIconProps = { size: 18, color: "#2563eb" };
  
  if (role === ROLES.SUPER_ADMIN) {
    return [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "Organizations", icon: <Building2 {...commonIconProps} />, href: "organizations" },
      { title: "Leads", icon: <Users {...commonIconProps} />, href: "leads" },
      { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
      { title: "Users", icon: <Users {...commonIconProps} />, href: "users" },
      { title: "Contacts", icon: <Users {...commonIconProps} />, href: "contacts" },
      { title: "Referrals", icon: <Users {...commonIconProps} />, href: "referrals" },
      { title: "Plans", icon: <Book {...commonIconProps} />, href: "plans" },
      { title: "Access", icon: <Shield {...commonIconProps} />, href: "access" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
      { title: "Payments", icon: <CreditCard {...commonIconProps} />, href: "payments" },
      { title: "Coupons", icon: <Gift {...commonIconProps} />, href: "coupons" },
      { title: "Analytics", icon: <FileBarChart {...commonIconProps} />, href: "analytics" },
      { title: "Backup", icon: <Database {...commonIconProps} />, href: "backup" },
      { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
    ];
  }
  
  if (role === ROLES.ORG_ADMIN || role === ROLES.SUB_ADMIN) {
    return [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" },
      { title: "Users", icon: <Users {...commonIconProps} />, href: "users" },
      { title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "registration-requests" },
      { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "my-attendance" },
      { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
      { title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" },
      { title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
      { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
    ];
  }
  
  if (role === ROLES.TEAM_LEADER) {
    return [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "My Team", icon: <Users {...commonIconProps} />, href: "teams" },
      { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
      { title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" },
      { title: "Requests", icon: <Inbox {...commonIconProps} />, href: "requests" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" }
    ];
  }
  
  // MEMBER fallback
  return [
    { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
    { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
    { title: "My Teams", icon: <Component {...commonIconProps} />, href: "teams" },
    { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
    { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
    { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
  ];
};

export default function MobileDashboardShell({ children }) {
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
              <View className="h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
                <Image 
                  source={require('../../../assets/images/logo-glow.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  Veagle <Text className="text-blue-500">Attendee</Text>
                </Text>
                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </Text>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => router.push('/org/settings')}
            className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
          >
            {user?.avatar || user?.profilePicture ? (
              <Image source={{ uri: user.avatar || user.profilePicture }} style={{ width: 26, height: 26, borderRadius: 13 }} />
            ) : (
              <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {user?.firstName?.charAt(0) || user?.name?.charAt(0) || "U"}
                </Text>
              </View>
            )}
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {user?.firstName || user?.name || "Profile"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Renders the current tab's content */}
      {children || <Slot />}

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
                  <Image 
                    source={require('../../../assets/images/logo-glow.png')}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                  />
                  <View>
                    <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Veagle <Text className="text-blue-500">Attendee</Text>
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
                  {getTabsForRole(user?.currentRole || user?.role).map((tab) => (
                    <Pressable
                      key={tab.title}
                      onPress={() => {
                        closeDrawer();
                        setTimeout(() => {
                          const activeRole = user?.currentRole || user?.role;
                          const normalizedRole = ROLE_ALIASES[activeRole?.toUpperCase()] || activeRole;
                          const basePath = DASHBOARD_ROOT_BY_ROLE[normalizedRole] || "/member";
                          router.push(`${basePath}/${tab.href}`);
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