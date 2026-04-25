"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  Edit3,
  IndianRupee,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  useDeletePlanMutation,
  useGetPlanByIdQuery,
  useUpdatePlanMutation,
} from "@/services/api/planApi";
import {
  formatPlanCodeLabel,
  formatPlanDurationLong,
  formatPlanNameLabel,
  formatPlanPrice,
} from "@/utils/plans";

const getFormDefaults = (plan) => ({
  name: plan?.name || "",
  price: String(plan?.price || 0),
  durationInDays: String(plan?.durationInDays || 0),
  memberLimit: String(plan?.memberLimit || 0),
  featuresText: Array.isArray(plan?.features) ? plan.features.join(", ") : "",
  description: plan?.description || "",
  maxTeams: String(plan?.maxTeams || 0),
  maxLocations: String(plan?.maxLocations || 0),
  isDefault: Boolean(plan?.isDefault),
  isActive: plan?.isActive !== false,
});

function DetailItem({ label, value }) {
  return (
    <div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-base font-black leading-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SettingsGlyph({ size, ...props }) {
  return <Edit3 size={size} {...props} />;
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(getFormDefaults(null));

  const { data: plan, isLoading, isError, refetch } = useGetPlanByIdQuery(id, { skip: !id });
  const [updatePlanMutation] = useUpdatePlanMutation();
  const [deletePlanMutation] = useDeletePlanMutation();

  useEffect(() => {
    setForm(getFormDefaults(plan));
  }, [plan]);

  const onInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await updatePlanMutation({
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
        isActive: form.isActive,
      }).unwrap();

      setMessage("Plan updated successfully.");
      setIsEditing(false);
      await refetch();
    } catch (updateError) {
      setError(updateError?.data?.message || updateError?.error || "Failed to update plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE plan "${plan?.name}"? This action cannot be undone.`,
      )
    )
      return;

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await deletePlanMutation(id).unwrap();
      router.push("/super-admin/plans");
    } catch (deleteError) {
      setError(deleteError?.data?.message || deleteError?.error || "Failed to delete plan");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">
          Loading plan intel...
        </p>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-40 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900">PLAN NOT FOUND</h2>
        <p className="mt-2 font-medium text-slate-500">
          The record you are looking for might have been deleted or is inaccessible.
        </p>
        <button
          onClick={() => router.push("/super-admin/plans")}
          className="brand-btn brand-btn-primary brand-btn-md mt-8"
        >
          <ChevronLeft size={18} /> Back to Inventory
        </button>
      </div>
    );
  }

  const planIsActive = plan.isActive !== false;

  return (
    <section className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/super-admin/plans")}
          className="group flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900"
        >
          <div className="brand-panel-soft flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:border-slate-900">
            <ChevronLeft size={20} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Inventory</span>
        </button>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="brand-btn brand-btn-danger brand-btn-sm h-10 w-10 p-0"
            >
              <Trash2 size={18} />
            </button>
          ) : null}
          <button
            onClick={() => setIsEditing((current) => !current)}
            className={`brand-btn brand-btn-sm h-10 px-4 text-xs font-black uppercase tracking-widest ${
              isEditing ? "brand-btn-secondary" : "brand-btn-primary"
            }`}
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? "Cancel" : "Edit Plan"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div
            className={`brand-entity-card rounded-[2.25rem] p-7 sm:p-8 ${
              plan.isDefault
                ? "border-blue-500/60 dark:border-cyan-400/40"
                : ""
            }`}
          >
            <div className="brand-metric-glow" />
            {plan.isDefault ? (
              <div className="absolute right-0 top-0 h-24 w-24 overflow-hidden">
                <div className="absolute right-[-34px] top-4 rotate-45 bg-blue-600 px-12 py-1 text-[9px] font-black text-white shadow-sm">
                  PRIMARY
                </div>
              </div>
            ) : null}

            <h1 className="relative mb-1 text-3xl font-black leading-none tracking-tight text-slate-900 dark:text-white">
              {formatPlanNameLabel(plan.name, plan.code)}
            </h1>
            <p className="relative mb-6 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {formatPlanCodeLabel(plan.code)}
            </p>

            <div className="relative mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                Rs. {formatPlanPrice(plan.price)}
              </span>
              <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                / {formatPlanDurationLong(plan.durationInDays)}
              </span>
            </div>

            <div className="relative space-y-4">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                  planIsActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    planIsActive ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                ></div>
                {planIsActive ? "Market Live" : "Inactive Tier"}
              </div>
            </div>
          </div>

          <div className="light-glow-card-static rounded-[1.9rem] p-6">
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Meta Data
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Subscribers</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{plan.subscribersTotal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Revenue</span>
                <span className="text-xs font-black text-emerald-600">Rs. {plan.revenue || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Created At</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {new Date(plan.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isEditing ? (
            <div className="light-glow-card-static animate-in zoom-in-95 rounded-[2rem] p-8 sm:p-10 duration-300">
              <form onSubmit={handleUpdate} className="grid gap-6 md:grid-cols-2">
                <div className="mb-4 flex items-center gap-3 md:col-span-2">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Update Configuration</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Modifying {formatPlanCodeLabel(plan.code)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Display Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Price Point (INR)
                  </label>
                  <div className="relative">
                    <IndianRupee
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={onInputChange}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-black outline-none transition-all focus:border-blue-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Duration (Days)
                  </label>
                  <input
                    name="durationInDays"
                    type="number"
                    value={form.durationInDays}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Member Capacity
                  </label>
                  <input
                    name="memberLimit"
                    type="number"
                    value={form.memberLimit}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Max Teams
                  </label>
                  <input
                    name="maxTeams"
                    type="number"
                    value={form.maxTeams}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Max Locations
                  </label>
                  <input
                    name="maxLocations"
                    type="number"
                    value={form.maxLocations}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Features (CSV)
                  </label>
                  <input
                    name="featuresText"
                    value={form.featuresText}
                    onChange={onInputChange}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pitch / Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                    rows={3}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-6 md:col-span-2">
                  <div className="flex items-center gap-6">
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={form.isDefault}
                        onChange={onInputChange}
                        className="h-5 w-5 rounded-lg accent-blue-600"
                      />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Default
                      </span>
                    </label>
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={onInputChange}
                        className="h-5 w-5 rounded-lg accent-emerald-500"
                      />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Active
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="brand-btn brand-btn-primary brand-btn-lg h-14 px-10 disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    Save Configuration
                  </button>
                </div>
              </form>

              {error ? (
                <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 p-4 text-center text-xs font-bold text-rose-500">
                  ERROR: {error}
                </div>
              ) : null}
              {message ? (
                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-600">
                  {message}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="animate-in fade-in space-y-8 duration-500">
              <div className="light-glow-card-static rounded-[2rem] p-8 sm:p-10">
                <h2 className="mb-8 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Service Parameters
                </h2>

                <div className="grid gap-10 md:grid-cols-2">
                  <DetailItem
                    label="User Allowance"
                    value={plan.memberLimit === 0 ? "Infinite Access" : `${plan.memberLimit} Seats`}
                  />
                  <DetailItem
                    label="Team Structure"
                    value={plan.maxTeams === 0 ? "Global Hierarchy" : `${plan.maxTeams} Teams Allowed`}
                  />
                  <DetailItem
                    label="Geo-Geofencing"
                    value={
                      plan.maxLocations === 0 ? "Dynamic Global" : `${plan.maxLocations} Active Spots`
                    }
                  />
                  <DetailItem
                    label="Billing Cycle"
                    value={`${plan.durationInDays} Full Days`}
                  />
                </div>

                <div className="mt-12">
                  <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Functional Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(plan.features) && plan.features.length > 0 ? (
                      plan.features.map((feature, index) => (
                        <span
                          key={`${plan.id}-feature-${index}`}
                          className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                        >
                          {feature}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs italic font-bold text-slate-400">
                        No modules assigned.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-12 rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/80">
                  <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Service Description
                  </h4>
                  <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    {plan.description ||
                      "The system administrator has not provided a detailed description for this service tier. Contact the DevOps team for protocol specifics."}
                  </p>
                </div>
              </div>

              <div className="light-glow-card-static flex items-start gap-4 rounded-[1.9rem] p-6 sm:p-8">
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                    System Integration Note
                  </h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                    Modifications to existing tiers will propagate to and affect all organizations
                    currently subscribed to this plan profile. Exercise caution when adjusting
                    capacity limits or core modules.
                  </p>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center text-xs font-bold text-rose-500">
                  ERROR: {error}
                </div>
              ) : null}
              {message ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-600">
                  {message}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
