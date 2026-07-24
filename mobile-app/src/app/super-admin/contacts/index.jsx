import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Book, Trash2, Mail, CheckCircle2, MessageSquare } from "lucide-react-native";
import { useGetSuperAdminContactInquiriesQuery, useDeleteSuperAdminContactMutation } from "@/services/api/superAdminApi";

export default function ContactsPage() {
  const { data, isLoading, isFetching, refetch } = useGetSuperAdminContactInquiriesQuery();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteSuperAdminContactMutation();

  const contacts = useMemo(() => data?.items || [], [data]);

  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to permanently delete the inquiry from '${name}'?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteContact(id).unwrap();
            } catch (error) {
              Alert.alert("Error", error?.data?.message || "Failed to delete contact inquiry");
            }
          } 
        }
      ]
    );
  };

  const renderBadge = (status) => {
    const isNew = status === "NEW";
    const colors = isNew 
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    
    return (
      <View className={`px-2 py-1 rounded border ${colors}`}>
        <Text className={`text-[10px] font-black uppercase tracking-widest ${colors.split(' ')[2]} ${colors.split(' ')[3]}`}>
          {status || "UNKNOWN"}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.push('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Contacts</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && contacts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : contacts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <Book size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white text-center">No Inquiries</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no contact inquiries to display.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {contacts.map((contact) => (
              <View key={contact.id} className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-lg font-black text-slate-900 dark:text-white mb-1">{contact.name}</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Mail size={12} className="text-slate-400" />
                      <Text className="text-xs font-semibold text-slate-500">{contact.email}</Text>
                    </View>
                  </View>
                  <View className="items-end gap-2">
                    {renderBadge(contact.status)}
                    <Pressable 
                      disabled={isDeleting}
                      onPress={() => handleDelete(contact.id, contact.name)}
                      className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 -mr-1">
                      <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                    </Pressable>
                  </View>
                </View>

                <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                  <View className="flex-row items-center gap-2 mb-2">
                    <MessageSquare size={14} className="text-slate-400" />
                    <Text className="text-sm font-black text-slate-700 dark:text-slate-200">{contact.subject}</Text>
                  </View>
                  <Text className="text-sm text-slate-600 dark:text-slate-400 leading-5">
                    {contact.message}
                  </Text>
                </View>
                
                <View className="border-t border-slate-100 dark:border-slate-800 pt-3 flex-row justify-between items-center">
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1.5">
                      <CheckCircle2 size={12} className={contact.adminMailStatus === 'SUCCESS' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <CheckCircle2 size={12} className={contact.requesterMailStatus === 'SUCCESS' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">User</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-medium text-slate-400">
                    {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>

                <View className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex-row justify-between items-center">
                  <Text className="text-xs font-semibold text-slate-400">Manage inquiry</Text>
                  <Pressable onPress={() => router.push(`/super-admin/contacts/${contact.id}`)}>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-blue-500">VIEW DETAILS</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
