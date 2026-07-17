import { Loader2, X, UsersRound } from "lucide-react";
import { useGetPostPollResultsQuery } from "@/services/api/postApi";

export default function PollResultsModal({ postId, open, onClose }) {
  const { data, isLoading, error } = useGetPostPollResultsQuery(postId, {
    skip: !open,
  });

  if (!open) return null;

  const results = data?.items || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Poll Results
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Detailed Voter Breakdown
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-4 text-sm font-semibold">Loading results...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 text-center dark:bg-red-500/10 dark:text-red-400">
              Failed to load poll results. You might not have permission.
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <UsersRound className="h-12 w-12 opacity-50" />
              <p className="mt-4 text-sm font-semibold text-center">No votes have been cast yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((result) => (
                <div key={result.index} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {result.option}
                    </h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {result.voters.length} {result.voters.length === 1 ? "Vote" : "Votes"}
                    </span>
                  </div>
                  
                  {result.voters.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      No one selected this option.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {result.voters.map((voter) => (
                        <li
                          key={voter.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/20"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold uppercase text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                            {voter.name?.charAt(0) || "U"}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-300">
                              {voter.name}
                            </p>
                            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-500">
                              {voter.role === "TEAM_LEADER" ? "Team Leader" : voter.role === "MEMBER" ? "Member" : voter.role}{voter.teams ? ` • ${voter.teams}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
