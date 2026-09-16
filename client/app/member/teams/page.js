"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Crown, Loader2, RefreshCcw, Users, UsersRound } from "lucide-react";
import { useGetTeamLeaderTeamsQuery } from "@/services/api/teamLeaderApi";
import { DASHBOARD_FETCH_LIMITS } from "@/utils/dashboardLimits";

export default function MemberTeamsPage() {
  const router = useRouter();
  const authUser = useSelector((state) => state.auth.user);

  const {
    data: teamsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetTeamLeaderTeamsQuery(DASHBOARD_FETCH_LIMITS.TEAM_LEADER_TEAMS);

  const teams = useMemo(
    () => (Array.isArray(teamsData?.items) ? teamsData.items : []),
    [teamsData]
  );

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="light-glow-card-static mobile-compact-panel rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">
              My Teams
            </h2>
            <p className="mobile-hide-copy mt-1.5 text-sm text-slate-500">
              Teams you are part of in your organization.
            </p>
          </div>
          <button
            title="Refresh"
            type="button"
            onClick={refetch}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2.5 py-20 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-semibold">Loading your teams...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="light-glow-card-static rounded-[1.9rem] p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UsersRound size={28} className="text-slate-400" />
          </div>
          <p className="text-base font-bold text-slate-700">
            No team assigned yet
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            You will see your teams here once an admin or team leader adds you.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <article
              key={team.id}
              onClick={() => router.push(`/member/teams/${team.id}`)}
              className="group light-glow-card cursor-pointer rounded-[1.6rem] p-5 sm:p-6 transition-all duration-300"
            >
              {/* Team Name + Active Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors duration-200">
                    {team.name}
                  </h3>
                </div>
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    team.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

              {/* Info Row */}
              <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                {/* Leader */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                    <Crown size={16} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Team Leader
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-slate-800">
                      {team.leaderName || "Unassigned"}
                    </p>
                  </div>
                </div>

                {/* Sub-Leader */}
                {team.subLeaderName && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                      <Crown size={16} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Sub-Leader
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-slate-800">
                        {team.subLeaderName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Members Count */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                    <Users size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Members
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tap hint */}
              <div className="mt-4 flex items-center justify-end">
                <span className="text-[11px] font-semibold text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Tap to view details →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
