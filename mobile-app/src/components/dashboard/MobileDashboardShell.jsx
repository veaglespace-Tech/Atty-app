import React, { useState, useEffect } from "react";
import { View, Text, Pressable, BackHandler, Dimensions, ScrollView, Image, Platform, useColorScheme as useRNColorScheme } from "react-native";
import { router, Link, Slot, usePathname } from "expo-router";
import { LogOut, Menu, X, ChevronRight, User, Users, Component, ClipboardCheck, CalendarCheck2, FileBarChart, CreditCard, MessageSquare, Bell, BarChart3, Building2, Book, Gift, Database, Inbox, Settings, Shield, ShieldAlert, Newspaper, Music } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { useColorScheme } from "nativewind";
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useGetOrgNotificationsQuery, useGetOrgRegistrationRequestsQuery } from "@/services/api/orgApi";

import { useAuthSession } from "@/hooks/useAuthSession";
import { logout } from "@/store/slices/authSlice";
import { ROLES, DASHBOARD_ROOT_BY_ROLE, ROLE_ALIASES, PERMISSIONS, hasPermission } from "@/utils/roles";
import { API_BASE_URL } from "@/services/api/baseApi";
import AnimatedLogo from '../AnimatedLogo.jsx';

const HeaderBadges = ({ user, isDark }) => {
  const role = user?.currentRole || user?.role;
  const rawRoot = DASHBOARD_ROOT_BY_ROLE[role] || "org";
  const cleanRoot = `/${rawRoot.replace(/^\//, '')}`;
  
  const canSeeRequests = user ? (hasPermission(user, PERMISSIONS.USERS.UPDATE_STATUS) || hasPermission(user, PERMISSIONS.USERS.CREATE)) : false;
  
  const { data: notificationsData } = useGetOrgNotificationsQuery(undefined, { skip: !user });
  const { data: regData } = useGetOrgRegistrationRequestsQuery(undefined, { skip: !canSeeRequests });

  if (!user) return null;

  const unreadCount = notificationsData?.notifications?.filter(n => !n.isRead)?.length || 0;
  const pendingRequestsCount = regData?.data?.filter(r => r.status === 'PENDING')?.length || 0;

  const reqPath = role === ROLES.TEAM_LEADER ? `/team-leader/requests` : `/org/registration-requests`;

  return (
    <View className="flex-row items-center mr-3" style={{ gap: 12 }}>
      {canSeeRequests && (
        <Pressable 
          onPress={() => router.push(reqPath)}
          className="relative items-center justify-center h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-transform"
        >
          <ClipboardCheck size={20} color={isDark ? "#ffffff" : "#0f172a"} />
          {pendingRequestsCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-amber-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white dark:border-slate-900">
              <Text className="text-white text-[9px] font-bold">{pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}</Text>
            </View>
          )}
        </Pressable>
      )}
      <Pressable 
        onPress={() => router.push(`${cleanRoot}/notifications`)}
        className="relative items-center justify-center h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-transform"
      >
        <Bell size={20} color={isDark ? "#ffffff" : "#0f172a"} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white dark:border-slate-900">
            <Text className="text-white text-[9px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export const getFullImageUrl = (url) => {
  if (!url) return null;
  const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '') : '';
  if (url.startsWith("http")) {
    if (url.includes("localhost:") || url.includes("127.0.0.1:")) {
      try {
        const urlObj = new URL(url);
        return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
      } catch (e) { return url; }
    }
    return url;
  }
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

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

  if (role === ROLES.ORG_ADMIN) {
    return [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "my-attendance" },
      { title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" },
      { title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "registration-requests" },
      { title: "Users", icon: <Users {...commonIconProps} />, href: "users" },
      { title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" },
      { title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
      { title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" },
      { title: "Instruments", icon: <Music {...commonIconProps} />, href: "instruments" },
      { title: "Departments", icon: <Building2 {...commonIconProps} />, href: "departments" },
      { title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" },
      { title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" },
      { title: "Funds & Expenses", icon: <CreditCard {...commonIconProps} />, href: "expenses" },
      { title: "Workspace", icon: <Building2 {...commonIconProps} />, href: "workspace" },
      { title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" }
    ];
  }
  
  if (role === ROLES.SUB_ADMIN) {
    const tabs = [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
      { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "my-attendance" },
    ];
    
    if (hasPermission(user, PERMISSIONS.USERS.UPDATE_STATUS)) {
      tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
      tabs.push({ title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "registration-requests" });
    }
    
    if (hasPermission(user, PERMISSIONS.USERS.CREATE)) {
      tabs.push({ title: "Users", icon: <Users {...commonIconProps} />, href: "users" });
    }
    
    if (hasPermission(user, PERMISSIONS.TEAM.VIEW_ALL)) {
      tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
    }
    
    if (hasPermission(user, PERMISSIONS.ATTENDANCE.VIEW_ALL)) {
      tabs.push({ title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" });
    }
    
    if (hasPermission(user, PERMISSIONS.POSTS.CREATE)) {
      tabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
    }
    
    if (hasPermission(user, PERMISSIONS.USERS.CREATE)) {
      tabs.push({ title: "Instruments", icon: <Music {...commonIconProps} />, href: "instruments" });
      tabs.push({ title: "Departments", icon: <Building2 {...commonIconProps} />, href: "departments" });
    }
    
    if (hasPermission(user, PERMISSIONS.REPORTS.VIEW)) {
      tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
    }
    
    if (hasPermission(user, PERMISSIONS.EXPENSES.MANAGE)) {
      tabs.push({ title: "Funds & Expenses", icon: <CreditCard {...commonIconProps} />, href: "expenses" });
    }
    
    if (hasPermission(user, PERMISSIONS.SUBSCRIPTION?.VIEW || "SUBSCRIPTION.VIEW")) {
      tabs.push({ title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" });
    }
    
    tabs.push({ title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" });
    
    return tabs;
  }
  
  if (role === ROLES.TEAM_LEADER) {
    const tabs = [
      { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
    ];
    if (hasPermission(user, PERMISSIONS.TEAM.VIEW_OWN) || hasPermission(user, PERMISSIONS.TEAM.VIEW_ALL)) {
      tabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
    }
    tabs.push({ title: "Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" });
    if (hasPermission(user, PERMISSIONS.USERS.VIEW) || hasPermission(user, PERMISSIONS.USERS.CREATE)) {
      tabs.push({ title: "Users", icon: <Users {...commonIconProps} />, href: "users" });
    }
    if (hasPermission(user, PERMISSIONS.USERS.UPDATE_STATUS)) {
      tabs.push({ title: "Requests", icon: <ClipboardCheck {...commonIconProps} />, href: "requests" });
    }
    if (hasPermission(user, PERMISSIONS.POSTS.CREATE)) {
      tabs.push({ title: "Posts", icon: <Newspaper {...commonIconProps} />, href: "posts" });
    }
    tabs.push({ title: "Instruments", icon: <Music {...commonIconProps} />, href: "instruments" });
    if (hasPermission(user, PERMISSIONS.REPORTS.VIEW)) {
      tabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
    }
    if (hasPermission(user, PERMISSIONS.SUBSCRIPTION?.VIEW || "SUBSCRIPTION.VIEW")) {
      tabs.push({ title: "Subscription", icon: <CreditCard {...commonIconProps} />, href: "subscription" });
    }
    if (hasPermission(user, PERMISSIONS.EXPENSES.MANAGE)) {
      tabs.push({ title: "Expenses & Claims", icon: <CreditCard {...commonIconProps} />, href: "expenses" });
    }
    tabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
    tabs.push({ title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" });
    
    return tabs;
  }
  
  // MEMBER / LIFE_MEMBER
  const memberTabs = [
    { title: "Dashboard", icon: <BarChart3 {...commonIconProps} />, href: "dashboard" },
    { title: "My Attendance", icon: <CalendarCheck2 {...commonIconProps} />, href: "attendance" },
  ];

  if (hasPermission(user, PERMISSIONS.TEAM.VIEW_ALL) || hasPermission(user, PERMISSIONS.TEAM.VIEW_OWN)) {
    memberTabs.push({ title: "Departments", icon: <Building2 {...commonIconProps} />, href: "departments" });
    memberTabs.push({ title: "Teams", icon: <Component {...commonIconProps} />, href: "teams" });
  }
  
  memberTabs.push({ title: "Instruments", icon: <Music {...commonIconProps} />, href: "instruments" });

  if (hasPermission(user, PERMISSIONS.POSTS.CREATE)) {
    memberTabs.push({ title: "Posts", icon: <MessageSquare {...commonIconProps} />, href: "posts" });
  }

  if (hasPermission(user, PERMISSIONS.EXPENSES.MANAGE)) {
    memberTabs.push({ title: "Expenses & Claims", icon: <CreditCard {...commonIconProps} />, href: "expenses" });
  }
  
  if (hasPermission(user, PERMISSIONS.REPORTS.VIEW)) {
    memberTabs.push({ title: "Reports", icon: <FileBarChart {...commonIconProps} />, href: "reports" });
  }
  
  memberTabs.push({ title: "Notifications", icon: <Bell {...commonIconProps} />, href: "notifications" });
  memberTabs.push({ title: "Settings", icon: <Settings {...commonIconProps} />, href: "settings" });
  
  return memberTabs;
};

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MobileDashboardShell({ children }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const rnColorScheme = useRNColorScheme();
  const isWebDark = Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const isDark = colorScheme === 'dark' || rnColorScheme === 'dark' || isWebDark;
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const pathname = usePathname();
  const isSettingsPage = Boolean(pathname?.endsWith("/settings"));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const { width: screenWidth } = Dimensions.get("window");
  const drawerWidth = Math.min(screenWidth * 0.75, 350);
  const slideAnim = useSharedValue(-drawerWidth);
  const fadeAnim = useSharedValue(0);

  const [avatarError, setAvatarError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const onLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  const openDrawer = () => {
    setIsDrawerVisible(true);
    setIsDrawerOpen(true);
    slideAnim.value = -drawerWidth;
    
    // Small delay to ensure state + layout is committed before animating
    requestAnimationFrame(() => {
      slideAnim.value = withTiming(0, { duration: 300 });
      fadeAnim.value = withTiming(1, { duration: 300 });
    });
  };

  const closeDrawer = () => {
    slideAnim.value = withTiming(-drawerWidth, { duration: 250 });
    fadeAnim.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setIsDrawerOpen)(false);
        runOnJS(setIsDrawerVisible)(false);
      }
    });
  };

  // Handle Android hardware back button to close drawer
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });
    return () => handler.remove();
  }, [isDrawerOpen]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const headerOrgLogoUrl = getFullImageUrl(user?.organization?.logoUrl);
  const headerProfileUrl = getFullImageUrl(user?.profileImageUrl || user?.avatar || user?.profilePicture);

  // Drawer content - shared between Modal (Android/web) and overlay (iOS)
  const drawerContent = (
    <View style={{ flex: 1 }}>
      {/* Backdrop */}
      <Pressable 
        onPress={closeDrawer} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
      >
        <Reanimated.View 
          style={[
            { 
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
            },
            backdropAnimatedStyle
          ]}
        />
      </Pressable>

      {/* Sliding Drawer */}
      <Reanimated.View
        style={[
          { 
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerWidth,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: isDark ? '#020617' : '#ffffff',
            zIndex: 10,
            elevation: 16,
          },
          drawerAnimatedStyle
        ]}
      >
        <View 
          style={{
            flex: 1,
            width: '100%',
            paddingTop: 8,
            paddingBottom: 16,
            backgroundColor: isDark ? '#020617' : '#ffffff',
            borderRightWidth: 1,
            borderRightColor: isDark ? '#1e293b' : '#e2e8f0'
          }}
        >
          <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <AnimatedLogo 
                style={{ width: 34, height: 34 }}
                animationType="2d"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text 
                  style={{ fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginRight: 6, color: isDark ? '#ffffff' : '#0f172a' }}
                >
                  Veagle
                </Text>
                <Text 
                  style={{ fontSize: 24, fontWeight: '900', letterSpacing: -0.5, color: '#3b82f6', flexShrink: 1 }}
                  numberOfLines={1}
                >
                  Attendee
                </Text>
              </View>
            </View>
            <Pressable 
              onPress={closeDrawer}
              style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, marginLeft: 8 }}
            >
              <X size={20} color={isDark ? "#94a3b8" : "#64748b"} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
            <Text 
              style={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, paddingHorizontal: 8, marginBottom: 12, color: isDark ? '#64748b' : '#94a3b8' }}
            >
              Navigation
            </Text>
            
            <View style={{ gap: 4 }}>
              {getTabsForRole(user).map((tab) => (
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
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View 
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: isDark ? '#1e293b' : '#e2e8f0'
                      }}
                    >
                      {tab.icon}
                    </View>
                    <Text 
                      style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}
                    >
                      {tab.title}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={isDark ? "#475569" : "#cbd5e1"} />
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View 
            style={{ paddingHorizontal: 24, paddingTop: 24, marginTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9' }}
          >
            <Pressable
              onPress={onLogout}
              style={{
                backgroundColor: isDark ? 'rgba(244, 63, 94, 0.1)' : '#fff1f2',
                borderColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6',
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                borderRadius: 16,
              }}
            >
              <LogOut size={18} color={isDark ? "#fb7185" : "#e11d48"} />
              <Text style={{ fontWeight: '700', color: isDark ? '#fb7185' : '#e11d48' }}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }} className="bg-slate-50 dark:bg-slate-950">
        
        {/* Global Header Bar with Menu Button */}
        {!isSettingsPage && (
          <View className="flex-row items-center justify-between px-4 pt-3 pb-3 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 h-[64px]">
            {/* Left Side: Hamburger Menu */}
            <View className="flex-row items-center w-12 z-10">
              <Pressable
                onPress={openDrawer}
                className="items-center justify-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform shadow-sm"
              >
                <Menu size={22} color={isDark ? "#94a3b8" : "#334155"} />
              </Pressable>
            </View>

            {/* Center: Logo + Org Name */}
            <View className="absolute inset-0 flex-row items-center justify-center" pointerEvents="none">
              <View className="flex-row items-center gap-2.5 max-w-[60%]" pointerEvents="none">
                {headerOrgLogoUrl && !logoError ? (
                  <Image 
                    source={{ uri: headerOrgLogoUrl }} 
                    style={{ width: 32, height: 32, borderRadius: 10 }}
                    resizeMode="cover"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <AnimatedLogo style={{ width: 32, height: 32 }} />
                )}
                <Text className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight" numberOfLines={1}>
                  {user?.organization?.name || "Dashboard"}
                </Text>
              </View>
            </View>

            {/* Right Side: Notifications + Profile */}
            <View className="flex-row items-center gap-2">
              <HeaderBadges user={user} isDark={isDark} />
              <Pressable
                onPress={() => {
                  const activeRole = user?.currentRole || user?.role;
                  const normalizedRole = ROLE_ALIASES[activeRole?.toUpperCase()] || activeRole;
                  const basePath = DASHBOARD_ROOT_BY_ROLE[normalizedRole] || "/member";
                  router.push(`${basePath}/settings`);
                }}
                className="items-center justify-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform shadow-sm overflow-hidden"
              >
                {headerProfileUrl && !avatarError ? (
                  <Image 
                    source={{ uri: headerProfileUrl }} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="cover" 
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text className="text-[15px] font-bold text-blue-600 dark:text-blue-400">
                    {user?.firstName?.charAt(0) || user?.name?.charAt(0) || "U"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Renders the current tab's content */}
        {children || <Slot />}
      </SafeAreaView>

      {/* Side Drawer - rendered OUTSIDE SafeAreaView to prevent iOS clipping */}
      {isDrawerVisible && (
        <View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 999,
          }}
          pointerEvents={isDrawerOpen ? 'auto' : 'none'}
        >
          {drawerContent}
        </View>
      )}
    </View>
  );
}
