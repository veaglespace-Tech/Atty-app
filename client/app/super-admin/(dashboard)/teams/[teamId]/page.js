"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetSuperAdminTeamByIdQuery,
  usePatchSuperAdminTeamMutation,
  useDeleteSuperAdminTeamMutation,
  useGetSuperAdminOrganizationUsersQuery,
} from "@/services/api/superAdminApi";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";
import {
  ArrowLeft, UsersRound, Building2, Save, Trash2,
  UserPlus, UserMinus, Crown, ShieldCheck, AlertTriangle, Search,
} from "lucide-react";

const ROLE_BADGE = {
  ORG_ADMIN: { label: "Admin", cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400" },
  SUB_ADMIN: { label: "Sub-Admin", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
  TEAM_LEADER: { label: "Leader", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400" },
  SUB_TEAM_LEADER: { label: "Sub-Leader", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-400" },
  MEMBER: { label: "Member", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function RoleBadge({ role }) {
  const badge = ROLE_BADGE[role] || ROLE_BADGE.MEMBER;
  return <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + badge.cls}>{badge.label}</span>;
}

export default function SuperAdminTeamDetailPage() {
  const { teamId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const { data: teamData, isLoading, error, refetch } = useGetSuperAdminTeamByIdQuery(teamId);
  const team = teamData?.data;

  const [patchTeam, { isLoading: isPatching }] = usePatchSuperAdminTeamMutation();
  const [deleteTeam, { isLoading: isDeleting }] = useDeleteSuperAdminTeamMutation();

  const { data: orgUsersData, isLoading: usersLoading } = useGetSuperAdminOrganizationUsersQuery(
    team?.organization?.id,
    { skip: !team?.organization?.id }
  );

  const allOrgUsers = useMemo(() => orgUsersData?.items || [], [orgUsersData]);

  const [form, setForm] = useState({ name: "", description: "", isActive: true, leaderId: "", subLeaderId: "" });
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [poolSearch, setPoolSearch] = useState("");

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name || "",
        description: team.description || "",
        isActive: Boolean(team.isActive),
        leaderId: team.leader?.id ? String(team.leader.id) : "",
        subLeaderId: team.subLeader?.id ? String(team.subLeader.id) : "",
      });
      setSelectedMemberIds(new Set((team.members || []).map((m) => m.userId)));
    }
  }, [team]);

  const leaderOptions = useMemo(
    () => allOrgUsers.filter((u) => ["TEAM_LEADER","SUB_TEAM_LEADER","SUB_ADMIN","ORG_ADMIN"].includes(u.role) && u.isActive),
    [allOrgUsers]
  );

  const currentMembers = useMemo(() => allOrgUsers.filter((u) => selectedMemberIds.has(u.id)), [allOrgUsers, selectedMemberIds]);
  const availablePool = useMemo(() => allOrgUsers.filter((u) => !selectedMemberIds.has(u.id)), [allOrgUsers, selectedMemberIds]);

  const filteredPool = useMemo(() => {
    if (!poolSearch.trim()) return availablePool;
    const q = poolSearch.toLowerCase();
    return availablePool.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [availablePool, poolSearch]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return currentMembers;
    const q = memberSearch.toLowerCase();
    return currentMembers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [currentMembers, memberSearch]);

  const addMember = (userId) => setSelectedMemberIds((prev) => new Set([...prev, userId]));
  const removeMember = (userId) => setSelectedMemberIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await patchTeam({
        teamId,
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: Boolean(form.isActive),
        leaderId: form.leaderId || null,
        subLeaderId: form.subLeaderId || null,
        memberIds: [...selectedMemberIds],
      }).unwrap();
      dispatch(addNotification({ type: "success", title: "Saved", message: "Team updated successfully." }));
      refetch();
    } catch (err) {
      dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to update team." }));
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Permanently delete this team? This cannot be undone.")) {
      try {
        await deleteTeam(teamId).unwrap();
        dispatch(addNotification({ type: "success", title: "Deleted", message: "Team deleted." }));
        router.push("/super-admin/teams");
      } catch (err) {
        dispatch(addNotification({ type: "error", title: "Error", message: err?.data?.message || "Failed to delete." }));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Team not found or failed to load.</p>
        <button onClick={() => router.push("/super-admin/teams")} className="mt-4 text-indigo-500 hover:underline text-sm">Back to Teams</button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/super-admin/teams")} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <UsersRound size={22} className="text-indigo-500" />
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{team.name}</h1>
              {!team.isActive && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">INACTIVE</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Building2 size={14} className="text-slate-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{team.organization?.name} &bull; {team.organization?.organizationCode}</span>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={isPatching} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60">
          {isPatching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={18} />}
          Save All Changes
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck size={18} className="text-indigo-500" /> Team Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Team Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{form.isActive ? "Active (Operational)" : "Inactive (Blocked)"}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Toggle to block or unblock this team</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><Crown size={18} className="text-amber-500" /> Leaders</h2>
          {usersLoading ? (
            <p className="text-sm text-indigo-500 animate-pulse">Loading organization users...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary Leader</label>
                <select value={form.leaderId} onChange={(e) => setForm({ ...form, leaderId: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  <option value="">-- No Leader --</option>
                  {allOrgUsers.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Leader</label>
                <select value={form.subLeaderId} onChange={(e) => setForm({ ...form, subLeaderId: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  <option value="">-- No Sub-Leader --</option>
                  {allOrgUsers.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UsersRound size={18} className="text-indigo-500" /> Members
            <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{selectedMemberIds.size}</span>
          </h2>
          {usersLoading ? (
            <p className="text-sm text-indigo-500 animate-pulse">Loading members...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Current ({currentMembers.length})</span>
                  <div className="relative"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-900 dark:text-white w-36" /></div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembers.length === 0 ? <div className="px-4 py-6 text-center text-sm text-slate-400">No members yet.</div> : filteredMembers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p></div>
                      <div className="flex items-center gap-2"><RoleBadge role={user.role} /><button type="button" onClick={() => removeMember(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove"><UserMinus size={15} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Add Members ({availablePool.length})</span>
                  <div className="relative"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-900 dark:text-white w-36" /></div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPool.length === 0 ? <div className="px-4 py-6 text-center text-sm text-slate-400">All users are already members.</div> : filteredPool.map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p></div>
                      <div className="flex items-center gap-2"><RoleBadge role={user.role} /><button type="button" onClick={() => addMember(user.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Add"><UserPlus size={15} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6">
          <h2 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3"><AlertTriangle size={18} /> Danger Zone</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">Deleting this team will permanently remove it and all member assignments.</p>
          <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow transition-all disabled:opacity-60">
            {isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Trash2 size={18} />}
            Delete This Team
          </button>
        </div>
      </form>
    </div>
  );
}