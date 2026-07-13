import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Mail, Phone, Hash, Activity, Building2, Edit2, X, User } from "lucide-react-native";
import { useGetReferralPartnerByIdQuery, useUpdateReferralPartnerMutation } from "@/services/api/partnerReferralApi";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReferralPartnerDetailsPage() {
  const { id } = useLocalSearchParams();
  const { data, isLoading } = useGetReferralPartnerByIdQuery(id, { skip: !id });
  const [updatePartner, { isLoading: isUpdating }] = useUpdateReferralPartnerMutation();
  const partner = data?.data;

  const referredOrganizations = partner?.referredOrganizations || [];

  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    partnerReferralCode: "",
    isActive: true,
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        email: partner.email || "",
        mobile: partner.mobile || "",
        partnerReferralCode: partner.partnerReferralCode || "",
        isActive: partner.isActive !== false,
      });
    }
  }, [partner]);

  const handleUpdate = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      return Alert.alert("Validation Error", "Name and email are required");
    }

    try {
      await updatePartner({ id: partner.id, data: formData }).unwrap();
      setShowEditForm(false);
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update partner details");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Native-style App Header */}
      <View className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <View className="flex-row items-center">
          <Pressable 
            onPress={() => router.back()} 
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mr-3 active:opacity-70 active:scale-95"
          >
            <ChevronLeft size={22} className="text-slate-900 dark:text-white" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {partner ? `${partner.name}'s Referrals` : "Partner Referrals"}
            </Text>
            {partner?.partnerReferralCode && (
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Organizations that signed up using partner code: {partner.partnerReferralCode}
              </Text>
            )}
          </View>
          {partner && (
            <Pressable 
              onPress={() => setShowEditForm(true)}
              className="ml-3 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex-row items-center active:opacity-70 active:scale-95 border border-blue-100 dark:border-blue-800/50"
            >
              <Edit2 size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
              <Text className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight">Update</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : !partner ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-2">Partner Not Found</Text>
          <Text className="text-slate-500 text-center">The partner details could not be loaded.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Partner Profile Details */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
              Partner Profile Details
            </Text>
            
            <View className="flex-row flex-wrap justify-between gap-y-6">
              <View className="w-[48%] flex-row items-center">
                <View className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-3 border border-blue-100 dark:border-blue-500/20">
                  <Mail size={18} className="text-blue-500 dark:text-blue-400" />
                </View>
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Email Address</Text>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{partner.email}</Text>
                </View>
              </View>
              
              <View className="w-[48%] flex-row items-center">
                <View className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center mr-3 border border-emerald-100 dark:border-emerald-500/20">
                  <Phone size={18} className="text-emerald-500 dark:text-emerald-400" />
                </View>
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Phone Number</Text>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{partner.mobile || "-"}</Text>
                </View>
              </View>

              <View className="w-[48%] flex-row items-center">
                <View className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 items-center justify-center mr-3 border border-purple-100 dark:border-purple-500/20">
                  <Hash size={18} className="text-purple-500 dark:text-purple-400" />
                </View>
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Referral Code</Text>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{partner.partnerReferralCode}</Text>
                </View>
              </View>

              <View className="w-[48%] flex-row items-center">
                <View className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 items-center justify-center mr-3 border border-amber-100 dark:border-amber-500/20">
                  <Activity size={18} className="text-amber-500 dark:text-amber-400" />
                </View>
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Referred Orgs</Text>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{referredOrganizations.length}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Referred Organizations List */}
          <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Referred Organizations List
              </Text>
              <View className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                <Text className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                  {referredOrganizations.length} Total
                </Text>
              </View>
            </View>

            {referredOrganizations.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
                  No organizations have been referred by this partner yet.
                </Text>
              </View>
            ) : (
              <View className="space-y-4 mt-2">
                {referredOrganizations.map((org, index) => (
                  <Pressable 
                    key={org.id} 
                    onPress={() => router.push(`/super-admin/organization/${org.id}`)}
                    className={`flex-row items-center justify-between active:opacity-70 ${index !== referredOrganizations.length - 1 ? 'border-b border-slate-100 dark:border-slate-800 pb-4 mb-1' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-4 border border-blue-100 dark:border-blue-500/20">
                        <Building2 size={20} className="text-blue-500 dark:text-blue-400" />
                      </View>
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-black text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>{org.name}</Text>
                        <View className="flex-row items-center">
                          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Code: {org.organizationCode}</Text>
                          <Text className="text-xs font-bold text-slate-300 dark:text-slate-600 mx-2">•</Text>
                          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {new Date(org.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className={`px-2.5 py-1 rounded-md ${org.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-[9px] font-black uppercase tracking-widest ${org.subscriptionStatus === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {org.subscriptionStatus || 'INACTIVE'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      )}

      {/* Edit Partner Modal */}
      <Modal visible={showEditForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white dark:bg-slate-950">
          <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between bg-white dark:bg-slate-900">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Update Partner Details</Text>
            <Pressable onPress={() => setShowEditForm(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </Pressable>
          </View>
          
          <ScrollView className="flex-1 px-5 py-6">
            <View className="space-y-5 mb-8">
              
              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Full Name *</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
                  <User size={18} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.name}
                    onChangeText={(val) => setFormData({...formData, name: val})}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 h-12 text-slate-900 dark:text-white font-bold"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Email Address *</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
                  <Mail size={18} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.email}
                    onChangeText={(val) => setFormData({...formData, email: val})}
                    placeholder="e.g. john@example.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 h-12 text-slate-900 dark:text-white font-bold"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Phone Number <Text className="lowercase tracking-normal font-medium text-slate-400">(optional)</Text></Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
                  <Phone size={18} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.mobile}
                    onChangeText={(val) => setFormData({...formData, mobile: val})}
                    placeholder="e.g. +1234567890"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    className="flex-1 h-12 text-slate-900 dark:text-white font-medium"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Referral Code <Text className="lowercase tracking-normal font-medium text-slate-400">(optional)</Text></Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
                  <Hash size={18} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.partnerReferralCode}
                    onChangeText={(val) => setFormData({...formData, partnerReferralCode: val.toUpperCase()})}
                    placeholder="Partner Code"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    className="flex-1 h-12 text-slate-900 dark:text-white font-mono font-bold uppercase"
                  />
                </View>
              </View>
              
              <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                <View>
                  <Text className="text-sm font-black text-slate-900 dark:text-white mb-0.5">Active Status</Text>
                  <Text className="text-xs font-medium text-slate-500">Allow this code to be used for new signups</Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={(val) => setFormData({...formData, isActive: val})}
                  trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
                  thumbColor={Platform.OS === "ios" ? "#ffffff" : formData.isActive ? "#ffffff" : "#f1f5f9"}
                />
              </View>

            </View>
          </ScrollView>

          <View className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Pressable 
              onPress={handleUpdate} 
              disabled={isUpdating}
              className="bg-blue-600 active:bg-blue-700 py-4 rounded-xl flex-row items-center justify-center shadow-sm"
            >
              {isUpdating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Edit2 size={20} className="text-white mr-2" />
                  <Text className="text-white font-black text-base">Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
