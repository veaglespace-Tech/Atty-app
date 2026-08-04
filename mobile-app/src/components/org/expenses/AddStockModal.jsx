import React, { useState } from "react";
import { View, Text, Modal, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { X, Package } from "lucide-react-native";
import { useAddOrgStockMutation } from "@/services/api/orgApi";

export default function AddStockModal({ visible, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [addStock, { isLoading }] = useAddOrgStockMutation();

  const resetForm = () => {
    setName("");
    setType("");
    setQuantity("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !type.trim() || !quantity.trim() || isNaN(Number(quantity))) {
      Alert.alert("Error", "Please fill all fields with valid data.");
      return;
    }

    try {
      const res = await addStock({
        name: name.trim(),
        type: type.trim(),
        quantity: Number(quantity)
      }).unwrap();

      if (res.success) {
        Alert.alert("Success", "Stock added successfully.");
        resetForm();
        onSuccess();
      } else {
        Alert.alert("Error", res.message || "Failed to add stock.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err?.data?.message || "A network error occurred.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 shadow-2xl h-[75%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                <Package size={20} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Add Stock</Text>
                <Text className="text-xs text-slate-500">Record new stock entry</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => { resetForm(); onClose(); }}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-90 transition-transform"
            >
              <X size={16} className="text-slate-500 dark:text-slate-400" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View className="space-y-5">
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                  Item Name
                </Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                  <TextInput
                    placeholder="E.g. Macbook Pro"
                    placeholderTextColor="#94a3b8"
                    value={name}
                    onChangeText={setName}
                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                  Item Type
                </Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                  <TextInput
                    placeholder="E.g. Electronics, Furniture"
                    placeholderTextColor="#94a3b8"
                    value={type}
                    onChangeText={setType}
                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                  Quantity
                </Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                  <TextInput
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 pb-8">
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              className={`h-14 items-center justify-center rounded-2xl ${isLoading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'} shadow-sm shadow-blue-200 dark:shadow-none`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">Add Stock</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
