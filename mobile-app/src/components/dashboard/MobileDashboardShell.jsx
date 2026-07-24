import React, { useState, useRef } from "react";
import { View, Text, Pressable, Modal, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, Image, Platform } from "react-native";
import { router, Link, Slot, usePathname } from "expo-router";
import { LogOut, Menu, X, ChevronRight, User, Users, Component, ClipboardCheck, CalendarCheck2, FileBarChart, CreditCard, MessageSquare, Bell, BarChart3, Building2, Book, Gift, Database, Inbox, Settings, Shield } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { useColorScheme } from "nativewind";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";
import { ROLES, DASHBOARD_ROOT_BY_ROLE, ROLE_ALIASES, PERMISSIONS, hasPermission } from "@/utils/roles";
import AnimatedLogo from '../AnimatedLogo.jsx';
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85; // Slightly wider drawer 

const getTabsForRole = (user) => {
  if (!user) return [];
  const role = ROLE_ALIASES[(user.currentRole || user.role)?.toUpperCase()] || (user.currentRole || user.role);
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
      { title: "Access", icon: <Shield {...commonIconProps} />, href: "access" },
      { title: "Roles", icon: <Shield {...commonIconProps} />, href: "roles" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
      { title: "Analytics", icon: <FileBarChart {...commonIconProps} />, href: "analytics" },
      { title: "Backup", icon: <Database {...commonIconProps} />, href: "backup" }
    ];
  }
  
  if (role === ROLES.ORG_ADMIN || role === ROLES.SUB_ADMIN) {
    const tabs = [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "my-attendance" }
    ];
    
    const isAdmin = role === ROLES.ORG_ADMIN;

    if (isAdmin || hasPermission(user, PERMISSIONS.USERS_STATUS_UPDATE)) {
      tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
      tabs.push({ title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "registration-requests" });
    }
    if (isAdmin || hasPermission(user, PERMISSIONS.USERS_CREATE)) {
      tabs.push({ title: "Users", icon: <Users {...commonIconProps} />, href: "users" });
    }
    if (isAdmin || hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
      tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
    }
    if (isAdmin || hasPermission(user, PERMISSIONS.ATTENDANCE_VIEW)) {
      tabs.push({ title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" });
    }
    if (isAdmin || hasPermission(user, PERMISSIONS.POST_CREATE)) {
      tabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
    }
    if (isAdmin || hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
      tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
    }
    if (isAdmin) {
      tabs.push({ title: "Workspace", icon: <Building2 {...commonIconProps} />, href: "workspace" });
      tabs.push({ title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" });
    }
    return tabs;
  }
  
  if (role === ROLES.TEAM_LEADER) {
    const tabs = [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" }
    ];
    // We map TEAM_VIEW_OWN to TEAM_VIEW as per roles.js
    if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
      tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
    }
    tabs.push({ title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" });
    if (hasPermission(user, PERMISSIONS.USERS_VIEW)) {
      tabs.push({ title: "Users", icon: <Users {...commonIconProps} />, href: "users" });
    }
    if (hasPermission(user, PERMISSIONS.USERS_STATUS_UPDATE)) {
      tabs.push({ title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "requests" });
    }
    if (hasPermission(user, PERMISSIONS.POST_CREATE)) {
      tabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
    }
    if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
      tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
    }
    tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
    return tabs;
  }
  
  // MEMBER fallback
  const fallbackTabs = [
    { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
    { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" }
  ];
  if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
    fallbackTabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
  }
  if (hasPermission(user, PERMISSIONS.POST_CREATE)) {
    fallbackTabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
  }
  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    fallbackTabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
  }
  fallbackTabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
  
  return fallbackTabs;
};

export default function MobileDashboardShell({ children }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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
        <View className="flex-row items-center justify-between px-4 pt-3 pb-3 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 h-[64px]">
          {/* Left Side: Hamburger Menu */}
          <View className="flex-row items-center w-12 z-10">
            <Pressable
              onPress={openDrawer}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm active:scale-95 transition-transform">
              <Menu size={20} color={isDark ? "#ffffff" : "#0f172a"} />
            </Pressable>
          </View>
          
          {/* Center: Org Logo or Brand */}
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none" style={{ top: 0, bottom: 0, zIndex: 1 }}>
            {user?.organization?.logoUrl ? (
              <Image 
                source={{ uri: user.organization.logoUrl }} 
                style={{ height: 32, width: 120 }} 
                resizeMode="contain" 
              />
            ) : (
              <View className="flex-row items-center justify-center">
                <AnimatedLogo style={{ width: 28, height: 28, marginRight: 8 }} />
                <Text className="text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mr-1">
                  Veagle
                </Text>
                <Text className="text-xl font-black text-blue-500 leading-tight tracking-tight">
                  Attendee
                </Text>
              </View>
            )}
          </View>

          {/* Right Side: Profile Info */}
          <Pressable
            onPress={() => router.push('/org/settings')}
            className="items-center justify-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform z-10 shadow-sm overflow-hidden"
          >
            {user?.profileImageUrl || user?.avatar || user?.profilePicture ? (
              <Image source={{ uri: user?.profileImageUrl || user?.avatar || user?.profilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text className="text-[15px] font-bold text-blue-600 dark:text-blue-400">
                {user?.firstName?.charAt(0) || user?.name?.charAt(0) || "U"}
              </Text>
            )}
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
              <View className="px-6 flex-row items-center justify-between mb-8 mt-2">
                <View className="flex-row items-center gap-3 flex-1">
                  <AnimatedLogo 
                    style={{ width: 34, height: 34 }}
                  />
                  <View className="flex-row items-center flex-1">
                    <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mr-1.5">
                      Veagle
                    </Text>
                    <Text 
                      className="text-2xl font-black text-blue-500 tracking-tight flex-shrink"
                      numberOfLines={1}
                    >
                      Attendee
                    </Text>
                  </View>
                </View>
                <Pressable 
                  onPress={closeDrawer}
                  className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ml-2 flex-shrink-0">
                  <X size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-3">
                  Navigation
                </Text>
                
                <View className="gap-y-1">
                  {getTabsForRole(user).map((tab) => (                    <Pressable
                      key={tab.title}
                      onPress={() => {
                        closeDrawer();
                        setTimeout(() => {
                          const activeRole = user?.currentRole || user?.role;
                          const normalizedRole = ROLE_ALIASES[activeRole?.toUpperCase()] || activeRole;
                          const basePath = DASHBOARD_ROOT_BY_ROLE[normalizedRole] || "/member";
                          router.push(`${basePath}/${tab.href}`);                        }, 200);
                      }}
                      className="flex-row items-center justify-between p-3 rounded-2xl active:bg-blue-50/80 dark:active:bg-slate-800/80 active:scale-95 transition-all">
                      <View className="flex-row items-center gap-4">
                        <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center">
                          {tab.icon}
                        </View>
                        <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-200">
                          {tab.title}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={isDark ? "#475569" : "#cbd5e1"} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View className="px-6 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <Pressable
                  onPress={onLogout}
                  className="flex-row items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 active:opacity-70">
                  <LogOut size={18} color={isDark ? "#fb7185" : "#e11d48"} />
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
