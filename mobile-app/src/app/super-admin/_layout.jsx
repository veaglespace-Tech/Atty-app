import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Building2, Users, CreditCard, Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function SuperAdminLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
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
        name="organizations"
        options={{
          title: 'Orgs',
          tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users/index"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
      <Tabs.Screen name="access" options={{ href: null }} />
      <Tabs.Screen name="organization/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment/[id]" options={{ href: null }} />
      <Tabs.Screen name="referrals/index" options={{ href: null }} />
      <Tabs.Screen name="referrals/[id]" options={{ href: null }} />
      <Tabs.Screen name="users/[id]" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="attendance/index" options={{ href: null }} />
      <Tabs.Screen name="attendance/member/[id]" options={{ href: null }} />
      <Tabs.Screen name="backup" options={{ href: null }} />
      <Tabs.Screen name="contacts/index" options={{ href: null }} />
      <Tabs.Screen name="contacts/[id]" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="leads" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/[id]" options={{ href: null }} />
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="plans/[id]" options={{ href: null }} />
      <Tabs.Screen name="posts" options={{ href: null }} />
      <Tabs.Screen name="referrals" options={{ href: null }} />
      <Tabs.Screen name="roles" options={{ href: null }} />
    </Tabs>
    </MobileDashboardShell>
  );
}
