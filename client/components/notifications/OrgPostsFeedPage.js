"use client";

import { useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  FileText,
  Loader2,
  Megaphone,
  Trophy,
  User,
} from "lucide-react";
import {
  useGetOrgPostsQuery,
  useVoteOnPostMutation,
} from "@/services/api/postApi";
import PollOptionsPanel from "@/components/posts/PollOptionsPanel";
import { getErrorMessage } from "@/utils/formValidation";

const POST_TYPES = {
  NOTIFICATION: {
    label: "Notification",
    icon: Megaphone,
    color:
      "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",
  },
  ARTICLE: {
    label: "Article",
    icon: FileText,
    color:
      "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  POLL: {
    label: "Poll",
    icon: BarChart2,
    color:
      "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20",
  },
  TOURNAMENT_CARD: {
    label: "Tournament",
    icon: Trophy,
    color:
      "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20",
  },
};

export default function OrgPostsFeedPage({
  title = "Feed & Updates",
  description = "Stay updated with the latest news, events, and polls from your organization.",
}) {
  const [activeVoteId, setActiveVoteId] = useState(null);
  const [voteError, setVoteError] = useState("");
  const { data: postsData, isLoading, refetch, isFetching } = useGetOrgPostsQuery();
  const [voteOnPost] = useVoteOnPostMutation();
  const posts = useMemo(() => postsData?.items || [], [postsData]);

  const handleVote = async (postId, optionIndex) => {
    try {
      setVoteError("");
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
    } catch (error) {
      setVoteError(getErrorMessage(error, "Unable to save your poll response"));
    } finally {
      setActiveVoteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-slate-400" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">
          Loading updates from your organization...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-slate-400 font-medium max-w-md">{description}</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Megaphone size={120} />
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-950/75 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-300">
            <Megaphone size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No updates yet</h3>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Check back later for news and announcements.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {voteError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {voteError}
            </div>
          ) : null}

          {posts.map((post) => {
            const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
            const Icon = config.icon;

            return (
              <div
                key={post.id}
                className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/75 p-6 shadow-sm transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <Calendar size={12} />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300">
                      {post.title}
                    </h2>

                    <div className="mt-4 whitespace-pre-wrap font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      {post.content}
                    </div>

                    {post.type === "POLL" && post.metadata?.options ? (
                      <PollOptionsPanel
                        post={post}
                        onVote={handleVote}
                        isVoting={activeVoteId === post.id}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                    <User size={14} />
                    <span>Posted by {post.author?.name || "Admin"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-xs font-black text-blue-600 dark:text-blue-300 hover:underline disabled:opacity-60"
                  >
                    {isFetching ? "Refreshing..." : "Refresh Feed"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
