import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Users, CalendarCheck2, Inbox, Settings } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import { useAuthSession } from "@/hooks/useAuthSession";
import { hasPermission, PERMISSIONS } from "@/utils/roles";

export default function TeamLeaderLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthSession();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: isDark ? 'rgba(2, 6, 23, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderTopColor: 'transparent',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          borderRadius: 32,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        }
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          href: hasPermission(user, PERMISSIONS.TEAM_VIEW) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <CalendarCheck2 size={24} color={color} />,
          href: hasPermission(user, PERMISSIONS.ATTENDANCE_VIEW) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <Inbox size={24} color={color} />,
          href: hasPermission(user, PERMISSIONS.USERS_STATUS_UPDATE) ? undefined : null,
        }}
      />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="posts" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="team/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications/[id]" options={{ href: null }} />
    </Tabs>
  );
}
