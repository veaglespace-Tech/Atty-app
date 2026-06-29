"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ArrowRight, Mail, Phone, Users, Hash, Activity } from "lucide-react";
import { useGetReferralPartnerByIdQuery } from "@/services/api/partnerReferralApi";

export default function ReferredOrganizationsPage({ params }) {
  const router = useRouter();
  const { partnerId } = use(params);
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

  return (
    <section className="space-y-6">
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

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total Referred Users</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{user._count?.referredUsers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Referred Organizations List
          </h3>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            {organizations.length} Total
          </span>
        </div>

        {organizations.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-slate-500">
            No organizations have been referred by this partner yet.
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
                {organizations.map((org) => (
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
    </section>
  );
}
