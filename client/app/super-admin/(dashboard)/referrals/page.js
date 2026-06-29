"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGetAllSuperAdminUsersQuery, useGetSuperAdminUserByIdQuery } from "@/services/api/superAdminApi";
import { UserPlus, ArrowRight, Loader2, Mail, Briefcase, ExternalLink, Activity, Search, X, Users } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useToggleReferralPartnerMutation } from "@/services/api/partnerReferralApi";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function SuperAdminReferralsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const { data, isLoading, refetch } = useGetAllSuperAdminUsersQuery({ page: 1, limit: 1000 });
  const [togglePartner, { isLoading: isToggling }] = useToggleReferralPartnerMutation();
  const dispatch = useDispatch();

  const users = data?.items || [];
  
  const referralPartners = users.filter((u) => u.isReferralPartner);

  const filteredPartners = referralPartners.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.partnerReferralCode && u.partnerReferralCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMakePartner = async (userId) => {
    try {
      await togglePartner({ userId, isPartner: true }).unwrap();
      dispatch(addNotification({ type: "success", title: "Success", message: "User is now a Referral Partner!" }));
      setIsAddModalOpen(false);
      refetch();
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to make partner." }));
    }
  };

  const handleRemovePartner = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user as a referral partner?")) return;
    try {
      await togglePartner({ userId, isPartner: false }).unwrap();
      dispatch(addNotification({ type: "success", title: "Success", message: "User removed from Referral Partners!" }));
      refetch();
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to remove partner." }));
    }
  };

  const nonPartners = users.filter((u) => !u.isReferralPartner && (u.role === "ORG_ADMIN" || u.role === "SUB_ADMIN"));
  const filteredNonPartners = nonPartners.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="light-glow-card-static rounded-[1.5rem] p-5 flex flex-col relative group transition-all hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)]">
              <div className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              
              <div className="flex items-center gap-4 mb-4">
                <UserAvatar 
                  src={null} 
                  name={partner.name} 
                  className="h-12 w-12 rounded-2xl" 
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {partner.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {partner.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-5 flex-1">
                <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Code</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 select-all">
                    {partner.partnerReferralCode}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500"><Activity size={14} /> Referred Orgs</span>
                  <Link
                    href={`/super-admin/referrals/${partner.id}`}
                    className="flex items-center gap-1.5 font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-0.5 rounded-lg transition-colors"
                    title="View Referred Organizations"
                  >
                    {partner._count?.referredOrganizations || 0}
                    <Users size={14} />
                  </Link>
                </div>
                
                {partner.organization?.name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500"><Briefcase size={14} /> Org</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={partner.organization.name}>
                      {partner.organization.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <Link 
                  href={`/super-admin/users/${partner.id}`}
                  className="flex-1 brand-btn brand-btn-secondary brand-btn-sm justify-between rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-500/20"
                >
                  View Details
                  <ArrowRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <button 
                  onClick={() => handleRemovePartner(partner.id)}
                  disabled={isToggling}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                  title="Remove Partner"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="light-glow-card-static rounded-[2rem] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            <UserPlus size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Referral Partners Found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm ? "No partners match your search criteria." : "You haven't designated any users as referral partners yet."}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Make Referral Partner</h3>
                <p className="text-sm text-slate-500">Search for a user to promote to a referral partner.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="brand-input w-full pl-10"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-4 flex-1 space-y-2">
              {filteredNonPartners.length > 0 ? (
                filteredNonPartners.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} className="h-10 w-10 rounded-xl" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleMakePartner(user.id)}
                      disabled={isToggling}
                      className="brand-btn brand-btn-primary brand-btn-sm rounded-xl shrink-0"
                    >
                      {isToggling ? "Making..." : "Make Partner"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">
                  {userSearchTerm ? "No users found matching your search." : "Search to find a user..."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
