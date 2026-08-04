import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Linking, Alert } from "react-native";
import { Link } from "expo-router";
import { Receipt, FileText, Package, ArrowDownCircle, ArrowUpCircle, CheckCircle, Plus } from "lucide-react-native";
import { 
  useGetOrgExpensesBalanceQuery,
  useGetOrgClaimsQuery,
  useGetOrgStockQuery 
} from "@/services/api/orgApi";
import DepositModal from "@/components/org/expenses/DepositModal";
import WithdrawModal from "@/components/org/expenses/WithdrawModal";
import SettleClaimModal from "@/components/org/expenses/SettleClaimModal";
import AddStockModal from "@/components/org/expenses/AddStockModal";

export default function OrgExpenses() {
  const [activeTab, setActiveTab] = useState("expenses"); // expenses, claims, stocks
  
  // Queries
  const { data: expensesData, isFetching: isFetchingExpenses, refetch: refetchExpenses } = useGetOrgExpensesBalanceQuery("");
  const { data: claimsData, isFetching: isFetchingClaims, refetch: refetchClaims } = useGetOrgClaimsQuery("");
  const { data: stockData, isFetching: isFetchingStock, refetch: refetchStock } = useGetOrgStockQuery();

  // Modals
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSettleClaim, setShowSettleClaim] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  const isFetching = isFetchingExpenses || isFetchingClaims || isFetchingStock;
  const onRefresh = useCallback(() => {
    refetchExpenses();
    refetchClaims();
    refetchStock();
  }, [refetchExpenses, refetchClaims, refetchStock]);

  const transactionsList = expensesData?.transactions || expensesData?.data?.transactions || [];
  const balance = expensesData?.fundBalance || expensesData?.data?.fundBalance || 0;
  const claims = claimsData?.data || [];
  const stocks = stockData?.data || [];

  const getStatusColor = (status) => {
    switch(status?.toUpperCase()) {
      case 'APPROVED': return 'text-emerald-600 dark:text-emerald-400';
      case 'PENDING': return 'text-amber-600 dark:text-amber-400';
      case 'REJECTED': return 'text-rose-600 dark:text-rose-400';
      default: return 'text-slate-500';
    }
  };

  const getStatusBg = (status) => {
    switch(status?.toUpperCase()) {
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

  const renderTabs = () => (
    <View className="flex-row items-center justify-between mb-4 bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl mx-4">
      {['expenses', 'claims', 'stocks'].map((tab) => (
        <Pressable
          key={tab}
          onPress={() => setActiveTab(tab)}
          className={`flex-1 py-2.5 items-center rounded-xl transition-colors ${
            activeTab === tab ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-transparent'
          }`}
        >
          <Text className={`text-sm font-bold capitalize ${
            activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
          }`}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderExpensesTab = () => (
    <View className="px-4 pb-24">
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
          
          <View className="flex-row gap-3 mt-2">
            <Pressable 
              onPress={() => setShowDeposit(true)}
              className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 py-3 rounded-xl flex-row items-center justify-center gap-2"
            >
              <ArrowDownCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
              <Text className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Deposit</Text>
            </Pressable>
            <Pressable 
              onPress={() => setShowWithdraw(true)}
              className="flex-1 bg-rose-100 dark:bg-rose-900/30 py-3 rounded-xl flex-row items-center justify-center gap-2"
            >
              <ArrowUpCircle size={16} className="text-rose-600 dark:text-rose-400" />
              <Text className="text-rose-700 dark:text-rose-300 font-bold text-sm">Withdraw</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Transactions
          </Text>
          <View className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
            <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {transactionsList.length} ITEMS
            </Text>
          </View>
        </View>

        <View className="gap-y-3">
          {transactionsList.length === 0 ? (
            <Text className="text-center text-slate-500 py-4">No transactions found.</Text>
          ) : (
            transactionsList.map((expense) => {
              const title = expense.title || 'Untitled Transaction';
              const amount = expense.amount || 0;
              const type = expense.type || 'UNKNOWN';
              const date = expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A';
              const status = expense.status || (type === 'DEPOSIT' ? 'APPROVED' : 'PENDING');
              
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
            })
          )}
        </View>
      </View>
    </View>
  );

  const renderClaimsTab = () => (
    <View className="px-4 pb-24">
      <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xl font-black text-slate-900 dark:text-white">Claims</Text>
            <Text className="text-xs text-slate-500">Employee expense claims</Text>
          </View>
          <Pressable 
            onPress={() => setShowSettleClaim(true)}
            className="flex-row items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-xl"
          >
            <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />
            <Text className="font-bold text-blue-700 dark:text-blue-300 text-xs">Settle</Text>
          </Pressable>
        </View>

        <View className="gap-y-3">
          {claims.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <FileText size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
              <Text className="text-slate-500 font-semibold text-center">No claims submitted yet.</Text>
            </View>
          ) : (
            claims.map((claim) => (
              <View key={claim.id} className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-4">
                    <Text className="text-xs text-blue-600 font-bold mb-1">{claim.claimNo}</Text>
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
            ))
          )}
        </View>
      </View>
    </View>
  );

  const renderStocksTab = () => (
    <View className="px-4 pb-24">
      <View className="bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xl font-black text-slate-900 dark:text-white">Stock</Text>
            <Text className="text-xs text-slate-500">Inventory and assets</Text>
          </View>
          <Pressable 
            onPress={() => setShowAddStock(true)}
            className="flex-row items-center gap-2 bg-slate-900 dark:bg-white px-3 py-2 rounded-xl"
          >
            <Plus size={16} className="text-white dark:text-slate-900" />
            <Text className="font-bold text-white dark:text-slate-900 text-xs">Add Stock</Text>
          </Pressable>
        </View>

        <View className="gap-y-3">
          {stocks.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Package size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
              <Text className="text-slate-500 font-semibold text-center">No stock available.</Text>
            </View>
          ) : (
            stocks.map((item) => (
              <View key={item.id} className="p-4 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800">
                    <Package size={20} className="text-slate-600 dark:text-slate-400" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {item.type}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-black text-slate-900 dark:text-white">
                    {item.quantity}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Units
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView 
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        {renderTabs()}
        
        {activeTab === 'expenses' && renderExpensesTab()}
        {activeTab === 'claims' && renderClaimsTab()}
        {activeTab === 'stocks' && renderStocksTab()}
      </ScrollView>

      {/* Modals */}
      <DepositModal visible={showDeposit} onClose={() => setShowDeposit(false)} onSuccess={() => { setShowDeposit(false); onRefresh(); }} />
      <WithdrawModal visible={showWithdraw} onClose={() => setShowWithdraw(false)} onSuccess={() => { setShowWithdraw(false); onRefresh(); }} />
      <SettleClaimModal visible={showSettleClaim} onClose={() => setShowSettleClaim(false)} onSuccess={() => { setShowSettleClaim(false); onRefresh(); }} claims={claims} />
      <AddStockModal visible={showAddStock} onClose={() => setShowAddStock(false)} onSuccess={() => { setShowAddStock(false); onRefresh(); }} />
    </View>
  );
}
