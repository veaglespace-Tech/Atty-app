import React, { memo, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInUp } from 'react-native-reanimated';
import { formatRoleLabel } from "@/utils/roles";
import { getFullImageUrl } from "@/components/dashboard/MobileDashboardShell";

const OrgUserTableRow = ({ user, index = 0 }) => {
  const [avatarError, setAvatarError] = useState(false);
  const profileUrl = getFullImageUrl(user.profileImageUrl);

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 50).springify()}>
      <Pressable
        onPress={() => router.push(`/org/users/${user.id}`)}
        className="p-5 bg-white dark:bg-slate-900 mb-3 mx-4 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800/80 active:scale-[0.98] transition-all">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-3.5 flex-1">
            {profileUrl && !avatarError ? (
              <Image
                source={{ uri: profileUrl }}
                style={{ width: 46, height: 46, borderRadius: 23 }}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View className="w-[46px] h-[46px] rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center border border-blue-100 dark:border-blue-800/40 shadow-sm">
                <Text className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {user.name || "Unknown"}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1" numberOfLines={1}>
                {user.email}
              </Text>
            </View>
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
    </Animated.View>
  );
};

export default memo(OrgUserTableRow);
