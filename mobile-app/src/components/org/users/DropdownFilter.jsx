import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { ChevronDown } from "lucide-react-native";

export default function DropdownFilter({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  
  return (
    <>
      <Pressable 
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 min-w-[140px] flex-1">
        <Text className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mr-2" numberOfLines={1}>{selectedLabel}</Text>
        <ChevronDown size={14} className="text-slate-400" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="bg-white dark:bg-[#0f172a] rounded-t-[32px] p-6 border-t border-slate-200 dark:border-slate-800 shadow-2xl pb-10">
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-4" />
              <Text className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{label}</Text>
            </View>
            
            <View className="gap-2">
              {options.map((opt) => (
                <Pressable 
                  key={opt.value} 
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  className={`px-5 py-4 rounded-2xl flex-row items-center justify-between ${value === opt.value ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800'}`}
                >
                  <Text className={`text-base font-bold ${value === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</Text>
                  {value === opt.value && <View className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
