"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Check,
  X,
  Loader2,
  UserCheck,
  UserX,
  FolderPlus,
  UserCog,
  UserPlus,
  Shield,
} from "lucide-react";
import {
  useGetOrgDepartmentsQuery,
  useCreateOrgDepartmentMutation,
  usePatchOrgDepartmentMutation,
  useDeleteOrgDepartmentMutation,
  useAssignOrgDepartmentMutation,
  useUnassignOrgDepartmentMutation,
  useGetOrgUsersQuery,
  usePatchOrgUserMutation,
} from "@/services/api/orgApi";
import { DASHBOARD_FETCH_LIMITS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";

const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";
const fieldClassName = "dashboard-field-control";

export default function OrgDepartmentsPage() {
  const [activeTab, setActiveTab] = useState("departments"); // "departments" | "allocations"
  const [allocationSubTab, setAllocationSubTab] = useState("assigned"); // "assigned" | "unassigned" | "all"
  
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");

  // Modal / Form state for Department Create/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  
  // Modal state for Editing Member's Department
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null); // { id, name, email, departmentId }
  const [targetDeptIdForMember, setTargetDeptIdForMember] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Multi-user selection for batch allocation
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Queries & Mutations
  const { data: deptData, isFetching: deptLoading } = useGetOrgDepartmentsQuery();
  const { data: usersData, isFetching: usersLoading } = useGetOrgUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS);

  const [createDept] = useCreateOrgDepartmentMutation();
  const [patchDept] = usePatchOrgDepartmentMutation();
  const [deleteDept] = useDeleteOrgDepartmentMutation();
  const [assignDept] = useAssignOrgDepartmentMutation();
  const [unassignDept] = useUnassignOrgDepartmentMutation();
  const [patchOrgUser] = usePatchOrgUserMutation();

  const departments = useMemo(() => deptData?.items || [], [deptData]);
  const users = useMemo(() => usersData?.items || [], [usersData]);

  // Auto-select first department if none selected and on allocations tab
  React.useEffect(() => {
    if (!selectedDeptId && departments.length > 0) {
      setSelectedDeptId(String(departments[0].id));
    }
  }, [departments, selectedDeptId]);

  // Filtered departments list
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [searchQuery, departments]);

  // Active selected department details
  const activeDepartment = useMemo(() => {
    if (!selectedDeptId) return null;
    return departments.find((d) => String(d.id) === String(selectedDeptId));
  }, [selectedDeptId, departments]);

  // Categorized Users for Selected Department:
  // 1. Assigned Members (Users assigned to the active department)
  const assignedUsers = useMemo(() => {
    if (!selectedDeptId) return [];
    return users.filter((u) => String(u.departmentId) === String(selectedDeptId));
  }, [selectedDeptId, users]);

  // 2. Unassigned Users (Users who belong to NO department)
  const unassignedUsers = useMemo(() => {
    return users.filter((u) => u.departmentId === null || u.departmentId === undefined);
  }, [users]);

  // Filtered List based on Active Allocation Sub-Tab & User Search Query
  const displayedUsers = useMemo(() => {
    let sourceList = [];
    if (allocationSubTab === "assigned") {
      sourceList = assignedUsers;
    } else if (allocationSubTab === "unassigned") {
      sourceList = unassignedUsers;
    } else {
      sourceList = users;
    }

    if (!userSearchQuery.trim()) return sourceList;
    const q = userSearchQuery.toLowerCase();
    return sourceList.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [allocationSubTab, assignedUsers, unassignedUsers, users, userSearchQuery]);

  // Handlers for Department Modal
  const openCreateModal = () => {
    setEditingDept(null);
    setForm({ name: "", description: "" });
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setForm({ name: dept.name, description: dept.description || "" });
    setError("");
    setModalOpen(true);
  };

  const handleSubmitDept = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Department name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingDept) {
        await patchDept({ id: editingDept.id, name: form.name, description: form.description }).unwrap();
        setMessage("Department updated successfully");
      } else {
        await createDept({ name: form.name, description: form.description }).unwrap();
        setMessage("Department created successfully");
      }
      setModalOpen(false);
      setForm({ name: "", description: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save department"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDept = async (deptId) => {
    if (!confirm("Are you sure you want to delete this department? Assigned users will become unassigned.")) return;
    try {
      await deleteDept(deptId).unwrap();
      if (String(selectedDeptId) === String(deptId)) {
        const remaining = departments.filter((d) => String(d.id) !== String(deptId));
        setSelectedDeptId(remaining.length > 0 ? String(remaining[0].id) : "");
      }
      setMessage("Department deleted successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete department"));
    }
  };

  // Handlers for Editing a Member's Department
  const openEditMemberModal = (user) => {
    setMemberToEdit(user);
    setTargetDeptIdForMember(user.departmentId ? String(user.departmentId) : "");
    setError("");
    setEditMemberModalOpen(true);
  };

  const handleSaveMemberDepartment = async (e) => {
    e.preventDefault();
    if (!memberToEdit) return;

    setSubmitting(true);
    setError("");

    try {
      const newDeptId = targetDeptIdForMember ? Number(targetDeptIdForMember) : null;
      await patchOrgUser({
        userId: memberToEdit.id,
        departmentId: newDeptId,
      }).unwrap();

      setMessage(`Updated department for ${memberToEdit.name}`);
      setEditMemberModalOpen(false);
      setMemberToEdit(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update member's department"));
    } finally {
      setSubmitting(false);
    }
  };

  // Checkbox selection toggle for batch allocation
  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllDisplayed = () => {
    const displayedIds = displayedUsers.map((u) => u.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  // Batch Assign Users to Active Department
  const handleBatchAssign = async () => {
    if (!selectedDeptId || selectedUserIds.length === 0) return;
    try {
      await assignDept({
        departmentId: Number(selectedDeptId),
        userIds: selectedUserIds,
      }).unwrap();
      setSelectedUserIds([]);
      setAllocationSubTab("assigned");
      setMessage(`Successfully assigned ${selectedUserIds.length} user(s) to ${activeDepartment?.name}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to assign users to department"));
    }
  };

  // Single User Assign to Active Department
  const handleSingleAssign = async (userId, userName) => {
    if (!selectedDeptId) return;
    setError("");
    setMessage("");
    try {
      await assignDept({
        departmentId: Number(selectedDeptId),
        userIds: [userId],
      }).unwrap();
      setAllocationSubTab("assigned");
      setMessage(`Successfully assigned ${userName || "user"} to ${activeDepartment?.name}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to assign user to department"));
    }
  };

  // Single User Unassign / Remove from Department
  const handleUnassignUser = async (userId, userName) => {
    if (!selectedDeptId) return;
    if (!confirm(`Are you sure you want to remove ${userName || "this user"} from ${activeDepartment?.name}?`)) return;
    try {
      await unassignDept({
        departmentId: Number(selectedDeptId),
        userId,
      }).unwrap();
      setMessage(`Removed ${userName || "user"} from ${activeDepartment?.name}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove user from department"));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Departments</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage organization departments, view members, and assign/unassign users
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/15 transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 flex items-center justify-between animate-in fade-in duration-200">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 flex items-center justify-between animate-in fade-in duration-200">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Section Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("departments")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "departments"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>Departments List ({departments.length})</span>
          </div>
          {activeTab === "departments" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("allocations")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "allocations"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Members & Allocation</span>
          </div>
          {activeTab === "allocations" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: DEPARTMENTS GRID */}
      {activeTab === "departments" && (
        <div className={sectionCardClassName}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${fieldClassName} pl-10`}
              />
            </div>
          </div>

          {deptLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading departments...</span>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <FolderPlus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No departments found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery ? "Try a different search query" : "Click 'Add Department' to create your first department."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDepartments.map((dept) => {
                const count = users.filter((u) => String(u.departmentId) === String(dept.id)).length;
                return (
                  <div
                    key={dept.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">{dept.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Department"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {dept.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                          {dept.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between mt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        <Users className="w-3.5 h-3.5" />
                        {count} assigned member{count === 1 ? "" : "s"}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedDeptId(String(dept.id));
                          setAllocationSubTab("assigned");
                          setActiveTab("allocations");
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline"
                      >
                        <span>View Members &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS & ALLOCATION */}
      {activeTab === "allocations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Department Selector Sidebar */}
          <div className={`${sectionCardClassName} lg:col-span-1 space-y-4`}>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Select Department</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose a department below to view assigned members or assign unassigned users.
            </p>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {departments.map((d) => {
                const isSelected = String(d.id) === String(selectedDeptId);
                const count = users.filter((u) => String(u.departmentId) === String(d.id)).length;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDeptId(String(d.id));
                      setSelectedUserIds([]);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-semibold shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className={`w-4 h-4 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Members / Allocation Content */}
          <div className={`${sectionCardClassName} lg:col-span-2 space-y-6`}>
            {!selectedDeptId ? (
              <div className="text-center py-16 text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Please select a department from the left panel</p>
              </div>
            ) : (
              <>
                {/* Department Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      <span>{activeDepartment?.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                        Department
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activeDepartment?.description || "Department members and allocation workspace"}
                    </p>
                  </div>

                  {allocationSubTab === "unassigned" && selectedUserIds.length > 0 && (
                    <button
                      onClick={handleBatchAssign}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Assign ({selectedUserIds.length}) Selected to {activeDepartment?.name}</span>
                    </button>
                  )}
                </div>

                {/* Sub-Tabs: Assigned Members vs Unassigned Users vs All Users */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <button
                    onClick={() => setAllocationSubTab("assigned")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      allocationSubTab === "assigned"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Assigned Members ({assignedUsers.length})</span>
                  </button>

                  <button
                    onClick={() => setAllocationSubTab("unassigned")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      allocationSubTab === "unassigned"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Unassigned Users ({unassignedUsers.length})</span>
                  </button>

                  <button
                    onClick={() => setAllocationSubTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      allocationSubTab === "all"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>All Org Users ({users.length})</span>
                  </button>
                </div>

                {/* Search & Bulk Select Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search in ${
                        allocationSubTab === "assigned"
                          ? "assigned members"
                          : allocationSubTab === "unassigned"
                          ? "unassigned users"
                          : "all users"
                      }...`}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className={`${fieldClassName} pl-10`}
                    />
                  </div>

                  {allocationSubTab === "unassigned" && (
                    <button
                      onClick={handleSelectAllDisplayed}
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      {displayedUsers.length > 0 && displayedUsers.every((u) => selectedUserIds.includes(u.id))
                        ? "Deselect All"
                        : "Select All Filtered"}
                    </button>
                  )}
                </div>

                {/* Table View */}
                {usersLoading ? (
                  <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                ) : displayedUsers.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {allocationSubTab === "assigned"
                        ? "No members assigned to this department yet"
                        : allocationSubTab === "unassigned"
                        ? "No unassigned users available"
                        : "No users found"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      {allocationSubTab === "assigned"
                        ? "Switch to the 'Unassigned Users' tab to assign members to this department."
                        : "All organization users are currently assigned to departments."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider font-semibold">
                        <tr>
                          {allocationSubTab === "unassigned" && (
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  displayedUsers.length > 0 &&
                                  displayedUsers.every((u) => selectedUserIds.includes(u.id))
                                }
                                onChange={handleSelectAllDisplayed}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                          )}
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Department</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayedUsers.map((user) => {
                          const isAssignedToThis = String(user.departmentId) === String(selectedDeptId);
                          const isSelected = selectedUserIds.includes(user.id);
                          return (
                            <tr
                              key={user.id}
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                isAssignedToThis ? "bg-blue-50/20 dark:bg-blue-900/10" : ""
                              }`}
                            >
                              {allocationSubTab === "unassigned" && (
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleUserSelection(user.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                              <td className="p-3 font-medium text-slate-900 dark:text-white">
                                <div>{user.name}</div>
                                <div className="text-xs text-slate-400 font-normal">{user.email}</div>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Shield className="w-3 h-3 text-slate-400" />
                                  {user.role}
                                </span>
                              </td>
                              <td className="p-3 text-xs">
                                {user.department ? (
                                  <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-800/50">
                                    {user.department.name}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium italic">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Edit Member Department Button */}
                                  <button
                                    onClick={() => openEditMemberModal(user)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Edit Member Department"
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </button>

                                  {/* Quick Assign / Unassign Actions */}
                                  {isAssignedToThis ? (
                                    <button
                                      onClick={() => handleUnassignUser(user.id, user.name)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-lg transition-colors"
                                      title="Remove from Department"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSingleAssign(user.id, user.name)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg transition-colors"
                                      title={`Assign to ${activeDepartment?.name}`}
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Assign</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT DEPARTMENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {editingDept ? "Edit Department" : "Add New Department"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {editingDept ? "Update department details." : "Create a new department for your organization."}
            </p>

            <form onSubmit={handleSubmitDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Sales, HR"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={fieldClassName}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of responsibilities or focus area..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${fieldClassName} min-h-[90px]`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDept ? "Save Changes" : "Create Department"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MEMBER DEPARTMENT */}
      {editMemberModalOpen && memberToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setEditMemberModalOpen(false);
                setMemberToEdit(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Edit Member Department
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Change the department for <strong className="text-slate-800 dark:text-slate-200">{memberToEdit.name}</strong> ({memberToEdit.email}).
            </p>

            <form onSubmit={handleSaveMemberDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Department
                </label>
                <select
                  value={targetDeptIdForMember}
                  onChange={(e) => setTargetDeptIdForMember(e.target.value)}
                  className={fieldClassName}
                >
                  <option value="">None (Unassign Department)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditMemberModalOpen(false);
                    setMemberToEdit(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Member Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
