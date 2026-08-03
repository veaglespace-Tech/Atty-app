import React from "react";
import { Tabs } from "expo-router";
import { Home, CalendarCheck2, Users, Settings } from "lucide-react-native";
import { useColorScheme, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthSession } from "@/hooks/useAuthSession";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function MemberLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuthSession();

  const insets = useSafeAreaInsets();

  return (
    <MobileDashboardShell>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#090d16",
            borderTopColor: "#1e293b",
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            elevation: 20,
            boxShadow: "0px -10px 20px rgba(0,0,0,0.3)",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            height: 65 + (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 0),
            paddingBottom: 8 + (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 0),
            paddingTop: 8,
            maxWidth: 768,
            alignSelf: "center",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "bold",
            marginBottom: 6,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarIcon: ({ color }) => (
              <CalendarCheck2 size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="teams"
          options={{
            title: "Teams",
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
        <Tabs.Screen name="expenses" options={{ href: null }} />
        <Tabs.Screen name="expenses/[id]" options={{ href: null }} />
        <Tabs.Screen name="instruments" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="posts" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
      </Tabs>
    </MobileDashboardShell>
  );
}
