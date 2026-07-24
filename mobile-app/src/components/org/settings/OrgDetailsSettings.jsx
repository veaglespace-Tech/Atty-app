import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useDispatch } from "react-redux";
import { Building2, Mail, MapPin, PhoneCall } from "lucide-react-native";
import { useAuthSession } from "@/hooks/useAuthSession";
import { setCurrentUser } from "@/store/slices/authSlice";
import { useUpdateOrgDetailsMutation } from "@/services/api/orgApi";

export default function OrgDetailsSettings() {
  const dispatch = useDispatch();
  const { user } = useAuthSession();
  const [updateOrgDetails, { isLoading: isUpdating }] = useUpdateOrgDetailsMutation();
  const organization = user?.organization || {};

  const [form, setForm] = useState({
    name: organization.name || "",
    email: organization.email || "",
    phone: organization.phone || "",
    phoneCountryCode: organization.phoneCountryCode || "+91",
    address: organization.address || "",
    city: organization.city || "",
    state: organization.state || "",
    country: organization.country || "India",
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert("Error", "Organization Name and Email are required.");
      return;
    }
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        phoneCountryCode: form.phoneCountryCode,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
      };

      const result = await updateOrgDetails(payload).unwrap();
      const updatedUser = {
        ...user,
        organization: {
          ...user.organization,
          ...result.data,
        }
      };
      dispatch(setCurrentUser(updatedUser));
      Alert.alert("Success", "Organization details updated successfully.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update organization details.");
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, icon: Icon }) => (
    <View className="mb-4">
      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">{label}</Text>
      <View className={`flex-row ${multiline ? 'items-start' : 'items-center'} bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5`}>
        {Icon && <Icon size={16} className={`text-slate-400 mr-3 ${multiline ? 'mt-0.5' : ''}`} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 2 : 1}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
    </View>
  );

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Organization Details</Text>
          <Text className="text-xs font-semibold text-slate-500">Update your workspace identity.</Text>
        </View>
      </View>

      <View>
        <InputField label="Organization Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Acme Corp" icon={Building2} />
        <InputField label="Email Address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="e.g. admin@acme.com" keyboardType="email-address" icon={Mail} />
        
        <View className="flex-row gap-4 mb-4">
          <View className="w-1/3">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Code</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.phoneCountryCode} onChangeText={(v) => setForm({ ...form, phoneCountryCode: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="+91" keyboardType="phone-pad" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Phone Number</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <PhoneCall size={16} className="text-slate-400 mr-2" />
              <TextInput value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="e.g. 9876543210" keyboardType="phone-pad" />
            </View>
          </View>
        </View>

        <InputField label="Full Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="e.g. 123 Main St" multiline icon={MapPin} />
        
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">City</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="City" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">State</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
              <TextInput value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="State" />
            </View>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Country</Text>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
            <TextInput value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" placeholder="Country" />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isUpdating}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isUpdating ? 'opacity-50' : ''}`}>
          {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Details</Text>}
        </Pressable>
      </View>
    </View>
  );
}
