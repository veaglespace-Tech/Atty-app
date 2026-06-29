"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, UserPlus } from "lucide-react";
import DataPanelPage from "@/components/saas/DataPanelPage";
import { attendanceDashboardTableColumns } from "@/components/saas/attendanceDashboardColumns";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetPartnerStatsQuery } from "@/services/api/partnerReferralApi";

function ReferralHeroCard() {
  const { user } = useAuthSession();
  const [copied, setCopied] = useState(false);
  const isReferralPartner = Boolean(user?.isReferralPartner);
  const { data, isFetching } = useGetPartnerStatsQuery(undefined, {
    skip: !isReferralPartner,
  });

  const stats = data?.data;
  const referralCode = stats?.referralCode || "";
  const shareLink = useMemo(() => {
    if (!referralCode) return "";
    const baseUrl =
      process.env.NEXT_PUBLIC_REFERRAL_LINK ||
      (typeof window !== "undefined" ? `${window.location.origin}/register/organisation` : "");
    return baseUrl ? `${baseUrl}?partnerRef=${referralCode}` : "";
  }, [referralCode]);

  if (!isReferralPartner || (!shareLink && !isFetching)) {
    return null;
  }

  const handleCopy = async () => {
    if (!shareLink || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-[1.5rem] border border-blue-200/70 bg-white/72 p-4 shadow-[0_22px_48px_rgba(15,23,42,0.10)] backdrop-blur dark:border-blue-400/20 dark:bg-slate-950/38 dark:shadow-[0_22px_48px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
          <UserPlus size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Partner Link
            </p>
            {referralCode ? (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
                {referralCode}
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-slate-800 dark:text-white">
            {isFetching && !shareLink ? "Loading referral link..." : shareLink}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {Number(stats?.totalReferred || 0)} organizations referred
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!shareLink}
          className="brand-btn brand-btn-primary brand-btn-sm flex-1 justify-center"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy Link"}
        </button>
        <a
          href={shareLink || undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!shareLink}
          className={`brand-btn brand-btn-secondary brand-btn-sm flex-1 justify-center ${
            shareLink ? "" : "pointer-events-none opacity-60"
          }`}
        >
          <ExternalLink size={14} />
          Open
        </a>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <DataPanelPage
      title="Organization Dashboard"
      description="Workspace summary for users, teams, attendance, and subscription usage."
      endpoint="/org/dashboard"
      emptyMessage="No dashboard activity found."
      tableColumns={attendanceDashboardTableColumns}
      heroAction={<ReferralHeroCard />}
      hiddenRecordColumns={["punchInLocationMeta", "punchOutLocationMeta"]}
    />
  );
}
