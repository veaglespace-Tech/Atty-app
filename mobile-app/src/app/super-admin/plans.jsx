import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CreditCard, Plus, Edit2, X, Trash2, Zap, ChevronRight } from "lucide-react-native";
import { useGetSuperAdminPlansQuery, useGetSystemSettingsQuery, useUpdateSystemSettingMutation } from "@/services/api/superAdminApi";
import { useCreatePlanMutation, useUpdatePlanMutation, useDeletePlanMutation } from "@/services/api/planApi";

export default function PlansPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPlansQuery();
  const { data: gstData, isLoading: isGstLoading, refetch: refetchGst } = useGetSystemSettingsQuery();
  const [updateSetting, { isLoading: isUpdatingGst }] = useUpdateSystemSettingMutation();

  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form State
  const [form, setForm] = useState({ name: "", code: "", price: "", durationInDays: "", memberLimit: "" });
  const [gstRate, setGstRate] = useState("18");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const plans = useMemo(() => data?.items || [], [data]);

  // Computed Metrics
  const activePlansCount = plans.filter((p) => p.status === "ACTIVE").length;
  const subscribersCount = plans.reduce((acc, p) => acc + (p.subscribersTotal || 0), 0);
  const totalItems = plans.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return plans.slice(start, start + pageSize);
  }, [plans, page, pageSize]);

  useEffect(() => {
    if (gstData?.items) {
      const setting = gstData.items.find(s => s.key === "GST_RATE");
      if (setting && setting.value) {
        setGstRate(setting.value);
      }
    }
  }, [gstData]);

  const handleRefresh = () => {
    refetch();
    refetchGst();
  };

  const handleSaveGst = async () => {
    if (!gstRate || isNaN(parseFloat(gstRate))) {
      Alert.alert("Error", "Please enter a valid GST percentage.");
      return;
    }
    try {
      await updateSetting({ key: "GST_RATE", value: parseFloat(gstRate).toString() }).unwrap();
      Alert.alert("Success", "GST percentage updated successfully!");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update GST setting.");
    }
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setForm({ name: "", code: "", price: "0", durationInDays: "30", memberLimit: "50" });
    setModalVisible(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || "",
      code: plan.code || "",
      price: String(plan.price || 0),
      durationInDays: String(plan.durationInDays || 0),
      memberLimit: String(plan.memberLimit || 0),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.price || !form.durationInDays) {
      Alert.alert("Error", "Name, Code, Price, and Duration are required.");
      return;
    }

    try {
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        price: Number(form.price),
        durationInDays: Number(form.durationInDays),
        memberLimit: Number(form.memberLimit) || 0,
      };

      if (editingPlan) {
        await updatePlan({ id: editingPlan.id, ...payload }).unwrap();
      } else {
        await createPlan(payload).unwrap();
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Failed to save plan.");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await deletePlan(id).unwrap();
            if (paginatedPlans.length === 1 && page > 1) {
              setPage(page - 1);
            }
          } catch (error) {
            Alert.alert("Error", error?.data?.message || "Failed to delete plan.");
          }
        } 
      }
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.push('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">System Plans</Text>
          <Pressable onPress={openAddModal} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-600">
            <Plus size={20} className="text-blue-600 dark:text-white" />
          </Pressable>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">SAAS Model Control</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching || isGstLoading} onRefresh={handleRefresh} tintColor="#3b82f6" />}
      >
        {/* Metric Cards */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Plans</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{totalItems}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Configured subscription tiers</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Active</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{activePlansCount}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Currently market-ready plans</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Default</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">0</Text>
            <Text className="text-[10px] font-medium text-slate-500">Starter plans shown by default</Text>
          </View>
          <View className="flex-1 min-w-[45%] bg-white dark:bg-[#151E2F] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Subscribers</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{subscribersCount}</Text>
            <Text className="text-[10px] font-medium text-slate-500">Active plan assignments</Text>
          </View>
        </View>

        {/* Global GST Settings */}
        <View className="bg-white dark:bg-[#151E2F] p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-[#1E293B] items-center justify-center mr-3">
              <Zap size={18} className="text-blue-500" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900 dark:text-white mb-0.5">Global GST Settings</Text>
              <Text className="text-[10px] text-slate-500">Manage dynamic tax rate applied during checkout</Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-2">
            <View className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex-row items-center w-20">
              <TextInput 
                value={gstRate}
                onChangeText={setGstRate}
                keyboardType="numeric"
                className="flex-1 text-sm font-bold text-slate-900 dark:text-white p-0 m-0"
              />
              <Text className="text-xs font-bold text-slate-400">%</Text>
            </View>
            <Pressable 
              onPress={handleSaveGst}
              disabled={isUpdatingGst}
              className="bg-blue-500 px-4 py-2.5 rounded-xl justify-center"
            >
              {isUpdatingGst ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-xs font-bold text-white">Save GST</Text>
              )}
            </Pressable>
          </View>
        </View>

        {isLoading && plans.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : paginatedPlans.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-slate-800">
            <CreditCard size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-lg font-black text-slate-900 dark:text-white text-center">No Plans</Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no subscription plans on this page.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 mb-6">
            {paginatedPlans.map((plan) => (
              <View key={plan.id} className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 shadow-sm">
                
                {/* Plan Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{plan.code}</Text>
                    <Pressable onPress={() => handleDelete(plan.id)} disabled={isDeleting} className="p-1">
                      <Trash2 size={12} className="text-rose-500" />
                    </Pressable>
                  </View>
                  <View className="px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 flex-row items-center gap-1">
                    <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{plan.status || 'ACTIVE'}</Text>
                  </View>
                </View>

                {/* Plan Details */}
                <View className="mb-4">
                  <Text className="text-lg font-black text-slate-900 dark:text-white mb-2">{plan.name}</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-2xl font-black text-slate-900 dark:text-white">Rs. {plan.price}</Text>
                    <Text className="text-xs font-bold text-slate-500">/ {plan.durationInDays} DAYS</Text>
                  </View>
                </View>

                <View className="mb-4 flex-row items-center gap-1">
                  <Text className="text-xs text-slate-500">{plan.subscribersTotal || 0} subscribers ·</Text>
                  <Text className="text-xs text-slate-500">Rs. {plan.revenue || 0} revenue</Text>
                </View>

                {/* Action Row */}
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <Text className="text-xs font-semibold text-slate-400">Open plan details</Text>
                  <Pressable onPress={() => router.push(`/super-admin/plans/${plan.id}`)}>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-blue-500">VIEW</Text>
                  </Pressable>
                </View>

              </View>
            ))}
          </View>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <View className="bg-white dark:bg-[#151E2F] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 flex-row flex-wrap items-center justify-between">
            <View className="w-full md:w-auto mb-3 md:mb-0">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
              <Text className="text-xs font-semibold text-slate-500">
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-{Math.min(page * pageSize, totalItems)} of {totalItems} plans
              </Text>
            </View>
            
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rows</Text>
                <View className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-slate-50 dark:bg-[#0A0F1C]">
                  <TextInput
                    value={String(pageSize)}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (num > 0) setPageSize(num);
                    }}
                    keyboardType="numeric"
                    className="text-xs font-bold text-slate-900 dark:text-white p-0 m-0 w-8 text-center"
                  />
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable 
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === 1 ? 'opacity-50' : ''}`}
                >
                  <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300 mr-1" />
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Prev</Text>
                </Pressable>
                
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {page} / {totalPages}
                </Text>

                <Pressable 
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center flex-row ${page === totalPages ? 'opacity-50' : ''}`}
                >
                  <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-1">Next</Text>
                  <ChevronRight size={14} className="text-slate-600 dark:text-slate-300" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Plan Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => {}}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-[#151E2F] rounded-t-3xl p-6 shadow-sm border-t border-slate-200 dark:border-[#1E293B]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {editingPlan ? "Edit Plan" : "Create New Plan"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[70vh]">
              <View className="space-y-4">
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Plan Name</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    placeholder="e.g. Pro Monthly"
                    placeholderTextColor="#64748b"
                    className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                  />
                </View>
                
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Plan Code</Text>
                  <TextInput
                    value={form.code}
                    onChangeText={(text) => setForm({ ...form, code: text.toUpperCase() })}
                    placeholder="PRO_MONTHLY"
                    autoCapitalize="characters"
                    placeholderTextColor="#64748b"
                    className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                  />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Price (₹)</Text>
                    <TextInput
                      value={form.price}
                      onChangeText={(text) => setForm({ ...form, price: text })}
                      keyboardType="numeric"
                      placeholder="999"
                      placeholderTextColor="#64748b"
                      className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Duration (Days)</Text>
                    <TextInput
                      value={form.durationInDays}
                      onChangeText={(text) => setForm({ ...form, durationInDays: text })}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor="#64748b"
                      className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">User Limit</Text>
                  <TextInput
                    value={form.memberLimit}
                    onChangeText={(text) => setForm({ ...form, memberLimit: text })}
                    keyboardType="numeric"
                    placeholder="Max users (e.g., 50)"
                    placeholderTextColor="#64748b"
                    className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleSave} 
                disabled={isCreating || isUpdating}
                className={`bg-blue-600 active:bg-blue-700 p-4 rounded-xl items-center justify-center mt-8 mb-4 shadow-sm ${isCreating || isUpdating ? 'opacity-70' : ''}`}
              >
                {isCreating || isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-sm">
                    {editingPlan ? "Save Changes" : "Create Plan"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}