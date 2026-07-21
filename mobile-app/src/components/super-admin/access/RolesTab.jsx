import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Shield, CheckCircle2, XCircle } from 'lucide-react-native';

export default function RolesTab({ 
  roleMappings, 
  allPermissions, 
  readOnlyFallback, 
  onToggleRolePermission 
}) {
  return (
    <View className="space-y-6 pb-12">
      {roleMappings.map((rm) => (
        <View key={rm.role} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <View className="flex-row items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <View className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3">
              <Shield size={24} className="text-indigo-600 dark:text-indigo-400" />
            </View>
            <View>
              <Text className="text-lg font-black text-slate-900 dark:text-white">{rm.role}</Text>
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">{rm.permissions.length} Permissions</Text>
            </View>
          </View>

          <View className="space-y-3">
            {allPermissions.map((p) => {
              const isAssigned = rm.permissions.some((rp) => rp.id === p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onToggleRolePermission(rm.role, p.id, rm.permissions)}
                  disabled={readOnlyFallback}
                  className={`flex-row items-center justify-between rounded-[24px] border p-4 ${
                    isAssigned
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-900/20'
                      : 'border-slate-100 bg-slate-50/50 dark:border-[#1E293B] dark:bg-[#0A0F1C]'
                  } ${readOnlyFallback ? 'opacity-70' : ''}`}
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    {isAssigned ? (
                      <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={18} className="text-slate-300 dark:text-slate-700" />
                    )}
                    <Text className={`text-sm font-bold flex-1 ${isAssigned ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {p.name}
                    </Text>
                  </View>
                  <Text className={`text-[10px] font-mono uppercase tracking-widest ${isAssigned ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`}>
                    {p.key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
