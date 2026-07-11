import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Gift, UserPlus, Users, Trash2, X, Search, Mail, Phone, Hash, User } from "lucide-react-native";
import { 
  useGetAllReferralPartnersQuery, 
  useCreateReferralPartnerMutation, 
  useDeleteReferralPartnerMutation 
} from "@/services/api/partnerReferralApi";

export default function ReferralsPage() {
  const { data, isLoading, refetch } = useGetAllReferralPartnersQuery();
  const [createPartner, { isLoading: isCreating }] = useCreateReferralPartnerMutation();
  const [deletePartner, { isLoading: isDeleting }] = useDeleteReferralPartnerMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    partnerReferralCode: ""
  });

  const referralPartners = useMemo(() => data?.data || [], [data]);

  const filteredPartners = useMemo(() => {
    return referralPartners.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.partnerReferralCode && p.partnerReferralCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [referralPartners, searchTerm]);

  const totalReferredOrgs = useMemo(() => {
    return referralPartners.reduce((acc, curr) => acc + (curr._count?.referredOrganizations || 0), 0);
  }, [referralPartners]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      partnerReferralCode: ""
    });
  };

  const handleOpenForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Remove Partner",
      "Are you sure you want to delete this referral partner? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deletePartner(id).unwrap();
              refetch();
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to remove partner");
            }
          } 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      return Alert.alert("Validation Error", "Name and email are required");
    }

    try {
      await createPartner(formData).unwrap();
      setShowForm(false);
      resetForm();
      refetch();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to add referral partner");
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Partner Referrals</Text>
          <Pressable onPress={handleOpenForm} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <UserPlus size={20} className="text-blue-600 dark:text-blue-400" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}>
        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Partners</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{referralPartners.length}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Referred Orgs</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{totalReferredOrgs}</Text>
          </View>
        </View>

        {/* Search */}
        <View className="mb-6 bg-white dark:bg-slate-900/80 p-2 rounded-[24px] border border-slate-200 dark:border-slate-800 flex-row items-center shadow-sm">
          <View className="pl-3 pr-2">
            <Search size={18} className="text-slate-400" />
          </View>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search partners..."
            placeholderTextColor="#94a3b8"
            className="flex-1 h-10 text-sm font-semibold text-slate-900 dark:text-white"
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => setSearchTerm("")} className="p-2">
              <X size={16} className="text-slate-400" />
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredPartners.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8 py-16">
            <View className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-900/80 items-center justify-center mb-6">
              <Gift size={48} className="text-slate-300 dark:text-slate-700" />
            </View>
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">No Partners Found</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-8">
              {searchTerm ? "No partners match your search criteria." : "You haven't designated any referral partners yet."}
            </Text>
            
            {!searchTerm && (
              <Pressable onPress={handleOpenForm} className="bg-blue-600 active:bg-blue-700 px-8 py-4 rounded-[24px] flex-row items-center justify-center shadow-sm shadow-blue-600/20">
                <UserPlus size={20} className="text-white mr-2" />
                <Text className="text-white font-bold text-base">Add New Partner</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="space-y-4">
            {filteredPartners.map((partner) => (
              <View key={partner.id} className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 flex-row items-center justify-between shadow-sm">
                <View className="flex-1">
                  <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white mb-0.5">{partner.name}</Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{partner.email}</Text>
                  
                  <View className="flex-row items-center gap-3">
                    <View className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                      <Text className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {partner.partnerReferralCode}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {partner._count?.referredOrganizations || 0} Orgs
                    </Text>
                  </View>
                </View>
                <View className="pl-4 border-l border-slate-100 dark:border-slate-800 ml-4 h-full justify-center">
                  <Pressable 
                    onPress={() => handleDelete(partner.id)} 
                    disabled={isDeleting}
                    className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30 active:bg-rose-100 dark:active:bg-rose-900/50"
                  >
                    <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Partner Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white dark:bg-slate-950">
          <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between bg-white dark:bg-slate-900/80 shadow-sm">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Add Referral Partner</Text>
            <Pressable onPress={() => setShowForm(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </Pressable>
          </View>
          
          <ScrollView className="flex-1 px-5 py-6">
            <View className="space-y-5 mb-8">
              
              <View>
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Full Name *</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
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
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
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
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
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
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1">
                  <Hash size={18} className="text-slate-400 mr-3" />
                  <TextInput
                    value={formData.partnerReferralCode}
                    onChangeText={(val) => setFormData({...formData, partnerReferralCode: val.toUpperCase()})}
                    placeholder="Leave blank to auto-generate"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    className="flex-1 h-12 text-slate-900 dark:text-white font-mono font-bold uppercase"
                  />
                </View>
              </View>

            </View>
          </ScrollView>

          <View className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm">
            <Pressable 
              onPress={handleSubmit} 
              disabled={isCreating}
              className="bg-blue-600 active:bg-blue-700 py-4 rounded-xl flex-row items-center justify-center shadow-sm"
            >
              {isCreating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <UserPlus size={20} className="text-white mr-2" />
                  <Text className="text-white font-black text-base">Save Partner</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}