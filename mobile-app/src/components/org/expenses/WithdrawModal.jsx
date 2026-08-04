import React, { useState } from "react";
import { View, Text, Modal, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, ArrowUpCircle, UploadCloud, FileText } from "lucide-react-native";
import { useAddOrgWithdrawalMutation } from "@/services/api/orgApi";
import { store } from "@/store";
import { API_BASE_URL } from "@/services/api/baseApi";

export default function WithdrawModal({ visible, onClose, onSuccess }) {
  const [withdrawalType, setWithdrawalType] = useState("");
  const [items, setItems] = useState([{ name: "", amount: "" }]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setWithdrawalType("");
    setItems([{ name: "", amount: "" }]);
    setReceiptFile(null);
  };

  const addItem = () => setItems([...items, { name: "", amount: "" }]);
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
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
    if (!withdrawalType.trim()) {
      Alert.alert("Error", "Please provide a withdrawal type.");
      return;
    }

    const validItems = items.filter(item => item.name.trim() && item.amount && !isNaN(Number(item.amount)));
    if (validItems.length === 0) {
      Alert.alert("Error", "Please add at least one valid item with name and amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = store.getState().auth.token;
      
      const formData = new FormData();
      formData.append("type", withdrawalType.trim());
      formData.append("items", JSON.stringify(validItems));

      if (receiptFile) {
        const uriParts = receiptFile.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append("receipt", {
          uri: Platform.OS === 'ios' ? receiptFile.uri.replace('file://', '') : receiptFile.uri,
          name: `receipt.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      const res = await fetch(`${API_BASE_URL}/org/expenses/withdrawal`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert("Success", "Fund withdrawn successfully.");
        resetForm();
        onSuccess();
      } else {
        Alert.alert("Error", data.message || "Failed to withdraw fund.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "A network error occurred.");
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
              <View className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20">
                <ArrowUpCircle size={20} className="text-rose-600 dark:text-rose-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Withdraw Fund</Text>
                <Text className="text-xs text-slate-500">Record an expense</Text>
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
                  Withdrawal Type
                </Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                  <TextInput
                    placeholder="E.g. Office Supplies, Travel"
                    placeholderTextColor="#94a3b8"
                    value={withdrawalType}
                    onChangeText={setWithdrawalType}
                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                    Items
                  </Text>
                  <Pressable onPress={addItem}>
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      + Add Item
                    </Text>
                  </Pressable>
                </View>

                {items.map((item, index) => (
                  <View key={index} className="flex-row items-center gap-3 mb-3">
                    <View className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                      <TextInput
                        placeholder="Item name"
                        placeholderTextColor="#94a3b8"
                        value={item.name}
                        onChangeText={(val) => updateItem(index, 'name', val)}
                        className="flex-1 text-slate-900 dark:text-white font-medium"
                      />
                    </View>
                    <View className="w-28 flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                      <TextInput
                        placeholder="Amount"
                        placeholderTextColor="#94a3b8"
                        value={item.amount}
                        onChangeText={(val) => updateItem(index, 'amount', val)}
                        keyboardType="numeric"
                        className="flex-1 text-slate-900 dark:text-white font-medium"
                      />
                    </View>
                    {items.length > 1 && (
                      <Pressable onPress={() => removeItem(index)} className="p-2">
                        <X size={20} className="text-rose-500" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                  Receipt (Optional)
                </Text>
                
                <Pressable
                  onPress={pickImage}
                  className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  {receiptFile ? (
                    <View className="items-center">
                      <FileText size={32} className="text-blue-500 mb-2" />
                      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {receiptFile.fileName || 'Receipt attached'}
                      </Text>
                      <Text className="text-xs text-slate-500 mt-1">Tap to change</Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <UploadCloud size={32} className="text-slate-400 mb-2" />
                      <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Upload Receipt
                      </Text>
                      <Text className="text-xs text-slate-400 mt-1">
                        JPG, PNG (Max 5MB)
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 pb-8">
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`h-14 items-center justify-center rounded-2xl ${isSubmitting ? 'bg-rose-400' : 'bg-rose-600 active:bg-rose-700'} shadow-sm shadow-rose-200 dark:shadow-none`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">Withdraw Fund</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
