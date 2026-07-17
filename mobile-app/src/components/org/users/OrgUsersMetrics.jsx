import React, { memo } from "react";
import { View, Text } from "react-native";

const OrgUsersMetrics = ({ summaryMap }) => {
  return (
    <View className="flex-row flex-wrap px-4 pt-4 gap-3">
      {[
        { label: "Total", value: summaryMap.get("Total Users") || 0 },
        { label: "Approved", value: summaryMap.get("Approved") || 0 },
        { label: "Pending", value: summaryMap.get("Pending") || 0 },
        { label: "Active", value: summaryMap.get("Active") || 0 },
      ].map((metric) => (
        <View key={metric.label} className="w-[47%] bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {metric.label}
          </Text>
          <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default memo(OrgUsersMetrics);
