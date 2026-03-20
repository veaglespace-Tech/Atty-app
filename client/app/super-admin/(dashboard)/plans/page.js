"use client";

import { useMemo, useState } from "react";
import { 
  Loader2, 
  PlusCircle, 
  RefreshCcw, 
  Zap, 
  ChevronRight,
  Plus,
  X,
  IndianRupee,
  Activity
} from "lucide-react";
import { 
  useCreatePlanMutation 
} from "@/store/api/planApi";
import { useGetSuperAdminPlansQuery } from "@/store/api/superAdminApi";
import Link from "next/link";

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

export default function SuperAdminPlansPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    price: "",
    durationInDays: "30",
    memberLimit: "0",
    featuresText: "",
    description: "",
    maxTeams: "0",
    maxLocations: "0",
    isDefault: false,
    isActive: true
  });

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminPlansQuery();
  
  const [createPlanMutation] = useCreatePlanMutation();

  const plans = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);

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
      durationInDays: "30",
      memberLimit: "0",
      featuresText: "",
      description: "",
      maxTeams: "0",
      maxLocations: "0",
      isDefault: false,
      isActive: true
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
        code: form.code.trim().toUpperCase(),
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
        isActive: form.isActive
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

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Mini Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Plans</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">SaaS Model Control</p>
        </div>

        <div className="flex items-center gap-3">
             <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors shadow-sm active:scale-95"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-xl transition-all active:scale-95 ${
                    showAddForm ? 'bg-rose-500 shadow-rose-100 hover:bg-rose-600' : 'bg-slate-900 shadow-slate-100 hover:bg-slate-800'
                }`}
            >
                {showAddForm ? <X size={18} /> : <Plus size={18} />}
                {showAddForm ? "Close Form" : "Create New Plan"}
            </button>
        </div>
      </div>

      {/* Toggleable Add Form */}
      {showAddForm && (
        <div className="rounded-[2rem] border-2 border-slate-900 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <PlusCircle size={24} />
                </div>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monthly Price</label>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Validity (Days)</label>
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
          plans.map((plan) => (
            <Link 
                href={`/super-admin/plans/${plan.id}`} 
                key={plan.id}
                className="group relative flex flex-col p-6 rounded-3xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-50 transition-all duration-300 active:scale-95 overflow-hidden"
            >
                <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <Zap size={20} fill={plan.isActive ? "currentColor" : "none"} />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        plan.active !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                    }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${plan.active !== false ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                        {plan.active !== false ? "Active" : "Paused"}
                    </span>
                </div>

                <div className="mt-6">
                    <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors uppercase">{plan.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ Month</span>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plan.code}</span>
                    <div className="h-8 w-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                        <ChevronRight size={16} />
                    </div>
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

      {/* Global Stats bar at bottom */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900 rounded-[2rem] p-6 text-white">
          <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Tiers</p>
              <h5 className="text-2xl font-black">{summaryMap.get("Plans") || plans.length}</h5>
          </div>
          <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>
          <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Market</p>
              <h5 className="text-2xl font-black text-emerald-400">{summaryMap.get("Active Plans") || 0}</h5>
          </div>
          <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>
          <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscribers</p>
              <h5 className="text-2xl font-black text-blue-400">{plans.reduce((sum, item) => sum + Number(item.subscribersTotal || 0), 0)}</h5>
          </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, icon, color }) {
  return (
    <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${color} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}
