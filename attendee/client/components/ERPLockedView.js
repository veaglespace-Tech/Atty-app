"use client";

import Link from "next/link";
import { Lock, CreditCard, ShieldAlert } from "lucide-react";
import { ROLES } from "@/utils/roles";

export default function ERPLockedView({ role }) {
  const isOrgAdmin = role === ROLES.ORG_ADMIN;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500/20 blur-[50px] rounded-full" />
        <div className="relative h-24 w-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-xl flex items-center justify-center border border-slate-200 dark:border-slate-800">
          <Lock className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
        Feature Locked
      </h2>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
        The Funds & Expenses ERP module is not active for this workspace. This premium add-on unlocks advanced financial management, claims, and wallet features.
      </p>

      {isOrgAdmin ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/pricing"
            className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <CreditCard size={18} />
            Upgrade / Purchase ERP
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-sm font-semibold">
          <ShieldAlert size={18} />
          Please contact your Organization Admin to unlock this feature.
        </div>
      )}
    </div>
  );
}
