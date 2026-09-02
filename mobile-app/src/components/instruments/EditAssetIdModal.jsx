import React from "react";
import { View, Text, Pressable, Modal, TextInput, ActivityIndicator } from "react-native";
import { X } from "lucide-react-native";

export default function EditAssetIdModal({
  visible,
  onClose,
  editingAssignment,
  editingAssetId,
  setEditingAssetId,
  onSave,
  isUpdating,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Asset ID
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#64748b" />
            </Pressable>
          </View>

          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Editing ID for{" "}
            <Text className="font-bold text-slate-800 dark:text-slate-200">
              {editingAssignment?.userName}
            </Text>{" "}
            ({editingAssignment?.instName})
          </Text>

          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instrument ID / Number
            </Text>
            <TextInput
              placeholder="e.g. 001, G-12"
              placeholderTextColor="#94a3b8"
              value={editingAssetId}
              onChangeText={setEditingAssetId}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
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
              onPress={onSave}
              disabled={isUpdating}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center justify-center active:scale-95"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-xs font-bold text-white">Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
