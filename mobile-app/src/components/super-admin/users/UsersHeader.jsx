import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { RefreshCcw, Download } from 'lucide-react-native';

const UsersHeader = ({ loading, downloadingExcel, usersLength, totalItems, refetch, handleDownload }) => {
  return (
    <View className="mb-6 flex-row items-start justify-between">
      <View className="flex-1 pr-4">
        <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20">
          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Platform Directory</Text>
        </View>
        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Users</Text>
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">View all users across the entire platform. Open a user's detail page to manage their profile and permissions.</Text>
      </View>
      
      <View className="items-end gap-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={refetch} disabled={loading} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <RefreshCcw size={14} className="text-slate-600 dark:text-slate-300" />}
          </Pressable>
          <Pressable 
            onPress={handleDownload} 
            disabled={downloadingExcel || usersLength === 0}
            className={`h-9 px-3 flex-row items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${(downloadingExcel || usersLength === 0) ? 'opacity-50' : ''}`}
          >
            {downloadingExcel ? <ActivityIndicator size="small" color="#64748b" className="mr-1" /> : <Download size={14} className="text-slate-600 dark:text-slate-300 mr-1" />}
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Export Excel</Text>
          </Pressable>
        </View>
        
        <View className="items-end mr-1 mt-1">
          <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Live View</Text>
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{totalItems} of {usersLength} visible.</Text>
        </View>
      </View>
    </View>
  );
};

export default React.memo(UsersHeader);
