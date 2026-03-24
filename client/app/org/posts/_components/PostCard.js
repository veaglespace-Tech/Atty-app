"use client";

import { Edit2, Trash2 } from "lucide-react";

export function PostCard({ post, types, onEdit, onDelete }) {
  const typeInfo = types.find((t) => t.value === post.type) || types[0];
  const Icon = typeInfo.icon;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-all hover:shadow-md overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className={`p-2.5 rounded-xl ${typeInfo.color}`}>
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onEdit(post)}
            className="p-1.5 text-slate-400 hover:text-blue-600 transition"
            title="Edit Post"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
            title="Delete Post"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-black text-slate-900 line-clamp-1">{post.title}</h4>
        <p className="mt-2 text-sm text-slate-600 line-clamp-3 font-medium min-h-[4.5em]">
          {post.content}
        </p>
      </div>

      {post.type === "POLL" && post.metadata?.options && (
        <div className="mt-4 space-y-1.5">
          {post.metadata.options.slice(0, 3).map((opt, i) => (
            <div
              key={i}
              className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
            >
              <div className="h-full bg-amber-400 w-1/4 opacity-30" />
            </div>
          ))}
          {post.metadata.options.length > 3 && (
            <p className="text-[10px] font-bold text-slate-400">
              +{post.metadata.options.length - 3} more options
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        <span>Admin: {post.author?.name || "Me"}</span>
      </div>
    </div>
  );
}
