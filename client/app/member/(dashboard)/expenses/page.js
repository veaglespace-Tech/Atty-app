"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";
import { API_BASE_URL } from "@/services/api/baseApi";

export default function MemberExpensesPage() {
  const dispatch = useDispatch();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [expenseType, setExpenseType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/claims/my-claims`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setClaims(data.data);
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Failed to load claims" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expenseType || !amount || Number(amount) <= 0) {
      return dispatch(addNotification({ type: "error", message: "Please provide valid expense type and amount" }));
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("expenseType", expenseType);
      if (description) formData.append("description", description);
      formData.append("amount", amount);
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      const res = await fetch(`${API_BASE_URL}/claims/raise`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        dispatch(addNotification({ type: "success", message: "Claim raised successfully" }));
        setShowModal(false);
        setExpenseType("");
        setDescription("");
        setAmount("");
        setReceiptFile(null);
        fetchClaims();
      } else {
        dispatch(addNotification({ type: "error", message: data.message || "Failed to raise claim" }));
      }
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Error raising claim" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading expenses...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Expenses & Claims</h1>
          <p className="text-gray-500 text-sm mt-1">Submit your expenses for reimbursement</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          Raise Claim
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="p-4">Claim No</th>
              <th className="p-4">Expense Type</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {claims.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">No claims submitted yet.</td>
              </tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-blue-600">{claim.claimNo || "N/A"}</td>
                  <td className="p-4 font-medium text-gray-900">
                    <div>{claim.expenseType}</div>
                    {claim.description && <div className="text-xs text-gray-500 mt-1">{claim.description}</div>}
                  </td>
                  <td className="p-4 font-semibold text-gray-900">₹{claim.amount}</td>
                  <td className="p-4 text-sm text-gray-500">{new Date(claim.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        claim.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : claim.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {claim.receiptUrl ? (
                      <a
                        href={claim.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Raise Expense Claim</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type / Title</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                  placeholder="e.g. Travel, Office Supplies"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about the expense"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt (Optional)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                />
                <p className="text-xs text-gray-400 mt-1">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isSubmitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
