"use client";

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
  const pollResults = getPollResults(post);
  const totalVotes = Number(post?.poll?.totalVotes || 0);
  const selectedOptionIndex =
    typeof post?.poll?.selectedOptionIndex === "number"
      ? post.poll.selectedOptionIndex
      : null;

  if (pollResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        <span>Poll Results</span>
        <span>{totalVotes} Votes</span>
      </div>

      <div className="space-y-2.5">
        {pollResults.map((result) => {
          const isSelected = result.index === selectedOptionIndex;
          const fillWidth =
            result.percentage > 0 ? result.percentage : isSelected ? 6 : 0;

          return (
            <button
              key={`${post.id}-poll-option-${result.index}`}
              type="button"
              onClick={() => onVote?.(post.id, result.index)}
              disabled={!onVote || isVoting}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-amber-300 bg-amber-50/80 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10"
                  : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              } ${!onVote || isVoting ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {result.option}
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

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"
                  }`}
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  {result.votes} vote{result.votes === 1 ? "" : "s"}
                </span>
                <span>
                  {isSelected ? "Selected" : onVote ? voteLabel : "Result"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
