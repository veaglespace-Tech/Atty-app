import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CheckCircle2, XCircle, ShieldCheck, FileWarning } from "lucide-react-native";

import {
  useGetOrgRegistrationRequestsQuery,
  useAcceptRegistrationRequestMutation,
  useRejectRegistrationRequestMutation,
  useGetOrgRegularizationRequestsQuery,
  useApproveRegularizationRequestMutation,
  useRejectRegularizationRequestMutation } from
"@/services/api/orgApi";

export default function OrgRequestsPage() {
  const [activeTab, setActiveTab] = useState("REGISTRATION");

  const { data: regData, isLoading: isRegLoading, isFetching: isRegFetching, refetch: refetchReg } = useGetOrgRegistrationRequestsQuery(undefined);
  const { data: attData, isLoading: isAttLoading, isFetching: isAttFetching, refetch: refetchAtt } = useGetOrgRegularizationRequestsQuery(undefined);

  const regItems = Array.isArray(regData?.items) ? regData.items : [];
  const attItems = Array.isArray(attData?.data) ? attData.data.filter((r) => r.status === "PENDING") : [];

  const loading = isRegLoading || isRegFetching || isAttLoading || isAttFetching;

  const refresh = () => {
    refetchReg();
    refetchAtt();
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Requests</Text>
        </View>

        <View className="flex-row mt-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveTab("REGISTRATION")}
            className={`flex-1 items-center justify-center py-2.5 rounded-lg ${activeTab === "REGISTRATION" ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}>
            
            <Text className={`text-[13px] font-bold ${activeTab === "REGISTRATION" ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>Registration ({regItems.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("ATTENDANCE")}
            className={`flex-1 items-center justify-center py-2.5 rounded-lg ${activeTab === "ATTENDANCE" ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}>
            
            <Text className={`text-[13px] font-bold ${activeTab === "ATTENDANCE" ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>Attendance ({attItems.length})</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2563eb" />}>
        
        <View style={{ display: activeTab === "REGISTRATION" ? "flex" : "none" }}>
          <RegistrationRequestsTab items={regItems} loading={isRegLoading || isRegFetching} refetch={refetchReg} />
        </View>
        
        <View style={{ display: activeTab === "ATTENDANCE" ? "flex" : "none" }}>
          <AttendanceRequestsTab items={attItems} loading={isAttLoading || isAttFetching} refetch={refetchAtt} />
        </View>
      </ScrollView>
    </View>);

}

function RegistrationRequestsTab({ items, loading, refetch }) {
  const [actionId, setActionId] = useState("");
  const [acceptRequest] = useAcceptRegistrationRequestMutation();
  const [rejectRequest] = useRejectRegistrationRequestMutation();

  const handleAccept = async (id) => {
    try {
      setActionId(id);
      await acceptRequest(id).unwrap();
      Alert.alert("Success", "User approved and registered successfully.");
      refetch();
    } catch (e) {
      Alert.alert("Error", e?.data?.message || "Failed to approve request");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (id) => {
    try {
      setActionId(id);
      await rejectRequest({ requestId: id, note: "Rejected by administrator" }).unwrap();
      Alert.alert("Success", "Registration request rejected.");
      refetch();
    } catch (e) {
      Alert.alert("Error", e?.data?.message || "Failed to reject request");
    } finally {
      setActionId("");
    }
  };

  if (items.length === 0) {
    return (
      <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 mt-4 shadow-sm">
        <ShieldCheck size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
        <Text className="text-slate-500 font-medium">No pending registration requests</Text>
      </View>);

  }

  return (
    <View className="gap-4">
      {items.map((item) => {
        const busy = actionId === item.id;
        return (
          <View key={item.id} className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-base font-bold text-slate-900 dark:text-white">{item.name || "Unknown"}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.email}</Text>
            {item.mobile && <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.mobile}</Text>}
            
            <View className="flex-row gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Pressable
                disabled={busy}
                onPress={() => handleAccept(item.id)}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50">
                
                {busy ? <ActivityIndicator size="small" color="#2563eb" /> :
                <>
                    <CheckCircle2 size={16} color="#2563eb" />
                    <Text className="font-bold text-blue-700 dark:text-blue-400 ml-1.5">Approve</Text>
                  </>
                }
              </Pressable>
              
              <Pressable
                disabled={busy}
                onPress={() => handleReject(item.id)}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50">
                
                {busy ? <ActivityIndicator size="small" color="#e11d48" /> :
                <>
                    <XCircle size={16} color="#e11d48" />
                    <Text className="font-bold text-rose-700 dark:text-rose-400 ml-1.5">Reject</Text>
                  </>
                }
              </Pressable>
            </View>
          </View>);

      })}
    </View>);

}

function AttendanceRequestsTab({ items, loading, refetch }) {
  const [actionId, setActionId] = useState("");
  const [approveRequest] = useApproveRegularizationRequestMutation();
  const [rejectRequest] = useRejectRegularizationRequestMutation();

  const handleApprove = async (id) => {
    try {
      setActionId(id);
      await approveRequest(id).unwrap();
      Alert.alert("Success", "Request approved and attendance updated to REGULARIZED.");
      refetch();
    } catch (e) {
      Alert.alert("Error", e?.data?.message || "Failed to approve request");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (id) => {
    try {
      setActionId(id);
      await rejectRequest({ id, note: "Rejected by administrator" }).unwrap();
      Alert.alert("Success", "Request rejected.");
      refetch();
    } catch (e) {
      Alert.alert("Error", e?.data?.message || "Failed to reject request");
    } finally {
      setActionId("");
    }
  };

  if (items.length === 0) {
    return (
      <View className="py-12 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 mt-4 shadow-sm">
        <FileWarning size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
        <Text className="text-slate-500 font-medium">No pending attendance issues</Text>
      </View>);

  }

  return (
    <View className="gap-4">
      {items.map((item) => {
        const busy = actionId === item.id;
        return (
          <View key={item.id} className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-base font-bold text-slate-900 dark:text-white">{item.user?.name || "Unknown"}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.user?.email}</Text>
            
            <View className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-3">
              <Text className="text-[10px] font-black uppercase text-slate-400">Date</Text>
              <Text className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{item.date}</Text>
              
              <Text className="text-[10px] font-black uppercase text-slate-400">Reason</Text>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.reason}</Text>
            </View>
            
            <View className="flex-row gap-3 mt-4">
              <Pressable
                disabled={busy}
                onPress={() => handleApprove(item.id)}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50">
                
                {busy ? <ActivityIndicator size="small" color="#2563eb" /> :
                <>
                    <CheckCircle2 size={16} color="#2563eb" />
                    <Text className="font-bold text-blue-700 dark:text-blue-400 ml-1.5">Approve</Text>
                  </>
                }
              </Pressable>
              
              <Pressable
                disabled={busy}
                onPress={() => handleReject(item.id)}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50">
                
                {busy ? <ActivityIndicator size="small" color="#e11d48" /> :
                <>
                    <XCircle size={16} color="#e11d48" />
                    <Text className="font-bold text-rose-700 dark:text-rose-400 ml-1.5">Reject</Text>
                  </>
                }
              </Pressable>
            </View>
          </View>);

      })}
    </View>);

}