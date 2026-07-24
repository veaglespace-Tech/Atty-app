import React from 'react';
import { Tabs } from 'expo-router';
import { Home, CalendarCheck2, Users, Settings, CreditCard } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import { useAuthSession } from "@/hooks/useAuthSession";
import { hasPermission, PERMISSIONS } from "@/utils/roles";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function MemberLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthSession();

  return (
    <MobileDashboardShell>
      <Tabs
        backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? '#020617' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          elevation: 20,
          boxShadow: '0px -10px 20px rgba(0,0,0,0.1)',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          height: 70,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 4,
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
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <CalendarCheck2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          href: hasPermission(user, PERMISSIONS.TEAM.VIEW_OWN) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="instruments"
        options={{ href: null }}
      />
      <Tabs.Screen name="posts" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
    </MobileDashboardShell>
  );
}
