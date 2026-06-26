"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  FileText,
  Globe,
  BarChart2,
  Trophy,
  Loader2,
  RefreshCcw,
  Search,
  Building2,
  User,
  Paperclip,
  Calendar,
} from "lucide-react";
import { useGetSuperAdminPostsQuery } from "@/services/api/superAdminApi";
import OrganizationLookupField from "@/components/OrganizationLookupField";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";

export const handleFileDownload = async (e, url, filename) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    window.open(url, "_blank");
  }
};

const POST_TYPES = {
  NOTIFICATION: {
    label: "Notification",
    icon: Megaphone,
    color:
      "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",
  },
  NEWS: {
    label: "News Feed",
    icon: Globe,
    color:
      "text-sky-600 bg-sky-50 border-sky-100 dark:text-sky-200 dark:bg-sky-500/10 dark:border-sky-500/20",
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

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";

export default function SuperAdminNotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState(null);

  const {
    data: postsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetSuperAdminPostsQuery({ limit: 1000, type: "NOTIFICATION" });

  const posts = useMemo(() => postsData?.items || [], [postsData]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrg = !selectedOrgFilter || post.orgId === selectedOrgFilter.id;
      return matchesSearch && matchesOrg;
    });
  }, [posts, searchTerm, selectedOrgFilter]);

  // Pagination
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPosts,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredPosts, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.POSTS[0],
    dependencies: [searchTerm, selectedOrgFilter, filteredPosts.length],
  });

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mx-auto w-full max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Notifications Feed
          </h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            View all organization notifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-sm h-10 w-10 p-0"
            title="Refresh Feed"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`${panelClassName} relative`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-1.5 min-w-[280px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Filter by Organization
            </label>
            <OrganizationLookupField
              selectedOrganization={selectedOrgFilter}
              onSelect={(org) => setSelectedOrgFilter(org)}
              onClear={() => setSelectedOrgFilter(null)}
              placeholder="Search and select organization"
              inputClassName="w-full h-11 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#111] border-slate-200 dark:border-slate-800"
              normalFieldClassName="border border-slate-200 dark:border-slate-800"
              containerClassName="relative"
            />
          </div>

          <div className="flex-1 space-y-1.5 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Search Keywords
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, content..."
                className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main post listing grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 px-4 py-14 sm:py-20">
            <Loader2 className="animate-spin text-slate-400" size={36} />
            <p className="text-center text-sm font-bold text-slate-500 animate-pulse sm:text-base dark:text-slate-400">
              Loading notifications...
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12 dark:border-slate-800 dark:bg-slate-950/75">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 sm:h-16 sm:w-16 dark:bg-slate-900">
              <Megaphone size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
              No notifications found
            </h3>
            <p className="mt-1 text-sm text-slate-500 sm:text-base dark:text-slate-400">
              Try adjusting your search criteria or organization filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:gap-6">
            {paginatedPosts.map((post) => {
              const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
              const Icon = config.icon;

              return (
                <div
                  key={post.id}
                  className={`relative group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/75 hover:border-slate-300 dark:hover:border-slate-700 p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:rounded-3xl sm:p-6`}
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
                        
                        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                          <Building2 size={10} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                            {post.organization?.name || "Global"}
                          </span>
                        </div>

                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 sm:text-xs dark:text-slate-500">
                          <Calendar size={12} />
                          {new Date(post.createdAt).toLocaleDateString()} at{" "}
                          {new Date(post.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <Link 
                        href={`/super-admin/notifications/${post.id}`} 
                        className="before:absolute before:inset-0 before:z-10 focus:outline-none"
                      >
                        <h2 className="text-lg font-black text-slate-900 transition-colors group-hover:text-blue-600 sm:text-xl dark:text-white dark:group-hover:text-blue-300">
                          {post.title}
                        </h2>
                      </Link>

                      <div className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600 sm:mt-4 sm:text-base dark:text-slate-300">
                        {post.content}
                      </div>

                      {post.metadata?.attachment && (
                        <div className="mt-4 relative z-20">
                          {post.metadata.attachment.url?.match(
                            /\.(jpeg|jpg|gif|png|webp)/i
                          ) ||
                          (post.metadata.attachment.resourceType === "image" &&
                            post.metadata.attachment.format !== "pdf" &&
                            !post.metadata.attachment.url?.match(/\.pdf/i)) ? (
                            <div
                              className="relative group/image h-48 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                              onContextMenu={(e) =>
                                post.metadata.attachment.allowDownload === false
                                  ? e.preventDefault()
                                  : null
                              }
                            >
                              <img
                                src={post.metadata.attachment.url}
                                alt={post.metadata.attachment.name || "Attachment"}
                                className={`h-full w-full object-cover transition-transform duration-500 group-hover/image:scale-105 ${
                                  post.metadata.attachment.allowDownload === false
                                    ? "pointer-events-none select-none"
                                    : ""
                                }`}
                              />
                              {post.metadata.attachment.allowDownload !== false && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/image:opacity-100">
                                  <a
                                    href={post.metadata.attachment.url}
                                    download={
                                      post.metadata.attachment.name || "attachment.jpg"
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-xl transition-transform hover:scale-105 active:scale-95"
                                    onClick={(e) =>
                                      handleFileDownload(
                                        e,
                                        post.metadata.attachment.url,
                                        post.metadata.attachment.name || "attachment.jpg"
                                      )
                                    }
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" x2="12" y1="15" y2="3" />
                                    </svg>
                                    Download Image
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : post.metadata.attachment.allowDownload !== false ? (
                            <div className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors max-w-2xl">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <Paperclip
                                    size={18}
                                    className="text-blue-500 dark:text-blue-400"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {post.metadata.attachment.name || "Attached File"}
                                  </p>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                                    Document / File
                                  </p>
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
                                  Preview
                                </a>
                                <a
                                  href={post.metadata.attachment.url}
                                  download={
                                    post.metadata.attachment.name || "attachment"
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                                  onClick={(e) =>
                                    handleFileDownload(
                                      e,
                                      post.metadata.attachment.url,
                                      post.metadata.attachment.name || "attachment"
                                    )
                                  }
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 opacity-80 max-w-2xl">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                <Paperclip size={18} className="text-slate-400" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-xs font-bold text-slate-500">
                                  {post.metadata.attachment.name || "Attached File"}
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Attachment (Download Disabled)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-20 mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 sm:text-sm dark:text-slate-500">
                      <User size={14} />
                      <span>
                        Posted by{" "}
                        {post.author?.role === "SUPER_ADMIN"
                          ? "Super Admin"
                          : post.author?.name || "System"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredPosts.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.POSTS}
              label="notifications"
            />
          </div>
        )}
      </div>
    </section>
  );
}
