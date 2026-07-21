import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Database, Download, Users, Building2, CalendarDays, CreditCard, FileJson, ShieldCheck, HardDrive, AlertTriangle } from "lucide-react-native";
import { useDownloadDatabaseBackupMutation } from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

const TABLE_INFO = [
  { icon: Users, label: "Users", desc: "All registered user accounts" },
  { icon: Building2, label: "Organizations", desc: "Org profiles & settings" },
  { icon: CalendarDays, label: "Attendance", desc: "Full attendance logs" },
  { icon: CreditCard, label: "Payments & Subscriptions", desc: "All billing records" },
  { icon: FileJson, label: "Plans, Posts, Contacts", desc: "Platform content & plans" },
  { icon: ShieldCheck, label: "Permissions & Roles", desc: "RBAC role-permission matrix" },
  { icon: HardDrive, label: "Archive & Misc", desc: "Archive data, settings, tokens" },
];

export default function BackupPage() {
  const [downloadBackup, { isLoading }] = useDownloadDatabaseBackupMutation();

  const handleBackup = async () => {
    try {
      const blob = await downloadBackup().unwrap();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `db-backup-${timestamp}.zip`;
      
      await downloadAndShareBlob(blob, filename);
    } catch (error) {
      console.error("Backup error:", error);
      Alert.alert("Error", error?.data?.message || "Failed to generate backup. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20 flex-row items-center">
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="mr-1 py-1">
                <ChevronLeft size={12} className="text-blue-500" />
              </Pressable>
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Database</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Database Backup</Text>
          </View>        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        {/* Left/Top Block: What's included */}
        <View className="bg-white dark:bg-[#151E2F] rounded-[32px] border border-slate-200 dark:border-[#1E293B] p-6 mb-6 shadow-sm">
          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
            What's included in the backup          </Text>
          <View className="flex-row flex-wrap gap-3">
            {TABLE_INFO.map(({ icon: Icon, label, desc }) => (
              <View key={label} className="w-full flex-row items-start gap-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 p-4">
                <View className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{label}</Text>
                  <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 flex-row items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 text-amber-600 dark:text-amber-400" />
            <Text className="flex-1 text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-300">
              A comprehensive database backup contains all critical system data, including user records, attendance logs, settings, and organizations. The backup contains sensitive data including hashed passwords, emails, and financial records. Store the file securely and do not share it.
            </Text>
          </View>
        </View>

        {/* Right/Bottom Block: Generate button card */}
        <View className="bg-white dark:bg-[#151E2F] rounded-[32px] border border-slate-200 dark:border-[#1E293B] p-6 shadow-sm z-0 relative overflow-hidden">
          <View className="absolute inset-0 bg-blue-50 dark:bg-blue-900/5 opacity-50 z-0" />
          <View className="relative z-10 flex-col items-center">
            <View className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-600 shadow-sm mb-4">
              <Database size={28} className="text-white" />
            </View>
            
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-1">Generate Backup</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center mb-8">
              All {TABLE_INFO.length} table categories · JSON format · ZIP compressed
            </Text>

            <Pressable 
              onPress={handleBackup}
              disabled={isLoading}
              className="w-full bg-blue-600 active:bg-blue-700 py-4 px-6 rounded-2xl flex-row items-center justify-center shadow-sm mb-6"
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" className="mr-3" />
                  <Text className="text-sm font-bold text-white">Generating backup...</Text>
                </>
              ) : (
                <>
                  <Download size={18} className="text-white mr-3" />
                  <Text className="text-sm font-bold text-white">Generate & Download Backup</Text>
                </>
              )}
            </Pressable>

            <View className="w-full">
              {[
                ["Format", "ZIP archive (.zip)"],
                ["Contents", "JSON files per table + manifest"],
                ["Compression", "Maximum (level 9)"],
                ["Access", "Super Admin only"],
              ].map(([key, val], idx) => (
                <View key={key} className={`flex-row items-center justify-between py-3 ${idx !== 3 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{key}</Text>
                  <Text className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-300 flex-shrink ml-4" numberOfLines={2}>{val}</Text>
                </View>
              ))}
            </View>
          </View>        </View>

      </ScrollView>
    </View>
  );
}