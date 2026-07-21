import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, Receipt, CheckCircle, XCircle } from "lucide-react-native";

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams();

  // Mock data for the specific expense
  const expense = {
    id,
    title: 'Client Dinner',
    amount: 12500,
    status: 'Pending',
    date: 'Oct 14, 2026',
    user: 'John Smith',
    category: 'Meals & Entertainment',
    description: 'Dinner with the prospective clients from Acme Corp to discuss Q4 strategy and partnerships.',
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'text-emerald-600 dark:text-emerald-400';
      case 'Pending': return 'text-amber-600 dark:text-amber-400';
      case 'Rejected': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-slate-500';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100/50 dark:bg-emerald-900/30';
      case 'Pending': return 'bg-amber-100/50 dark:bg-amber-900/30';
      case 'Rejected': return 'bg-rose-100/50 dark:bg-rose-900/30';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <View className="px-4 py-4 pt-12 flex-row items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Pressable 
          onPress={() => router.back()} 
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 mr-3"
        >
          <ArrowLeft size={20} className="text-slate-900 dark:text-white" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Expense Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* HERO CARD */}
        <View className="mb-6 rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm p-6 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 dark:bg-blue-900/30 mb-4">
            <Receipt size={32} className="text-blue-600 dark:text-blue-400" />
          </View>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{expense.category}</Text>
          <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            ₹{expense.amount.toLocaleString('en-IN')}
          </Text>
          <View className={`px-3 py-1 rounded-full ${getStatusBg(expense.status)}`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${getStatusColor(expense.status)}`}>
              {expense.status}
            </Text>
          </View>
        </View>

        {/* DETAILS LIST */}
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm mb-6">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4">
            Information
          </Text>
          
          <View className="mb-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Title</Text>
            <Text className="text-sm font-medium text-slate-900 dark:text-white">{expense.title}</Text>
          </View>
          
          <View className="mb-4 flex-row">
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Submitted By</Text>
              <Text className="text-sm font-medium text-slate-900 dark:text-white">{expense.user}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Date</Text>
              <Text className="text-sm font-medium text-slate-900 dark:text-white">{expense.date}</Text>
            </View>
          </View>
          
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Description</Text>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              {expense.description}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS (MOCK) */}
        {expense.status === 'Pending' && (
          <View className="flex-row gap-4 mt-2">
            <Pressable className="flex-1 flex-row items-center justify-center py-4 rounded-2xl bg-emerald-500 dark:bg-emerald-600 active:opacity-80">
              <CheckCircle size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-base">Approve</Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center py-4 rounded-2xl bg-rose-500 dark:bg-rose-600 active:opacity-80">
              <XCircle size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-base">Reject</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
