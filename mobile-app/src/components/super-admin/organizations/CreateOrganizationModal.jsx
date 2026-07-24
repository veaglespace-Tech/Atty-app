import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Modal, Alert } from "react-native";
import { X, Layers, Plus } from "lucide-react-native";
import { useCreateSuperAdminOrganizationMutation } from "@/services/api/superAdminApi";

export default function CreateOrganizationModal({ isOpen, onClose, onCreated }) {
  const [createOrganization, { isLoading: isCreating }] = useCreateSuperAdminOrganizationMutation();
  const [form, setForm] = useState({
    organization: { name: "", email: "", phone: "", phoneCountryCode: "+91", address: "", city: "", state: "", country: "India", latitude: "", longitude: "" },
    admin: { name: "", email: "", mobile: "", mobileCountryCode: "+91", password: "" },
    planCode: "FREE",
    hasERP: false,
  });

  const onChange = (section, field, value) => {
    setForm(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const onSubmit = async () => {
    if (!form.organization.name || !form.organization.email || !form.organization.phone || !form.admin.name || !form.admin.email || !form.admin.mobile || !form.admin.password) {
      Alert.alert("Error", "Please fill out all required fields including phone numbers.");
      return;
    }
    try {
      await createOrganization(form).unwrap();
      Alert.alert("Success", "Organization created successfully.");
      onCreated();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to create organization.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-slate-950">
        <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <View>
            <Text className="text-lg font-black text-slate-900 dark:text-white uppercase">Create Organization</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">Onboard a workspace.</Text>
          </View>
          <Pressable onPress={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
            <X size={20} className="text-slate-600 dark:text-slate-300" />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Organization Info</Text>
          <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 gap-3">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Name</Text>
              <TextInput
                value={form.organization.name}
                onChangeText={(v) => onChange("organization", "name", v)}
                placeholder="Acme Corp"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Email</Text>
              <TextInput
                value={form.organization.email}
                onChangeText={(v) => onChange("organization", "email", v)}
                placeholder="org@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Phone Number</Text>
              <TextInput
                value={form.organization.phone}
                onChangeText={(v) => onChange("organization", "phone", v)}
                placeholder="9876543210"
                keyboardType="phone-pad"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">City</Text>
                <TextInput
                  value={form.organization.city}
                  onChangeText={(v) => onChange("organization", "city", v)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Country</Text>
                <TextInput
                  value={form.organization.country}
                  onChangeText={(v) => onChange("organization", "country", v)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>
          </View>

          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Admin Account</Text>
          <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 gap-3">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Admin Name</Text>
              <TextInput
                value={form.admin.name}
                onChangeText={(v) => onChange("admin", "name", v)}
                placeholder="John Doe"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Admin Email</Text>
              <TextInput
                value={form.admin.email}
                onChangeText={(v) => onChange("admin", "email", v)}
                placeholder="admin@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Mobile Number</Text>
              <TextInput
                value={form.admin.mobile}
                onChangeText={(v) => onChange("admin", "mobile", v)}
                placeholder="9876543210"
                keyboardType="phone-pad"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Initial Password</Text>
              <TextInput
                value={form.admin.password}
                onChangeText={(v) => onChange("admin", "password", v)}
                placeholder="••••••••"
                secureTextEntry
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Add-Ons</Text>
          <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 flex-row items-center justify-between pb-20">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center">
                <Layers size={18} className="text-indigo-500" />
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">ERP Module</Text>
                <Text className="text-xs text-slate-500">Funds & Expenses / Instruments</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => setForm(prev => ({ ...prev, hasERP: !prev.hasERP }))}
              className={`w-12 h-6 rounded-full flex-row items-center px-1 transition-colors ${form.hasERP ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <View className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.hasERP ? 'translate-x-6' : 'translate-x-0'}`} />
            </Pressable>
          </View>
        </ScrollView>

        <View className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-row gap-3">
          <Pressable 
            onPress={onClose}
            className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center"
          >
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Cancel</Text>
          </Pressable>
          <Pressable 
            onPress={onSubmit}
            disabled={isCreating}
            className={`flex-[2] p-4 rounded-xl bg-blue-600 items-center justify-center flex-row ${isCreating ? 'opacity-50' : ''}`}
          >
            {isCreating ? <ActivityIndicator size="small" color="#ffffff" className="mr-2" /> : <Plus size={18} className="text-white mr-2" />}
            <Text className="text-sm font-bold text-white">Create Organization</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
