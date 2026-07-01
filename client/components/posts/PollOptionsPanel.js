"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import PollResultsModal from "./PollResultsModal";

function getPollResults(post) {
  if (Array.isArray(post?.poll?.results) && post.poll.results.length > 0) {
    return post.poll.results;
  }

  return (Array.isArray(post?.metadata?.options) ? post.metadata.options : []).map(
    (option, index) => ({
      index,
      option,
      votes: 0,
      percentage: 0,
    })
  );
}

export default function PollOptionsPanel({
  post,
  onVote,
  isVoting = false,
  voteLabel = "Tap to vote",
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;

  const pollResults = getPollResults(post);
  const totalVotes = Number(post?.poll?.totalVotes || 0);
  const selectedOptionIndex =
    typeof post?.poll?.selectedOptionIndex === "number"
      ? post.poll.selectedOptionIndex
      : null;

  const hasVoted = selectedOptionIndex !== null;

  if (pollResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        <span>{hasVoted ? "Poll Results" : "Poll"}</span>
        <span>{hasVoted ? `${totalVotes} Votes` : ""}</span>
      </div>

      <div className="space-y-2.5">
        {pollResults.map((result) => {
          const isSelected = result.index === selectedOptionIndex;
          const fillWidth = result.percentage > 0 ? result.percentage : isSelected ? 6 : 0;

          if (!hasVoted) {
            // Before voting: Show simple options
            return (
              <button
                key={`${post.id}-poll-option-${result.index}`}
                type="button"
                onClick={() => onVote?.(post.id, result.index)}
                disabled={!onVote || isVoting}
                className={`w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:hover:bg-slate-900 ${
                  !onVote || isVoting ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {result.option}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {onVote ? voteLabel : ""}
                  </span>
                </div>
              </button>
            );
          }

          // After voting: Show full results
          return (
            <button
              key={`${post.id}-poll-option-${result.index}`}
              type="button"
              disabled={true}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-amber-300 bg-amber-50/80 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10"
                  : "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70 cursor-default"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {result.option}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                    {result.votes} vote{result.votes === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`text-sm font-black ${
                      isSelected
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-slate-500 dark:text-slate-300"
                    }`}
                  >
                    {result.percentage}%
                  </span>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"
                  }`}
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              {isSelected && (
                <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <span></span>
                  <span>Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {["ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER"].includes(userRole) && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            View Results
          </button>
        </div>
      )}

      {modalOpen && (
        <PollResultsModal
          postId={post.id}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
