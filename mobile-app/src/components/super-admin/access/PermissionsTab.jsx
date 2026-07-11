import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { KeyRound, Edit, Trash2 } from 'lucide-react-native';

export default function PermissionsTab({ 
  permissions, 
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
      <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
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
                <Pressable onPress={() => onEdit(p)} className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30">
                  <Edit size={16} className="text-blue-600 dark:text-blue-400" />
                </Pressable>
                <Pressable onPress={() => onDelete(p.id)} className="p-2 rounded-full bg-rose-50 dark:bg-rose-900/30">
                  <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                </Pressable>
              </View>
            )}
          </View>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            {p.description || "No description provided."}
          </Text>
        </View>
      ))}
    </View>
  );
}
