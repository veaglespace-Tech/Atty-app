"use client";

import React from "react";
import { useGetSuperAdminLeadsQuery } from "@/services/api/superAdminApi";

export default function LeadsPage() {
  const { data, isLoading, error } = useGetSuperAdminLeadsQuery();
  const leads = data?.data || [];

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Organization Leads</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">
            Users who registered an organization but did not complete any plan purchase.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 rounded-2xl">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load leads data. Please try again.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Admin Info</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No leads found.</p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">All registered users have completed their payments.</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{lead.name}</div>
                        <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1">{lead.code}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{lead.adminName}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{lead.adminEmail}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{lead.adminPhone}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                          {lead.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium text-slate-600 dark:text-slate-400">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(lead.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
