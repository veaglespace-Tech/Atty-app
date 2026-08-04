import React, { useState } from "react";
import { View, Text, Modal, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { X, ArrowDownCircle } from "lucide-react-native";
import { useAddOrgDepositMutation } from "@/services/api/orgApi";

export default function DepositModal({ visible, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [addDeposit, { isLoading }] = useAddOrgDepositMutation();

  const resetForm = () => {
    setAmount("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Error", "Please provide a valid deposit amount.");
      return;
    }

    try {
      const res = await addDeposit({
        amount: Number(amount),
        description: description.trim()
      }).unwrap();

      if (res.success) {
        Alert.alert("Success", "Fund deposited successfully.");
        resetForm();
        onSuccess();
      } else {
        Alert.alert("Error", res.message || "Failed to deposit fund.");
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
              <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                <ArrowDownCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Deposit Fund</Text>
                <Text className="text-xs text-slate-500">Add funds to the organization</Text>
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
                  Amount (₹)
                </Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                  <TextInput
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                  Description
                </Text>
                <View className="flex-row bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 min-h-[100px]">
                  <TextInput
                    placeholder="Enter description (optional)"
                    placeholderTextColor="#94a3b8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
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
              className={`h-14 items-center justify-center rounded-2xl ${isLoading ? 'bg-emerald-400' : 'bg-emerald-600 active:bg-emerald-700'} shadow-sm shadow-emerald-200 dark:shadow-none`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">Deposit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
