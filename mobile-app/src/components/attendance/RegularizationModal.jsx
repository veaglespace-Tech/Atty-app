import React, { useState } from "react";
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator } from "react-native";
import { AlertCircle, X } from "lucide-react-native";
import Button from "@/components/ui/Button";








export default function RegularizationModal({ open, onClose, onSubmit, isSubmitting }) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!date || !reason.trim()) return;
    onSubmit({ date, reason });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDate("");
      setReason("");
      onClose();
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/50 px-4">
        <View className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95">
            
            <X size={16} className="text-slate-600 dark:text-slate-300" />
          </Pressable>

          <View className="pr-8 mb-4 mt-2">
            <Text className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              Request Regularization
            </Text>
          </View>

          <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <Text className="flex-1 text-[13px] font-medium text-blue-800 dark:text-blue-300 leading-snug">
              Use this form if you faced a technical issue and could not punch in/out. 
              Your request will be sent to the admin for approval.
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Date of Issue <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-900" />
              
            </View>
            
            <View>
              <Text className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Reason / Technical Issue <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                placeholder="Briefly explain the issue..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                className="min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-900" />
              
            </View>

            <View className="mt-2">
              <Button
                variant="primary"
                onPress={handleSubmit}
                disabled={isSubmitting || !date || !reason.trim()}
                className="w-full">
                
                {isSubmitting ?
                <ActivityIndicator size="small" color="white" /> :

                <Text className="font-bold text-white ml-2">Submit Request</Text>
                }
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>);

}
