import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AlertCircle, Calendar, X } from "lucide-react-native";
import AppDatePicker from "@/components/ui/AppDatePicker";

export default function RegularizationModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate past 1-29 days range
  const { minDate, maxDate, minDateKey, maxDateKey } = useMemo(() => {
    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const past29 = new Date(today);
    past29.setDate(past29.getDate() - 29);

    const formatYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return {
      minDate: past29,
      maxDate: yesterday,
      minDateKey: formatYmd(past29),
      maxDateKey: formatYmd(yesterday),
    };
  }, []);

  if (!open) return null;

  const handleSubmit = () => {
    if (!date || !reason.trim()) return;
    if (date > maxDateKey || date < minDateKey) return;
    onSubmit({ date, reason: reason.trim() });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDate("");
      setReason("");
      setShowDatePicker(false);
      onClose();
    }
  };

  const formattedDisplayDate = () => {
    if (!date) return "";
    const parts = date.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
    }
    return date;
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-4">
        <View className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0b132b] p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <Text className="text-lg font-black text-slate-900 dark:text-white">
              Request Regularization
            </Text>
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95"
            >
              <X size={16} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Info Banner */}
          <View className="mb-4 flex-row items-start gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/30 p-3">
            <AlertCircle
              size={16}
              color="#3b82f6"
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-xs font-medium text-blue-900 dark:text-blue-200 leading-relaxed">
              Use this form to request regularization for past dates (up to 29 days
              ago). Current day and future dates cannot be regularized.
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Date Input */}
            <View>
              <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                Date of Issue <Text className="text-red-500">* (Past 1-29 days only)</Text>
              </Text>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-3 active:border-blue-500"
              >
                <Text
                  className={`text-xs font-medium ${
                    date
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {date ? formattedDisplayDate() : "dd-mm-yyyy"}
                </Text>
                <Calendar size={16} color="#94a3b8" />
              </Pressable>
            </View>

            {/* Reason Textarea */}
            <View className="mt-3">
              <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
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
                className="min-h-[85px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </View>

            {/* Submit Button */}
            <View className="mt-4 pt-1">
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !date || !reason.trim()}
                className={`w-full py-3.5 rounded-xl items-center justify-center flex-row active:scale-98 ${
                  isSubmitting || !date || !reason.trim()
                    ? "bg-blue-600/50"
                    : "bg-blue-600 shadow-md shadow-blue-600/20"
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-bold text-xs text-white">
                    Submit Request
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      <AppDatePicker
        visible={showDatePicker}
        value={date || maxDateKey}
        minimumDate={minDate}
        maximumDate={maxDate}
        title="Select Issue Date"
        onConfirm={(selectedDateKey) => {
          setDate(selectedDateKey);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Modal>
  );
}
