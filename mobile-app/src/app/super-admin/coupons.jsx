import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Switch } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Ticket, Plus, Save, Trash2, X, Info } from "lucide-react-native";
import { 
  useGetSuperAdminCouponsQuery, 
  useCreateSuperAdminCouponMutation, 
  useUpdateSuperAdminCouponMutation, 
  useDeleteSuperAdminCouponMutation,
  useGetSuperAdminPlansQuery
} from "@/services/api/superAdminApi";

export default function CouponsPage() {
  const { data: couponsData, isLoading: isLoadingCoupons, refetch: refetchCoupons } = useGetSuperAdminCouponsQuery();
  const { data: plansData } = useGetSuperAdminPlansQuery();
  
  const [createCoupon, { isLoading: isCreating }] = useCreateSuperAdminCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateSuperAdminCouponMutation();
  const [deleteCoupon] = useDeleteSuperAdminCouponMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewUsersId, setViewUsersId] = useState(null);

  const coupons = useMemo(() => couponsData?.data || [], [couponsData]);
  const plans = useMemo(() => plansData?.items || [], [plansData]);

  const [formData, setFormData] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    maxUses: "",
    validFrom: "",
    validUntil: "",
    applicablePlanCodes: []
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      code: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      maxUses: "",
      validFrom: "",
      validUntil: "",
      applicablePlanCodes: plans.map(p => p.code)
    });
  };

  const handleOpenForm = (coupon = null) => {
    if (coupon) {
      setEditingId(coupon.id);
      setFormData({
        code: coupon.code || "",
        discountType: coupon.discountType || "PERCENTAGE",
        discountValue: coupon.discountValue ? String(coupon.discountValue) : "",
        maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
        validFrom: coupon.validFrom ? coupon.validFrom.substring(0, 10) : "",
        validUntil: coupon.validUntil ? coupon.validUntil.substring(0, 10) : "",
        applicablePlanCodes: coupon.applicablePlanCodes || plans.map(p => p.code)
      });
    } else {
      resetForm();
    }
    setViewUsersId(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Coupon",
      "Are you sure you want to delete this coupon? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteCoupon(id).unwrap();
              refetchCoupons();
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to delete coupon");
            }
          } 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) return Alert.alert("Validation Error", "Coupon code is required");
    if (!formData.discountValue.trim()) return Alert.alert("Validation Error", "Discount value is required");
    if (formData.applicablePlanCodes.length === 0) return Alert.alert("Validation Error", "Select at least one applicable plan");

    if (formData.validFrom && formData.validUntil) {
      if (new Date(formData.validFrom) > new Date(formData.validUntil)) {
        return Alert.alert("Validation Error", "Valid Until date cannot be before Valid From date");
      }
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : null,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      applicablePlanCodes: formData.applicablePlanCodes
    };

    try {
      if (editingId) {
        await updateCoupon({ id: editingId, ...payload }).unwrap();
      } else {
        await createCoupon(payload).unwrap();
      }
      setShowForm(false);
      resetForm();
      refetchCoupons();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to save coupon");
    }
  };

  const togglePlanCode = (code) => {
    setFormData(prev => {
      const isSelected = prev.applicablePlanCodes.includes(code);
      if (isSelected) {
        return { ...prev, applicablePlanCodes: prev.applicablePlanCodes.filter(c => c !== code) };
      } else {
        return { ...prev, applicablePlanCodes: [...prev.applicablePlanCodes, code] };
      }
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Coupons</Text>
          <Pressable onPress={() => handleOpenForm()} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Plus size={20} className="text-blue-600 dark:text-blue-400" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}>
        {isLoadingCoupons ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : coupons.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 py-20">
            <View className="h-24 w-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center mb-6">
              <Ticket size={48} className="text-indigo-400 dark:text-indigo-500" />
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">No Active Coupons</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-8">
              Create discount codes and promotional offers to help drive subscription sales and upgrades.
            </Text>
            
            <Pressable onPress={() => handleOpenForm()} className="bg-blue-600 active:bg-blue-700 px-8 py-4 rounded-[24px] flex-row items-center justify-center shadow-sm shadow-blue-600/20">
              <Plus size={20} className="text-white mr-2" />
              <Text className="text-white font-bold text-base">Create First Coupon</Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-4">
            {coupons.map((coupon) => (
              <View key={coupon.id} className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-start justify-between mb-4">
                  <View>
                    <Text className="text-lg font-black tracking-wide text-indigo-600 dark:text-indigo-400 uppercase">{coupon.code}</Text>
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      {coupon.discountValue} {coupon.discountType === 'PERCENTAGE' ? '%' : '₹'} OFF
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => handleOpenForm(coupon)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(coupon.id)} className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30">
                      <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                    </Pressable>
                  </View>
                </View>

                <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex-row flex-wrap justify-between gap-y-3">
                  <View className="w-[48%]">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Uses</Text>
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {coupon.usesCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : '(Unlimited)'}
                    </Text>
                  </View>
                  <View className="w-[48%]">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plans</Text>
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {coupon.applicablePlanCodes?.length > 0 ? `${coupon.applicablePlanCodes.length} Plans` : "All Plans"}
                    </Text>
                  </View>
                  <View className="w-[48%] mt-2">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valid From</Text>
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {coupon.validFrom ? new Date(coupon.validFrom).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                  <View className="w-[48%] mt-2">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valid Until</Text>
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : "Never expires"}
                    </Text>
                  </View>
                </View>

                {coupon.usesCount > 0 && (
                  <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <Pressable 
                      onPress={() => setViewUsersId(viewUsersId === coupon.id ? null : coupon.id)}
                      className="flex-row justify-center py-2"
                    >
                      <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {viewUsersId === coupon.id ? "Hide Users" : "View Users"}
                      </Text>
                    </Pressable>
                    
                    {viewUsersId === coupon.id && coupon.payments && coupon.payments.length > 0 && (
                      <View className="mt-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <View className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/30">
                          <Text className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Customers who claimed {coupon.code}</Text>
                        </View>
                        {coupon.payments.map((payment, pIdx) => (
                          <View key={payment.id} className={`p-4 ${pIdx !== coupon.payments.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}>
                            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{payment.user?.name || "Unknown"}</Text>
                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{payment.user?.email || "-"}</Text>
                            <View className="flex-row justify-between">
                              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{payment.user?.mobile || "-"}</Text>
                              <Text className="text-[10px] font-bold text-slate-400">{new Date(payment.createdAt).toLocaleDateString()}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white dark:bg-slate-950">
          <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between bg-white dark:bg-slate-900/80 shadow-sm">
            <Text className="text-lg font-black text-slate-900 dark:text-white">{editingId ? "Edit Coupon" : "Create Coupon"}</Text>
            <Pressable onPress={() => setShowForm(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5 py-6">
            <View className="space-y-5 mb-8">
              
              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Coupon Code *</Text>
                <TextInput
                  value={formData.code}
                  onChangeText={(val) => setFormData({...formData, code: val})}
                  placeholder="e.g. SUMMER50"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Discount Type</Text>
                  <View className="flex-row bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl">
                    <Pressable 
                      onPress={() => setFormData({...formData, discountType: "PERCENTAGE"})}
                      className={`flex-1 py-2 rounded-lg items-center ${formData.discountType === "PERCENTAGE" ? "bg-white dark:bg-slate-800 shadow-sm" : ""}`}
                    >
                      <Text className={`text-xs font-bold ${formData.discountType === "PERCENTAGE" ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>%</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setFormData({...formData, discountType: "FLAT_AMOUNT"})}
                      className={`flex-1 py-2 rounded-lg items-center ${formData.discountType === "FLAT_AMOUNT" ? "bg-white dark:bg-slate-800 shadow-sm" : ""}`}
                    >
                      <Text className={`text-xs font-bold ${formData.discountType === "FLAT_AMOUNT" ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>₹</Text>
                    </Pressable>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Value *</Text>
                  <TextInput
                    value={formData.discountValue}
                    onChangeText={(val) => setFormData({...formData, discountValue: val})}
                    placeholder="e.g. 20"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Max Uses (Optional)</Text>
                <TextInput
                  value={formData.maxUses}
                  onChangeText={(val) => setFormData({...formData, maxUses: val})}
                  placeholder="Leave empty for unlimited"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Valid From</Text>
                  <TextInput
                    value={formData.validFrom}
                    onChangeText={(val) => setFormData({...formData, validFrom: val})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Valid Until</Text>
                  <TextInput
                    value={formData.validUntil}
                    onChangeText={(val) => setFormData({...formData, validUntil: val})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500">Applicable Plans *</Text>
                  <Pressable 
                    onPress={() => setFormData({...formData, applicablePlanCodes: formData.applicablePlanCodes.length === plans.length ? [] : plans.map(p => p.code)})}
                  >
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formData.applicablePlanCodes.length === plans.length ? "Deselect All" : "Select All"}
                    </Text>
                  </Pressable>
                </View>
                
                <View className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {plans.length === 0 ? (
                    <Text className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No plans available.</Text>
                  ) : (
                    plans.map((plan, index) => (
                      <Pressable 
                        key={plan.id} 
                        onPress={() => togglePlanCode(plan.code)}
                        className={`p-4 flex-row justify-between items-center ${index < plans.length - 1 ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}
                      >
                        <View>
                          <Text className="font-bold text-slate-800 dark:text-slate-200">{plan.name}</Text>
                          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">₹{plan.price || '0'}</Text>
                        </View>
                        <View className={`h-6 w-6 rounded-md border items-center justify-center ${formData.applicablePlanCodes.includes(plan.code) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                          {formData.applicablePlanCodes.includes(plan.code) && <Plus size={14} color="white" style={{transform: [{rotate: '45deg'}]}} />}
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>

            </View>
          </ScrollView>

          <View className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm">
            <Pressable 
              onPress={handleSubmit} 
              disabled={isSaving}
              className="bg-blue-600 active:bg-blue-700 py-4 rounded-xl flex-row items-center justify-center shadow-sm"
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Save size={20} className="text-white mr-2" />
                  <Text className="text-white font-black text-base">
                    {editingId ? "Update Coupon" : "Save Coupon"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}