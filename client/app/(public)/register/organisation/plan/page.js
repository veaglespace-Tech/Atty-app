"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Zap, Star, Crown, Loader2 } from "lucide-react";
import { useGetPlansQuery } from "@/services/api/planApi";
import {
  filterVisiblePlans,
  formatPlanDurationLong,
  formatPlanDurationShort,
  formatPlanPrice,
} from "@/utils/plans";

export default function Plans() {
  const router = useRouter();
  const { data: rawPlans, isLoading, error, refetch } = useGetPlansQuery();
  const [selectedDuration, setSelectedDuration] = useState(90);

  const tiers = useMemo(() => {
    const plans = filterVisiblePlans(rawPlans);
    if (plans.length === 0) return [];

    const grouped = plans.reduce((acc, plan) => {
      const tierName = plan.name.split(" - ")[0] || "Standard";
      if (!acc[tierName]) {
        acc[tierName] = {
          name: tierName,
          options: [],
          users: plan.memberLimit || plan.maxUsers || "N/A",
          features: plan.features || [],
          icon: tierName.includes("1") ? <Zap size={24} /> : tierName.includes("2") ? <Star size={24} /> : <Crown size={24} />,
          color: tierName.includes("1") ? "blue" : tierName.includes("2") ? "indigo" : "amber",
          popular: tierName.includes("2"),
        };
      }
      acc[tierName].options.push(plan);
      return acc;
    }, {});

    return Object.values(grouped).map((tier) => {
      tier.options.sort((a, b) => a.durationInDays - b.durationInDays);
      return tier;
    });
  }, [rawPlans]);

  const durations = [
    { value: 7, label: "7 Days Trial" },
    { value: 90, label: "3 Months" },
    { value: 180, label: "6 Months" },
    { value: 365, label: "12 Months" },
  ];

  const handleSelectPlan = (plan) => {
    const planData = {
      name: plan.name,
      code: plan.code,
      price: plan.price,
      features: plan.features,
      durationInDays: plan.durationInDays,
    };

    localStorage.setItem("selectedPlan", JSON.stringify(planData));
    router.push("/register/organisation/payment");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 dark:text-blue-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest text-[10px]">
            Fetching Plans...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
        <div className="text-center p-12 bg-red-50 dark:bg-rose-500/10 rounded-[3rem] border border-red-100 dark:border-rose-500/20 max-w-lg shadow-2xl shadow-red-100 dark:shadow-black/20">
          <div className="w-16 h-16 bg-red-100 dark:bg-rose-500/15 text-red-600 dark:text-rose-300 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Check size={32} className="rotate-45" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Oops! Something went wrong
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-8">
            We couldn&apos;t load the subscription plans. There might be a connection issue with the server.
          </p>
          <button
            onClick={() => refetch()}
            className="w-full py-5 bg-slate-900 dark:bg-blue-400 text-white dark:text-slate-950 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 dark:hover:bg-blue-300 transition-all shadow-xl active:scale-95"
          >
            Retry Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block py-2 px-6 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-200 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-500/20">
            Step 3 of 4
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tightest leading-tight">
            Select Your <span className="gradient-text">Growth Plan</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-300 font-medium text-lg max-w-2xl mx-auto mb-12 italic">
            Pick the scale that matches your organization&apos;s ambition.
          </p>

          <div className="inline-flex p-1.5 bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-black/30 rounded-3xl mb-8 flex-wrap justify-center">
            {durations.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDuration(d.value)}
                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedDuration === d.value
                  ? "bg-slate-900 dark:bg-blue-400 text-white dark:text-slate-950 shadow-xl shadow-blue-200/30"
                  : "text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-white"
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {tiers.map((tier, index) => {
            const isFreeTier = Number(tier.options[0]?.price || 0) === 0;
            const planOption = isFreeTier
              ? tier.options[0]
              : tier.options.find((option) => option.durationInDays === selectedDuration) || tier.options[0];
            const isDurationAvailable = isFreeTier || planOption.durationInDays === selectedDuration;

            return (
              <div
                key={tier.name}
                className={`group bg-white dark:bg-slate-950/70 p-1 rounded-[3rem] transition-all hover:translate-y-[-10px] ${tier.popular ? "ring-4 ring-blue-600/10 dark:ring-blue-400/20" : ""
                  }`}
              >
                <div className={`bg-white dark:bg-slate-950/90 rounded-[2.8rem] p-10 h-full flex flex-col border border-slate-100 dark:border-white/10 shadow-2xl transition-all ${tier.popular ? "shadow-blue-100/50 border-blue-50 dark:shadow-blue-950/20 dark:border-blue-500/20" : "shadow-slate-200/40 dark:shadow-black/30"}`}>
                  <div className={`w-16 h-16 rounded-[1.5rem] mb-10 flex items-center justify-center transform group-hover:rotate-6 transition-transform shadow-lg ${tier.color === "blue" ? "bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-950" :
                    tier.color === "indigo" ? "bg-indigo-600 dark:bg-indigo-400 text-white dark:text-slate-950" :
                      "bg-amber-500 dark:bg-amber-400 text-white dark:text-slate-950"
                    }`}>
                    {tier.icon}
                  </div>

                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{tier.name}</h3>
                  <div className="flex items-center gap-2 mb-8">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                      {tier.users} Users Limit
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">
                      Rs. {formatPlanPrice(planOption.price)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-300 font-black text-sm uppercase tracking-widest">
                      / {formatPlanDurationShort(planOption.durationInDays)}
                    </span>
                  </div>

                  {!isDurationAvailable && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-300 font-black mb-6 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-2xl text-center border border-amber-100 dark:border-amber-500/20">
                      * Defaulting to {formatPlanDurationLong(planOption.durationInDays)} for this plan
                    </p>
                  )}

                  <div className="space-y-5 mb-12 flex-grow">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-4">
                        <div className="mt-1 w-6 h-6 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                          <Check size={14} className="text-blue-600 dark:text-blue-300" />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-bold text-sm leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSelectPlan(planOption)}
                    className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 group/btn shadow-2xl ${tier.popular
                      ? "bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-950 shadow-blue-200 dark:shadow-blue-950/30 hover:bg-slate-900 dark:hover:bg-blue-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-blue-600 dark:hover:bg-slate-700 hover:text-white"
                      }`}
                  >
                    Activate {tier.name}
                    <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
          Secure checkout by Razorpay â€¢ Cancel or upgrade anytime
        </p>
      </div>
    </div>
  );
}
