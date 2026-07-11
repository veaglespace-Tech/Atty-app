import React, { useState, useRef } from "react";
import { View, Text, Pressable, Modal, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, Image } from "react-native";
import { router, Link, Slot, usePathname } from "expo-router";
import { LogOut, Menu, X, ChevronRight, User, Users, Component, ClipboardCheck, CalendarCheck2, FileBarChart, CreditCard, MessageSquare, Bell, BarChart3, Building2, Book, Gift, Database, Inbox, Settings, Shield } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { useColorScheme } from "nativewind";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";
<<<<<<< HEAD
import { ROLES, DASHBOARD_ROOT_BY_ROLE, ROLE_ALIASES, PERMISSIONS, hasPermission } from "@/utils/roles";
import AnimatedLogo from '../AnimatedLogo.jsx';
=======
import { ROLES, DASHBOARD_ROOT_BY_ROLE } from "@/utils/roles";

>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85; // Slightly wider drawer 

<<<<<<< HEAD
const getTabsForRole = (user) => {
  if (!user) return [];
  const role = ROLE_ALIASES[(user.currentRole || user.role)?.toUpperCase()] || (user.currentRole || user.role);
=======
import { BarChart3, Building2, Book, Gift, Database, Inbox, Settings } from "lucide-react-native";

const getTabsForRole = (role) => {
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
  const commonIconProps = { size: 18, color: "#2563eb" };
  
  if (role === ROLES.SUPER_ADMIN) {
    return [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "Organizations", icon: <Building2 {...commonIconProps} />, href: "organizations" },
<<<<<<< HEAD
      { title: "Leads", icon: <Users {...commonIconProps} />, href: "leads" },
      { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
      { title: "Users", icon: <Users {...commonIconProps} />, href: "users" },
      { title: "Contacts", icon: <Users {...commonIconProps} />, href: "contacts" },
      { title: "Referrals", icon: <Users {...commonIconProps} />, href: "referrals" },
      { title: "Plans", icon: <Book {...commonIconProps} />, href: "plans" },
      { title: "Access", icon: <Shield {...commonIconProps} />, href: "access" },
      { title: "Roles", icon: <Shield {...commonIconProps} />, href: "roles" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
      { title: "Payments", icon: <CreditCard {...commonIconProps} />, href: "payments" },
      { title: "Coupons", icon: <Gift {...commonIconProps} />, href: "coupons" },
      { title: "Analytics", icon: <FileBarChart {...commonIconProps} />, href: "analytics" },
      { title: "Backup", icon: <Database {...commonIconProps} />, href: "backup" }
=======
      { title: "Users", icon: <Users {...commonIconProps} />, href: "users" },
      { title: "Plans", icon: <Book {...commonIconProps} />, href: "plans" },
      { title: "Payments", icon: <CreditCard {...commonIconProps} />, href: "payments" },
      { title: "Coupons", icon: <Gift {...commonIconProps} />, href: "coupons" },
      { title: "Analytics", icon: <FileBarChart {...commonIconProps} />, href: "analytics" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Leads", icon: <Users {...commonIconProps} />, href: "leads" },
      { title: "Contacts", icon: <Users {...commonIconProps} />, href: "contacts" },
      { title: "Backup", icon: <Database {...commonIconProps} />, href: "backup" },
      { title: "Referrals", icon: <Users {...commonIconProps} />, href: "referrals" },
      { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
    ];
  }
  
  if (role === ROLES.ORG_ADMIN || role === ROLES.SUB_ADMIN) {
<<<<<<< HEAD
    const tabs = [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "my-attendance" }
    ];
    if (hasPermission(user, PERMISSIONS.USERS_STATUS_UPDATE)) {
      tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
      tabs.push({ title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "registration-requests" });
    }
    if (hasPermission(user, PERMISSIONS.USERS_CREATE)) {
      tabs.push({ title: "Users", icon: <Users {...commonIconProps} />, href: "users" });
    }
    if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
      tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
    }
    if (hasPermission(user, PERMISSIONS.ATTENDANCE_VIEW)) {
      tabs.push({ title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" });
    }
    if (hasPermission(user, PERMISSIONS.POST_CREATE)) {
      tabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
    }
    if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
      tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
    }
    if (hasPermission(user, PERMISSIONS.SUBSCRIPTION_VIEW)) {
      tabs.push({ title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" });
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
    if (hasPermission(user, PERMISSIONS.SUBSCRIPTION_VIEW)) {
      tabs.push({ title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" });
    }
    tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
    return tabs;
  }
  
  // MEMBER fallback
  const tabs = [
    { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
    { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" }
  ];
  if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
    tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
  }
  if (hasPermission(user, PERMISSIONS.POST_CREATE)) {
    tabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
  }
  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
  }
  tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
  
  return tabs;
=======
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
    { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
  ];
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
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
        <View className="flex-row items-center justify-between px-4 pt-3 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={openDrawer}
              className="h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm active:scale-95 transition-transform">
              <Menu size={22} color={isDark ? "#ffffff" : "#0f172a"} />
            </Pressable>
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
<<<<<<< HEAD
                <AnimatedLogo 
                  className="w-full h-full" 
                />
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  Veagle
                </Text>
                <Text className="text-lg font-black text-blue-500 leading-tight tracking-tight">
                  Attendee
=======
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
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
                </Text>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => router.push('/org/settings')}
<<<<<<< HEAD
            className="flex-row items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
=======
            className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
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
<<<<<<< HEAD
=======
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {user?.firstName || user?.name || "Profile"}
            </Text>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
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
<<<<<<< HEAD
                  <AnimatedLogo 
                    style={{ width: 36, height: 36 }}
                  />
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Veagle
=======
                  <Image 
                    source={require('../../../assets/images/logo-glow.png')}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                  />
                  <View>
                    <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Veagle <Text className="text-blue-500">Attendee</Text>
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
                    </Text>
                    <Text className="text-2xl font-black text-blue-500 tracking-tight">
                      Attendee
                    </Text>
                  </View>
                </View>
                <Pressable 
                  onPress={closeDrawer}
                  className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <X size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-3">
                  Navigation
                </Text>
                
                <View className="gap-y-1">
<<<<<<< HEAD
                  {getTabsForRole(user).map((tab) => (
=======
                  {getTabsForRole(user?.role).map((tab) => (
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
                    <Pressable
                      key={tab.title}
                      onPress={() => {
                        closeDrawer();
                        setTimeout(() => {
<<<<<<< HEAD
                          const activeRole = user?.currentRole || user?.role;
                          const normalizedRole = ROLE_ALIASES[activeRole?.toUpperCase()] || activeRole;
                          const basePath = DASHBOARD_ROOT_BY_ROLE[normalizedRole] || "/member";
                          router.push(`${basePath}/${tab.href}`);
=======
                          const basePath = DASHBOARD_ROOT_BY_ROLE[user?.role] || "/member";
                          router.replace(`${basePath}/${tab.href}`);
>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
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