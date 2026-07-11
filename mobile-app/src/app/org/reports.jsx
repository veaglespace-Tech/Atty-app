import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, TextInput, Platform, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, FileText, Download, Calendar, X, FileBox, FileBarChart, Users, CheckCircle2, XCircle, Timer, Loader2 } from "lucide-react-native";
import { useGetOrgReportsQuery, useGetOrgAttendanceQuery, useDownloadOrgReportPdfMutation, useDownloadOrgReportExcelMutation } from "@/services/api/orgApi";
import { useSelector } from "react-redux";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from "expo-sharing";

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const todayKey = () => new Date().toISOString().split('T')[0];
const daysAgoKey = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const formatHoursValue = (val) => {
  if (val == null) return "0";
  return typeof val === "number" ? val.toFixed(2) : String(val);
};

export default function OrgReportsPage() {
  const authUser = useSelector((state) => state.auth.user);
  
  const [period, setPeriod] = useState("monthly");
  const [customRange, setCustomRange] = useState({ from: daysAgoKey(30), to: todayKey() });
  
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      if (customRange.from) params.set("from", customRange.from);
      if (customRange.to) params.set("to", customRange.to);
    }
    return params.toString();
  }, [period, customRange]);

  const { data, isLoading, isFetching, refetch, error } = useGetOrgReportsQuery(queryString, {
    skip: period === "custom" && (!customRange.from || !customRange.to),
  });

  const { data: memberAttendanceData, isLoading: isLoadingMemberAttendance } = useGetOrgAttendanceQuery("limit=2000", {
    skip: !selectedMember,
  });

  const [downloadPdf, { isLoading: isDownloadingPdf }] = useDownloadOrgReportPdfMutation();
  const [downloadExcel, { isLoading: isDownloadingExcel }] = useDownloadOrgReportExcelMutation();

  const reports = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(() => data?.summary || [], [data]);
  const meta = data?.meta || {};

  const summaryMap = useMemo(() => {
    const map = new Map();
    summary.forEach(item => {
      if (item?.label) map.set(item.label, item.value);
    });
    return map;
  }, [summary]);

  const memberLogs = useMemo(() => {
    if (!selectedMember || !memberAttendanceData?.items) return [];
    return memberAttendanceData.items.filter(
      (log) => log.userId === selectedMember.id || log.member === selectedMember.member
    );
  }, [selectedMember, memberAttendanceData]);

  const handleDownload = async (format) => {
    setShowDownloadModal(false);
    const mutation = format === 'pdf' ? downloadPdf : downloadExcel;
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const uti = format === 'pdf' ? 'com.adobe.pdf' : 'com.microsoft.excel.xls';

    try {
      const blob = await mutation(queryString).unwrap();
      const filename = `attendance_report_${period}_${todayKey()}.${ext}`;

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Success", "Report downloaded successfully.");
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          try {
            const base64data = reader.result.split(',')[1];
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, { UTI: uti, mimeType });
            } else {
              Alert.alert("Success", `Report saved to ${filename}`);
            }
          } catch (e) {
            Alert.alert("Error", "Failed to save file.");
          }
        };
      }
    } catch (err) {
      Alert.alert("Error", err?.data?.message || `Failed to download ${format.toUpperCase()}`);
    }
  };

  const isFreePlan = authUser?.organization?.plan?.code === "FREE_7D_TRIAL" || authUser?.organization?.planCode === "FREE_7D_TRIAL";
  const canDownload = Boolean(meta?.canDownload) && !isFreePlan;
  
  if (selectedMember) {
    const rangeText = period === 'custom' ? `${customRange.from} to ${customRange.to}` : (
        period === 'monthly' ? "THIS MONTH" :
        period === 'weekly' ? "THIS WEEK" : "TODAY"
    );

    return (
      <View className="flex-1 bg-[#0B1120]">
        <View className="px-5 pt-12 pb-4 bg-[#0B1120] z-20">
          <View className="bg-[#0f172a] rounded-[24px] p-5 border border-[#1e293b] flex-row items-center justify-between mb-4">
            <Pressable onPress={() => setSelectedMember(null)} className="flex-row items-center gap-1 border border-[#334155] px-3 py-1.5 rounded-full bg-[#1e293b] active:bg-[#334155]">
              <ChevronLeft size={14} className="text-slate-300" />
              <Text className="text-xs font-bold text-slate-300">Back to Reports</Text>
            </Pressable>
            <View className="items-end">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Selected Range</Text>
              <Text className="text-[10px] font-bold text-slate-300">{rangeText}</Text>
            </View>
          </View>
          
          <View className="px-2">
            <Text className="text-xl font-black tracking-tight text-white uppercase">{selectedMember.member}</Text>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMember.role || "Member"} • ATTENDANCE HISTORY</Text>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="-mx-4 mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Present Days</Text>
                <Text className="text-3xl font-black text-white">{selectedMember.presentDays}</Text>
              </View>
              <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Half Days</Text>
                <Text className="text-3xl font-black text-white">{selectedMember.halfDays}</Text>
              </View>
              <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Absent Days</Text>
                <Text className="text-3xl font-black text-white">{selectedMember.absentDays}</Text>
              </View>
              <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Total Worked Hrs</Text>
                <Text className="text-3xl font-black text-white">{formatHoursValue(selectedMember.workedHours)}</Text>
              </View>
            </ScrollView>
          </View>

          <View className="bg-[#0f172a] rounded-[24px] border border-[#1e293b] overflow-hidden mb-6">
            <View className="p-5 border-b border-[#1e293b]">
              <Text className="text-xs font-black uppercase tracking-widest text-white">Daily Attendance Logs ({memberLogs.length} Entries)</Text>
            </View>

            {isLoadingMemberAttendance ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : memberLogs.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Text className="text-sm font-medium text-slate-500">No logs found.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="min-w-[650px] px-5 pb-5">
                  <View className="flex-row items-center border-b border-[#1e293b] py-4">
                    <Text className="w-24 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</Text>
                    <Text className="w-28 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</Text>
                    <Text className="w-24 text-[9px] font-black uppercase tracking-widest text-slate-400">Punch In</Text>
                    <Text className="w-24 text-[9px] font-black uppercase tracking-widest text-slate-400">Punch Out</Text>
                    <Text className="w-28 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Worked Hrs</Text>
                    <Text className="w-20 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Geo Valid</Text>
                  </View>
                  
                  {memberLogs.map((log) => (
                    <View key={log.id} className="flex-row items-center border-b border-[#1e293b]/50 py-4">
                      <Text className="w-24 text-xs font-bold text-slate-300">{log.date}</Text>
                      <View className="w-28">
                        <View className={`self-start px-3 py-1 rounded-full border ${log.status === 'PRESENT' || log.status === 'HALF_DAY' ? 'border-blue-500/30 bg-blue-900/20' : 'border-slate-500/30 bg-slate-800'}`}>
                          <Text className={`text-[9px] font-black uppercase tracking-widest ${log.status === 'PRESENT' || log.status === 'HALF_DAY' ? 'text-blue-400' : 'text-slate-400'}`}>{log.status}</Text>
                        </View>
                      </View>
                      <Text className="w-24 text-xs font-bold text-slate-300">{log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                      <Text className="w-24 text-xs font-bold text-slate-300">{log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                      <Text className="w-28 text-xs font-bold text-slate-300 text-right">{formatHoursValue(log.workedHours ?? log.workedMinutes)} hrs</Text>
                      <Text className="w-20 text-xs font-bold text-slate-300 text-center">
                        {log.status === 'ABSENT' ? 'No' : (log.isLocationValid === false ? 'No' : 'Yes')}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Reports</Text>
          <Pressable 
            onPress={() => canDownload ? setShowDownloadModal(true) : Alert.alert("Locked", "Download is only available on paid plans.")} 
            className={`h-10 w-10 items-center justify-center rounded-full ${canDownload ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800 opacity-50'}`}
          >
            <Download size={20} className={canDownload ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
          </Pressable>
        </View>

        <Pressable 
          onPress={() => setShowPeriodModal(true)}
          className="flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-xl"
        >
          <View className="flex-row items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {period === 'custom' ? `${customRange.from} to ${customRange.to}` : PERIOD_OPTIONS.find(p => p.value === period)?.label}
            </Text>
          </View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change</Text>
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="-mx-4 mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Members</Text>
              <Text className="text-3xl font-black text-white">{summaryMap.get("Members") || 0}</Text>
            </View>
            <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Present</Text>
              <Text className="text-3xl font-black text-white">{summaryMap.get("Present Days") || 0}</Text>
            </View>
            <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Absent</Text>
              <Text className="text-3xl font-black text-white">{summaryMap.get("Absent Days") || 0}</Text>
            </View>
            <View className="w-[150px] bg-[#0f172a] p-5 rounded-[16px] border border-[#1e293b]">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Worked Hrs</Text>
              <Text className="text-3xl font-black text-white">{formatHoursValue(summaryMap.get("Worked Hrs"))}</Text>
            </View>
          </ScrollView>
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Member Reports ({reports.length})</Text>

        {isLoading && reports.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : reports.length === 0 ? (
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <FileText size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium text-center px-4">No report data found for the selected period.</Text>
          </View>
        ) : (
          <View className="space-y-3 pb-12">
            {reports.map((report) => (
              <Pressable 
                key={report.id} 
                onPress={() => setSelectedMember(report)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
              >
                <View className="flex-row justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <View>
                    <Text className="text-base font-black text-slate-900 dark:text-white">{report.member}</Text>
                    <Text className="text-xs font-bold text-slate-500 mt-0.5">{report.role || "-"}</Text>
                  </View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-blue-500">View Logs</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pre</Text>
                    <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{report.presentDays}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Abs</Text>
                    <Text className="text-sm font-bold text-rose-600 dark:text-rose-400">{report.absentDays}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Half</Text>
                    <Text className="text-sm font-bold text-amber-600 dark:text-amber-400">{report.halfDays}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Hrs</Text>
                    <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatHoursValue(report.workedHours)}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Period Modal */}
      <Modal visible={showPeriodModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">Select Period</Text>
              <Pressable onPress={() => setShowPeriodModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <View className="space-y-3">
              {PERIOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setPeriod(opt.value);
                    if (opt.value !== 'custom') setShowPeriodModal(false);
                  }}
                  className={`p-4 rounded-xl border ${period === opt.value ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                >
                  <Text className={`font-bold ${period === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {period === 'custom' && (
              <View className="mt-6 flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">From</Text>
                  <TextInput
                    value={customRange.from}
                    onChangeText={(t) => setCustomRange(p => ({ ...p, from: t }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">To</Text>
                  <TextInput
                    value={customRange.to}
                    onChangeText={(t) => setCustomRange(p => ({ ...p, to: t }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </View>
              </View>
            )}

            {period === 'custom' && (
              <Pressable 
                onPress={() => setShowPeriodModal(false)}
                className="mt-6 bg-blue-600 p-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold">Apply Range</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Download Modal */}
      <Modal visible={showDownloadModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">Download Report</Text>
              <Pressable onPress={() => setShowDownloadModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <View className="space-y-4">
              <Pressable 
                onPress={() => handleDownload('pdf')}
                disabled={isDownloadingPdf || isDownloadingExcel}
                className="flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <View className="flex-row items-center gap-3">
                  <FileText className="text-blue-500" size={24} />
                  <Text className="font-bold text-slate-700 dark:text-slate-200">Export as PDF</Text>
                </View>
                {isDownloadingPdf && <ActivityIndicator color="#3b82f6" />}
              </Pressable>

              <Pressable 
                onPress={() => handleDownload('excel')}
                disabled={isDownloadingPdf || isDownloadingExcel}
                className="flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <View className="flex-row items-center gap-3">
                  <FileBox className="text-emerald-500" size={24} />
                  <Text className="font-bold text-slate-700 dark:text-slate-200">Export as Excel</Text>
                </View>
                {isDownloadingExcel && <ActivityIndicator color="#10b981" />}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <View className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-2 mb-2">
        {icon}
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Text>
      </View>
      <Text className="text-xl font-black text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}