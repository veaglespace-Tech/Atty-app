"use client";

import { X, Send, Loader2, Check } from "lucide-react";

export function UpdateForm({
  form,
  setForm,
  submitting,
  onSubmit,
  onReset,
  roles = [],
  rolesLoading = false,
}) {
  const onInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleCode) => {
    setForm((prev) => {
      const currentRoles = prev.metadata?.targetRoles || [];
      const newRoles = currentRoles.includes(roleCode)
        ? currentRoles.filter((r) => r !== roleCode)
        : [...currentRoles, roleCode];
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          targetRoles: newRoles,
        },
      };
    });
  };

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Send Targeted Update
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={onInputChange}
            placeholder="Write your update message here..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition-all font-medium resize-none"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-indigo-600 ml-1">
            Target Roles <span className="text-red-500">*</span>
          </label>
          {rolesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
              <Loader2 className="animate-spin" size={16} /> Loading roles...
            </div>
          ) : roles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {roles
                .filter((r) => r.code !== "SUPER_ADMIN")
                .map((role) => {
                  const isSelected = form.metadata?.targetRoles?.includes(
                    role.code
                  );
                  return (
                    <button
                      key={role.code}
                      type="button"
                      onClick={() => handleRoleToggle(role.code)}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div
                          className={`text-sm font-bold ${
                            isSelected ? "text-indigo-700" : "text-slate-700"
                          }`}
                        >
                          {role.name}
                        </div>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">No roles found.</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            {submitting ? "Sending..." : "Send Updates"}
          </button>
        </div>
      </form>
    </div>
  );
}
