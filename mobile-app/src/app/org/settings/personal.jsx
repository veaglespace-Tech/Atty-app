import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { ChevronLeft, User, Mail, Smartphone, MapPin, PhoneCall, Save } from "lucide-react-native";

import { useAuthSession } from "@/hooks/useAuthSession";
import { setCurrentUser } from "@/store/slices/authSlice";
import { useUpdateMeMutation } from "@/services/api/authApi";

export default function PersonalSettings() {
  const { user } = useAuthSession();
  const dispatch = useDispatch();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    emergencyContact: user?.emergencyContact || "",
    currentAddress: user?.currentAddress || "",
  });

  const handleUpdate = useCallback(async () => {
    try {
      const payload = {};
      if (formData.name && formData.name !== user?.name) payload.name = formData.name;
      if (formData.mobile && formData.mobile !== user?.mobile) payload.mobile = formData.mobile;
      if (formData.emergencyContact !== user?.emergencyContact) payload.emergencyContact = formData.emergencyContact;
      if (formData.currentAddress !== user?.currentAddress) payload.currentAddress = formData.currentAddress;

      if (Object.keys(payload).length === 0) {
        Alert.alert("Info", "No changes to save.");
        return;
      }

      const result = await updateMe(payload).unwrap();
      dispatch(setCurrentUser(result.user));
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update profile.");
    }
  }, [formData, user, updateMe, dispatch]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex-row items-center gap-3">
        <Pressable 
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
          <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 dark:text-white flex-1">
          Personal Details
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <View className="gap-y-4">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Full Name</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <User size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.name}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Email Address</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 opacity-70">
                <Mail size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.email}
                  editable={false}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Mobile Number</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <Smartphone size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.mobile}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, mobile: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Emergency Contact</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <PhoneCall size={16} className="text-slate-400 mr-3" />
                <TextInput
                  value={formData.emergencyContact}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, emergencyContact: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter emergency contact"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Current Address</Text>
              <View className="flex-row bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5">
                <MapPin size={16} className="text-slate-400 mr-3 mt-0.5" />
                <TextInput
                  value={formData.currentAddress}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, currentAddress: val }))}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter current address"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            
            <Pressable
              onPress={handleUpdate}
              disabled={isLoading}
              className={`mt-4 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 active:bg-blue-700 ${isLoading ? 'opacity-70' : ''}`}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text className="font-bold text-white text-[15px]">Save Profile Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
