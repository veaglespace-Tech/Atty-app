import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CreditCard, Plus, Edit2, X, Trash2 } from "lucide-react-native";
import { useGetSuperAdminPlansQuery } from "@/services/api/superAdminApi";
import { useCreatePlanMutation, useUpdatePlanMutation, useDeletePlanMutation } from "@/services/api/planApi";

export default function PlansPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminPlansQuery();
  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form State
  const [form, setForm] = useState({ name: "", code: "", price: "", durationInDays: "", memberLimit: "" });

  const plans = useMemo(() => data?.items || [], [data]);

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
          } catch (error) {
            Alert.alert("Error", error?.data?.message || "Failed to delete plan.");
          }
        } 
      }
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Plans</Text>
          <Pressable onPress={openAddModal} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Plus size={20} className="text-blue-600 dark:text-blue-400" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && plans.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : plans.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <CreditCard size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center">No Plans</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no subscription plans created. Click + to add one.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {plans.map((plan) => (
              <View key={plan.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 items-center justify-center">
                      <CreditCard size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </View>
                    <View>
                      <Text className="text-lg font-black text-slate-900 dark:text-white">{plan.name}</Text>
                      <Text className="text-xs font-bold text-slate-500">Code: {plan.code}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => openEditModal(plan)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Edit2 size={14} className="text-slate-600 dark:text-slate-400" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(plan.id)} disabled={isDeleting} className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30">
                      <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Price</Text>
                    <Text className="text-lg font-black text-slate-900 dark:text-white">₹{plan.price}</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Duration</Text>
                    <Text className="text-lg font-black text-slate-900 dark:text-white">{plan.durationInDays} days</Text>
                  </View>
                  <View className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Limit</Text>
                    <Text className="text-lg font-black text-slate-900 dark:text-white">{plan.memberLimit}</Text>
                  </View>
                </View>
                
                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subscribers</Text>
                    <Text className="text-base font-bold text-slate-800 dark:text-slate-200">{plan.subscribersTotal}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-right">Total Revenue</Text>
                    <Text className="text-base font-bold text-emerald-600 dark:text-emerald-400 text-right">₹{plan.revenue}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6">
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
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Plan Name</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    placeholder="e.g. Pro Monthly"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>
                
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Plan Code</Text>
                  <TextInput
                    value={form.code}
                    onChangeText={(text) => setForm({ ...form, code: text.toUpperCase() })}
                    placeholder="PRO_MONTHLY"
                    autoCapitalize="characters"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Price (₹)</Text>
                    <TextInput
                      value={form.price}
                      onChangeText={(text) => setForm({ ...form, price: text })}
                      keyboardType="numeric"
                      placeholder="999"
                      placeholderTextColor="#94a3b8"
                      className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Duration (Days)</Text>
                    <TextInput
                      value={form.durationInDays}
                      onChangeText={(text) => setForm({ ...form, durationInDays: text })}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor="#94a3b8"
                      className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">User Limit</Text>
                  <TextInput
                    value={form.memberLimit}
                    onChangeText={(text) => setForm({ ...form, memberLimit: text })}
                    keyboardType="numeric"
                    placeholder="Max users (e.g., 50)"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleSave} 
                disabled={isCreating || isUpdating}
                className="bg-blue-600 active:bg-blue-700 p-4 rounded-xl items-center justify-center mt-8 mb-4 shadow-sm shadow-blue-600/20"
              >
                {isCreating || isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
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