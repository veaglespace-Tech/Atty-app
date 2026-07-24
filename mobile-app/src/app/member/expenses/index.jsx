import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert, Linking } from "react-native";
import { Receipt, Plus, FileText, ChevronRight } from "lucide-react-native";
import { useSelector } from "react-redux";
import { API_BASE_URL } from "@/services/api/baseApi";
import { useAuthSession } from "@/hooks/useAuthSession";
import RaiseClaimModal from "@/components/member/expenses/RaiseClaimModal";

export default function MemberExpenses() {
  const { user } = useAuthSession();
  const token = useSelector((state) => state.auth.token);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!user?.organization?.hasERP) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/claims/my-claims`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setClaims(data.data);
      } else {
        Alert.alert("Error", data.message || "Failed to load claims");
      }
    } catch (err) {
      Alert.alert("Error", "Network error while loading claims");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClaims();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return 'text-emerald-600 dark:text-emerald-400';
      case 'PENDING': return 'text-amber-600 dark:text-amber-400';
      case 'REJECTED': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-slate-500';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'APPROVED': return 'bg-emerald-100/50 dark:bg-emerald-900/30';
      case 'PENDING': return 'bg-amber-100/50 dark:bg-amber-900/30';
      case 'REJECTED': return 'bg-rose-100/50 dark:bg-rose-900/30';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  const openReceipt = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open receipt URL"));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (user && !user?.organization?.hasERP) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <Text className="text-xl font-bold text-slate-900 dark:text-white text-center">ERP Feature Locked</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
          Your organization has not unlocked ERP capabilities.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        {/* Header Hero */}
        <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
          <View className="p-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Receipt size={24} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Pressable 
                onPress={() => setShowModal(true)}
                className="flex-row items-center gap-2 bg-slate-900 dark:bg-white px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                <Plus size={16} className="text-white dark:text-slate-900" />
                <Text className="font-bold text-white dark:text-slate-900 text-sm">Raise Claim</Text>
              </Pressable>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">My Claims</Text>
            <Text className="text-sm font-medium text-slate-500 mt-1">Submit and track your expenses</Text>
          </View>
        </View>

        {/* Claims List */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Claim History
            </Text>
            <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {claims.length} CLAIMS
              </Text>
            </View>
          </View>

          {claims.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <FileText size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
              <Text className="text-slate-500 font-semibold text-center">No claims submitted yet.</Text>
            </View>
          ) : (
            <View className="gap-y-3">
              {claims.map((claim) => (
                <View key={claim.id} className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-4">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        {claim.expenseType}
                      </Text>
                      {claim.description ? (
                        <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                          {claim.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-base font-black text-slate-900 dark:text-white">
                      ₹{claim.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </Text>
                    
                    <View className="flex-row items-center gap-3">
                      {claim.receiptUrl && (
                        <Pressable onPress={() => openReceipt(claim.receiptUrl)} className="flex-row items-center gap-1 active:opacity-70">
                          <FileText size={12} className="text-blue-600 dark:text-blue-400" />
                          <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">Receipt</Text>
                        </Pressable>
                      )}
                      
                      <View className={`px-2 py-1 rounded-md ${getStatusBg(claim.status)}`}>
                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <RaiseClaimModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={() => {
          setShowModal(false);
          onRefresh();
        }}
      />
    </View>
  );
}
