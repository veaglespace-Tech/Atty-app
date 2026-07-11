import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Briefcase, CalendarCheck2, Users, CreditCard } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

export default function OrgLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarStyle: {
          backgroundColor: isDark ? '#020617' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
          elevation: 0,
          shadowOpacity: 0,
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
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <CalendarCheck2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Subscription',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
        }}
      />
      <Tabs.Screen name="workspace" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="registration-requests" options={{ href: null }} />
      <Tabs.Screen name="posts" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="my-attendance" options={{ href: null }} />
    </Tabs>
  );
}
