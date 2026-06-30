"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGetAllReferralPartnersQuery, useCreateReferralPartnerMutation, useDeleteReferralPartnerMutation } from "@/services/api/partnerReferralApi";
import { UserPlus, ArrowRight, Loader2, Briefcase, Activity, Search, X, Users, Phone, Mail, User, Hash } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function SuperAdminReferralsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", mobile: "", partnerReferralCode: "" });

  const { data, isLoading, refetch } = useGetAllReferralPartnersQuery();
  const [createPartner, { isLoading: isCreating }] = useCreateReferralPartnerMutation();
  const [deletePartner, { isLoading: isDeleting }] = useDeleteReferralPartnerMutation();
  const dispatch = useDispatch();

  const referralPartners = data?.data || [];

  const filteredPartners = referralPartners.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.partnerReferralCode && u.partnerReferralCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    try {
      await createPartner(formData).unwrap();
      dispatch(addNotification({ type: "success", title: "Success", message: "Referral Partner created successfully!" }));
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", mobile: "", partnerReferralCode: "" });
      refetch();
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to create partner." }));
    }
  };

  const handleRemovePartner = async (id) => {
    if (!window.confirm("Are you sure you want to delete this referral partner?")) return;
    try {
      await deletePartner(id).unwrap();
      dispatch(addNotification({ type: "success", title: "Success", message: "Referral Partner deleted!" }));
      refetch();
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to remove partner." }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Referral Partners
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your referral partners and view their performance.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="brand-btn brand-btn-primary brand-btn-md shrink-0 rounded-2xl"
        >
          <UserPlus size={18} />
          Add New Partner
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search partners by name, email, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="brand-input w-full pl-10 h-11"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          {referralPartners.length} Total Partners
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredPartners.length > 0 ? (
        <div className="overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-950/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Partner Details</th>
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Referral Code</th>
                  <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Referred Orgs</th>
                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar 
                          src={null} 
                          name={partner.name} 
                          className="h-10 w-10 rounded-xl" 
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{partner.name}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{partner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                        {partner.partnerReferralCode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {partner._count?.referredOrganizations || 0}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/super-admin/referrals/${partner.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          View Details <ArrowRight size={14} />
                        </Link>
                        <button 
                          onClick={() => handleRemovePartner(partner.id)}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove Partner"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="light-glow-card-static rounded-[2rem] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            <UserPlus size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Referral Partners Found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm ? "No partners match your search criteria." : "You haven't designated any referral partners yet."}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="brand-btn brand-btn-primary brand-btn-md inline-flex rounded-xl"
            >
              Add New Partner
            </button>
          )}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/80 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[92vh] scale-in-95 duration-200">
            
            <div className="shrink-0 relative z-10 p-8 pb-6 border-b border-slate-100 dark:border-slate-800/50">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1.5">Add Referral Partner</h3>
                  <p className="text-sm font-medium text-slate-500">Create a new partner to track referrals.</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreatePartner} className="p-8 space-y-5 overflow-y-auto visible-scrollbar flex-1 min-h-0 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <User size={18} />
                  </div>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <Mail size={18} />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Phone Number <span className="text-slate-400/70 lowercase tracking-normal font-medium">(optional)</span></label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <Phone size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. +1234567890"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Referral Code <span className="text-slate-400/70 lowercase tracking-normal font-medium">(optional)</span></label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <Hash size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate"
                    value={formData.partnerReferralCode}
                    onChange={(e) => setFormData({ ...formData, partnerReferralCode: e.target.value.toUpperCase() })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm uppercase"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    "Save Partner"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
