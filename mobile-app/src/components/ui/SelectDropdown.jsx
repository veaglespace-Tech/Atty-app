import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

const SelectDropdown = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  
  return (
    <View className="w-full">
      <Pressable 
        onPress={() => setOpen(true)} 
        className="flex-row items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl active:bg-slate-100 dark:active:bg-slate-800/80"
      >
        <Text className="text-sm font-semibold text-slate-900 dark:text-white mr-2" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <ChevronDown size={16} className="text-slate-400" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-t-[32px] pt-4 pb-8 max-h-[80%] border-t border-slate-200 dark:border-slate-800">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white px-6 mb-4">{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  className={`px-5 py-4 mb-2 rounded-2xl flex-row items-center justify-between ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/50' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800'}`}
                >
                  <Text className={`text-[15px] font-bold ${value === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default SelectDropdown;
