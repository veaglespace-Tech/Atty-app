"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Crown,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { useGetTeamLeaderTeamByIdQuery } from "@/services/api/teamLeaderApi";
import { formatRoleLabel } from "@/utils/roles";

export default function MemberTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = Number(params?.teamId);

  const {
    data: teamData,
    isLoading,
  } = useGetTeamLeaderTeamByIdQuery(teamId, {
    skip: !Number.isFinite(teamId) || teamId <= 0,
  });

  const team = teamData?.item || null;

  const members = useMemo(() => {
    if (!team?.members) return [];
    return team.members;
  }, [team]);

  if (!Number.isFinite(teamId) || teamId <= 0) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid team id.
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="flex items-center justify-center gap-2 py-20 text-slate-600">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-semibold">Loading team details...</span>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/member/teams")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to My Teams
        </button>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-700">
          Team not found or access denied.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="light-glow-card-static rounded-[1.9rem] p-6">
        <button
          type="button"
          onClick={() => router.push("/member/teams")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="mt-3 text-2xl font-black text-slate-900">
          {team.name}
        </h2>
        {team.description && (
          <p className="mt-1.5 text-sm text-slate-500">{team.description}</p>
        )}
      </div>

      {/* Team Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Leader Card */}
        <div className="light-glow-card-static rounded-[1.6rem] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
              <Crown size={20} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Team Leader
              </p>
              <p className="mt-0.5 truncate text-base font-bold text-slate-800">
                {team.leaderName || "Unassigned"}
              </p>
            </div>
          </div>
        </div>

        {/* Member Count Card */}
        <div className="light-glow-card-static rounded-[1.6rem] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Total Members
              </p>
              <p className="mt-0.5 text-base font-bold text-slate-800">
                {team.memberCount}
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="light-glow-card-static rounded-[1.6rem] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                team.isActive
                  ? "bg-gradient-to-br from-emerald-100 to-green-100"
                  : "bg-gradient-to-br from-slate-100 to-slate-200"
              }`}
            >
              <div
                className={`h-3 w-3 rounded-full ${
                  team.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Status
              </p>
              <p
                className={`mt-0.5 text-base font-bold ${
                  team.isActive ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                {team.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="light-glow-card-static overflow-hidden rounded-[1.9rem]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
            Teammates ({members.length})
          </h3>
        </div>

        {members.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              No members in this team yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member, index) => (
              <li
                key={`member-${member.id}-${index}`}
                className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100">
                  <User size={18} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {member.name || "Unknown"}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {formatRoleLabel(member.role)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
