"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Crown,
  Loader2,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetPlansQuery } from "@/services/api/planApi";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";
import {
  useCreateRenewalOrderMutation,
  useLazyGetPaymentPublicKeyQuery,
  useVerifyRenewalPaymentMutation,
} from "@/services/api/paymentApi";
import { getErrorMessage } from "@/utils/formValidation";
import { formatCalendarDate } from "@/utils/date";
import {
  filterVisiblePlans,
  formatPlanDurationLong,
  formatPlanDurationShort,
  formatPlanPrice,
} from "@/utils/plans";
import { ROLES } from "@/utils/roles";

function getAccentPalette(color) {
  return {
    icon: "bg-slate-100 text-slate-950 dark:bg-blue-500/15 dark:text-blue-200",
    chipActive: "bg-blue-600 text-white dark:bg-blue-400 dark:text-slate-950",
    check: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    hoverShadow: "hover:shadow-blue-500/20 dark:hover:shadow-blue-950/25",
  };
}

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const isRenewalRestrictedPlan = (plan = {}) => {
  const code = String(plan.code || "").trim().toUpperCase();
  return Number(plan.price || 0) <= 0 || code.includes("FREE");
};

const formatExpiryLabel = (value) => formatCalendarDate(value);

const buildRenewalPreview = ({ selectedPlan, activeSubscription, currentPlanName }) => {
  if (!selectedPlan) return null;

  const now = new Date();
  const activeEndDate = activeSubscription?.endDate ? new Date(activeSubscription.endDate) : null;
  const activeStartDate = activeSubscription?.startDate ? new Date(activeSubscription.startDate) : null;
  const hasActiveWindow =
    activeEndDate &&
    !Number.isNaN(activeEndDate.getTime()) &&
    activeEndDate.getTime() > now.getTime();
  const remainingMs = hasActiveWindow ? activeEndDate.getTime() - now.getTime() : 0;
  const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : 0;
  const samePlan =
    hasActiveWindow &&
    String(activeSubscription?.planCode || "").trim().toUpperCase() ===
      String(selectedPlan.code || "").trim().toUpperCase();
  const currentPlanPrice = Number(activeSubscription?.amount || 0);
  const selectedPlanPrice = Number(selectedPlan?.price || 0);

  let mode = "RENEW";
  let upgradeCredit = 0;

  if (hasActiveWindow) {
    if (samePlan) {
      mode = "EXTEND";
    } else if (selectedPlanPrice < currentPlanPrice) {
      mode = "DOWNGRADE_SCHEDULED";
    } else {
      mode = "UPGRADE_NOW";
      const totalMs =
        activeStartDate && !Number.isNaN(activeStartDate.getTime())
          ? Math.max(activeEndDate.getTime() - activeStartDate.getTime(), 24 * 60 * 60 * 1000)
          : 24 * 60 * 60 * 1000;
      upgradeCredit = Math.max(
        0,
        Number(
          (
            Number(activeSubscription?.amount || 0) *
            ((activeEndDate.getTime() - now.getTime()) / totalMs)
          ).toFixed(2)
        )
      );
    }
  }

  const payableAmount =
    mode === "UPGRADE_NOW"
      ? Math.max(0, Number(Number(selectedPlan.price || 0) - upgradeCredit).toFixed(2))
      : Number(selectedPlan.price || 0);
  const nextExpiry =
    (mode === "EXTEND" || mode === "DOWNGRADE_SCHEDULED") && hasActiveWindow
      ? new Date(
          activeEndDate.getTime() + Number(selectedPlan.durationInDays || 30) * 24 * 60 * 60 * 1000
        )
      : new Date(now.getTime() + Number(selectedPlan.durationInDays || 30) * 24 * 60 * 60 * 1000);

  return {
    mode,
    remainingDays,
    currentPlanName: activeSubscription?.planName || currentPlanName || "No active plan",
    upgradeCredit,
    payableAmount,
    nextExpiry,
  };
};

const getRenewalCtaLabel = ({ isCurrentPlan, subscriptionStatus, mode }) => {
  if (mode === "DOWNGRADE_SCHEDULED") {
    return "Schedule Downgrade";
  }

  if (isCurrentPlan) {
    return subscriptionStatus === "EXPIRED" ? "Renew Plan" : "Extend Plan";
  }

  return mode === "UPGRADE_NOW" ? "Upgrade Now" : "Renew Plan";
};

export default function PricingPage() {
  const { token, user, hydrated } = useAuthSession();
  const isOrgAdminRenewal =
    hydrated && Boolean(token) && user?.currentRole === ROLES.ORG_ADMIN;
  const { data: rawPlans, isLoading, error, refetch } = useGetPlansQuery();
  const { data: orgSubscription, isFetching: isSubscriptionLoading, refetch: refetchSubscription } =
    useGetOrgSubscriptionQuery(undefined, {
      skip: !isOrgAdminRenewal,
    });
  const [createRenewalOrder] = useCreateRenewalOrderMutation();
  const [getPaymentPublicKey] = useLazyGetPaymentPublicKeyQuery();
  const [verifyRenewalPayment] = useVerifyRenewalPaymentMutation();
  const [selectedDurations, setSelectedDurations] = useState({});
  const [paymentStatus, setPaymentStatus] = useState("");
  const [processingPlanCode, setProcessingPlanCode] = useState("");
  const [successState, setSuccessState] = useState(null);

  const tiers = useMemo(() => {
    const plans = filterVisiblePlans(rawPlans).filter(
      (plan) => !isOrgAdminRenewal || !isRenewalRestrictedPlan(plan)
    );

    if (plans.length === 0) return [];

    const grouped = plans.reduce((accumulator, plan) => {
      const tierName = plan.name.split(" - ")[0] || "Standard";

      if (!accumulator[tierName]) {
        accumulator[tierName] = {
          name: tierName,
          options: [],
          features: Array.isArray(plan.features) ? plan.features : [],
          icon: tierName.includes("1") ? Zap : tierName.includes("2") ? Star : Crown,
          color: "blue",
          popular: tierName.includes("2"),
        };
      }

      accumulator[tierName].options.push(plan);
      return accumulator;
    }, {});

    return Object.values(grouped).map((tier) => ({
      ...tier,
      options: [...tier.options].sort((left, right) => left.durationInDays - right.durationInDays),
    }));
  }, [rawPlans, isOrgAdminRenewal]);

  const resolvedDurations = useMemo(() => {
    if (Object.keys(selectedDurations).length > 0) return selectedDurations;

    const defaults = {};
    tiers.forEach((tier) => {
      defaults[tier.name] = tier.options[0].durationInDays;
    });

    return defaults;
  }, [tiers, selectedDurations]);

  const orgMeta = orgSubscription?.meta || {};
  const orgUsage = orgMeta.usage || {};
  const activeSubscription = useMemo(() => {
    const subscriptions = Array.isArray(orgSubscription?.items) ? orgSubscription.items : [];
    return (
      subscriptions.find((item) => {
        const endDate = new Date(item?.endDate || 0);
        return String(item?.status || "").toUpperCase() === "ACTIVE" && endDate > new Date();
      }) || null
    );
  }, [orgSubscription?.items]);
  const subscriptionStatus = String(
    orgMeta.subscriptionStatus || user?.organization?.subscriptionStatus || "ACTIVE"
  ).toUpperCase();
  const currentPlanCode = String(orgMeta.currentPlanCode || "").trim().toUpperCase();

  const handleRenewPlan = async (selectedPlan) => {
    if (!isOrgAdminRenewal || !selectedPlan?.code) return;

    setSuccessState(null);
    setPaymentStatus("Preparing secure checkout...");
    setProcessingPlanCode(selectedPlan.code);

    try {
      const orderResponse = await createRenewalOrder({
        planCode: selectedPlan.code,
      }).unwrap();
      const intentId = Number(orderResponse?.intentId || 0);
      if (!Number.isFinite(intentId) || intentId <= 0) {
        throw new Error("Unable to create secure renewal session.");
      }

      if (orderResponse?.freeRenewal) {
        setPaymentStatus("Applying plan credit...");

        const verifyResult = await verifyRenewalPayment({
          intentId,
          planCode: selectedPlan.code,
        }).unwrap();

        setSuccessState({
          planName: verifyResult?.subscription?.planName || selectedPlan.name,
          organizationName:
            verifyResult?.organization?.name ||
            orgMeta.organizationName ||
            user?.organization?.name ||
            "Your workspace",
          expiryDate:
            verifyResult?.organization?.subscriptionExpiry ||
            verifyResult?.subscription?.endDate ||
            null,
          redirectPath: verifyResult?.redirectPath || "/org/dashboard",
          emailSent: verifyResult?.emailSent !== false,
        });
        setPaymentStatus("");
        setProcessingPlanCode("");
        refetchSubscription?.();
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      setPaymentStatus("Connecting to secure gateway...");

      const keyResponse = await getPaymentPublicKey().unwrap();
      if (!keyResponse?.key) {
        throw new Error("Razorpay key not found.");
      }

      const order = orderResponse?.order;
      if (!order?.id) {
        throw new Error("Failed to create renewal order.");
      }

      setPaymentStatus("Opening payment window...");

      const paymentObject = new window.Razorpay({
        key: keyResponse.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Veagle Attendee",
        description: `${selectedPlan.name} Workspace Renewal`,
        image: "/logo1-clean.webp",
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "",
        },
        notes: {
          planCode: selectedPlan.code,
          organizationCode: orgMeta.organizationCode || "",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus("Payment cancelled.");
            setProcessingPlanCode("");
          },
        },
        handler: async (response) => {
          try {
            setPaymentStatus("Verifying secure payment...");

            const verifyResult = await verifyRenewalPayment({
              ...response,
              intentId,
              planCode: selectedPlan.code,
            }).unwrap();

            setSuccessState({
              planName: verifyResult?.subscription?.planName || selectedPlan.name,
              organizationName:
                verifyResult?.organization?.name ||
                orgMeta.organizationName ||
                user?.organization?.name ||
                "Your workspace",
              expiryDate:
                verifyResult?.organization?.subscriptionExpiry ||
                verifyResult?.subscription?.endDate ||
                null,
              redirectPath: verifyResult?.redirectPath || "/org/dashboard",
              emailSent: verifyResult?.emailSent !== false,
            });
            setPaymentStatus("");
            setProcessingPlanCode("");
            refetchSubscription?.();
          } catch (renewalError) {
            setPaymentStatus(
              getErrorMessage(renewalError, "Payment captured but renewal could not be completed.")
            );
            setProcessingPlanCode("");
          }
        },
      });

      paymentObject.on("payment.failed", (response) => {
        setPaymentStatus(response?.error?.description || "Payment failed. Please try again.");
        setProcessingPlanCode("");
      });

      paymentObject.open();
    } catch (renewalError) {
      setPaymentStatus(getErrorMessage(renewalError, "Unable to start renewal payment."));
      setProcessingPlanCode("");
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-blue-600 dark:text-blue-300" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Loading Plans...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="mb-4 font-black text-red-600 dark:text-rose-200">Error loading plans</p>
          <p className="text-sm text-red-500 dark:text-rose-300">
            {error?.data?.message || error?.message || "Failed to fetch plans from server."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-6 rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell relative min-h-screen overflow-hidden px-4 pb-24 pt-32 transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-8%] top-24 h-72 w-72 rounded-full blur-[110px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-32 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-16 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {isOrgAdminRenewal ? (
          <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="rounded-[2.2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)] md:p-7">
              <SectionEyebrow className="mb-4">Workspace Plans</SectionEyebrow>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-5xl">
                    Renew or Upgrade{" "}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent dark:from-white dark:via-blue-200 dark:to-cyan-200">
                      Your Workspace
                    </span>
                  </h1>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Choose a paid plan below. Your existing organization stays the same, and the
                    new plan is applied right after payment.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-left shadow-[0_18px_44px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-200">
                    Live Workspace
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                    {orgMeta.organizationName || user?.organization?.name || "Your workspace"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {orgMeta.organizationCode || user?.organizationCode || "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2.2rem] border border-slate-200 bg-white/88 p-5 shadow-[0_26px_72px_rgba(59,130,246,0.12),0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/82 dark:shadow-[0_28px_84px_rgba(2,6,23,0.42)] lg:sticky lg:top-28">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Live Plan Details
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {isSubscriptionLoading ? "Loading..." : orgMeta.currentPlanName || "No active plan"}
                  </p>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                  {subscriptionStatus}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <CompactInfoCard label="Expires On" value={formatExpiryLabel(orgMeta.subscriptionExpiry)} />
                <CompactInfoCard label="Workspace Code" value={orgMeta.organizationCode || user?.organizationCode || "--"} />
                <CompactInfoCard label="Users" value={Number(orgUsage.users || 0)} />
                <CompactInfoCard label="Teams" value={Number(orgUsage.teams || 0)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-12 text-center">
            <SectionEyebrow className="mb-6">Flexible Pricing</SectionEyebrow>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
              Plans for{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent dark:from-white dark:via-blue-200 dark:to-cyan-200">
                Every Scale
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Transparent pricing with no hidden fees. Choose the plan and duration that best fits your organization&apos;s needs.
            </p>
          </div>
        )}

        {isOrgAdminRenewal && paymentStatus ? (
          <div className="mb-5 flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            {processingPlanCode ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            <span>{paymentStatus}</span>
          </div>
        ) : null}

        {isOrgAdminRenewal && successState ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-700 dark:text-emerald-300">
              Renewal Successful
            </p>
            <h3 className="mt-2 text-2xl font-black text-emerald-950 dark:text-emerald-50">
              {successState.planName} is now active
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
              {successState.organizationName} has been renewed successfully and will stay
              active until {formatExpiryLabel(successState.expiryDate)}.
              {successState.emailSent
                ? " A confirmation email has been sent to the admin mailbox."
                : " Renewal completed, but the confirmation email could not be delivered."}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={successState.redirectPath}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccessState(null);
                  refetchSubscription?.();
                }}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-slate-950/40 dark:text-emerald-100 dark:hover:bg-emerald-500/10"
              >
                Review Plans Again
              </button>
            </div>
          </div>
        ) : null}

        {tiers.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-10 text-center shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {isOrgAdminRenewal
                ? "No paid renewal plans are available right now."
                : "No plans are available right now."}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier) => {
              const currentDuration = resolvedDurations[tier.name];
              const selectedPlan =
                tier.options.find((option) => option.durationInDays === currentDuration) ||
                tier.options[0];
              const palette = getAccentPalette(tier.color);
              const Icon = tier.icon;
              const isCurrentPlan =
                currentPlanCode &&
                String(selectedPlan.code || "").trim().toUpperCase() === currentPlanCode;
              const renewalPreview = isOrgAdminRenewal
                ? buildRenewalPreview({
                    selectedPlan,
                    activeSubscription,
                    currentPlanName: orgMeta.currentPlanName,
                  })
                : null;
              const ctaLabel = isOrgAdminRenewal
                ? getRenewalCtaLabel({
                    isCurrentPlan,
                    subscriptionStatus,
                    mode: renewalPreview?.mode,
                  })
                : "Select Plan";

              return (
                <div
                  key={tier.name}
                  className={`group relative rounded-[2.5rem] border border-transparent bg-white p-1 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-100 hover:shadow-[0_36px_96px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/25 ${palette.hoverShadow}`}
                >
                  <div className="flex h-full flex-col rounded-[2.3rem] border border-slate-100 bg-white p-8 transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/90 md:p-10">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <div
                        className={`brand-hover-white-media flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-105 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 ${palette.icon}`}
                      >
                        <Icon size={24} />
                      </div>
                      {isCurrentPlan ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                          Current
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mb-2 text-2xl font-black text-slate-950 dark:text-white">
                      {tier.name}
                    </h3>

                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-950 dark:text-white">
                        Rs. {formatPlanPrice(selectedPlan.price)}
                      </span>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        /{formatPlanDurationLong(selectedPlan.durationInDays)}
                      </span>
                    </div>

                    <div className="mb-8 flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/80">
                      {tier.options.map((option) => {
                        const active = currentDuration === option.durationInDays;

                        return (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() =>
                              setSelectedDurations((prev) => ({
                                ...prev,
                                [tier.name]: option.durationInDays,
                              }))
                            }
                            className={`flex-1 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                              active
                                ? `${palette.chipActive} shadow-lg`
                                : "text-slate-500 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            }`}
                          >
                            {formatPlanDurationShort(option.durationInDays)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mb-10 flex-grow space-y-4">
                      {renewalPreview ? (
                        <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            Upgrade Preview
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Current Plan
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {renewalPreview.currentPlanName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Mode
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {renewalPreview.mode}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Remaining Days
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {renewalPreview.remainingDays || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Credit Applied
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                Rs. {formatPlanPrice(renewalPreview.upgradeCredit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Pay Now
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                Rs. {formatPlanPrice(renewalPreview.payableAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Next Expiry
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatExpiryLabel(renewalPreview.nextExpiry)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div
                            className={`brand-hover-white-media mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full group-hover:bg-blue-600 dark:group-hover:bg-blue-500 ${palette.check}`}
                          >
                            <Check size={12} />
                          </div>
                          <span className="text-sm font-medium leading-tight text-slate-600 dark:text-slate-300">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isOrgAdminRenewal ? (
                      <button
                        type="button"
                        onClick={() => handleRenewPlan(selectedPlan)}
                        disabled={Boolean(processingPlanCode)}
                        className="group/btn flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 py-5 font-black text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 hover:bg-blue-600 hover:text-white hover:shadow-[0_24px_60px_rgba(59,130,246,0.18)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-100"
                      >
                        {processingPlanCode === selectedPlan.code ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Opening Checkout...
                          </>
                        ) : (
                          <>
                            {ctaLabel}
                            <ArrowRight
                              size={20}
                              className="transition-transform group-hover/btn:translate-x-1"
                            />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={{
                          pathname: "/register/organisation",
                          query: { planCode: selectedPlan.code },
                        }}
                        className="group/btn flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 py-5 font-black text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 hover:bg-blue-600 hover:text-white hover:shadow-[0_24px_60px_rgba(59,130,246,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-100"
                      >
                        Select Plan
                        <ArrowRight
                          size={20}
                          className="transition-transform group-hover/btn:translate-x-1"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="brand-spotlight relative mt-20 overflow-hidden rounded-[3rem] p-10">
          <div className="brand-spotlight-orb-primary absolute right-0 top-0 h-80 w-80 rounded-full blur-[170px]" />
          <div className="brand-spotlight-orb-secondary absolute bottom-0 left-0 h-72 w-72 rounded-full blur-[160px]" />
          <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="max-w-md">
              <h4 className="brand-spotlight-title mb-3 text-3xl font-black">
                Need a Custom Solution?
              </h4>
              <p className="brand-spotlight-copy text-lg font-medium leading-relaxed">
                For organizations with more than 1500 employees, we offer custom enterprise plans
                with dedicated infrastructure and support.
              </p>
            </div>
            <Link
              href="/contact"
              className="brand-spotlight-button shrink-0 rounded-3xl px-10 py-5 text-sm uppercase tracking-widest active:scale-95"
            >
              Contact Enterprise
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactInfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
