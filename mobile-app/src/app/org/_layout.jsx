import React from 'react';
import { Tabs } from 'expo-router';
import { Home, CalendarCheck2, Users, Settings } from 'lucide-react-native';
import { useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthSession } from "@/hooks/useAuthSession";
import { hasPermission, PERMISSIONS, ROLES } from "@/utils/roles";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function OrgLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthSession();
  const insets = useSafeAreaInsets();
  
  const role = user?.currentRole || user?.role;
  const isAdmin = role === ROLES.ORG_ADMIN;

  return (
    <MobileDashboardShell>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#94a3b8',
          safeAreaInsets: { bottom: 0 },
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#090d16',
            borderTopColor: '#1e293b',
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            elevation: 20,
            boxShadow: '0px -10px 20px rgba(0,0,0,0.3)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: Platform.OS === 'ios' ? (insets.bottom > 0 ? 54 + insets.bottom : 62) : 62,
            paddingBottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom - 4 : 8) : 8,
            paddingTop: 8,
            maxWidth: 768,
            alignSelf: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: 'bold',
            marginBottom: 6,
          }
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ color }) => <CalendarCheck2 size={24} color={color} />,
            href: isAdmin || hasPermission(user, PERMISSIONS.ATTENDANCE.VIEW_ALL) ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
            href: isAdmin || hasPermission(user, PERMISSIONS.USERS.CREATE) ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />

        <Tabs.Screen name="attendance/[logId]" options={{ href: null }} />
        <Tabs.Screen name="contact-support" options={{ href: null }} />
        <Tabs.Screen name="department/[id]" options={{ href: null }} />
        <Tabs.Screen name="departments" options={{ href: null }} />
        <Tabs.Screen name="expenses" options={{ href: null }} />
        <Tabs.Screen name="expenses/[id]" options={{ href: null }} />
        <Tabs.Screen name="instruments" options={{ href: null }} />
        <Tabs.Screen name="my-attendance" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="notifications/[id]" options={{ href: null }} />
        <Tabs.Screen name="posts" options={{ href: null }} />
        <Tabs.Screen name="registration-requests" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="settings/personal" options={{ href: null }} />
        <Tabs.Screen name="settings/security" options={{ href: null }} />
        <Tabs.Screen name="settings/workspace" options={{ href: null }} />
        <Tabs.Screen name="teams/[id]" options={{ href: null }} />
        <Tabs.Screen name="teams" options={{ href: null }} />
        <Tabs.Screen name="users/[id]" options={{ href: null }} />
        <Tabs.Screen name="workspace" options={{ href: null }} />
      </Tabs>
    </MobileDashboardShell>
  );
}
