"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ArrowRight, Mail, Phone, Users, Hash, Activity, Edit2, X, User } from "lucide-react";
import { useGetReferralPartnerByIdQuery, useUpdateReferralPartnerMutation } from "@/services/api/partnerReferralApi";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function ReferredOrganizationsPage({ params }) {
  const router = useRouter();
  const { partnerId } = use(params);
  const [monthFilter, setMonthFilter] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", mobile: "", partnerReferralCode: "" });
  
  const [updatePartner, { isLoading: isUpdating }] = useUpdateReferralPartnerMutation();
  const dispatch = useDispatch();

  const { data, isLoading } = useGetReferralPartnerByIdQuery(partnerId, {
    skip: !partnerId
  });

  const user = data?.data;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Referral partner not found.
      </div>
    );
  }

  const organizations = user.referredOrganizations || [];

  const filteredOrganizations = organizations.filter((org) => {
    if (!monthFilter) return true;
    const orgDate = new Date(org.createdAt);
    const orgMonth = `${orgDate.getFullYear()}-${String(orgDate.getMonth() + 1).padStart(2, "0")}`;
    return orgMonth === monthFilter;
  });

  const openEditModal = () => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      partnerReferralCode: user.partnerReferralCode || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePartner = async (e) => {
    e.preventDefault();
    try {
      await updatePartner({ id: partnerId, data: formData }).unwrap();
      dispatch(addNotification({ type: "success", title: "Success", message: "Partner details updated successfully!" }));
      setIsEditModalOpen(false);
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to update partner." }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {user.name}&apos;s Referrals
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Organizations that signed up using partner code: <span className="font-bold text-slate-700 dark:text-slate-300">{user.partnerReferralCode}</span>
            </p>
          </div>
        </div>
        
        <button
          onClick={openEditModal}
          className="brand-btn brand-btn-primary brand-btn-md rounded-xl shadow-sm hidden sm:flex"
        >
          <Edit2 size={16} /> Update Details
        </button>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6 mb-6">
        <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mb-6">
          Partner Profile Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Email Address</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.email || "-"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Phone Number</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user.mobile || "Not provided"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Hash size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Referral Code</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{user.partnerReferralCode}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total Referred Orgs</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{organizations.length}</p>
            </div>
          </div>

        </div>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Referred Organizations List
            </h3>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
              {filteredOrganizations.length} Total
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <label htmlFor="monthFilter" className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter by Month:</label>
            <input
              type="month"
              id="monthFilter"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:border-blue-500"
            />
            {monthFilter && (
              <button
                onClick={() => setMonthFilter("")}
                className="h-9 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-slate-500">
            {monthFilter ? "No organizations registered in this month." : "No organizations have been referred by this partner yet."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Organization Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Admin Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Plan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Joined On</th>
                  <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrganizations.map((org) => (
                  <tr key={org.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{org.name}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {org.orgAdmin?.name || "-"}
                      <span className="block text-xs text-slate-400">{org.orgAdmin?.email}</span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">
                      {org.plan?.name || "No Plan"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        org.subscriptionStatus === 'ACTIVE' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {org.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/super-admin/organizations/${org.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Org <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/80 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[92vh] scale-in-95 duration-200">
            
            <div className="shrink-0 relative z-10 p-8 pb-6 border-b border-slate-100 dark:border-slate-800/50">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1.5">Update Partner</h3>
                  <p className="text-sm font-medium text-slate-500">Modify referral partner details.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdatePartner} className="p-8 space-y-5 overflow-y-auto visible-scrollbar flex-1 min-h-0 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <User size={18} />
                  </div>
                  <input
                    required
                    type="text"
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
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Referral Code</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <Hash size={18} />
                  </div>
                  <input
                    required
                    type="text"
                    value={formData.partnerReferralCode}
                    onChange={(e) => setFormData({ ...formData, partnerReferralCode: e.target.value.toUpperCase() })}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm uppercase"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
