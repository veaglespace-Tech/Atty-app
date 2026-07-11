import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Database, Download, FileJson, FileSpreadsheet } from "lucide-react-native";
import { useDownloadDatabaseBackupMutation } from "@/services/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function BackupPage() {
  const [downloadBackup, { isLoading: isExporting }] = useDownloadDatabaseBackupMutation();
  const [activeFormat, setActiveFormat] = useState(null);

  const handleDownload = (format) => {
    Alert.alert(
      "Download Backup",
      `Generating a full database backup in ${format.toUpperCase()} format might take a few moments. We'll notify you when it's ready.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Start Backup", 
          onPress: async () => {
            setActiveFormat(format);
            try {
              const blob = await downloadBackup(format).unwrap();
              const dateStr = new Date().toISOString().split('T')[0];
              const ext = format === 'json' ? 'json' : 'xlsx';
              const filename = `veagle_attendee_backup_${dateStr}.${ext}`;

              if (Platform.OS === 'web') {
                downloadBlobFile(blob, filename);
                Alert.alert("Success", "Backup downloaded successfully!");
              } else {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result.split(',')[1];
                    const fileUri = `${FileSystem.documentDirectory}${filename}`;
                    
                    await FileSystem.writeAsStringAsync(fileUri, base64data, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(fileUri, { 
                        UTI: format === 'json' ? 'public.json' : 'com.microsoft.excel.xls',
                        mimeType: format === 'json' ? 'application/json' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                      });
                      Alert.alert("Success", "Backup generated and ready to be saved/shared.");
                    } else {
                      Alert.alert("Success", `Backup generated and saved to document directory as ${filename}. Sharing is not available on this device.`);
                    }
                  } catch (err) {
                    console.error("FileSystem error:", err);
                    Alert.alert("Error", "Failed to save the backup file locally.");
                  }
                };
              }
            } catch (error) {
              Alert.alert("Error", error?.data?.message || "Failed to download backup");
            } finally {
              setActiveFormat(null);
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Database Backup</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        <View className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 mb-6 items-center">
          <View className="h-20 w-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center mb-6">
            <Database size={40} className="text-indigo-500" />
          </View>
          
          <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">Manual Data Snapshot</Text>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-8 px-4">
            Generate and download a complete, point-in-time snapshot of all organizations, users, attendance, and payment records.
          </Text>

          <View className="w-full space-y-4">
            <Pressable 
              onPress={() => handleDownload('json')}
              disabled={isExporting}
              className={`p-4 rounded-xl flex-row items-center justify-between border ${activeFormat === 'json' ? 'bg-slate-50 border-slate-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700'}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                  <FileJson size={20} className="text-blue-500" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">JSON Export</Text>
                  <Text className="text-xs text-slate-500">Full structured database</Text>
                </View>
              </View>
              {activeFormat === 'json' ? <ActivityIndicator size="small" color="#2563eb" /> : <Download size={20} className="text-slate-400" />}
            </Pressable>

            <Pressable 
              onPress={() => handleDownload('excel')}
              disabled={isExporting}
              className={`p-4 rounded-xl flex-row items-center justify-between border ${activeFormat === 'excel' ? 'bg-slate-50 border-slate-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700'}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">Excel Summary</Text>
                  <Text className="text-xs text-slate-500">Spreadsheet formatted</Text>
                </View>
              </View>
              {activeFormat === 'excel' ? <ActivityIndicator size="small" color="#10b981" /> : <Download size={20} className="text-slate-400" />}
            </Pressable>
          </View>
        </View>

        <View className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30">
          <Text className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">Important Notice</Text>
          <Text className="text-xs text-amber-700 dark:text-amber-500 leading-5">
            Generating large backups on a mobile device may consume significant memory and data. For very large databases, we recommend using the web dashboard.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}