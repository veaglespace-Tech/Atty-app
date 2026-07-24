import React, { useState } from "react";
import { View, Text, Modal, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, UploadCloud, Receipt } from "lucide-react-native";
import { API_BASE_URL } from "@/services/api/baseApi";
import { store } from "@/store";

export default function RaiseClaimModal({ visible, onClose, onSuccess }) {
  const [expenseType, setExpenseType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setExpenseType("");
    setDescription("");
    setAmount("");
    setReceiptFile(null);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleSubmit = async () => {
    if (!expenseType.trim() || !amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Error", "Please provide a valid expense type and amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = store.getState().auth.token;
      
      const formData = new FormData();
      formData.append("expenseType", expenseType.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      formData.append("amount", amount.trim());

      if (receiptFile) {
        // React Native FormData requires { uri, type, name } for files
        const uriParts = receiptFile.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append("receipt", {
          uri: Platform.OS === 'ios' ? receiptFile.uri.replace('file://', '') : receiptFile.uri,
          name: `receipt.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      const res = await fetch(`${API_BASE_URL}/claims/raise`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert("Success", "Claim raised successfully.");
        resetForm();
        onSuccess(); // Refresh list and close
      } else {
        Alert.alert("Error", data.message || "Failed to raise claim.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "A network error occurred while raising the claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 shadow-2xl h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl items-center justify-center">
                <Receipt size={20} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">Raise Claim</Text>
            </View>
            <Pressable 
              onPress={() => { resetForm(); onClose(); }} 
              className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center active:scale-95 transition-transform"
            >
              <X size={20} className="text-slate-500 dark:text-slate-400" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Title */}
            <View className="mb-5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-2">Expense Type / Title</Text>
              <TextInput
                value={expenseType}
                onChangeText={setExpenseType}
                placeholder="e.g. Travel, Office Supplies"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Amount */}
            <View className="mb-5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-2">Amount (₹)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Description */}
            <View className="mb-5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-2">Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Additional details about the expense"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 min-h-[100px] text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Receipt Upload */}
            <View className="mb-6">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-2">Upload Receipt (Optional)</Text>
              <Pressable 
                onPress={pickImage}
                className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
              >
                {receiptFile ? (
                  <View className="items-center">
                    <Image source={{ uri: receiptFile.uri }} className="w-24 h-24 rounded-xl mb-3 border border-slate-200" />
                    <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">Change Receipt</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <View className="h-12 w-12 bg-white dark:bg-slate-800 rounded-full items-center justify-center mb-3 shadow-sm border border-slate-100 dark:border-slate-700">
                      <UploadCloud size={24} className="text-slate-400" />
                    </View>
                    <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Tap to upload receipt</Text>
                    <Text className="text-[10px] text-slate-500 mt-1">JPG, PNG (Max 5MB)</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`flex-row items-center justify-center py-4 rounded-2xl bg-blue-600 dark:bg-blue-500 active:scale-95 transition-transform ${isSubmitting ? 'opacity-70' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="font-bold text-white text-base">Submit Claim</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
