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
    <View className="space-y-4 pb-12">
      {permissions.map((p) => (
        <View key={p.id} className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-black text-slate-900 dark:text-white">{p.name}</Text>
              <Text className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">{p.key}</Text>
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
        </View>
      ))}
    </View>
  );
}
