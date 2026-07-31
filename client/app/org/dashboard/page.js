"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Copy, Check, Link2 } from "lucide-react";
import DataPanelPage from "@/components/saas/DataPanelPage";
import { attendanceDashboardTableColumns } from "@/components/saas/attendanceDashboardColumns";

export default function Page() {
  const { user } = useSelector((state) => state.auth);
  const referralCode = user?.organization?.referralCode || null;
  const [copiedReferral, setCopiedReferral] = useState(false);
  
  const referralLinkUrl = 
    typeof window !== "undefined" && referralCode 
      ? `${window.location.origin}/register/user?ref=${referralCode}` 
      : "";

  return (
    <div className="flex flex-col gap-6">
      <DataPanelPage
        title="Organization Dashboard"
        description="Workspace summary for users, teams, attendance, and subscription usage."
        endpoint="/org/dashboard"
        emptyMessage="No dashboard activity found."
        tableColumns={attendanceDashboardTableColumns}
        hiddenRecordColumns={["punchInLocationMeta", "punchOutLocationMeta"]}
        heroAction={
          referralCode ? (
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-950/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Link2 size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  My Org Referral Link
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Share this link to invite users to your organization.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {referralLinkUrl || referralCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLinkUrl || referralCode);
                    setCopiedReferral(true);
                    setTimeout(() => setCopiedReferral(false), 2000);
                  }}
                  className="brand-btn brand-btn-primary shrink-0 h-[34px] px-3 rounded-xl"
                  title="Copy Referral Link"
                >
                  {copiedReferral ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
