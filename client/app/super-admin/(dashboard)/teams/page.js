"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetSuperAdminAllTeamsQuery,
  useDeleteSuperAdminTeamMutation,
  useDownloadSuperAdminTeamsPdfMutation,
  useDownloadSuperAdminTeamsExcelMutation,
} from "@/services/api/superAdminApi";
import { ShieldAlert, UsersRound, Building2, Edit2, Trash2, Search, Download, ChevronDown, FileBox, FileText, Loader2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function SuperAdminTeamsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { data, isLoading, error } = useGetSuperAdminAllTeamsQuery();
  const teams = useMemo(() => data?.data || [], [data]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTeam, { isLoading: isDeleting }] = useDeleteSuperAdminTeamMutation();
  const [downloadTeamsPdf, { isLoading: downloadingPdf }] = useDownloadSuperAdminTeamsPdfMutation();
  const [downloadTeamsExcel, { isLoading: downloadingExcel }] = useDownloadSuperAdminTeamsExcelMutation();

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onDownloadPdf = async () => {
    try {
      const blob = await downloadTeamsPdf().unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `global-teams-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: "Failed to download PDF." }));
    }
  };

  const onDownloadExcel = async () => {
    try {
      const blob = await downloadTeamsExcel().unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `global-teams-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: "Failed to download Excel." }));
    }
  };

  const handleDelete = async (e, teamId, teamName) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${teamName}"? This cannot be undone.`)) {
      try {
        await deleteTeam(teamId).unwrap();
        dispatch(addNotification({ type: "success", title: "Deleted", message: "Team deleted successfully." }));
      } catch (err) {
        dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to delete team." }));
      }
    }
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.organizationName.toLowerCase().includes(q) ||
        t.organizationCode.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Global Teams
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">
            Click any row to manage a team&apos;s details, members, and leaders.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search team or org..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <div className="relative w-full sm:w-auto" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isLoading || downloadingPdf || downloadingExcel}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {(downloadingPdf || downloadingExcel) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export
              <ChevronDown size={14} className={`opacity-60 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50">
                <button
                  onClick={onDownloadPdf}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <FileBox size={16} />
                  Download PDF
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <button
                  onClick={onDownloadExcel}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <FileText size={16} />
                  Download Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="text-red-500" size={24} />
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load teams. Please try again.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Team</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Leaders</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Members</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No teams found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      onClick={() => router.push(`/super-admin/teams/${team.id}`)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <UsersRound size={16} className="text-indigo-500" />
                          {team.name}
                        </div>
                        {team.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] truncate">{team.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Building2 size={16} className="text-slate-400" />
                          {team.organizationName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">
                          {team.organizationCode}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-medium text-slate-500 dark:text-slate-400 mr-1">Leader:</span>{team.leaderName}
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                          <span className="font-medium text-slate-500 dark:text-slate-400 mr-1">Sub:</span>{team.subLeaderName}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-bold text-sm border border-indigo-100 dark:border-indigo-800/50">
                          {team.memberCount}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        {team.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">ACTIVE</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">INACTIVE</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/super-admin/teams/${team.id}`)}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Manage Team"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, team.id, team.name)}
                            disabled={isDeleting}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50 transition-colors"
                            title="Delete Team"
                          >
                            <Trash2 size={18} />
                          </button>
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
