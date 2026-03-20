"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X,
  IndianRupee,
  Users,
  Layout,
  MapPin,
  Clock,
  Zap,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { 
  useGetPlanByIdQuery, 
  useUpdatePlanMutation, 
  useDeletePlanMutation 
} from "@/store/api/planApi";

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: plan, isLoading, isError, refetch } = useGetPlanByIdQuery(id);
  const [updatePlanMutation] = useUpdatePlanMutation();
  const [deletePlanMutation] = useDeletePlanMutation();

  const [form, setForm] = useState({
    name: "",
    price: "",
    durationInDays: "",
    memberLimit: "",
    featuresText: "",
    description: "",
    maxTeams: "",
    maxLocations: "",
    isDefault: false,
    isActive: true
  });

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || "",
        price: (plan.price || 0).toString(),
        durationInDays: (plan.durationInDays || 0).toString(),
        memberLimit: (plan.memberLimit || 0).toString(),
        featuresText: Array.isArray(plan.features) ? plan.features.join(", ") : "",
        description: plan.description || "",
        maxTeams: (plan.maxTeams || 0).toString(),
        maxLocations: (plan.maxLocations || 0).toString(),
        isDefault: !!plan.isDefault,
        isActive: plan.isActive !== false
      });
    }
  }, [plan]);

  const onInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ 
        ...prev, 
        [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const payload = {
        id,
        name: form.name.trim(),
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

      await updatePlanMutation(payload).unwrap();
      setMessage("Plan updated successfully.");
      setIsEditing(false);
      refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to update plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to deactivate plan "${plan?.name}"?`)) return;

    try {
      setSubmitting(true);
      await deletePlanMutation(id).unwrap();
      router.push("/super-admin/plans");
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to deactivate plan");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-black text-slate-400 uppercase tracking-widest">Loading Plan Intel...</p>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center px-6">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">PLAN NOT FOUND</h2>
        <p className="mt-2 text-slate-500 font-medium">The record you are looking for might have been deleted or is inaccessible.</p>
        <button 
            onClick={() => router.push("/super-admin/plans")}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3 text-sm font-black text-white"
        >
            <ChevronLeft size={18} /> Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Back & Actions Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/super-admin/plans")}
          className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white group-hover:border-slate-900 transition-all">
            <ChevronLeft size={20} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Inventory</span>
        </button>

        <div className="flex items-center gap-3">
            {!isEditing && (
                <button 
                    onClick={handleDelete}
                    disabled={submitting}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                >
                    <Trash2 size={18} />
                </button>
            )}
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase transition-all active:scale-95 ${
                    isEditing ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                }`}
            >
                {isEditing ? <X size={16} /> : <Edit3 size={16} />}
                {isEditing ? "Cancel" : "Edit Plan"}
            </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Detail Overview */}
        <div className="lg:col-span-1 space-y-6">
            <div className={`rounded-[2.5rem] border-4 p-8 bg-white relative overflow-hidden ${plan.isDefault ? "border-blue-600 shadow-2xl shadow-blue-50" : "border-white shadow-xl shadow-slate-100"}`}>
                {plan.isDefault && (
                    <div className="absolute top-0 right-0 h-24 w-24 overflow-hidden">
                        <div className="absolute top-4 right-[-34px] bg-blue-600 text-[9px] font-black text-white py-1 px-12 rotate-45 shadow-sm">
                            PRIMARY
                        </div>
                    </div>
                )}
                
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 mb-6 border border-slate-100">
                    <Zap size={28} fill={plan.isActive ? "currentColor" : "none"} />
                </div>

                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{plan.name}</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">{plan.code}</p>

                <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                    <span className="text-xs font-black text-slate-400 uppercase">/ Month</span>
                </div>

                <div className="space-y-4">
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${plan.active !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        <div className={`h-2 w-2 rounded-full ${plan.active !== false ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                        {plan.active !== false ? "Market Live" : "Inactive TIER"}
                    </div>
                </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Meta Data</h4>
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-500">Subscribers</span>
                        <span className="text-xs font-black text-slate-900">{plan.subscribersTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-500">Revenue</span>
                        <span className="text-xs font-black text-emerald-600">₹{plan.revenue || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-500">Created At</span>
                        <span className="text-xs font-black text-slate-900">
                            {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side: Configuration Form or Values */}
        <div className="lg:col-span-2">
            {isEditing ? (
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-xl animate-in zoom-in-95 duration-300">
                    <form onSubmit={handleUpdate} className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2 flex items-center gap-3 mb-4">
                             <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Update Configuration</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modifying {plan.code}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price Point (INR)</label>
                            <div className="relative">
                                <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="price"
                                    type="number"
                                    value={form.price}
                                    onChange={onInputChange}
                                    className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-black outline-none transition-all focus:border-blue-500 focus:bg-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Duration (Days)</label>
                            <input
                                name="durationInDays"
                                type="number"
                                value={form.durationInDays}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Member Capacity</label>
                            <input
                                name="memberLimit"
                                type="number"
                                value={form.memberLimit}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                            />
                        </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Teams</label>
                            <input
                                name="maxTeams"
                                type="number"
                                value={form.maxTeams}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                            />
                        </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Locations</label>
                            <input
                                name="maxLocations"
                                type="number"
                                value={form.maxLocations}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Features (CSV)</label>
                            <input
                                name="featuresText"
                                value={form.featuresText}
                                onChange={onInputChange}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pitch / Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={onInputChange}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                                rows={3}
                            />
                        </div>

                        <div className="md:col-span-2 flex items-center justify-between border-t border-slate-100 pt-6 mt-2">
                             <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        name="isDefault"
                                        checked={form.isDefault}
                                        onChange={onInputChange}
                                        className="h-5 w-5 rounded-lg accent-blue-600"
                                    />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Default</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={onInputChange}
                                        className="h-5 w-5 rounded-lg accent-emerald-500"
                                    />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Active</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="h-14 rounded-2xl bg-slate-900 px-10 text-sm font-black text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl shadow-slate-100"
                            >
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                Save Configuration
                            </button>
                        </div>
                    </form>
                    
                    {error && <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 text-xs font-bold text-center">ERROR: {error}</div>}
                    {message && <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold text-center">{message}</div>}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Content Section */}
                    <div className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-xl shadow-slate-50">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Service Parameters</h2>
                        
                        <div className="grid gap-10 md:grid-cols-2">
                            <DetailItem icon={<Users size={20}/>} label="User Allowance" value={plan.memberLimit === 0 ? "Infinite Access" : `${plan.memberLimit} Seats`} />
                            <DetailItem icon={<Layout size={20}/>} label="Team Structure" value={plan.maxTeams === 0 ? "Global Hierarchy" : `${plan.maxTeams} Teams Allowed`} />
                            <DetailItem icon={<MapPin size={20}/>} label="Geo-Geofencing" value={plan.maxLocations === 0 ? "Dynamic Global" : `${plan.maxLocations} Active Spots`} />
                            <DetailItem icon={<Clock size={20}/>} label="Billing Cycle" value={`${plan.durationInDays} Full Days`} />
                        </div>

                        <div className="mt-12">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Functional Stack</h4>
                             <div className="flex flex-wrap gap-2">
                                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                                    plan.features.map((feature, i) => (
                                        <span key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
                                            {feature}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-xs font-bold text-slate-400 italic">No modules assigned.</p>
                                )}
                             </div>
                        </div>

                        <div className="mt-12 bg-slate-50 rounded-2xl p-6">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Service Description</h4>
                             <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                {plan.description || "The system administrator has not provided a detailed description for this service tier. Contact the DevOps team for protocol specifics."}
                             </p>
                        </div>
                    </div>

                    {/* Quick Warning */}
                    <div className="rounded-3xl border border-blue-50 bg-blue-50/30 p-8 flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <AlertCircle size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase">System Integration Note</h4>
                            <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">
                                Modifications to existing tiers will propagate to and affect all organizations currently subscribed to this plan profile. 
                                Exercise caution when adjusting capacity limits or core modules.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 border border-slate-100">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-base font-black text-slate-900 leading-tight">{value}</p>
            </div>
        </div>
    );
}

function Settings2({ size, ...props }) {
    return <Edit3 size={size} {...props} />;
}
