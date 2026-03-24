"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Crown, Loader2, Star, Zap } from "lucide-react";
import { useGetPlansQuery } from "@/services/api/planApi";
import {
  filterVisiblePlans,
  formatPlanDurationLong,
  formatPlanDurationShort,
  formatPlanPrice,
} from "@/utils/plans";

function getAccentPalette(color) {
  if (color === "indigo") {
    return {
      icon: "bg-slate-100 text-slate-950 dark:bg-indigo-500/15 dark:text-indigo-200",
      chipActive: "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-slate-950",
      check: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200",
      hoverShadow: "hover:shadow-indigo-500/20 dark:hover:shadow-indigo-950/25",
    };
  }

  if (color === "amber") {
    return {
      icon: "bg-slate-100 text-slate-950 dark:bg-amber-500/15 dark:text-amber-200",
      chipActive: "bg-amber-500 text-slate-950 dark:bg-amber-300 dark:text-slate-950",
      check: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200",
      hoverShadow: "hover:shadow-amber-400/25 dark:hover:shadow-amber-950/20",
    };
  }

  return {
    icon: "bg-slate-100 text-slate-950 dark:bg-blue-500/15 dark:text-blue-200",
    chipActive: "bg-blue-600 text-white dark:bg-blue-400 dark:text-slate-950",
    check: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200",
    hoverShadow: "hover:shadow-blue-500/20 dark:hover:shadow-blue-950/25",
  };
}

export default function PricingPage() {
  const { data: rawPlans, isLoading, error, refetch } = useGetPlansQuery();
  const [selectedDurations, setSelectedDurations] = useState({});

  const tiers = useMemo(() => {
    const plans = filterVisiblePlans(rawPlans);
    if (plans.length === 0) return [];

    const grouped = plans.reduce((accumulator, plan) => {
      const tierName = plan.name.split(" - ")[0] || "Standard";

      if (!accumulator[tierName]) {
        accumulator[tierName] = {
          name: tierName,
          options: [],
          features: Array.isArray(plan.features) ? plan.features : [],
          icon: tierName.includes("1")
            ? Zap
            : tierName.includes("2")
              ? Star
              : Crown,
          color: tierName.includes("1")
            ? "blue"
            : tierName.includes("2")
              ? "indigo"
              : "amber",
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
  }, [rawPlans]);

  const resolvedDurations = useMemo(() => {
    if (Object.keys(selectedDurations).length > 0) return selectedDurations;

    const defaults = {};
    tiers.forEach((tier) => {
      defaults[tier.name] = tier.options[0].durationInDays;
    });

    return defaults;
  }, [tiers, selectedDurations]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 pb-24 pt-32 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-24 h-72 w-72 rounded-full bg-indigo-400/14 blur-[110px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-32 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/18" />
        <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-indigo-500/12 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 shadow-[0_18px_44px_rgba(59,130,246,0.12)] backdrop-blur-xl dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200">
            <Zap size={14} className="text-blue-600 dark:text-blue-300" />
            Flexible Pricing
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-6xl">
            Plans for{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent dark:from-white dark:via-blue-200 dark:to-cyan-200">
              Every Scale
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            Transparent pricing with no hidden fees. Choose the plan and duration that best
            fits your organization&apos;s needs.
          </p>
        </div>

        {tiers.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-10 text-center shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/78 dark:shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              No plans are available right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier, index) => {
              const currentDuration = resolvedDurations[tier.name];
              const selectedPlan =
                tier.options.find((option) => option.durationInDays === currentDuration) ||
                tier.options[0];
              const palette = getAccentPalette(tier.color);
              const Icon = tier.icon;

              return (
                <div
                  key={tier.name}
                  className={`group relative rounded-[2.5rem] border border-transparent bg-white p-1 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-100 hover:shadow-[0_36px_96px_rgba(59,130,246,0.16),0_18px_42px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/25 ${palette.hoverShadow} ${tier.popular ? "ring-4 ring-blue-600/10 dark:ring-blue-400/20" : ""}`}
                >
                  <div className="flex h-full flex-col rounded-[2.3rem] border border-slate-100 bg-white p-8 transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/90 md:p-10">
                    <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-105 ${palette.icon}`}>
                      <Icon size={24} />
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
                            className={`flex-1 rounded-xl px-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${active ? `${palette.chipActive} shadow-lg` : "text-slate-500 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}
                          >
                            {formatPlanDurationShort(option.durationInDays)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mb-10 flex-grow space-y-4">
                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${palette.check}`}>
                            <Check size={12} />
                          </div>
                          <span className="text-sm font-medium leading-tight text-slate-600 dark:text-slate-300">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={{
                        pathname: "/register/organisation",
                        query: { planCode: selectedPlan.code },
                      }}
                      className={`group/btn flex w-full items-center justify-center gap-3 rounded-3xl py-5 font-black shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 ${tier.popular ? "bg-blue-600 text-white shadow-[0_24px_60px_rgba(59,130,246,0.24)] hover:bg-slate-900 hover:shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-blue-950/30 dark:hover:bg-blue-300" : "border border-slate-200 bg-slate-50 text-slate-950 hover:bg-blue-600 hover:text-white hover:shadow-[0_24px_60px_rgba(59,130,246,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-100"}`}
                    >
                      Select Plan
                      <ArrowRight size={20} className="transition-transform group-hover/btn:translate-x-1" />
                    </Link>
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
              <h4 className="brand-spotlight-title mb-3 text-3xl font-black">Need a Custom Solution?</h4>
              <p className="brand-spotlight-copy text-lg font-medium leading-relaxed">
                For organizations with more than 1500 employees, we offer custom enterprise
                plans with dedicated infrastructure and support.
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
