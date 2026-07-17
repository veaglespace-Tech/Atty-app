import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { formatRoleLabel } from "@/utils/roles";

const OrgUserTableRow = ({ user }) => {
  return (
    <Pressable
      onPress={() => router.push(`/org/user/${user.id}`)}
      className="p-5 bg-white dark:bg-[#0f172a] active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
            {user.name || "Unknown"}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${
          user.active
            ? "bg-emerald-100 dark:bg-emerald-500/10"
            : "bg-slate-200 dark:bg-slate-800"
        }`}>
          <Text className={`text-[10px] font-black uppercase tracking-widest ${
            user.active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-400"
          }`}>
            {user.active ? "Active" : "Blocked"}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-4">
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Mobile
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>
            {user.mobile ? `${user.mobileCountryCode} ${user.mobile}` : "-"}
          </Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Role
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>
            {formatRoleLabel(user.role)}
          </Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Status
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200" numberOfLines={1}>
            {user.approvalStatus}
          </Text>
        </View>
        <View className="w-[45%]">
          <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Profile
          </Text>
          <Text className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400" numberOfLines={1}>
            Open details →
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default memo(OrgUserTableRow);
