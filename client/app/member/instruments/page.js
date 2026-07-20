"use client";

import React, { useMemo } from "react";
import { Music, Calendar, Hash } from "lucide-react";
import { useGetMemberInstrumentsQuery } from "@/services/api/memberApi";

const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";

export default function MemberInstrumentsPage() {
  const { data, isLoading, isError } = useGetMemberInstrumentsQuery();
  
  const instruments = useMemo(() => data?.items || [], [data]);

  return (
    <div className="pb-24 max-w-5xl">
      <div className={sectionCardClassName}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Assigned Instruments</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            View the physical instruments and assets that have been assigned to you by the organization admin.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50">
            Failed to load your assigned instruments.
          </div>
        ) : instruments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
              <Music className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Instruments Assigned</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              You currently do not have any instruments assigned to you. If you believe this is a mistake, please contact your organization admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instruments.map((inst) => (
              <div key={inst.id} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      <Music className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{inst.name}</h3>
                      {inst.description && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {inst.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {inst.assetId && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Hash className="h-4 w-4 text-slate-400" />
                      <span>ID: {inst.assetId}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Assigned on {new Date(inst.assignedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
