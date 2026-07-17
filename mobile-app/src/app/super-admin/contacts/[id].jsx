import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Trash2, Mail, User, Clock, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useGetSuperAdminContactByIdQuery, usePatchSuperAdminContactMutation, useDeleteSuperAdminContactMutation } from '@/services/api/superAdminApi';

const STATUS_OPTIONS = [
  { label: 'New / Pending', value: 'NEW' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, error } = useGetSuperAdminContactByIdQuery(id, { skip: !id });
  const [patchContact, { isLoading: isUpdating }] = usePatchSuperAdminContactMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteSuperAdminContactMutation();

  const inquiry = data?.item;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard');
    } else {
      router.replace('/super-admin/contacts');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await patchContact({ id, status: newStatus }).unwrap();
    } catch (err) {
      Alert.alert('Error', err?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(id).unwrap();
              handleBack();
            } catch (err) {
              Alert.alert('Error', err?.data?.message || 'Failed to delete message');
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
      </View>
    );
  }

  if (error || !inquiry) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C] items-center justify-center p-6">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <Text className="text-xl font-black text-slate-900 dark:text-white mb-6">Inquiry not found</Text>
        <Pressable onPress={handleBack} className="bg-blue-600 px-6 py-3 rounded-xl">
          <Text className="text-white font-bold">Go back to list</Text>
        </Pressable>
      </View>
    );
  }

  const StatusCard = ({ label, status, errorMsg }) => {
    const isSuccess = status === "SUCCESS";
    return (
      <View className={`flex-1 rounded-2xl p-4 border ${isSuccess ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`}>
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Text>
          {isSuccess ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-500" />}
        </View>
        <Text className={`mt-2 text-sm font-bold ${isSuccess ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {status || 'PENDING'}
        </Text>
        {errorMsg ? <Text className="mt-1 text-[10px] text-rose-500 font-medium">{errorMsg}</Text> : null}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 flex-row items-center justify-between">
        <Pressable onPress={handleBack} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Message Details</Text>
        <Pressable onPress={handleDelete} disabled={isDeleting} className="h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
          <Trash2 size={18} className="text-rose-600 dark:text-rose-400" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 mb-6">
          <Text className="text-2xl font-black text-slate-900 dark:text-white mb-6">{inquiry.subject}</Text>
          
          <View className="space-y-3 mb-6">
            <View className="flex-row items-center bg-slate-50 dark:bg-[#0A0F1C] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <User size={16} className="text-slate-400 mr-3" />
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">From</Text>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">{inquiry.name}</Text>
              </View>
            </View>
            <View className="flex-row items-center bg-slate-50 dark:bg-[#0A0F1C] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <Mail size={16} className="text-slate-400 mr-3" />
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</Text>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">{inquiry.email}</Text>
              </View>
            </View>
            <View className="flex-row items-center bg-slate-50 dark:bg-[#0A0F1C] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <Clock size={16} className="text-slate-400 mr-3" />
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Received</Text>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">{new Date(inquiry.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Update Status</Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handleStatusChange(opt.value)}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-full border ${inquiry.status === opt.value ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                >
                  <Text className={`text-xs font-bold ${inquiry.status === opt.value ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-slate-400" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message Content</Text>
            </View>
            <View className="bg-slate-50 dark:bg-[#0A0F1C] p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Text className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{inquiry.message}</Text>
            </View>
          </View>

          <View className="flex-row gap-4">
            <StatusCard label="Admin Notification" status={inquiry.adminMailStatus} errorMsg={inquiry.adminNotificationError} />
            <StatusCard label="User Confirmation" status={inquiry.requesterMailStatus} errorMsg={inquiry.requesterNotificationError} />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
