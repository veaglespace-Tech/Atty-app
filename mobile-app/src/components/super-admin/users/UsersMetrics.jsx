import React from 'react';
import { View, Text } from 'react-native';

const UsersMetrics = ({ totalUsers, activeUsersCount, superAdminsCount }) => {
  return (
    <View className="flex-row gap-3 mb-6">
      <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total Users</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalUsers}</Text>
      </View>
      <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Active Users</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activeUsersCount}</Text>
      </View>
      <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Super Admins</Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{superAdminsCount}</Text>
      </View>
    </View>
  );
};

export default React.memo(UsersMetrics);
