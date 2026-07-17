import { View, Text, ScrollView } from "react-native";

export default function AdminDashboard() {
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-[#020617]" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Dashboard</Text>
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Your Veagle Attendee workspace is ready on mobile.</Text>
      </View>
    </ScrollView>
  );
}