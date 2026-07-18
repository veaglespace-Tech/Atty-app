"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";
import { API_BASE_URL } from "@/services/api/baseApi";
import { Search, Download, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OrgExpensesPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("expenses"); // "stock", "expenses", "claims"

  // Data states
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [stock, setStock] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals
  const [showStockModal, setShowStockModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states
  const [stockForm, setStockForm] = useState({ name: "", type: "", quantity: 0 });
  const [expenseTab, setExpenseTab] = useState("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [withdrawalType, setWithdrawalType] = useState("");
  const [withdrawalItems, setWithdrawalItems] = useState([{ name: "", amount: "" }]);
  const [withdrawalReceipt, setWithdrawalReceipt] = useState(null);

  // Settle claim states
  const [searchClaimNo, setSearchClaimNo] = useState("");
  const [fetchedClaim, setFetchedClaim] = useState(null);
  const [settleAmountPaid, setSettleAmountPaid] = useState("");
  const [settleReceipt, setSettleReceipt] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, filterType, filterStatus, sortBy, sortOrder]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParamsExp = new URLSearchParams({ search: debouncedSearch, type: filterType, sortBy, sortOrder }).toString();
      const queryParamsClaim = new URLSearchParams({ search: debouncedSearch, status: filterStatus, sortBy, sortOrder }).toString();

      const [resExp, resStock, resClaims] = await Promise.all([
        fetch(`${API_BASE_URL}/org/expenses/balance?${queryParamsExp}`, { credentials: "include" }).then((res) => res.json()),
        fetch(`${API_BASE_URL}/org/stock`, { credentials: "include" }).then((res) => res.json()),
        fetch(`${API_BASE_URL}/claims?${queryParamsClaim}`, { credentials: "include" }).then((res) => res.json()),
      ]);

      if (resExp.success) {
        setBalance(resExp.data.fundBalance);
        setTransactions(resExp.data.transactions);
      }
      if (resStock.success) {
        setStock(resStock.data);
      }
      if (resClaims.success) {
        setClaims(resClaims.data);
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Failed to load data" }));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const queryParamsExp = new URLSearchParams({ search: debouncedSearch, type: filterType }).toString();
    window.open(`${API_BASE_URL}/org/expenses/export/${format}?${queryParamsExp}`, '_blank');
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!stockForm.name || !stockForm.type || stockForm.quantity === "") {
      return dispatch(addNotification({ type: "error", message: "All fields are mandatory" }));
    }
    try {
      const res = await fetch(`${API_BASE_URL}/org/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(stockForm),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addNotification({ type: "success", message: "Stock added successfully" }));
        setShowStockModal(false);
        setStockForm({ name: "", type: "", quantity: 0 });
        fetchData();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to add stock" }));
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Error adding stock" }));
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return dispatch(addNotification({ type: "error", message: "Invalid amount" }));
    try {
      const res = await fetch(`${API_BASE_URL}/org/expenses/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: depositAmount, description: depositDescription }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addNotification({ type: "success", message: "Fund deposited" }));
        setShowExpenseModal(false);
        setDepositAmount("");
        setDepositDescription("");
        fetchData();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to deposit" }));
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Error depositing fund" }));
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!withdrawalType || withdrawalItems.some((item) => !item.name || !item.amount)) {
      return dispatch(addNotification({ type: "error", message: "Please fill all items and type" }));
    }
    const totalAmount = withdrawalItems.reduce((acc, curr) => acc + Number(curr.amount), 0);
    try {
      const formData = new FormData();
      formData.append("withdrawalType", withdrawalType);
      formData.append("totalAmount", totalAmount);
      formData.append("items", JSON.stringify(withdrawalItems));
      if (withdrawalReceipt) {
        formData.append("receipt", withdrawalReceipt);
      }

      const res = await fetch(`${API_BASE_URL}/org/expenses/withdrawal`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addNotification({ type: "success", message: "Withdrawal successful" }));
        setShowExpenseModal(false);
        setWithdrawalType("");
        setWithdrawalItems([{ name: "", amount: "" }]);
        setWithdrawalReceipt(null);
        fetchData();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to withdraw" }));
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Error withdrawing fund" }));
    }
  };

  const handleClaimStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/claims/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addNotification({ type: "success", message: `Claim ${status.toLowerCase()} successfully` }));
        fetchData();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to update claim" }));
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Error updating claim" }));
    }
  };

  const handleFetchClaim = async () => {
    if(!searchClaimNo) return;
    try {
      const res = await fetch(`${API_BASE_URL}/claims/by-no/${searchClaimNo}`, { credentials: "include" });
      const data = await res.json();
      if(data.success) {
        setFetchedClaim(data.data);
        setSettleAmountPaid(data.data.amount);
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Claim not found" }));
        setFetchedClaim(null);
      }
    } catch(err) {
      dispatch(addNotification({ type: "error", message: "Failed to fetch claim" }));
    }
  };

  const handleSettleClaim = async (e) => {
    e.preventDefault();
    if(!fetchedClaim || !settleAmountPaid || !settleReceipt) {
      return dispatch(addNotification({ type: "error", message: "Please fill all details and attach receipt" }));
    }
    const formData = new FormData();
    formData.append("claimNo", fetchedClaim.claimNo);
    formData.append("amountPaid", settleAmountPaid);
    formData.append("receipt", settleReceipt);

    try {
      const res = await fetch(`${API_BASE_URL}/org/expenses/settle-claim`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if(data.success) {
        dispatch(addNotification({ type: "success", message: "Claim settled successfully" }));
        setShowExpenseModal(false);
        setSearchClaimNo("");
        setFetchedClaim(null);
        setSettleAmountPaid("");
        setSettleReceipt(null);
        fetchData();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to settle claim" }));
      }
    } catch(err) {
      dispatch(addNotification({ type: "error", message: "Error settling claim" }));
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funds & Expenses</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage organization funds, stock, and expense claims.</p>
        </div>
        <div className="text-left sm:text-right mt-4 sm:mt-0">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total Balance</p>
          <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-500">₹{balance.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-slate-800">
        {["expenses", "claims", "stock"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500"
                : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      {(activeTab === "expenses" || activeTab === "claims") && (
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            {activeTab === "expenses" && (
              <select
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none dark:text-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="CLAIM_SETTLEMENT">Claim Settlement</option>
              </select>
            )}
            {activeTab === "claims" && (
              <select
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none dark:text-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            )}
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold dark:text-white">Expense Transactions</h2>
            <div className="flex space-x-2">
              <button onClick={() => handleExport('excel')} className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Download className="h-4 w-4" />
                <span>Excel</span>
              </button>
              <button onClick={() => handleExport('pdf')} className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Expenses / Funds
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort('type')}>
                      <div className="flex items-center">Type {sortBy === 'type' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}</div>
                    </th>
                    <th className="p-4">Title</th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort('amount')}>
                      <div className="flex items-center">Amount {sortBy === 'amount' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}</div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort('createdAt')}>
                      <div className="flex items-center">Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500 dark:text-slate-400">Loading transactions...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500 dark:text-slate-400">No transactions found.</td></tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/org/expenses/${tx.id}`)}
                      >
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${tx.type === "DEPOSIT"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-900 dark:text-white">{tx.title}</p>
                          {tx.items && (
                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 space-y-1">
                              {tx.items.length} items included
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                          {tx.type === "DEPOSIT" ? "+" : "-"}₹{tx.amount}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold dark:text-white">Stock Inventory</h2>
            <button
              onClick={() => setShowStockModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add Stock
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stock.length === 0 ? (
              <p className="text-gray-500 dark:text-slate-400 col-span-3 text-center py-8">No stock items available.</p>
            ) : (
              stock.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Type: {item.type}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500 mt-4">{item.quantity}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Added on {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "claims" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold dark:text-white">User Claim Requests</h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-500 dark:text-slate-400 text-center py-8">Loading claims...</p>
            ) : claims.length === 0 ? (
              <p className="text-gray-500 dark:text-slate-400 text-center py-8">No claims found.</p>
            ) : (
              claims.map((claim) => (
                <div key={claim.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{claim.expenseType}</h3>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">Claim No: {claim.claimNo}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      Requested by: {claim.user?.name} ({claim.user?.email})
                    </p>
                    {claim.description && <p className="text-sm text-gray-700 dark:text-slate-300 mt-2 italic">"{claim.description}"</p>}
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">Amount: ₹{claim.amount}</p>
                    {claim.receiptUrl && (
                      <a href={claim.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 text-sm hover:underline mt-2 inline-block">
                        View Receipt
                      </a>
                    )}
                  </div>
                  <div>
                    {claim.status === "PENDING" ? (
                      <div className="space-x-3 flex">
                        <button
                          onClick={() => {
                            setSearchClaimNo(claim.claimNo);
                            setExpenseTab("settle-claim");
                            setShowExpenseModal(true);
                          }}
                          className="bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Settle
                        </button>
                        <button
                          onClick={() => handleClaimStatus(claim.id, "REJECTED")}
                          className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        claim.status === "APPROVED" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                        {claim.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md border dark:border-slate-800">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Add Stock</h2>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={stockForm.type}
                  onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800 mt-4">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-slate-800">
              <button
                className={`pb-2 font-medium ${expenseTab === "deposit" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                onClick={() => setExpenseTab("deposit")}
              >
                Deposit
              </button>
              <button
                className={`pb-2 font-medium ${expenseTab === "withdrawal" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                onClick={() => setExpenseTab("withdrawal")}
              >
                Expense Details
              </button>
              <button
                className={`pb-2 font-medium ${expenseTab === "settle-claim" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                onClick={() => setExpenseTab("settle-claim")}
              >
                Settle Claim
              </button>
            </div>

            {expenseTab === "deposit" && (
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={depositDescription}
                    onChange={(e) => setDepositDescription(e.target.value)}
                    placeholder="e.g. Donation from Sponsor"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800 mt-4">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add Fund</button>
                </div>
              </form>
            )}

            {expenseTab === "withdrawal" && (
              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Expense Type / Title</label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                    value={withdrawalType}
                    onChange={(e) => setWithdrawalType(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Expense Items</label>
                  {withdrawalItems.map((item, idx) => (
                    <div key={idx} className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Water bottle)"
                        className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...withdrawalItems];
                          newItems[idx].name = e.target.value;
                          setWithdrawalItems(newItems);
                        }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        className="w-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...withdrawalItems];
                          newItems[idx].amount = e.target.value;
                          setWithdrawalItems(newItems);
                        }}
                        required
                      />
                      {withdrawalItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = withdrawalItems.filter((_, i) => i !== idx);
                            setWithdrawalItems(newItems);
                          }}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawalItems([...withdrawalItems, { name: "", amount: "" }])}
                    className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Upload Receipt/Bill (Optional)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm dark:text-white"
                    onChange={(e) => setWithdrawalReceipt(e.target.files[0])}
                  />
                </div>
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100 dark:border-slate-800">
                  <div className="font-bold text-gray-900 dark:text-white">
                    Total: ₹{withdrawalItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)}
                  </div>
                  <div className="flex space-x-3">
                    <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add Expense</button>
                  </div>
                </div>
              </form>
            )}

            {expenseTab === "settle-claim" && (
              <form onSubmit={handleSettleClaim} className="space-y-4">
                <div className="flex space-x-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Claim No</label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                      value={searchClaimNo}
                      onChange={(e) => setSearchClaimNo(e.target.value)}
                      placeholder="e.g. CLM-1709123456"
                      required
                    />
                  </div>
                  <button type="button" onClick={handleFetchClaim} className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    Fetch
                  </button>
                </div>

                {fetchedClaim && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 space-y-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fetchedClaim.expenseType}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Requested by: {fetchedClaim.user?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Requested Amount: <span className="font-bold text-gray-900 dark:text-white">₹{fetchedClaim.amount}</span></p>
                    {fetchedClaim.description && <p className="text-sm text-gray-700 dark:text-slate-300 italic border-l-2 border-blue-300 dark:border-blue-600 pl-2 mt-2">"{fetchedClaim.description}"</p>}
                    {fetchedClaim.receiptUrl && (
                       <a href={fetchedClaim.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 text-xs hover:underline inline-block mt-2">View User's Receipt</a>
                    )}
                  </div>
                )}

                {fetchedClaim && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Amount Paid (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={settleAmountPaid}
                        onChange={(e) => setSettleAmountPaid(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Screenshot / Receipt</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm dark:text-white"
                        onChange={(e) => setSettleReceipt(e.target.files[0])}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800 mt-4">
                  <button type="button" onClick={() => {setShowExpenseModal(false); setFetchedClaim(null);}} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium">Cancel</button>
                  <button type="submit" disabled={!fetchedClaim} className={`px-4 py-2 text-white rounded-lg font-medium ${fetchedClaim ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 dark:bg-slate-700 cursor-not-allowed'}`}>
                    Settle Claim
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
