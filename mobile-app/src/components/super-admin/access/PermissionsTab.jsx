import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { KeyRound, Edit2, Trash2 } from 'lucide-react-native';

export default function PermissionsTab({ 
  permissions, 
  totalItems,
  readOnlyFallback, 
  loading,
  onEdit, 
  onDelete 
}) {
  if (loading && permissions.length === 0) {
    return (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (permissions.length === 0) {
    return (
      <View className="py-12 items-center justify-center bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B]">
        <KeyRound size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
        <Text className="text-slate-500 font-medium text-center px-6">No permissions found in the system.</Text>
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] overflow-hidden mb-6">
      <View className="px-5 py-4 border-b border-slate-200 dark:border-[#1E293B]">
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">System Permissions ({totalItems !== undefined ? totalItems : permissions.length})</Text>
      </View>
      
      <View className="flex-col">
        {permissions.map((p, index) => (
          <View 
            key={p.id} 
            className={`px-5 py-4 flex-row items-center justify-between ${index !== permissions.length - 1 ? 'border-b border-slate-100 dark:border-[#1E293B]' : ''}`}
          >
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1">{p.key}</Text>
              <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">{p.name}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{p.description || "No description provided."}</Text>
            </View>
            
            {!readOnlyFallback && (
              <View className="flex-row gap-2">
                <Pressable onPress={() => onEdit(p)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Edit2 size={12} className="text-blue-500" />
                </Pressable>
                <Pressable onPress={() => onDelete(p.id)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Trash2 size={12} className="text-slate-400" />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
