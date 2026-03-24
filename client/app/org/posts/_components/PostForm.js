"use client";

import { X, Edit2, Plus, Loader2, Trash2 } from "lucide-react";

export function PostForm({
  form,
  setForm,
  editingId,
  submitting,
  onSubmit,
  onReset,
  onInputChange,
  types,
}) {
  const onPollOptionChange = (index, value) => {
    const newOptions = [...form.metadata.options];
    newOptions[index] = value;
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, options: newOptions },
    }));
  };

  const addPollOption = () => {
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        options: [...prev.metadata.options, ""],
      },
    }));
  };

  const removePollOption = (index) => {
    if (form.metadata.options.length <= 2) return;
    const newOptions = form.metadata.options.filter((_, i) => i !== index);
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, options: newOptions },
    }));
  };

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          {editingId ? "Edit Post" : "Create New Post"}
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Title
            </label>
            <input
              name="title"
              value={form.title}
              onChange={onInputChange}
              placeholder="Post heading..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Type
            </label>
            <select
              name="type"
              value={form.type}
              onChange={onInputChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Content
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={onInputChange}
            placeholder="Write your message here..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition-all font-medium resize-none"
            required
          />
        </div>

        {form.type === "POLL" && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
            <label className="text-[11px] font-black uppercase tracking-widest text-amber-600 block">
              Poll Options
            </label>
            {form.metadata.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => onPollOptionChange(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-amber-200 px-3 py-2 text-sm outline-none focus:border-amber-500 font-medium"
                  required
                />
                {form.metadata.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(i)}
                    className="p-2 text-amber-400 hover:text-amber-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPollOption}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
            >
              <Plus size={14} /> Add Option
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : editingId ? (
              <Edit2 size={18} />
            ) : (
              <Plus size={18} />
            )}
            {editingId ? "Update Post" : "Publish Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
