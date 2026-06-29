"use client";

import React, { useMemo, useState } from "react";
import { useGetPartnerStatsQuery } from "@/services/api/partnerReferralApi";
import { Check, Copy, ExternalLink, Loader2, Mail, MessageCircle, Share2, Users } from "lucide-react";

export default function ReferralsPage() {
  const { data, isLoading, isError } = useGetPartnerStatsQuery();
  const [copied, setCopied] = useState(false);

  const stats = data?.data;
  const referralCode = stats?.referralCode || "";
  // In a real app, this should ideally be NEXT_PUBLIC_SITE_URL or window.location.origin
  const baseUrl = process.env.NEXT_PUBLIC_REFERRAL_LINK || (typeof window !== "undefined" ? `${window.location.origin}/register/organisation` : "");
  const shareLink = baseUrl ? `${baseUrl}?partnerRef=${referralCode}` : "";

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(`Hi! I recommend using Veagle Attendee to manage your team. Use my referral link to sign up: ${shareLink}`);
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent("Invitation to join Veagle Attendee");
  const emailBody = encodeURIComponent(`Hi,\n\nI recommend using Veagle Attendee to manage your team's attendance and tasks. Use my referral link to sign up:\n${shareLink}\n\nBest regards`);
  const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        You are not authorized to view this page or an error occurred.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static rounded-[1.9rem] p-6 relative z-20">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_32%)]" />
        <h2 className="text-3xl font-black text-slate-900 dark:text-white relative">
          Referral Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl relative">
          Share your referral link with other organizations and earn rewards when they sign up.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="light-glow-card-static rounded-[1.9rem] p-6 lg:col-span-2 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Your Unique Link</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 px-4 flex items-center justify-between overflow-hidden">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate mr-4">
                {shareLink}
              </span>
            </div>
            <button 
              onClick={handleCopy}
              className="brand-btn brand-btn-primary brand-btn-md shrink-0"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-4">Quick Share</p>
            <div className="flex flex-wrap gap-3">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-2.5 text-sm font-semibold text-[#1DA851] hover:bg-[#25D366]/20 transition-colors"
              >
                <MessageCircle size={18} /> Share on WhatsApp
              </a>
              <a 
                href={emailUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Mail size={18} /> Share via Email
              </a>
            </div>
          </div>
        </div>

        <div className="light-glow-card-static rounded-[1.9rem] p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users size={32} />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalReferred}
            </p>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mt-2">
              Organizations Referred
            </p>
          </div>
        </div>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 mb-6">Referred Organizations</h3>
        
        {stats.referredOrganizations?.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">
            You haven't referred any organizations yet. Share your link to get started!
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Organization Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Admin Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Plan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Joined On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.referredOrganizations.map((org) => (
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
