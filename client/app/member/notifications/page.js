"use client";

import { useMemo } from "react";
import { 
  Megaphone, 
  FileText, 
  BarChart2, 
  Trophy, 
  Loader2, 
  Calendar, 
  User 
} from "lucide-react";
import { useGetOrgPostsQuery } from "@/services/api/postApi";

const POST_TYPES = {
  NOTIFICATION: { label: "Notification", icon: Megaphone, color: "text-blue-600 bg-blue-50 border-blue-100" },
  ARTICLE: { label: "Article", icon: FileText, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  POLL: { label: "Poll", icon: BarChart2, color: "text-amber-600 bg-amber-50 border-amber-100" },
  TOURNAMENT_CARD: { label: "Tournament", icon: Trophy, color: "text-rose-600 bg-rose-50 border-rose-100" },
};

export default function MemberNotificationsPage() {
  const { data: postsData, isLoading, refetch, isFetching } = useGetOrgPostsQuery();
  
  const posts = useMemo(() => postsData?.items || [], [postsData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-slate-400" size={40} />
        <p className="text-slate-500 font-bold animate-pulse">Loading updates from your organization...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">Feed & Updates</h1>
          <p className="mt-2 text-slate-400 font-medium max-w-md">
            Stay updated with the latest news, events, and polls from your management.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Megaphone size={120} />
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Megaphone size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No updates yet</h3>
          <p className="text-slate-500 mt-1">Check back later for news and announcements.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => {
            const config = POST_TYPES[post.type] || POST_TYPES.NOTIFICATION;
            const Icon = config.icon;

            return (
              <div 
                key={post.id} 
                className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
                        <Icon size={12} />
                        {config.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h2>
                    
                    <div className="mt-4 text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </div>

                    {post.type === "POLL" && post.metadata?.options && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cast Your Entry</p>
                        <div className="grid gap-2">
                          {post.metadata.options.map((opt, i) => (
                            <button 
                              key={i}
                              className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all font-bold text-slate-700 relative overflow-hidden group/opt"
                            >
                              <span className="relative z-10">{opt}</span>
                              <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover/opt:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <User size={14} />
                    <span>Posted by {post.author?.name || "Admin"}</span>
                  </div>
                  
                  {post.type === "ARTICLE" && (
                    <button className="text-xs font-black text-blue-600 hover:underline">
                      Read Full Story →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
