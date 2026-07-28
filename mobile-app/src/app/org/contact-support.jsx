import React from "react";
import { View, Text, Pressable } from "react-native";
import { ShieldAlert, LogOut, Mail, Phone } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "expo-router";

export default function ContactSupport() {
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/(auth)/login");
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-[#020617]">
      <View className="items-center bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <View className="h-20 w-20 bg-rose-100 dark:bg-rose-500/20 rounded-full items-center justify-center mb-6">
          <ShieldAlert size={40} className="text-rose-600 dark:text-rose-400" />
        </View>
        
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-3 text-center">
          Workspace Suspended
        </Text>
        
        <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center mb-8 leading-relaxed">
          Your workspace access is currently suspended. Please contact the system administrator to restore access and continue using the app.
        </Text>

        <View className="w-full space-y-4 mb-8">
          <View className="flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <View className="h-10 w-10 bg-blue-100 dark:bg-blue-500/20 rounded-full items-center justify-center">
              <Mail size={20} className="text-blue-600 dark:text-blue-400" />
            </View>
            <View>
              <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Email Support</Text>
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">support@veagle.com</Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mt-3">
            <View className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full items-center justify-center">
              <Phone size={20} className="text-emerald-600 dark:text-emerald-400" />
            </View>
            <View>
              <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Call Us</Text>
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">+91 99999 99999</Text>
            </View>
          </View>
        </View>

        <Pressable 
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 px-6 py-4 rounded-xl active:opacity-80 w-full"
        >
          <LogOut size={20} className="text-slate-600 dark:text-slate-400" />
          <Text className="text-slate-700 dark:text-slate-300 font-bold text-base">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
