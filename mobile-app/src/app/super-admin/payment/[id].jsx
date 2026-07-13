import React, { useState, useEffect } from "react";
import { 
  View, Text, Pressable, ScrollView, ActivityIndicator, Alert, 
  TextInput, Modal, KeyboardAvoidingView, Platform, TouchableOpacity 
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Save, Trash2, CreditCard, ChevronDown } from "lucide-react-native";
import { 
  useGetSuperAdminPaymentByIdQuery, 
  useUpdateSuperAdminPaymentMutation,
  useDeleteSuperAdminPaymentMutation
} from "@/services/api/superAdminApi";
import { SafeAreaView } from "react-native-safe-area-context";

const PAYMENT_STATUS_OPTIONS = ["CREATED", "SUCCESS", "FAILED", "REFUNDED"];
const SUBSCRIPTION_STATUS_OPTIONS = ["ACTIVE", "EXPIRED", "PAYMENT_PENDING", "CANCELLED"];

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
};

export default function PaymentDetailPage() {
  const { id } = useLocalSearchParams();
  const paymentId = Number(id);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPaymentByIdQuery(paymentId, {
    skip: !Number.isFinite(paymentId) || paymentId <= 0,
  });
  
  const [updatePayment] = useUpdateSuperAdminPaymentMutation();
  const [deletePayment] = useDeleteSuperAdminPaymentMutation();

  const item = data?.item || null;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({});
  const [activePicker, setActivePicker] = useState(null); // 'paymentStatus' | 'subscriptionStatus' | null

  useEffect(() => {
    if (item) {
      setForm({
        paymentStatus: item?.status || "CREATED",
        paymentAmount: String(item?.amount ?? 0),
        paymentCurrency: item?.currency || "INR",
        gateway: item?.gateway || "PAYU",
        paymentPlanName: item?.planName || "",
        paymentPlanCode: item?.planCode || "",
        orderId: item?.orderId || "",
        paymentIdValue: item?.paymentId || "",
        signature: item?.signature || "",
        failureReason: item?.failureReason || "",
        subscriptionStatus: item?.subscription?.status || "ACTIVE",
        subscriptionAmount: String(item?.subscription?.amount ?? 0),
        subscriptionCurrency: item?.subscription?.currency || item?.currency || "INR",
        subscriptionPlanName: item?.subscription?.planName || item?.planName || "",
        subscriptionPlanCode: item?.subscription?.planCode || item?.planCode || "",
        subscriptionOrderId: item?.subscription?.orderId || "",
        subscriptionPaymentId: item?.subscription?.paymentId || "",
        subscriptionSignature: item?.subscription?.signature || "",
        startDate: item?.subscription?.startDate ? new Date(item.subscription.startDate).toISOString().split('T')[0] : "",
        endDate: item?.subscription?.endDate ? new Date(item.subscription.endDate).toISOString().split('T')[0] : "",
        notes: item?.subscription?.notes || "",
      });
    }
  }, [item]);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePayment({
        paymentId,
        payment: {
          status: form.paymentStatus,
          amount: Number(form.paymentAmount || 0),
          currency: form.paymentCurrency || "INR",
          gateway: form.gateway || "PAYU",
          planName: form.paymentPlanName,
          planCode: form.paymentPlanCode.toUpperCase(),
          orderId: form.orderId,
          paymentId: form.paymentIdValue,
          signature: form.signature,
          failureReason: form.failureReason,
        },
        subscription: {
          status: form.subscriptionStatus,
          amount: Number(form.subscriptionAmount || 0),
          currency: form.subscriptionCurrency || "INR",
          planName: form.subscriptionPlanName,
          planCode: form.subscriptionPlanCode.toUpperCase(),
          orderId: form.subscriptionOrderId,
          paymentId: form.subscriptionPaymentId,
          signature: form.subscriptionSignature,
          notes: form.notes,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        },
      }).unwrap();
      Alert.alert("Success", "Payment record updated successfully.");
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update payment record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Deletion",
      `Delete purchase record for ${item?.organization?.name || "this organization"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePayment(paymentId).unwrap();
              router.back();
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to delete payment record");
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <Text className="text-xl font-black text-slate-900 dark:text-white mb-2 text-center">Payment Not Found</Text>
        <Text className="text-sm text-slate-500 text-center mb-6">This purchase record may have been removed or is no longer available.</Text>
        <Pressable onPress={() => router.back()} className="bg-blue-600 px-6 py-3 rounded-xl">
          <Text className="text-white font-black">Back to Payments</Text>
        </Pressable>
      </View>
    );
  }

  const renderPickerModal = () => {
    const isPayment = activePicker === 'paymentStatus';
    const options = isPayment ? PAYMENT_STATUS_OPTIONS : SUBSCRIPTION_STATUS_OPTIONS;
    
    return (
      <Modal visible={!!activePicker} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setActivePicker(null)} className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">
              Select Status
            </Text>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  handleChange(activePicker, opt);
                  setActivePicker(null);
                }}
                className="py-4 border-b border-slate-100 dark:border-slate-800"
              >
                <Text className={`text-base font-bold ${form[activePicker] === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <View className="flex-row items-center space-x-2">
            <Pressable 
              onPress={handleDelete}
              disabled={deleting}
              className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30 mr-2"
            >
              {deleting ? <ActivityIndicator size="small" color="#e11d48" /> : <Trash2 size={18} className="text-rose-600 dark:text-rose-400" />}
            </Pressable>
            <Pressable 
              onPress={handleSave}
              disabled={saving}
              className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl"
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} className="text-white mr-2" />}
              <Text className="text-white font-black text-sm">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Purchase Detail */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Purchase Detail</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1">{item.organization?.name}</Text>
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">{item.organization?.code || "-"}</Text>

            <View className="flex-row flex-wrap gap-y-6">
              <View className="w-1/2 pr-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plan</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.planName || item.planCode || "-"}</Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Amount</Text>
                <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(item.amount, item.currency)}</Text>
              </View>
              <View className="w-1/2 pr-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.status || "-"}</Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subscription End</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.subscription?.endDate ? new Date(item.subscription.endDate).toLocaleDateString() : "-"}</Text>
              </View>
            </View>
          </View>

          {/* Linked Data */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">Linked Data</Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">User</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.user?.name || "-"}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">User Email</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.user?.email || "-"}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Organization Status</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.organization?.subscriptionStatus || "-"}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment Count On Subscription</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{Number(item.subscription?.paymentCount || 0)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Record Form */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <View className="flex-row items-center mb-5">
              <CreditCard size={18} className="text-slate-400 mr-2" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Record</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Status</Text>
                <Pressable onPress={() => setActivePicker('paymentStatus')} className="flex-row items-center justify-between border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{form.paymentStatus}</Text>
                  <ChevronDown size={16} className="text-slate-400" />
                </Pressable>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Amount</Text>
                  <TextInput
                    value={form.paymentAmount}
                    onChangeText={(val) => handleChange('paymentAmount', val)}
                    keyboardType="numeric"
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Currency</Text>
                  <TextInput
                    value={form.paymentCurrency}
                    onChangeText={(val) => handleChange('paymentCurrency', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium uppercase"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Gateway</Text>
                <TextInput
                  value={form.gateway}
                  onChangeText={(val) => handleChange('gateway', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Plan Name</Text>
                  <TextInput
                    value={form.paymentPlanName}
                    onChangeText={(val) => handleChange('paymentPlanName', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Plan Code</Text>
                  <TextInput
                    value={form.paymentPlanCode}
                    onChangeText={(val) => handleChange('paymentPlanCode', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium uppercase"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Order ID</Text>
                <TextInput
                  value={form.orderId}
                  onChangeText={(val) => handleChange('orderId', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment ID</Text>
                <TextInput
                  value={form.paymentIdValue}
                  onChangeText={(val) => handleChange('paymentIdValue', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Signature</Text>
                <TextInput
                  value={form.signature}
                  onChangeText={(val) => handleChange('signature', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Failure Reason</Text>
                <TextInput
                  value={form.failureReason}
                  onChangeText={(val) => handleChange('failureReason', val)}
                  multiline
                  numberOfLines={3}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium min-h-[80px]"
                />
              </View>
            </View>
          </View>

          {/* Subscription Record Form */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">Subscription Record</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Status</Text>
                <Pressable onPress={() => setActivePicker('subscriptionStatus')} className="flex-row items-center justify-between border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{form.subscriptionStatus}</Text>
                  <ChevronDown size={16} className="text-slate-400" />
                </Pressable>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Amount</Text>
                  <TextInput
                    value={form.subscriptionAmount}
                    onChangeText={(val) => handleChange('subscriptionAmount', val)}
                    keyboardType="numeric"
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Currency</Text>
                  <TextInput
                    value={form.subscriptionCurrency}
                    onChangeText={(val) => handleChange('subscriptionCurrency', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium uppercase"
                  />
                </View>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Plan Name</Text>
                  <TextInput
                    value={form.subscriptionPlanName}
                    onChangeText={(val) => handleChange('subscriptionPlanName', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Plan Code</Text>
                  <TextInput
                    value={form.subscriptionPlanCode}
                    onChangeText={(val) => handleChange('subscriptionPlanCode', val)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium uppercase"
                  />
                </View>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={form.startDate}
                    onChangeText={(val) => handleChange('startDate', val)}
                    placeholder="2026-07-02"
                    placeholderTextColor="#94a3b8"
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={form.endDate}
                    onChangeText={(val) => handleChange('endDate', val)}
                    placeholder="2026-09-30"
                    placeholderTextColor="#94a3b8"
                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Order ID</Text>
                <TextInput
                  value={form.subscriptionOrderId}
                  onChangeText={(val) => handleChange('subscriptionOrderId', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment ID</Text>
                <TextInput
                  value={form.subscriptionPaymentId}
                  onChangeText={(val) => handleChange('subscriptionPaymentId', val)}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notes</Text>
                <TextInput
                  value={form.notes}
                  onChangeText={(val) => handleChange('notes', val)}
                  multiline
                  numberOfLines={3}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium min-h-[80px]"
                />
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPickerModal()}
    </SafeAreaView>
  );
}
