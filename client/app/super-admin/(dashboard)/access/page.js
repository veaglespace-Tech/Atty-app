"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Key,
  ShieldAlert,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from "@/services/api/superAdminApi";
import SectionEyebrow from "@/components/SectionEyebrow";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

export default function SuperAdminAccessPage() {
  const [activeTab, setActiveTab] = useState("PERMISSIONS"); // "PERMISSIONS" or "ROLES"
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [newPermission, setNewPermission] = useState({ key: "", name: "", description: "" });

  // API Hooks
  const { data: permissionsData, isLoading: loadingPermissions, refetch: refetchPermissions } = useGetPermissionsQuery();
  const { data: rolePermissionsData, isLoading: loadingRolePermissions, refetch: refetchRolePermissions } = useGetRolePermissionsQuery();
  const [createPermission, { isLoading: creating }] = useCreatePermissionMutation();
  const [updatePermission, { isLoading: updating }] = useUpdatePermissionMutation();
  const [deletePermission, { isLoading: deleting }] = useDeletePermissionMutation();
  const [updateRolePermissions, { isLoading: updatingRole }] = useUpdateRolePermissionsMutation();

  const permissions = useMemo(() => permissionsData?.items || [], [permissionsData]);
  const roleMappings = useMemo(() => rolePermissionsData?.items || [], [rolePermissionsData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createPermission(newPermission).unwrap();
      setShowAddModal(false);
      setNewPermission({ key: "", name: "", description: "" });
    } catch (err) {
      alert(err.data?.message || "Failed to create permission");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updatePermission({
        id: editingPermission.id,
        name: editingPermission.name,
        description: editingPermission.description,
      }).unwrap();
      setEditingPermission(null);
    } catch (err) {
      alert(err.data?.message || "Failed to update permission");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this permission? This will remove it from all roles.")) {
      try {
        await deletePermission(id).unwrap();
      } catch (err) {
        alert(err.data?.message || "Failed to delete permission");
      }
    }
  };

  const toggleRolePermission = async (role, pId, currentPermissions) => {
    const currentIds = currentPermissions.map((p) => p.id);
    let nextIds;
    if (currentIds.includes(pId)) {
      nextIds = currentIds.filter((id) => id !== pId);
    } else {
      nextIds = [...currentIds, pId];
    }

    try {
      await updateRolePermissions({ role, permissionIds: nextIds }).unwrap();
    } catch (err) {
      alert(err.data?.message || "Failed to update role mapping");
    }
  };

  const loading = loadingPermissions || loadingRolePermissions;

  return (
    <section className="space-y-6">
      {/* Header Panel */}
      <div className={`${panelClassName} mobile-compact-panel relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_32%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="border-indigo-200/80 bg-white/88 px-3 py-1 text-[11px] text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              Access Control
            </SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              Roles & Permissions
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Manage the security architecture of the system. Define granular permissions and map them to standard user roles to control platform access.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => activeTab === "PERMISSIONS" ? refetchPermissions() : refetchRolePermissions()}
              className="brand-btn brand-btn-secondary brand-btn-md h-fit"
              disabled={loading}
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="brand-btn brand-btn-primary brand-btn-md h-fit"
            >
              <Plus size={16} />
              New Permission
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mt-8 flex border-b border-slate-200 dark:border-slate-800">
          <TabButton
            active={activeTab === "PERMISSIONS"}
            onClick={() => setActiveTab("PERMISSIONS")}
            icon={<Key size={16} />}
            label="Permissions"
          />
          <TabButton
            active={activeTab === "ROLES"}
            onClick={() => setActiveTab("ROLES")}
            icon={<ShieldCheck size={16} />}
            label="Role Access"
          />
        </div>
      </div>

      {activeTab === "PERMISSIONS" ? (
        <div className={`${panelClassName} mobile-compact-panel`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              System Permissions ({permissions.length})
            </h3>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Key</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Name</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissions.map((p) => (
                  <tr key={p.id} className="transition hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5">
                    <td className="px-6 py-4 font-mono text-[13px] text-indigo-600 dark:text-indigo-400">{p.key}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">{p.description || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingPermission(p)}
                          className="brand-btn brand-btn-soft brand-btn-sm text-blue-600"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="brand-btn brand-btn-soft brand-btn-sm text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {roleMappings.map((rm) => (
            <div key={rm.role} className={panelClassName}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{rm.role}</h4>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{rm.permissions.length} Permissions</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {permissions.map((p) => {
                  const isAssigned = rm.permissions.some((rp) => rp.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleRolePermission(rm.role, p.id, rm.permissions)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
                        isAssigned
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-100"
                          : "border-slate-100 bg-slate-50/30 text-slate-500 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isAssigned ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <XCircle size={16} className="text-slate-300" />
                        )}
                        <span className="text-sm font-semibold">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-50 uppercase">{p.key}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">New Permission</h3>
            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unique Key (e.g. USER_DELETE)</label>
                <input
                  required
                  value={newPermission.key}
                  onChange={(e) => setNewPermission({ ...newPermission, key: e.target.value })}
                  className="dashboard-field-control w-full mt-2"
                  placeholder="TEAM_VIEW"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</label>
                <input
                  required
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  className="dashboard-field-control w-full mt-2"
                  placeholder="View Team"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <textarea
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  className="dashboard-field-control w-full mt-2 h-20 resize-none"
                  placeholder="Allow users to see team list..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="brand-btn brand-btn-secondary w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="brand-btn brand-btn-primary w-full"
                >
                  {creating ? <Loader2 className="animate-spin" /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Edit Permission</h3>
            <p className="text-xs font-mono text-indigo-500 mt-1 uppercase tracking-wider">{editingPermission.key}</p>
            <form onSubmit={handleUpdate} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</label>
                <input
                  required
                  value={editingPermission.name}
                  onChange={(e) => setEditingPermission({ ...editingPermission, name: e.target.value })}
                  className="dashboard-field-control w-full mt-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <textarea
                  value={editingPermission.description}
                  onChange={(e) => setEditingPermission({ ...editingPermission, description: e.target.value })}
                  className="dashboard-field-control w-full mt-2 h-20 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPermission(null)}
                  className="brand-btn brand-btn-secondary w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="brand-btn brand-btn-primary w-full"
                >
                  {updating ? <Loader2 className="animate-spin" /> : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all ${
        active
          ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
