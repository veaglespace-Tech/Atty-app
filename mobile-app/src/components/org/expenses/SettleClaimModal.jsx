import React, { useState, useEffect } from "react";
import { View, Text, Modal, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, CheckCircle, UploadCloud, FileText, Search } from "lucide-react-native";
import { store } from "@/store";
import { API_BASE_URL } from "@/services/api/baseApi";

export default function SettleClaimModal({ visible, onClose, onSuccess, claims = [] }) {
  const [claimNo, setClaimNo] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setClaimNo("");
    setSelectedClaim(null);
    setAmountPaid("");
    setReceiptFile(null);
  };

  const handleSearch = () => {
    const claim = claims.find(c => c.claimNo === claimNo && c.status === "PENDING");
    if (claim) {
      setSelectedClaim(claim);
      setAmountPaid(String(claim.amount));
    } else {
      Alert.alert("Not Found", "No pending claim found with this number.");
      setSelectedClaim(null);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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

  const handleSubmit = async (status) => {
    if (!selectedClaim) return;
    if (status === 'APPROVED' && (!amountPaid.trim() || isNaN(Number(amountPaid)))) {
      Alert.alert("Error", "Please provide a valid settlement amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = store.getState().auth.token;
      
      const formData = new FormData();
      formData.append("claimId", selectedClaim.id);
      formData.append("status", status);
      
      if (status === 'APPROVED') {
        formData.append("amountPaid", amountPaid.trim());
      }

      if (receiptFile && status === 'APPROVED') {
        const uriParts = receiptFile.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append("receipt", {
          uri: Platform.OS === 'ios' ? receiptFile.uri.replace('file://', '') : receiptFile.uri,
          name: `receipt.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      const res = await fetch(`${API_BASE_URL}/org/expenses/settle-claim`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert("Success", `Claim ${status.toLowerCase()} successfully.`);
        resetForm();
        onSuccess();
      } else {
        Alert.alert("Error", data.message || `Failed to ${status.toLowerCase()} claim.`);
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
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 shadow-2xl h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                <CheckCircle size={20} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Settle Claim</Text>
                <Text className="text-xs text-slate-500">Approve or reject employee claim</Text>
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
            <View className="space-y-5">
              {!selectedClaim ? (
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                    Search Claim No.
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                    <TextInput
                      placeholder="E.g. CLM-12345"
                      placeholderTextColor="#94a3b8"
                      value={claimNo}
                      onChangeText={setClaimNo}
                      className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                    />
                    <Pressable onPress={handleSearch} className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg ml-2">
                      <Search size={16} className="text-blue-600 dark:text-blue-400" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-slate-500 text-xs font-bold">CLAIM NO</Text>
                      <Text className="text-slate-900 dark:text-white font-bold">{selectedClaim.claimNo}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-slate-500 text-xs font-bold">TYPE</Text>
                      <Text className="text-slate-900 dark:text-white font-bold">{selectedClaim.expenseType}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-xs font-bold">REQUESTED AMOUNT</Text>
                      <Text className="text-blue-600 dark:text-blue-400 font-black">₹{selectedClaim.amount}</Text>
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                      Settlement Amount (₹)
                    </Text>
                    <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-14">
                      <TextInput
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                        keyboardType="numeric"
                        className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
                      Payment Receipt (Optional)
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
                </>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          {selectedClaim && (
            <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 pb-8 flex-row gap-3">
              <Pressable
                onPress={() => handleSubmit('REJECTED')}
                disabled={isSubmitting}
                className="flex-1 h-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30 active:bg-rose-200"
              >
                <Text className="text-rose-600 dark:text-rose-400 font-bold text-base tracking-wide">Reject</Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleSubmit('APPROVED')}
                disabled={isSubmitting}
                className={`flex-1 h-14 items-center justify-center rounded-2xl ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'} shadow-sm shadow-blue-200 dark:shadow-none`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base tracking-wide">Approve</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
