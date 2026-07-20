"use client";

import { X, Edit2, Plus, Loader2, Trash2, Paperclip, FileText, Image as ImageIcon } from "lucide-react";

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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const MAX_DIM = 1200;
          
          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress the image to JPEG with 0.8 quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          
          if (dataUrl.length > 5 * 1024 * 1024) {
            alert("Image is too large even after compression. Please choose a smaller image.");
            return;
          }

          setForm((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), { dataUrl, name: file.name, allowDownload: true }]
          }));
        };
      } else {
        if (file.size > 4 * 1024 * 1024) {
          alert("Document size should not exceed 4MB");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), { dataUrl: reader.result, name: file.name, allowDownload: true }]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = null;
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  };

  const toggleAttachmentDownload = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.map((att, i) => i === index ? { ...att, allowDownload: !att.allowDownload } : att)
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

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Attachment (Optional)
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                <Paperclip size={16} />
                Attach Files
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            
            {form.attachments && form.attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {form.attachments.map((att, idx) => (
                  <div key={idx} className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        {att.name?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || att.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || (att.dataUrl && att.dataUrl.startsWith("data:image")) ? (
                          <ImageIcon size={16} className="text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText size={16} className="text-blue-500 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate max-w-[150px]">
                          {att.name || "Attachment"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-blue-400 hover:text-blue-600 transition p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer border-t border-blue-100/50 pt-2">
                      <input
                        type="checkbox"
                        checked={att.allowDownload !== false}
                        onChange={() => toggleAttachmentDownload(idx)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-600">Allow download</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
