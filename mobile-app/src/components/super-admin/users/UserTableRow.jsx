import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatRoleLabel } from '@/utils/roles';
import { router } from 'expo-router';

const getStatusTone = (user) => {
  if (!(user.isActive || user.active)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
};

const UserTableRow = ({ user }) => {
  return (
    <View className="flex-row items-center px-4 py-3 mb-1 rounded-2xl border border-transparent dark:border-transparent">
      <View className="w-48 pr-4">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
        <Text className="text-xs font-semibold text-slate-500 mt-0.5" numberOfLines={1}>{user.email}</Text>
      </View>
      
      <View className="w-28 pr-2">
        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatRoleLabel(user.role) || "-"}</Text>
      </View>
      
      <View className="w-48 pr-4">
        {user.organization ? (
          <>
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>{user.organization.name}</Text>
            <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">{user.organization.organizationCode}</Text>
          </>
        ) : (
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">-</Text>
        )}
      </View>
      
      <View className="w-24">
        <View className={`self-start px-2 py-1 rounded-lg border ${getStatusTone(user)}`}>
          <Text className="text-[9px] font-black uppercase tracking-widest">
            {(user.isActive || user.active) ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>
      
      <View className="flex-1 items-end pr-2">
        <Pressable 
          onPress={() => router.push(`/super-admin/users/${user.id}`)}
          className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 active:bg-slate-200"
        >
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Open Detail</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default React.memo(UserTableRow);
