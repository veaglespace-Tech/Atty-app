import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  Alert,
  Switch
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  ChevronLeft, 
  Trash2, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react-native';
import { 
  useGetPlanByIdQuery, 
  useUpdatePlanMutation, 
  useDeletePlanMutation 
} from '@/services/api/planApi';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: plan, isLoading, isError, refetch } = useGetPlanByIdQuery(id, { skip: !id });
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();

  const [form, setForm] = useState({
    name: '',
    price: '0',
    durationInDays: '0',
    memberLimit: '0',
    featuresText: '',
    description: '',
    maxTeams: '0',
    maxLocations: '0',
    isDefault: false,
    isActive: true,
    displayOrder: '0',
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard');
    } else {
      router.replace('/super-admin/plans');
    }
  };

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        price: String(plan.price || 0),
        durationInDays: String(plan.durationInDays || 0),
        memberLimit: String(plan.memberLimit || 0),
        featuresText: Array.isArray(plan.features) ? plan.features.join(', ') : '',
        description: plan.description || '',
        maxTeams: String(plan.maxTeams || 0),
        maxLocations: String(plan.maxLocations || 0),
        isDefault: Boolean(plan.isDefault),
        isActive: plan.isActive !== false,
        displayOrder: String(plan.displayOrder || 0),
      });
    }
  }, [plan]);

  const handleUpdate = async () => {
    if (!form.name || !form.price || !form.durationInDays) {
      Alert.alert('Error', 'Name, Price, and Duration are required fields.');
      return;
    }

    try {
      await updatePlan({
        id,
        name: form.name.trim(),
        price: Number(form.price),
        durationInDays: Number(form.durationInDays),
        memberLimit: Number(form.memberLimit || 0),
        features: form.featuresText
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        description: form.description.trim(),
        limits: {
          maxUsers: Number(form.memberLimit || 0),
          maxTeams: Number(form.maxTeams || 0),
          maxLocations: Number(form.maxLocations || 0),
        },
        isDefault: form.isDefault,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder || 0),
      }).unwrap();
      
      Alert.alert('Success', 'Plan updated successfully!');
      refetch();
    } catch (error) {
      Alert.alert('Error', error?.data?.message || 'Failed to update plan.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to PERMANENTLY delete plan "${plan?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(id).unwrap();
              handleBack();
            } catch (error) {
              Alert.alert('Error', error?.data?.message || 'Failed to delete plan.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C] items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Plan Data...</Text>
      </View>
    );
  }

  if (isError || !plan) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C] items-center justify-center p-6">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <Text className="text-2xl font-black text-slate-900 dark:text-white">PLAN NOT FOUND</Text>
        <Text className="text-sm font-medium text-slate-500 text-center mt-2 mb-8">
          The record you are looking for might have been deleted.
        </Text>
        <Pressable onPress={handleBack} className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center">
          <ChevronLeft size={16} className="text-white mr-2" />
          <Text className="text-white font-bold">Back to Inventory</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={handleBack} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mr-3">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <View>
            <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Plan Configuration</Text>
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{plan.code}</Text>
          </View>
        </View>
        <Pressable onPress={handleDelete} disabled={isDeleting} className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
          <Trash2 size={18} className="text-rose-600 dark:text-rose-400" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 shadow-sm mb-6">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-6">Update Settings</Text>

          <View className="space-y-4">
            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Display Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
              />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Price Point (INR)</Text>
                <TextInput
                  value={form.price}
                  onChangeText={(text) => setForm({ ...form, price: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Duration (Days)</Text>
                <TextInput
                  value={form.durationInDays}
                  onChangeText={(text) => setForm({ ...form, durationInDays: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Member Capacity</Text>
                <TextInput
                  value={form.memberLimit}
                  onChangeText={(text) => setForm({ ...form, memberLimit: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Max Teams</Text>
                <TextInput
                  value={form.maxTeams}
                  onChangeText={(text) => setForm({ ...form, maxTeams: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Max Locations</Text>
                <TextInput
                  value={form.maxLocations}
                  onChangeText={(text) => setForm({ ...form, maxLocations: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Display Order</Text>
                <TextInput
                  value={form.displayOrder}
                  onChangeText={(text) => setForm({ ...form, displayOrder: text })}
                  keyboardType="numeric"
                  className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
            </View>

            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Features (Comma Separated)</Text>
              <TextInput
                value={form.featuresText}
                onChangeText={(text) => setForm({ ...form, featuresText: text })}
                placeholder="e.g. Attendance, Payroll, Analytics"
                placeholderTextColor="#64748b"
                className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
              />
            </View>

            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Pitch / Description</Text>
              <TextInput
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold min-h-[100px]"
              />
            </View>

            <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-[#1E293B] pt-4 mt-2">
              <View className="flex-row items-center gap-6">
                <View className="flex-row items-center gap-2">
                  <Switch
                    value={form.isDefault}
                    onValueChange={(val) => setForm({ ...form, isDefault: val })}
                    trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    thumbColor="#fff"
                  />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Default</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Switch
                    value={form.isActive}
                    onValueChange={(val) => setForm({ ...form, isActive: val })}
                    trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                    thumbColor="#fff"
                  />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Active</Text>
                </View>
              </View>
            </View>

          </View>
        </View>

        <Pressable 
          onPress={handleUpdate} 
          disabled={isUpdating}
          className={`bg-blue-600 active:bg-blue-700 flex-row items-center justify-center p-4 rounded-2xl shadow-sm ${isUpdating ? 'opacity-70' : ''}`}
        >
          {isUpdating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <ShieldCheck size={18} className="text-white mr-2" />
              <Text className="text-white font-black text-sm">Save Configuration</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
