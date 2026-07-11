import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, FileBarChart, FileText, Download, FileBox, FileArchive } from "lucide-react-native";
import { useGetOrgReportsQuery, useDownloadOrgReportPdfMutation, useDownloadOrgReportExcelMutation } from "@/services/api/orgApi";
import { formatHoursValue } from "@/utils/time";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function OrgReportsPage() {
  const [period, setPeriod] = useState("monthly");
  
  const { data, isLoading, isFetching, refetch } = useGetOrgReportsQuery(`period=${period}`);
  const [downloadPdf, { isLoading: downloadingPdf }] = useDownloadOrgReportPdfMutation();
  const [downloadExcel, { isLoading: downloadingExcel }] = useDownloadOrgReportExcelMutation();
  
  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = Array.isArray(data?.summary) ? data.summary : [];

  const summaryMap = useMemo(() => {
    const map = new Map();
    for (const item of summary) {
      if (item?.label) map.set(item.label, item.value);
    }
    return map;
  }, [summary]);

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
                const blob = await downloadPdf(`period=${period}`).unwrap();
                if (Platform.OS === 'web') {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `report-${period}.pdf`;
                  document.body.appendChild(a); a.click(); a.remove();
                } else {
                  ToastAndroid.show("PDF download simulated", ToastAndroid.SHORT);
                }
              } catch (e) {}
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
                const blob = await downloadExcel(`period=${period}`).unwrap();
                if (Platform.OS === 'web') {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `report-${period}.xlsx`;
                  document.body.appendChild(a); a.click(); a.remove();
                } else {
                  ToastAndroid.show("Excel download simulated", ToastAndroid.SHORT);
                }
              } catch (e) {}
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

        <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
          Member Records
        </Text>

        {items.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-2">
            <FileBarChart size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No report data found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {items.map((item) => (
              <ReportRecordCard key={item.id || item.member} item={item} />
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

function ReportRecordCard({ item }) {
  return (
    <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white">{item.member}</Text>
          <Text className="text-xs font-semibold text-slate-500 mt-0.5">{item.role || "Member"}</Text>
        </View>
        <View className="px-2 py-1 rounded-full border bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <Text className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400">Report</Text>
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
    </View>
  );
}