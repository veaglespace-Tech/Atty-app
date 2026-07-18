"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Receipt, FileText, CheckCircle, Clock, Tag } from "lucide-react";
import { API_BASE_URL } from "@/services/api/baseApi";

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/org/expenses/${id}`, { credentials: "include" });
        const data = await res.json();
        if (data.success) {
          setTransaction(data.data);
        } else {
          setError(data.message || "Failed to load transaction details");
        }
      } catch (err) {
        setError("Error fetching transaction");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading transaction details...</div>;
  if (error) return <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>;
  if (!transaction) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Transaction not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => router.back()} 
        className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Expenses</span>
      </button>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 dark:border-slate-800 pb-6 mb-6 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  transaction.type === "DEPOSIT"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {transaction.type}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {new Date(transaction.createdAt).toLocaleString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{transaction.title}</h1>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Total Amount</p>
            <p className={`text-4xl font-extrabold ${transaction.type === 'DEPOSIT' ? 'text-green-600 dark:text-green-500' : 'text-gray-900 dark:text-white'}`}>
              {transaction.type === "DEPOSIT" ? "+" : "-"}₹{transaction.amount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center mb-3">
                <Info className="h-4 w-4 mr-2" /> Details
              </h3>
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400 text-sm">Transaction ID</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">#{transaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400 text-sm">Type</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{transaction.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400 text-sm">Date</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {transaction.items && transaction.items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center mb-3">
                  <Tag className="h-4 w-4 mr-2" /> Items Breakdown
                </h3>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                      <tr>
                        <th className="p-3 text-left font-medium">Item</th>
                        <th className="p-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {transaction.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3 text-gray-900 dark:text-white">{item.name}</td>
                          <td className="p-3 text-right font-medium text-gray-900 dark:text-white">₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 dark:border-slate-700">
                      <tr>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">Total</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white">₹{transaction.amount}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {transaction.claimDetails && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center mb-3">
                  <FileText className="h-4 w-4 mr-2" /> Claim Information
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                    <span className="font-semibold text-blue-900 dark:text-blue-100">Settled Claim Request</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700/70 dark:text-blue-300/70">Claim No</span>
                      <span className="font-medium text-blue-900 dark:text-blue-100">{transaction.claimDetails.claimNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700/70 dark:text-blue-300/70">Requested By</span>
                      <span className="font-medium text-blue-900 dark:text-blue-100">{transaction.claimDetails.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700/70 dark:text-blue-300/70">Email</span>
                      <span className="font-medium text-blue-900 dark:text-blue-100">{transaction.claimDetails.user?.email}</span>
                    </div>
                    {transaction.claimDetails.description && (
                      <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800/50">
                        <span className="text-blue-700/70 dark:text-blue-300/70 block mb-1">User Note:</span>
                        <p className="italic text-blue-900 dark:text-blue-100">"{transaction.claimDetails.description}"</p>
                      </div>
                    )}
                  </div>
                  {transaction.claimDetails.receiptUrl && (
                    <a
                      href={transaction.claimDetails.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 font-medium"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>View Original Claim Receipt</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {transaction.receiptUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide flex items-center mb-3">
                  <Receipt className="h-4 w-4 mr-2" /> Attached Receipt / Proof
                </h3>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Receipt className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                    A receipt or proof of payment is attached to this transaction.
                  </p>
                  <a
                    href={transaction.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <span>View Document</span>
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
