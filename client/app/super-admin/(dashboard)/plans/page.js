"use client";

import { useMemo, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { 
  Loader2, 
  RefreshCcw, 
  Zap, 
  Plus,
  X,
  IndianRupee,
  Activity,
  Trash2
} from "lucide-react";
import { 
  useCreatePlanMutation,
  useDeletePlanMutation
} from "@/services/api/planApi";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { 
  useGetSuperAdminPlansQuery,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation
} from "@/services/api/superAdminApi";
import Link from "next/link";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import {
  filterVisiblePlans,
  formatPlanCodeLabel,
  formatPlanDurationLong,
  formatPlanNameLabel,
  formatPlanPrice,
} from "@/utils/plans";
import { addNotification } from "@/store/slices/notificationSlice";

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";
const planTileClassName =
  "brand-entity-card group active:scale-[0.99]";

export default function SuperAdminPlansPage() {
  const dispatch = useDispatch();
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  const [gstRate, setGstRate] = useState("18");
  const [sortBy, setSortBy] = useState("displayOrder-asc");

  const [form, setForm] = useState({
    name: "",
    code: "",
    price: "",
    durationInDays: "90",
    memberLimit: "0",
    featuresText: "",
    description: "",
    maxTeams: "0",
    maxLocations: "0",
    isDefault: false,
    isActive: true,
    displayOrder: "0"
  });

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminPlansQuery();
  
  const { data: gstData } = useGetSystemSettingsQuery();
  const [updateSetting, { isLoading: isUpdatingGst }] = useUpdateSystemSettingMutation();

  const [createPlanMutation] = useCreatePlanMutation();
  const [deletePlanMutation] = useDeletePlanMutation();

  useEffect(() => {
    if (gstData?.items) {
      const gstSetting = gstData.items.find(s => s.key === "GST_RATE");
      if (gstSetting) {
        setGstRate(gstSetting.value);
      }
    }
  }, [gstData]);

  const handleSaveGst = async (e) => {
    e.preventDefault();
    if (!gstRate || isNaN(parseFloat(gstRate))) {
      dispatch(
        addNotification({
          type: "error",
          title: "Invalid Input",
          message: "Please enter a valid GST percentage.",
        })
      );
      return;
    }

    try {
      await updateSetting({ key: "GST_RATE", value: parseFloat(gstRate).toString() }).unwrap();
      dispatch(
        addNotification({
          type: "success",
          title: "Settings Saved",
          message: "GST percentage updated successfully!",
        })
      );
    } catch (err) {
      dispatch(
        addNotification({
          type: "error",
          title: "Update Failed",
          message: err?.data?.message || "Failed to update GST setting.",
        })
      );
    }
  };

  const plans = useMemo(() => {
    let list = filterVisiblePlans(Array.isArray(data?.items) ? data.items : []);
    list.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "date-desc":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "date-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "displayOrder-asc":
        default:
          if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return (a.price || 0) - (b.price || 0);
      }
    });
    return list;
  }, [data, sortBy]);
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);
  const overviewCards = useMemo(
    () => [
      {
        label: "Plans",
        value: summaryMap.get("Plans") || plans.length,
        hint: "Configured subscription tiers",
      },
      {
        label: "Active",
        value: summaryMap.get("Active Plans") || plans.filter((plan) => plan.active).length,
        hint: "Currently market-ready plans",
      },
      {
        label: "Default",
        value: summaryMap.get("Default Plans") || plans.filter((plan) => plan.isDefault).length,
        hint: "Starter plans shown by default",
      },
      {
        label: "Subscribers",
        value:
          summaryMap.get("Total Subscribers") ||
          plans.reduce((sum, item) => sum + Number(item.subscribersTotal || 0), 0),
        hint: "Active plan assignments",
      },
    ],
    [plans, summaryMap]
  );
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPlans,
    setPage,
    setPageSize,
  } = useLocalPagination(plans, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.PLANS[0],
    dependencies: [plans.length],
  });

  const onInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ 
        ...prev, 
        [name]: type === "checkbox" ? checked : value 
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      price: "",
      durationInDays: "90",
      memberLimit: "0",
      featuresText: "",
      description: "",
      maxTeams: "0",
      maxLocations: "0",
      isDefault: false,
      isActive: true,
      displayOrder: "0"
    });
  };

  const createPlan = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.code.trim() || !form.price || !form.durationInDays) {
      setError("Name, code, price and duration are required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase().replace(/[-\s]+/g, "_").replace(/_+/g, "_"),
        price: Number(form.price),
        durationInDays: Number(form.durationInDays),
        memberLimit: Number(form.memberLimit || 0),
        features: form.featuresText
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
        description: form.description.trim(),
        limits: {
            maxUsers: Number(form.memberLimit || 0),
            maxTeams: Number(form.maxTeams || 0),
            maxLocations: Number(form.maxLocations || 0),
        },
        isDefault: form.isDefault,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder || 0)
      };

      await createPlanMutation(payload).unwrap();
      setMessage("Plan added successfully.");
      resetForm();
      setShowAddForm(false);
      await refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to process plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (e, plan) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE plan "${plan.name}"? This action cannot be undone.`,
      )
    )
      return;

    try {
      setError("");
      setMessage("");
      await deletePlanMutation(plan.id).unwrap();
      setMessage("Plan deleted successfully.");
      await refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to delete plan");
    }
  };

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Mini Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">System Plans</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">SaaS Model Control</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                 <select 
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value)}
                   className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-300"
                 >
                   <option value="displayOrder-asc">Default (Display Order)</option>
                   <option value="price-asc">Price (Low to High)</option>
                   <option value="price-desc">Price (High to Low)</option>
                   <option value="date-desc">Newest First</option>
                   <option value="date-asc">Oldest First</option>
                   <option value="name-asc">Name (A-Z)</option>
                 </select>
                 <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
             </div>
             <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-sm h-10 w-10 p-0"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`brand-btn ${showAddForm ? "brand-btn-secondary" : "brand-btn-primary"} brand-btn-md`}
            >
                {showAddForm ? <X size={18} /> : <Plus size={18} />}
                {showAddForm ? "Close Form" : "Create New Plan"}
            </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
          />
        ))}
      </div>

      {/* Global Tax Settings (GST) */}
      <div className="light-glow-card-static rounded-[1.9rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 rounded-2xl">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Global GST Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage dynamic tax rate applied during registration checkout</p>
            </div>
          </div>
          <form onSubmit={handleSaveGst} className="flex items-center gap-3">
            <div className="relative max-w-[120px]">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="18"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-slate-500 text-xs font-bold">%</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={isUpdatingGst}
              className="brand-btn brand-btn-primary brand-btn-sm h-10 font-black animate-in fade-in"
            >
              {isUpdatingGst ? <Loader2 size={16} className="animate-spin" /> : "Save GST"}
            </button>
          </form>
        </div>
      </div>

      {/* Toggleable Add Form */}
      {showAddForm && (
        <div className={`${panelClassName} animate-in zoom-in-95 duration-300`}>
            <div className="mb-8 flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-900">Define a New Subscription TIER</h3>
            </div>

            <form onSubmit={createPlan} className="grid gap-6 md:grid-cols-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plan Name</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={onInputChange}
                        placeholder="Premium Pro"
                        className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        required
                    />
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">System Code</label>
                    <input
                        name="code"
                        value={form.code}
                        onChange={onInputChange}
                        placeholder="PRO_2026"
                        className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black uppercase outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Billing Price</label>
                    <div className="relative">
                        <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            name="price"
                            type="number"
                            value={form.price}
                            onChange={onInputChange}
                            placeholder="0.00"
                            className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-black outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Billing Cycle (Days)</label>
                    <input
                        name="durationInDays"
                        type="number"
                        value={form.durationInDays}
                        onChange={onInputChange}
                        className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Users</label>
                    <input
                        name="memberLimit"
                        type="number"
                        value={form.memberLimit}
                        onChange={onInputChange}
                        className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Display Order</label>
                    <input
                        name="displayOrder"
                        type="number"
                        value={form.displayOrder}
                        onChange={onInputChange}
                        className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none ring-offset-2 transition-all focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Flags</label>
                    <div className="flex h-12 items-center gap-4 px-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={onInputChange} className="h-4 w-4 rounded accent-blue-600" />
                            <span className="text-xs font-bold text-slate-700">Default</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isActive" checked={form.isActive} onChange={onInputChange} className="h-4 w-4 rounded accent-emerald-500" />
                            <span className="text-xs font-bold text-slate-700">Active</span>
                        </label>
                    </div>
                </div>

                <div className="md:col-span-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-14 rounded-2xl bg-blue-600 text-base font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} fill="currentColor" />}
                        Finalize & Deploy Plan
                    </button>
                </div>
            </form>
            
            {error && <p className="mt-4 text-sm font-bold text-rose-500 text-center">{error}</p>}
        </div>
      )}

      {/* Plans Mini Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse border border-slate-200"></div>
          ))
        ) : plans.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <Activity className="mx-auto text-slate-200" size={48} />
            <p className="mt-4 text-slate-400 font-bold">No plans configured yet.</p>
          </div>
        ) : (
          paginatedPlans.map((plan) => (
            <Link 
                href={`/super-admin/plans/${plan.id}`} 
                key={plan.id}
                className={planTileClassName}
            >
                <div className="brand-metric-glow" />
                <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {formatPlanCodeLabel(plan.code)}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => handleDeletePlan(e, plan)}
                            className="relative z-10 p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            plan.active !== false
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                        }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${plan.active !== false ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                            {plan.active !== false ? "Active" : "Paused"}
                        </span>
                    </div>
                </div>

                <div className="relative mt-6 flex-1">
                    <h4 className="text-[1.3rem] font-black leading-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-200">
                      {formatPlanNameLabel(plan.name, plan.code)}
                    </h4>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-[2rem] font-black tracking-tight text-slate-900 dark:text-white">
                          Rs. {formatPlanPrice(plan.price)}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          / {formatPlanDurationLong(plan.durationInDays)}
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
                      {Number(plan.subscribersTotal || 0)} subscribers
                      {" · "}
                      Rs. {formatPlanPrice(plan.revenue || 0)} revenue
                    </p>
                </div>

                <div className="relative mt-6 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                      Open plan details
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-200 dark:group-hover:text-cyan-200">
                      View
                    </span>
                </div>

                {plan.isDefault && (
                    <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-600 text-[8px] font-black text-white py-1 px-8 translate-x-1/2 translate-y-1/2 rotate-45 shadow-sm">
                            DEFAULT
                        </div>
                    </div>
                )}
            </Link>
          ))
        )}
      </div>

      {!loading && plans.length > 0 ? (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={plans.length}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.PLANS}
          label="plans"
        />
      ) : null}
    </section>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="brand-metric-card">
      <div className="brand-metric-glow" />
      <div className="relative">
        <p className="brand-metric-label mt-0">{label}</p>
        <p className="brand-metric-value">{value}</p>
        <p className="brand-metric-copy">{hint}</p>
      </div>
    </div>
  );
}
