import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Gift } from "lucide-react-native";
import { API_BASE_URL } from "@/services/api/baseApi";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSelector } from "react-redux";

export default function MyCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useSelector((state: any) => state.auth.token);

  useEffect(() => {
    fetch(`${API_BASE_URL}/coupons/my-coupons`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCoupons(data.data);
        }
      })
      .catch((err) => {
        console.error(err);
        Alert.alert("Error", "Failed to fetch coupons");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">My Coupons</Text>
          <View className="w-10" />
        </View>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : coupons.length === 0 ? (
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Gift size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium">No coupons have been assigned to you yet.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {coupons.map((c) => (
              <View key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <Text className="text-xl font-black text-blue-600 dark:text-blue-400 mb-2">{c.code}</Text>
                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Discount: <Text className="font-bold text-slate-800 dark:text-slate-100">{c.discountValue} {c.discountType === 'PERCENTAGE' ? '%' : '₹'}</Text>
                </Text>
                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2">
                  Total Times Used: <Text className="font-bold text-slate-800 dark:text-slate-100">{c.usesCount}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
