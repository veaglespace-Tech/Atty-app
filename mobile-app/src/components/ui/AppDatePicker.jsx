import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Platform,
  useColorScheme,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDateKey } from '@/utils/date';

export default function AppDatePicker({
  visible,
  value,
  mode = 'date',
  maximumDate,
  minimumDate,
  title = 'Select Date',
  onConfirm,
  onCancel,
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const parseValueToDate = (val) => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    // Parse YYYY-MM-DD safely in local timezone
    if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const [tempDate, setTempDate] = useState(() => parseValueToDate(value));

  useEffect(() => {
    if (visible) {
      setTempDate(parseValueToDate(value));
    }
  }, [visible, value]);

  if (!visible) return null;

  // On Android, use native OS dialog
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={tempDate}
        mode={mode}
        display="default"
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onChange={(event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            const dateKey = getDateKey(selectedDate);
            onConfirm?.(dateKey, selectedDate);
          } else {
            onCancel?.();
          }
        }}
      />
    );
  }

  // On iOS, render modern bottom sheet modal with Done / Cancel toolbar
  const handleIosDone = () => {
    const dateKey = getDateKey(tempDate);
    onConfirm?.(dateKey, tempDate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onCancel} />
        
        <View className="bg-white dark:bg-[#0f172a] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Header Toolbar */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#1e293b]/60">
            <Pressable
              onPress={onCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="py-1 px-2 rounded-lg active:opacity-70"
            >
              <Text className="text-[15px] font-semibold text-slate-500 dark:text-slate-400">
                Cancel
              </Text>
            </Pressable>

            <Text className="text-[16px] font-bold text-slate-900 dark:text-white">
              {title}
            </Text>

            <Pressable
              onPress={handleIosDone}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="py-1 px-3 bg-blue-600 rounded-xl active:bg-blue-700"
            >
              <Text className="text-[15px] font-bold text-white">
                Done
              </Text>
            </Pressable>
          </View>

          {/* Date Picker Content */}
          <View className="py-4 items-center justify-center bg-white dark:bg-[#0f172a]">
            <DateTimePicker
              value={tempDate}
              mode={mode}
              display="spinner"
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={isDark ? '#ffffff' : '#0f172a'}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempDate(selectedDate);
                }
              }}
              style={{ height: 215, width: '100%' }}
            />
          </View>

          {/* Bottom safe area padding for iPhone */}
          <View style={{ height: Math.max(insets.bottom, 16) }} />
        </View>
      </View>
    </Modal>
  );
}
