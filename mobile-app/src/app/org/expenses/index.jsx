import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Link } from "expo-router";
import { Receipt } from "lucide-react-native";
import { useGetOrgExpensesBalanceQuery } from "@/services/api/orgApi";

export default function OrgExpenses() {
  const { data, isFetching, refetch } = useGetOrgExpensesBalanceQuery("");

  const transactionsList = data?.transactions || data?.data?.transactions || [];
  const balance = data?.fundBalance || data?.data?.fundBalance || 0;

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
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
    >
      <View className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />
        <View className="p-5">
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                Finance
              </Text>
              <Text className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                ₹{balance.toLocaleString('en-IN')}
              </Text>
              <Text className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                Total Fund Balance
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Receipt size={20} className="text-slate-900 dark:text-white" />
            </View>
          </View>
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Recent Claims
            </Text>
          </View>
          <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {transactionsList.length} TRANSACTIONS
            </Text>
          </View>
        </View>

        <View className="gap-y-3">
          {transactionsList.map((expense) => {
            const title = expense.title || 'Untitled Transaction';
            const amount = expense.amount || 0;
            const type = expense.type || 'UNKNOWN';
            const date = expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A';
            const status = expense.status || (type === 'DEPOSIT' ? 'Approved' : 'Pending');
            
            return (
            <Link href={`/org/expenses/${expense.id}`} asChild key={expense.id}>
              <Pressable className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-transform">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white flex-1 mr-4">
                    {title}
                  </Text>
                  <Text className={`text-sm font-black ${type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    {type === 'DEPOSIT' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-end mt-1">
                  <View>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {type}
                    </Text>
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {date}
                    </Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded ${getStatusBg(status)}`}>
                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                      {status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
