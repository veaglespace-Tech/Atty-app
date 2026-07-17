"use client";

import React, { useState, useMemo } from "react";
import { useGetPublicPartnerStatsMutation } from "@/services/api/partnerReferralApi";
import { Loader2, ArrowRight, Check, Copy, MessageCircle, Mail, ExternalLink, Users, ShieldCheck } from "lucide-react";
import Link from "next/link";
import DashboardBrandBlock from "@/components/DashboardBrandBlock";

export default function PartnerReferralDashboard() {
  const [email, setEmail] = useState("");
  const [partnerReferralCode, setPartnerReferralCode] = useState("");
  const [partnerStats, setPartnerStats] = useState(null);
  const [copied, setCopied] = useState(false);

  const [getStats, { isLoading, error, isError }] = useGetPublicPartnerStatsMutation();

  React.useEffect(() => {
    const storedAuth = localStorage.getItem("partnerAuth");
    if (storedAuth) {
      try {
        const { email: storedEmail, partnerReferralCode: storedCode } = JSON.parse(storedAuth);
        if (storedEmail && storedCode) {
          setEmail(storedEmail);
          setPartnerReferralCode(storedCode);
          getStats({ email: storedEmail, partnerReferralCode: storedCode })
            .unwrap()
            .then(res => setPartnerStats(res.data))
            .catch(() => {
              localStorage.removeItem("partnerAuth");
            });
        }
      } catch (e) {
        localStorage.removeItem("partnerAuth");
      }
    }
  }, [getStats]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !partnerReferralCode) return;
    try {
      const response = await getStats({ email, partnerReferralCode }).unwrap();
      setPartnerStats(response.data);
      localStorage.setItem("partnerAuth", JSON.stringify({ email, partnerReferralCode }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setPartnerStats(null);
    setEmail("");
    setPartnerReferralCode("");
    localStorage.removeItem("partnerAuth");
  };

  const shareLink = useMemo(() => {
    if (!partnerStats) return "";
    const baseUrl =
      partnerStats._config?.referralLinkBase ||
      process.env.NEXT_PUBLIC_REFERRAL_LINK ||
      (typeof window !== "undefined" ? `${window.location.origin}/register/organisation` : "");
    return baseUrl ? `${baseUrl}?partnerRef=${partnerStats.partnerReferralCode}` : "";
  }, [partnerStats]);

  const handleCopy = async () => {
    if (!shareLink || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (partnerStats) {
    const whatsappMessage = encodeURIComponent(`Hi! I recommend using Veagle Attendee to manage your team. Use my referral link to sign up: ${shareLink}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

    const emailSubject = encodeURIComponent("Invitation to join Veagle Attendee");
    const emailBody = encodeURIComponent(`Hi,\n\nI recommend using Veagle Attendee to manage your team's attendance and tasks. Use my referral link to sign up:\n${shareLink}\n\nBest regards`);
    const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
    
    const organizations = partnerStats.referredOrganizations || [];

    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans pt-20">

        <div className="flex-1 max-w-5xl w-full mx-auto p-6 py-10 space-y-8">
          <div className="rounded-[2.5rem] p-10 relative z-20 overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-xl shadow-blue-900/20 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-white/20 blur-3xl rounded-full" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/40 blur-3xl rounded-full" />
            <h1 className="text-4xl font-black tracking-tight relative z-10">
              Welcome back, {partnerStats.name}!
            </h1>
            <p className="mt-3 text-blue-100 font-medium relative z-10 text-lg max-w-xl">
              Track your referrals, manage your unique sharing links, and see your impact all in one place.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-8 lg:col-span-2 flex flex-col relative group transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ExternalLink size={20} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Your Unique Link</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center overflow-hidden relative group-hover:border-blue-200 dark:group-hover:border-blue-500/30 transition-colors">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 truncate select-all">
                    {shareLink}
                  </span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="py-4 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-2xl shrink-0 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-900/20 dark:shadow-blue-900/20"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Share Instantly</p>
                <div className="flex flex-wrap gap-4">
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366]/10 px-5 py-3.5 text-sm font-bold text-[#1DA851] hover:bg-[#25D366]/20 transition-all hover:-translate-y-0.5"
                  >
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                  <a 
                    href={emailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5"
                  >
                    <Mail size={18} /> Email
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
              
              <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-100 dark:border-blue-500/20 mb-6 relative z-10">
                <Users size={40} className="drop-shadow-sm" />
              </div>
              <div className="relative z-10">
                <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {partnerStats._count?.referredOrganizations || 0}
                </p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mt-3">
                  Orgs Referred
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Referred Organizations</h3>
              </div>
              <span className="text-xs font-bold px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                {organizations.length} Total
              </span>
            </div>
            
            {organizations.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 border-dashed">
                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-5 text-slate-300 dark:text-slate-700 shadow-sm border border-slate-100 dark:border-slate-800">
                  <Users size={32} />
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                  No organizations referred yet
                </p>
                <p className="text-sm font-medium text-slate-500 max-w-sm">
                  Share your unique link above to invite organizations and start tracking them here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80">
                      <tr>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Organization Name</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Admin Name</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Price</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Joined On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {organizations.map((org) => (
                        <tr key={org.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40 group">
                          <td className="px-6 py-5 font-bold text-slate-900 dark:text-white">{org.name}</td>
                          <td className="px-6 py-5">
                            <span className="block font-semibold text-slate-700 dark:text-slate-300">{org.orgAdmin?.name || "-"}</span>
                            <span className="block text-xs text-slate-500 mt-0.5">{org.orgAdmin?.email}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                              {org.plan?.name || "No Plan"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1 text-sm font-black text-slate-700 dark:text-slate-300">
                              {org.plan?.price != null ? `₹${org.plan.price.toLocaleString()}` : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xs font-semibold text-slate-500">
                            {new Date(org.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="mb-10 relative z-10">
        <div className="scale-90">
          <DashboardBrandBlock />
        </div>
      </div>
      
      <div className="w-full max-w-md light-glow-card-static rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative z-10 border border-white/50 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-[1.2rem] flex items-center justify-center mx-auto mb-5 text-blue-600 dark:text-blue-400 shadow-inner border border-blue-100 dark:border-blue-500/20">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Partner Portal</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">Enter your credentials to view your referrals</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. partner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[1.2rem] border-2 border-slate-200 bg-white/50 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ml-1">Referral Code</label>
            <input
              type="text"
              required
              placeholder="e.g. PARTNER-1234"
              value={partnerReferralCode}
              onChange={(e) => setPartnerReferralCode(e.target.value.toUpperCase())}
              className="w-full rounded-[1.2rem] border-2 border-slate-200 bg-white/50 px-4 py-3.5 text-sm font-bold font-mono text-slate-800 outline-none transition-all placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-500 dark:focus:bg-slate-900 uppercase"
            />
          </div>

          {isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              {error?.data?.message || "Invalid email or referral code."}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !partnerReferralCode}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_12px_24px_rgba(15,23,42,0.2)] disabled:opacity-50 disabled:hover:translate-y-0 dark:hover:bg-slate-100 dark:hover:text-slate-900"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Access Dashboard <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
      <div className="mt-8 text-center relative z-10 text-xs font-semibold text-slate-400">
        &copy; {new Date().getFullYear()} Veagle Attendee. All rights reserved.
      </div>
    </main>
  );
}
