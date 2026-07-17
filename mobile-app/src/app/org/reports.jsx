import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, FileBarChart, FileText, Download, FileBox, FileArchive, Search, X } from "lucide-react-native";
import { useGetOrgReportsQuery, useGetOrgAttendanceQuery, useDownloadOrgReportPdfMutation, useDownloadOrgReportExcelMutation } from "@/services/api/orgApi";
import { formatHoursValue } from "@/utils/time";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, ActivityIndicator } from "react-native";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export default function OrgReportsPage() {
  const [period, setPeriod] = useState("monthly");
  
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);

  const queryString = period === "custom" ? `period=custom&from=${customFrom}&to=${customTo}` : `period=${period}`;

  const { data, isLoading, isFetching, refetch } = useGetOrgReportsQuery(queryString);
  const [downloadPdf, { isLoading: downloadingPdf }] = useDownloadOrgReportPdfMutation();
  const [downloadExcel, { isLoading: downloadingExcel }] = useDownloadOrgReportExcelMutation();
  
  const [selectedMember, setSelectedMember] = useState(null);
  
  const { data: attendanceData, isLoading: attendanceLoading } = useGetOrgAttendanceQuery("limit=2000", {
    skip: !selectedMember,
  });

  const filteredMemberLogs = useMemo(() => {
    if (!selectedMember || !attendanceData?.items) return [];
    return attendanceData.items.filter(
      (log) => log.userId === selectedMember.id || log.member === selectedMember.member
    );
  }, [selectedMember, attendanceData]);


  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = Array.isArray(data?.summary) ? data.summary : [];
  const meta = data?.meta || {};

  const summaryMap = useMemo(() => {
    const map = new Map();
    for (const item of summary) {
      if (item?.label) map.set(item.label, item.value);
    }
    return map;
  }, [summary]);

  if (selectedMember) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
          <Pressable onPress={() => setSelectedMember(null)} className="flex-row items-center gap-2 mb-4 self-start">
            <ChevronLeft size={20} className="text-slate-500" />
            <Text className="text-sm font-bold text-slate-500">Back to Reports</Text>
          </Pressable>
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{selectedMember.member}</Text>
          <Text className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">{selectedMember.role || "Member"} • History</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
            <MetricCard label="Present Days" value={selectedMember.presentDays} />
            <MetricCard label="Half Days" value={selectedMember.halfDays} />
            <MetricCard label="Absent Days" value={selectedMember.absentDays} />
            <MetricCard label="Worked Hrs" value={formatHoursValue(selectedMember.workedHours)} />
          </View>

          <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Daily Attendance Logs</Text>
          
          {attendanceLoading ? (
             <View className="py-12 items-center justify-center">
               <ActivityIndicator size="large" color="#2563eb" />
             </View>
          ) : filteredMemberLogs.length === 0 ? (
            <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <FileText size={32} className="text-slate-300 dark:text-slate-700 mb-4" />
              <Text className="text-slate-500 font-medium">No records found for this period.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredMemberLogs.map((log) => (
                <View key={log.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{log.date}</Text>
                    <View className="px-2 py-1 rounded-full border bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{log.status}</Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                     <View>
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">In</Text>
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{log.punchInAt ? new Date(log.punchInAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                     </View>
                     <View>
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Out</Text>
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{log.punchOutAt ? new Date(log.punchOutAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</Text>
                     </View>
                     <View className="items-end">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Hrs</Text>
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formatHoursValue(log.workedHours ?? log.workedMinutes, { fromMinutes: log.workedHours == null })}</Text>
                     </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Reports</Text>
        </View>

        <View className="flex-row gap-2">
          <Pressable 
            onPress={async () => {
              try {
                const blob = await downloadPdf(queryString).unwrap();
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result.split(',')[1];
                    const filename = `report-${period}.pdf`;
                    const uri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Success", "PDF downloaded successfully.");
                    }
                  } catch (e) {
                    Alert.alert("Error", "Failed to save PDF to device.");
                  }
                };
                reader.readAsDataURL(blob);
              } catch (e) { Alert.alert("Error", "Failed to download PDF"); }
            }}
            disabled={downloadingPdf || downloadingExcel}
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 flex-row items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 dark:border-slate-700"
          >
            {downloadingPdf ? <ActivityIndicator size="small" color="#475569" /> : <FileBox size={16} className="text-slate-600 dark:text-slate-400" />}
            <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Export PDF</Text>
          </Pressable>
          <Pressable 
            onPress={async () => {
              try {
                const blob = await downloadExcel(queryString).unwrap();
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result.split(',')[1];
                    const filename = `report-${period}.xlsx`;
                    const uri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Success", "Excel downloaded successfully.");
                    }
                  } catch (e) {
                    Alert.alert("Error", "Failed to save Excel to device.");
                  }
                };
                reader.readAsDataURL(blob);
              } catch (e) { Alert.alert("Error", "Failed to download Excel"); }
            }}
            disabled={downloadingPdf || downloadingExcel}
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 flex-row items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 dark:border-slate-700"
          >
            {downloadingExcel ? <ActivityIndicator size="small" color="#475569" /> : <FileArchive size={16} className="text-slate-600 dark:text-slate-400" />}
            <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Export Excel</Text>
          </Pressable>
        </View>

        {/* Period Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-5 -mx-5 px-5"
          contentContainerStyle={{ gap: 8, paddingRight: 40 }}>
          {PERIODS.map((p) => {
            const isActive = p.value === period;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPeriod(p.value)}
                className={`px-4 py-2.5 rounded-full border ${
                  isActive 
                    ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20" 
                    : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                }`}>
                <Text className={`text-[13px] font-bold tracking-wide ${
                  isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
                }`}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {period === "custom" && (
          <View className="mt-4 flex-row gap-4">
             <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">From</Text>
                <TextInput value={customFrom} onChangeText={setCustomFrom} placeholder="YYYY-MM-DD" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
             </View>
             <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">To</Text>
                <TextInput value={customTo} onChangeText={setCustomTo} placeholder="YYYY-MM-DD" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white" />
             </View>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
          <MetricCard label="Members" value={summaryMap.get("Members") || 0} />
          <MetricCard label="Present Days" value={summaryMap.get("Present Days") || 0} />
          <MetricCard label="Absent Days" value={summaryMap.get("Absent Days") || 0} />
          <MetricCard label="Worked Hrs" value={formatHoursValue(summaryMap.get("Worked Hrs") || 0)} />
        </View>

        <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
          Member Records
        </Text>

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : items.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-2">
            <FileBarChart size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No report data found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {items.map((item) => (
              <ReportRecordCard key={item.id || item.member} item={item} onPress={() => setSelectedMember(item)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value }) {
  return (
    <View className="w-[48%] bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</Text>
      <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function ReportRecordCard({ item, onPress }) {
  return (
    <Pressable onPress={onPress} className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm active:scale-[0.98] transition-transform">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{item.member}</Text>
          <Text className="text-xs font-semibold text-slate-500 mt-0.5">{item.role || "Member"}</Text>
        </View>
        <View className="px-2 py-1 rounded-full border bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <Text className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400">Details &gt;</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3 gap-y-3">
        <View className="w-1/2">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Present</Text>
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.presentDays}</Text>
        </View>
        <View className="w-1/2">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Absent</Text>
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.absentDays}</Text>
        </View>
        <View className="w-1/2">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Half Day</Text>
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.halfDays}</Text>
        </View>
        <View className="w-1/2">
          <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Worked Hrs</Text>
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatHoursValue(item.workedHours)}</Text>
        </View>
      </View>
    </Pressable>
  );
}