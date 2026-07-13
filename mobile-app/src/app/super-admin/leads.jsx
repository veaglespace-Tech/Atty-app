import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Users, Trash2, Mail, Phone, MapPin, Search, Eye, X } from "lucide-react-native";
import { useGetSuperAdminLeadsQuery, useDeleteSuperAdminLeadMutation } from "@/services/api/superAdminApi";

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminLeadsQuery();
  const [deleteLead, { isLoading: isDeleting }] = useDeleteSuperAdminLeadMutation();

  const leads = useMemo(() => {
    let filtered = data?.data || data?.items || [];
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) || 
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.adminName && l.adminName.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [data, search]);

  const loading = isLoading || isFetching;

  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Lead",
      `Are you sure you want to delete lead '${name}'?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteLead(id).unwrap();
            } catch (error) {
              Alert.alert("Error", error?.data?.message || "Failed to delete lead");
            }
          } 
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Leads</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or admin..."
            placeholderTextColor="#94a3b8"
            className="flex-1 p-2.5 text-slate-900 dark:text-white font-medium outline-none"
          />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && leads.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : leads.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium text-center">No leads found.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              {leads.length} Leads Found
            </Text>
            {leads.map((lead) => (
              <View key={lead.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-lg font-black text-slate-900 dark:text-white mb-1">{lead.name}</Text>
                    <Text className="text-xs font-bold text-slate-500">Admin: {lead.adminName !== "-" ? lead.adminName : "(Not provided)"}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable 
                      onPress={() => setSelectedLead(lead)}
                      className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                      <Eye size={18} className="text-blue-600 dark:text-blue-400" />
                    </Pressable>
                    <Pressable 
                      disabled={isDeleting}
                      onPress={() => handleDelete(lead.id, lead.name)}
                      className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
                      <Trash2 size={18} className="text-rose-600 dark:text-rose-400" />
                    </Pressable>
                  </View>
                </View>

                <View className="space-y-2 mb-4">
                  <View className="flex-row items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lead.email}</Text>
                  </View>
                  {!!lead.phone && (
                    <View className="flex-row items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lead.phone}</Text>
                    </View>
                  )}
                  {!!(lead.city || lead.country) && (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Text className="text-xs font-medium text-slate-400 text-right">
                    Received {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Lead Details Modal */}
      <Modal visible={!!selectedLead} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden max-h-[90%]">
            <View className="flex-row items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-lg font-black text-slate-900 dark:text-white">Lead Details</Text>
              <Pressable 
                onPress={() => setSelectedLead(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={18} className="text-slate-500" />
              </Pressable>
            </View>
            
            <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 40 }}>
              {selectedLead && (
                <View className="space-y-6">
                  {/* Organization Details */}
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Organization Details</Text>
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                      <View>
                        <Text className="text-xs font-semibold text-slate-500 mb-0.5">Name</Text>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.name}</Text>
                      </View>
                      <View>
                        <Text className="text-xs font-semibold text-slate-500 mb-0.5">Email</Text>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.email}</Text>
                      </View>
                      <View>
                        <Text className="text-xs font-semibold text-slate-500 mb-0.5">Phone</Text>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.phone || "-"}</Text>
                      </View>
                      <View className="flex-row flex-wrap gap-y-3">
                        <View className="w-1/2 pr-2">
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">City</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.city || "-"}</Text>
                        </View>
                        <View className="w-1/2 pr-2">
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">State</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.state || "-"}</Text>
                        </View>
                        <View className="w-1/2 pr-2">
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">Country</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.country || "-"}</Text>
                        </View>
                      </View>
                      <View>
                        <Text className="text-xs font-semibold text-slate-500 mb-0.5">Address</Text>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.address || "-"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Admin Info */}
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Admin Info</Text>
                    {selectedLead.adminName === "-" && selectedLead.adminEmail === "-" ? (
                      <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center justify-center">
                        <Text className="text-xs font-medium text-slate-500 italic">User did not proceed to the admin setup step.</Text>
                      </View>
                    ) : (
                      <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <View>
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">Name</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.adminName !== "-" ? selectedLead.adminName : "-"}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">Email</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.adminEmail !== "-" ? selectedLead.adminEmail : "-"}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-semibold text-slate-500 mb-0.5">Phone</Text>
                          <Text className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.adminPhone !== "-" ? selectedLead.adminPhone : "-"}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Registration Date */}
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Registration Date</Text>
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">
                        {new Date(selectedLead.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}