"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, Megaphone, FileText, BarChart2, Trophy } from "lucide-react";
import { useGetOrgNotificationByIdQuery, useMarkNotificationAsReadMutation } from "@/services/api/orgApi";
import Link from "next/link";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "text-blue-600 border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300" },
  ARTICLE: { label: "Article", icon: FileText, color: "text-emerald-600 border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" },
  NEWS: { label: "News", icon: Megaphone, color: "text-sky-600 border-sky-100 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300" },
  POLL: { label: "Poll", icon: BarChart2, color: "text-amber-600 border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300" },
  TOURNAMENT_CARD: { label: "Tournament Card", icon: Trophy, color: "text-rose-600 border-rose-100 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300" },
};

export default function NotificationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading } = useGetOrgNotificationByIdQuery(id);
  const [markAsRead] = useMarkNotificationAsReadMutation();

  const notification = data?.data;

  useEffect(() => {
    if (id) {
      markAsRead(id);
    }
  }, [id, markAsRead]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-3 px-4 py-14 sm:py-20">
        <Loader2 className="animate-spin text-slate-400" size={36} />
        <p className="text-center text-sm font-bold text-slate-500 animate-pulse sm:text-base dark:text-slate-400">
          Loading notification...
        </p>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5 pb-8 pt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12 dark:border-slate-800 dark:bg-slate-950/75">
          <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">Notification not found</h3>
          <p className="mt-1 mb-6 text-sm text-slate-500 sm:text-base dark:text-slate-400">
            It may have been deleted or you do not have access.
          </p>
          <button onClick={() => router.back()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-8 sm:space-y-6 sm:pb-10 lg:space-y-8 lg:pb-12 pt-4">
      <Link 
        href={
          typeof window !== "undefined" && window.location.pathname.startsWith("/member") 
            ? "/member/notifications" 
            : (typeof window !== "undefined" && window.location.pathname.startsWith("/team-leader") 
              ? "/team-leader/notifications" 
              : "/org/notifications")
        } 
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Notifications
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl dark:border-slate-800 dark:bg-slate-950/75">
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {(() => {
              const config = POST_TYPES[notification.type] || POST_TYPES.NOTIFICATION;
              const Icon = config.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${config.color}`}>
                  <Icon size={14} />
                  {config.label}
                </span>
              );
            })()}
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Calendar size={14} />
              {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {notification.title}
          </h1>
          
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {notification.authorName?.charAt(0).toUpperCase()}
            </span>
            <span>Posted by {notification.authorName}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500 dark:prose-invert dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300">
            <p className="whitespace-pre-wrap text-base font-medium text-slate-700 dark:text-slate-300">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
