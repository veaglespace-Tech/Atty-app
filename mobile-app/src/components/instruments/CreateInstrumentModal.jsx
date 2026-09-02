import React from "react";
import { View, Text, Pressable, Modal, TextInput, ActivityIndicator } from "react-native";
import { X } from "lucide-react-native";

export default function CreateInstrumentModal({
  visible,
  onClose,
  form,
  setForm,
  onSubmit,
  isCreating,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Create Instrument
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#64748b" />
            </Pressable>
          </View>

          <View className="mb-3">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instrument Name *
            </Text>
            <TextInput
              placeholder="e.g. Acoustic Guitar, MacBook Air"
              placeholderTextColor="#94a3b8"
              value={form.name}
              onChangeText={(t) => setForm((prev) => ({ ...prev, name: t }))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </View>

          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </Text>
            <TextInput
              placeholder="Details, model or department notes..."
              placeholderTextColor="#94a3b8"
              value={form.description}
              onChangeText={(t) => setForm((prev) => ({ ...prev, description: t }))}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: "top" }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white min-h-[70px]"
            />
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={isCreating}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center justify-center active:scale-95"
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-xs font-bold text-white">Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
