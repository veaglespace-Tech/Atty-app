"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart2,
  Calendar,
  FileText,
  Loader2,
  Megaphone,
  Trophy,
  User,
  Paperclip,
} from "lucide-react";
import {
  useVoteOnPostMutation,
} from "@/services/api/postApi";
import {
  useGetOrgNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
} from "@/services/api/orgApi";
import PaginationControls from "@/components/dashboard/PaginationControls";
import PollOptionsPanel from "@/components/posts/PollOptionsPanel";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";

export const handleFileDownload = async (e, url, filename) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    window.open(url, '_blank');
  }
};

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
  const { data: postsData, isLoading, refetch, isFetching } = useGetOrgNotificationsQuery(500);
  const [voteOnPost] = useVoteOnPostMutation();
  const posts = useMemo(() => postsData?.items || [], [postsData]);
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPosts,
    setPage,
    setPageSize,
  } = useLocalPagination(posts, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.POSTS[0],
    dependencies: [posts.length],
  });

  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

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
      <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-3 px-4 py-14 sm:py-20">
        <Loader2 className="animate-spin text-slate-400" size={36} />
        <p className="text-center text-sm font-bold text-slate-500 animate-pulse sm:text-base dark:text-slate-400">
          Loading updates from your organization...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8 sm:space-y-6 sm:pb-10 lg:space-y-8 lg:pb-12">
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-xl sm:rounded-3xl sm:p-7 lg:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-300 sm:text-base">{description}</p>
          </div>
          {posts.some(p => !p.isRead) && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20 active:scale-95"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="pointer-events-none absolute -right-3 -top-3 opacity-10 sm:right-0 sm:top-0 sm:p-6">
          <Megaphone size={88} className="sm:h-[120px] sm:w-[120px]" />
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12 dark:border-slate-800 dark:bg-slate-950/75">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 sm:h-16 sm:w-16 dark:bg-slate-900">
            <Megaphone size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">No updates yet</h3>
          <p className="mt-1 text-sm text-slate-500 sm:text-base dark:text-slate-400">
            Check back later for news and announcements.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:gap-6">
          {voteError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:rounded-2xl dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {voteError}
            </div>
          ) : null}

          {paginatedPosts.map((post) => {
            const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
            const Icon = config.icon;

            return (
              <div
                key={post.id}
                className={`relative group rounded-2xl border ${post.isRead ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/75 hover:border-slate-300 dark:hover:border-slate-700" : "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-800"} p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:rounded-3xl sm:p-6`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest sm:px-3 ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 sm:text-xs dark:text-slate-500">
                      <Calendar size={12} />
                      {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <Link 
                    href={
                      typeof window !== "undefined" && window.location.pathname.startsWith("/member") 
                        ? `/member/notifications/${post.id}` 
                        : (typeof window !== "undefined" && window.location.pathname.startsWith("/team-leader") 
                          ? `/team-leader/notifications/${post.id}` 
                          : `/org/notifications/${post.id}`)
                    } 
                    className="before:absolute before:inset-0 before:z-10 focus:outline-none"
                  >
                    <h2 className="text-lg font-black text-slate-900 transition-colors group-hover:text-blue-600 sm:text-xl dark:text-white dark:group-hover:text-blue-300">
                      {post.title}
                    </h2>
                  </Link>

                  <div className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600 sm:mt-4 sm:text-base dark:text-slate-300 line-clamp-3">
                      {post.message || post.content}
                    </div>

                    {post.metadata?.attachment && (
                      <div className="mt-4 relative z-20">
                        {post.metadata.attachment.url?.match(/\.(jpeg|jpg|gif|png|webp)/i) || (post.metadata.attachment.resourceType === "image" && post.metadata.attachment.format !== "pdf" && !post.metadata.attachment.url?.match(/\.pdf/i)) ? (
                          <div 
                            className="relative group/image h-48 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                            onContextMenu={(e) => post.metadata.attachment.allowDownload === false ? e.preventDefault() : null}
                          >
                            <img 
                              src={post.metadata.attachment.url} 
                              alt={post.metadata.attachment.name || "Attachment"} 
                              className={`h-full w-full object-cover transition-transform duration-500 group-hover/image:scale-105 ${post.metadata.attachment.allowDownload === false ? 'pointer-events-none select-none' : ''}`} 
                            />
                            {post.metadata.attachment.allowDownload !== false && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/image:opacity-100">
                                <a
                                  href={post.metadata.attachment.url}
                                  download={post.metadata.attachment.name || "attachment.jpg"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-xl transition-transform hover:scale-105 active:scale-95"
                                  onClick={(e) => handleFileDownload(e, post.metadata.attachment.url, post.metadata.attachment.name || "attachment.jpg")}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                  Download Image
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          post.metadata.attachment.allowDownload !== false ? (
                            <div className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <Paperclip size={18} className="text-blue-500 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">{post.metadata.attachment.name || "Attached File"}</p>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">Document / File</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <a 
                                  href={post.metadata.attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                  Preview
                                </a>
                                <a 
                                  href={post.metadata.attachment.url}
                                  download={post.metadata.attachment.name || "attachment"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                                  onClick={(e) => handleFileDownload(e, post.metadata.attachment.url, post.metadata.attachment.name || "attachment")}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                  Download
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 opacity-80">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                <Paperclip size={18} className="text-slate-400" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-xs font-bold text-slate-500">{post.metadata.attachment.name || "Attached File"}</p>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Attachment (Download Disabled)</p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {post.type === "POLL" && post.metadata?.options ? (
                      <div className="relative z-20 mt-4">
                        <PollOptionsPanel
                          post={post}
                          onVote={handleVote}
                          isVoting={activeVoteId === post.id}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="relative z-20 mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 sm:text-sm dark:text-slate-500">
                    <User size={14} />
                    <span>Posted by {post.author?.name || "Admin"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 sm:w-auto sm:border-0 sm:px-0 sm:py-0 sm:text-sm sm:text-blue-600 sm:hover:bg-transparent sm:hover:underline dark:border-blue-500/30 dark:text-blue-300 dark:sm:border-0"
                  >
                    {isFetching ? "Refreshing..." : "Refresh Feed"}
                  </button>
                </div>
              </div>
            );
          })}

          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalItems={posts.length}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.POSTS}
            label="updates"
          />
        </div>
      )}
    </div>
  );
}
