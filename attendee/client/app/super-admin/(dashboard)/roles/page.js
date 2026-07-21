"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Shield, Loader2, X } from "lucide-react";
import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "@/services/api/roleApi";
import { addNotification } from "@/store/slices/notificationSlice";
import { useDispatch } from "react-redux";

export default function SuperAdminRolesPage() {
  const dispatch = useDispatch();
  const { data, isLoading } = useGetRolesQuery();
  const roles = data?.data || [];

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    dashboardPath: "/member/dashboard",
  });

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setForm({
        code: role.code,
        name: role.name,
        description: role.description || "",
        dashboardPath: role.dashboardPath || "/member/dashboard",
      });
    } else {
      setEditingRole(null);
      setForm({
        code: "",
        name: "",
        description: "",
        dashboardPath: "/member/dashboard",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingRole) {
        await updateRole({ ...form, code: editingRole.code }).unwrap();
        dispatch(addNotification({ type: "success", message: "Role updated successfully" }));
      } else {
        await createRole(form).unwrap();
        dispatch(addNotification({ type: "success", message: "Role created successfully" }));
      }
      setShowModal(false);
    } catch (error) {
      dispatch(addNotification({ type: "error", message: error?.data?.message || "Operation failed" }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await deleteRole(code).unwrap();
      dispatch(addNotification({ type: "success", message: "Role deleted successfully" }));
    } catch (error) {
      dispatch(addNotification({ type: "error", message: error?.data?.message || "Failed to delete role" }));
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Custom Roles</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage dynamic roles and system access.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Role
        </button>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6 sm:p-8 border border-slate-200/80 bg-white/88 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/88">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.code} className="brand-entity-card p-6 rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{role.code}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 min-h-[40px]">
                  {role.description || "No description provided."}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                  <span className="text-xs font-medium text-slate-500">Path: {role.dashboardPath}</span>
                  <div className="flex gap-2">
                    {!role.isSystem && (
                      <>
                        <button onClick={() => handleOpenModal(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(role.code)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {role.isSystem && (
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md dark:bg-slate-700 dark:text-slate-300">System</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingRole && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role Code</label>
                  <input
                    required
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                    className="brand-input"
                    placeholder="e.g. SUB_TEAM_LEADER"
                  />
                  <p className="mt-1 text-xs text-slate-500">Unique identifier. Cannot be changed later.</p>
                </div>
              )}
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="brand-input"
                  placeholder="e.g. Sub Team Leader"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Dashboard UI Experience</label>
                <select
                  value={form.dashboardPath}
                  onChange={(e) => setForm({ ...form, dashboardPath: e.target.value })}
                  className="brand-input"
                >
                  <option value="/member/dashboard">Member Dashboard (Standard)</option>
                  <option value="/team-leader/dashboard">Team Leader Dashboard (Managerial)</option>
                  <option value="/org/dashboard">Organization Admin Dashboard</option>
                  <option value="/super-admin/dashboard">Super Admin Dashboard</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">The UI layout and experience this role will see upon logging in.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="brand-input h-24 resize-none"
                  placeholder="Optional role description"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
