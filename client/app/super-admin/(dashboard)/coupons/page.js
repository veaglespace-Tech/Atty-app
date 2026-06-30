"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api/baseApi";
import { useSelector } from "react-redux";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // State for showing users who used the coupon
  const [viewUsersId, setViewUsersId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    maxUses: "",
    validFrom: "",
    validUntil: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token = useSelector((state) => state.auth.token);

  const fetchCoupons = () => {
    fetch(`${API_BASE_URL}/coupons/admin`, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCoupons(data.data);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (coupon) => {
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses || "",
      validFrom: coupon.validFrom ? coupon.validFrom.substring(0, 10) : "",
      validUntil: coupon.validUntil ? coupon.validUntil.substring(0, 10) : ""
    });
    setEditingId(coupon.id);
    setShowForm(true);
    setViewUsersId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        fetchCoupons();
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Network error occurred");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      code: formData.code,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null
    };

    try {
      const url = editingId ? `${API_BASE_URL}/coupons/${editingId}` : `${API_BASE_URL}/coupons`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ code: "", discountType: "PERCENTAGE", discountValue: "", maxUses: "", validFrom: "", validUntil: "" });
        fetchCoupons();
      } else {
        setError(data.message || "Failed to save coupon");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ code: "", discountType: "PERCENTAGE", discountValue: "", maxUses: "", validFrom: "", validUntil: "" });
    setError("");
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Manage Coupons</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">Create public or targeted referral codes to give users discounts on purchases.</p>
        </div>
        <button
          onClick={() => showForm ? handleCancel() : setShowForm(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md ring-1 ring-inset ring-indigo-500/20 dark:ring-indigo-400/20"
        >
          {showForm ? "Cancel" : "+ Add Coupon"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 transition-all">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingId ? "Edit Coupon" : "Create New Coupon"}</h2>
          {error && <div className="mb-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded-xl font-medium">{error}</div>}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Coupon Code *</label>
              <input required type="text" name="code" value={formData.code} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase" placeholder="e.g. DIWALI50" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Discount Type *</label>
              <select required name="discountType" value={formData.discountType} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT_AMOUNT">Flat Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Discount Value *</label>
              <input required type="number" step="0.01" name="discountValue" value={formData.discountValue} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. 20" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Max Uses (Optional)</label>
              <input type="number" name="maxUses" value={formData.maxUses} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Leave blank for unlimited" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valid From (Optional)</label>
              <input type="date" name="validFrom" value={formData.validFrom} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valid Until (Optional)</label>
              <input type="date" name="validUntil" value={formData.validUntil} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={handleCancel} className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-6 py-3 rounded-xl font-semibold transition-all">
                Cancel
              </button>
              <button disabled={isSubmitting} type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Saving..." : editingId ? "Update Coupon" : "Save Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Discount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Uses</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Valid From</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Valid Until</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {coupons.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">No coupons found. Create one above!</td></tr>
              ) : (
                coupons.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap font-black text-indigo-600 dark:text-indigo-400 tracking-wide">{c.code}</td>
                      <td className="px-6 py-5 whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">{c.discountValue} {c.discountType === 'PERCENTAGE' ? '%' : '₹'}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="font-bold text-slate-700 dark:text-slate-200">
                          {c.usesCount} {c.maxUses && <span className="text-slate-400 dark:text-slate-500 font-medium">/ {c.maxUses}</span>}
                        </div>
                        <button 
                          onClick={() => c.usesCount > 0 && setViewUsersId(viewUsersId === c.id ? null : c.id)}
                          disabled={c.usesCount === 0}
                          className={`block text-xs font-semibold mx-auto mt-2 transition-all ${c.usesCount > 0 ? "text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline" : "text-slate-400 dark:text-slate-600 cursor-not-allowed"}`}
                        >
                          {viewUsersId === c.id ? "Hide Users" : "View Users"}
                        </button>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                        {c.validFrom ? new Date(c.validFrom).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                        {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : "Never Expires"}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-bold">
                        <button onClick={() => handleEdit(c)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 transition-colors">Delete</button>
                      </td>
                    </tr>
                    
                    {/* Embedded row showing users who purchased using this coupon */}
                    {viewUsersId === c.id && c.payments && c.payments.length > 0 && (
                      <tr className="bg-slate-50/80 dark:bg-slate-950/40">
                        <td colSpan="5" className="p-0 border-b border-slate-200 dark:border-slate-800">
                          <div className="p-6 md:px-8 border-l-4 border-indigo-500 dark:border-indigo-400">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded text-xs">Used By</span>
                              Customers who claimed {c.code}
                            </h4>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                                  <thead className="bg-slate-50/50 dark:bg-slate-950/50">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Name</th>
                                      <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Email</th>
                                      <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Mobile</th>
                                      <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Date Used</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {c.payments.map(payment => (
                                      <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{payment.user?.name || "Unknown"}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{payment.user?.email || "-"}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{payment.user?.mobile || "-"}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-500 font-medium">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
