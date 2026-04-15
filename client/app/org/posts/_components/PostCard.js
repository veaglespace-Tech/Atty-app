"use client";

import { Edit2, Trash2 } from "lucide-react";
import PollOptionsPanel from "@/components/posts/PollOptionsPanel";
import { cn } from "@/lib/utils";

export function PostCard({ post, types, onEdit, onDelete, onVote, isVoting }) {
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
        <PollOptionsPanel post={post} onVote={onVote} isVoting={isVoting} />
      )}

      <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[9px]",
            post.author?.role === "ORG_ADMIN" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" :
            post.author?.role === "SUB_ADMIN" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" :
            post.author?.role === "TEAM_LEADER" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" :
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
          )}>
            {(post.author?.role || "ADMIN").replace("_", " ")}
          </span>
          <span className="text-slate-600 dark:text-slate-300">{post.author?.name || "Me" }</span>
        </div>
      </div>
    </div>
  );
}
