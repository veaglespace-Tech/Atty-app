"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Search, Check, Music, Plus, Minus, X, Loader2, Edit2, Trash2, Calendar, ChevronDown, Download, FileText, FileSpreadsheet } from "lucide-react";
import { 
  useGetOrgInstrumentsQuery,
  useCreateOrgInstrumentMutation,
  useAssignOrgInstrumentMutation,
  useDeleteOrgInstrumentMutation,
  useUnassignOrgInstrumentMutation,
  useUpdateOrgInstrumentAssignmentMutation,
  useGetOrgUsersQuery
} from "@/services/api/orgApi";
import { DASHBOARD_FETCH_LIMITS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";


const sectionCardClassName = "light-glow-card-static rounded-[1.9rem] p-6 sm:p-8";
const fieldClassName = "dashboard-field-control";

const NumberCombobox = ({ value, onChange, placeholder = "0-999" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        onChange(searchTerm);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, onChange]);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const filteredOptions = useMemo(() => {
    const all = Array.from({ length: 1000 }, (_, i) => i.toString());
    if (!searchTerm) return all;
    return all.filter(n => n.includes(searchTerm));
  }, [searchTerm]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[120px]">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={`${fieldClassName} !py-1.5 !pl-3 !pr-8 !text-sm w-full font-medium`}
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val !== "") val = parseInt(val, 10).toString();
            if (val !== "" && parseInt(val) > 999) val = "999";
            setSearchTerm(val);
            onChange(val);
            setIsOpen(true);
          }}
        />
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={14} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-white transition-colors"
                onClick={() => {
                  setSearchTerm(opt);
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500 text-center italic">No match</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function OrgInstrumentsPage() {
  const [selectedInstrumentId, setSelectedInstrumentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({}); // { [userId]: assetId }
  const [activeTab, setActiveTab] = useState("instruments");
  
  const [editingAssignment, setEditingAssignment] = useState(null); // { userId, instrumentId, currentAssetId }
  const [editingAssetId, setEditingAssetId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [reportFilterId, setReportFilterId] = useState("all");
  const downloadRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadRef.current && !downloadRef.current.contains(event.target)) {
        setDownloadOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: instrumentsData, isFetching: instLoading } = useGetOrgInstrumentsQuery();
  const { data: usersData, isFetching: usersLoading } = useGetOrgUsersQuery(DASHBOARD_FETCH_LIMITS.ORG_USERS);
  
  const [createInstrument] = useCreateOrgInstrumentMutation();
  const [assignInstrument] = useAssignOrgInstrumentMutation();
  const [deleteInstrument] = useDeleteOrgInstrumentMutation();
  const [unassignInstrument] = useUnassignOrgInstrumentMutation();
  const [updateAssignment] = useUpdateOrgInstrumentAssignmentMutation();

  const instruments = useMemo(() => instrumentsData?.items || [], [instrumentsData]);
  const users = useMemo(() => usersData?.items || [], [usersData]);

  // --- ASSIGNMENT LOGIC ---
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(
      (user) =>
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, users]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      const newSelection = { ...prev };
      if (newSelection[userId] !== undefined) {
        delete newSelection[userId];
      } else {
        newSelection[userId] = "";
      }
      return newSelection;
    });
  };

  const updateAssetId = (userId, assetId) => {
    setSelectedUsers((prev) => ({ ...prev, [userId]: assetId }));
  };

  const handleAssign = async () => {
    const userIds = Object.keys(selectedUsers);
    if (!selectedInstrumentId || userIds.length === 0) return;
    
    const assignments = userIds.map(id => ({
      userId: Number(id),
      assetId: selectedUsers[id] || null
    }));

    try {
      await assignInstrument({
        instrumentId: Number(selectedInstrumentId),
        assignments,
      }).unwrap();
      setSelectedUsers({}); // Reset after assign
      setMessage("Instrument assigned successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to assign instrument"));
    }
  };

  const handleSingleAssign = async (userId) => {
    if (!selectedInstrumentId) return;
    const assetId = selectedUsers[userId];
    if (!assetId) {
      setError("Please select or type an ID / Number first");
      return;
    }
    
    try {
      await assignInstrument({
        instrumentId: Number(selectedInstrumentId),
        assignments: [{ userId: Number(userId), assetId }],
      }).unwrap();
      
      const newSelected = { ...selectedUsers };
      delete newSelected[userId];
      setSelectedUsers(newSelected);
      
      setMessage("User assigned successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to assign instrument"));
    }
  };

  const handleDeleteInstrument = async (instrumentId, name) => {
    if (!window.confirm(`Are you sure you want to delete the instrument "${name}"? This will also remove it from any assigned users.`)) return;
    try {
      await deleteInstrument(instrumentId).unwrap();
      setMessage("Instrument deleted successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete instrument"));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setError("Instrument name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await createInstrument({ name: form.name, description: form.description }).unwrap();
      setMessage("Instrument created successfully");
      setForm({ name: "", description: "" });
      setCreateOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create instrument"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async (userId, instrumentId, instName, userName) => {
    if (!window.confirm(`Remove ${instName} from ${userName}?`)) return;
    try {
      await unassignInstrument({ userId, instrumentId }).unwrap();
      setMessage("Instrument removed successfully");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove instrument"));
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;
    try {
      await updateAssignment({
        userId: editingAssignment.userId,
        instrumentId: editingAssignment.instrumentId,
        assetId: editingAssetId
      }).unwrap();
      setMessage("Assignment updated successfully");
      setEditingAssignment(null);
      setEditingAssetId("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update assignment"));
    }
  };

  // --- ASSIGNED USERS LOGIC ---
  const usersWithInstruments = useMemo(() => {
    return users.filter((user) => user.instruments && user.instruments.length > 0);
  }, [users]);

  const handleDownloadExcel = () => {
    let csv = "Instrument Type,User Name,Instrument ID\n";
    usersWithInstruments.forEach(user => {
      const filteredInsts = reportFilterId === "all" ? user.instruments : user.instruments?.filter(i => String(i.id) === String(reportFilterId));
      filteredInsts?.forEach(inst => {
        csv += `"${inst.name}","${user.name}","${inst.assetId || ''}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "instrument-assignments.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    let html = `
      <html>
        <head>
          <title>Instrument Assignments Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Instrument Assignments Report</h2>
          <table>
            <thead>
              <tr>
                <th>Instrument Type</th>
                <th>User Name</th>
                <th>Instrument ID / Number</th>
              </tr>
            </thead>
            <tbody>
    `;

    usersWithInstruments.forEach(user => {
      const filteredInsts = reportFilterId === "all" ? user.instruments : user.instruments?.filter(i => String(i.id) === String(reportFilterId));
      filteredInsts?.forEach(inst => {
        html += `
          <tr>
            <td>${inst.name}</td>
            <td>${user.name}</td>
            <td>${inst.assetId || '-'}</td>
          </tr>
        `;
      });
    });

    html += `
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <section className="space-y-6">
      <div className={`${sectionCardClassName} mobile-compact-panel`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-[1.65rem] font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Instruments</h2>
            <p className="mobile-hide-copy mt-2.5 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Create instruments and assign them to your members.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <select
              value={reportFilterId}
              onChange={(e) => setReportFilterId(e.target.value)}
              className="dashboard-field-control !py-2 !px-3 !w-full sm:!w-48 text-sm font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">All Instruments</option>
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-auto" ref={downloadRef}>
              <button 
                type="button" 
                onClick={() => setDownloadOpen(!downloadOpen)} 
                className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download size={15} />
                Download Report
              </button>
              
              {downloadOpen && (
                <div className="absolute right-0 z-50 flex flex-col gap-1 p-2 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl w-56 mt-2 border border-slate-100 dark:bg-slate-900/95 dark:border-slate-800">
                  <button 
                    onClick={() => { handleDownloadPdf(); setDownloadOpen(false); }} 
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                      <FileText size={16} />
                    </div>
                    Export as PDF
                  </button>
                  <button 
                    onClick={() => { handleDownloadExcel(); setDownloadOpen(false); }} 
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-green-50 hover:text-green-600 dark:text-slate-300 dark:hover:bg-green-500/10 dark:hover:text-green-400"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                      <FileSpreadsheet size={16} />
                    </div>
                    Export as Excel
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen((prev) => !prev)}
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={15} />
              Add Instrument
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="flex space-x-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1 mb-6 max-w-md">
        <button
          onClick={() => setActiveTab("instruments")}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
            activeTab === "instruments"
              ? "bg-white text-blue-900 shadow dark:bg-blue-900/60 dark:text-blue-100"
              : "text-slate-600 hover:bg-white/[0.12] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Instruments
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
            activeTab === "members"
              ? "bg-white text-blue-900 shadow dark:bg-blue-900/60 dark:text-blue-100"
              : "text-slate-600 hover:bg-white/[0.12] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Members & Assignments
        </button>
      </div>

      {createOpen && activeTab === "instruments" ? (
        <div className={sectionCardClassName}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Create Instrument</h3>
            <button
              type="button"
              onClick={() => {
                setForm({ name: "", description: "" });
                setCreateOpen(false);
              }}
              className="brand-btn brand-btn-secondary brand-btn-sm w-full sm:w-auto"
            >
              <X size={13} /> Close
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="mt-5 grid gap-3 sm:gap-4 xl:grid-cols-2">
            <input
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Instrument Name (e.g. Dhol)"
              className={fieldClassName}
              required
            />
            <input
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (Optional)"
              className={fieldClassName}
            />
            <div className="xl:col-span-2 flex justify-stretch sm:justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeTab === "members" ? (
        <div className="space-y-6">
          {/* 1. ASSIGNMENT PANEL */}
        <div className={sectionCardClassName}>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Assign Instrument</h2>

          <div className="form-control w-full mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              1. Select Instrument
            </label>
            <select
              className={fieldClassName}
              value={selectedInstrumentId}
              onChange={(e) => {
                setSelectedInstrumentId(e.target.value);
                setSelectedUsers({});
              }}
            >
              <option value="" disabled>-- Choose an Instrument --</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {selectedInstrumentId && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                2. Select Users
              </label>
              
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className={`${fieldClassName} pl-10`}
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg max-h-60 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No users found.</div>
                ) : (
                  filteredUsers.map((user) => {
                    const alreadyAssigned = user.instruments?.some(
                      (inst) => inst.id === Number(selectedInstrumentId)
                    );
                    const isSelected = selectedUsers[user.id] !== undefined;

                    return (
                      <div
                        key={user.id}
                        className={`flex flex-col p-3 rounded-md mb-2 transition-colors border
                          ${
                            alreadyAssigned
                              ? "opacity-60 bg-slate-200 dark:bg-slate-800 border-transparent cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent cursor-pointer"
                          }
                        `}
                      >
                        <div 
                          className="flex items-center justify-between"
                          onClick={() => !alreadyAssigned && toggleUserSelection(user.id)}
                        >
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white">{user.name}</p>
                            <p className={`text-xs ${isSelected ? "text-blue-800 dark:text-blue-300" : "text-slate-500"}`}>
                              {user.email}
                            </p>
                          </div>
                          <div>
                            {alreadyAssigned ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                Assigned
                              </span>
                            ) : isSelected ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleAssign(user.id);
                                }}
                                className="flex items-center justify-center rounded-full bg-blue-100 p-1 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-500 dark:hover:text-white shadow-sm"
                                title="Click to assign instantly"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isSelected && !alreadyAssigned && (
                          <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/50">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                              Assign ID / Number <span className="text-red-500">*</span>
                            </label>
                            <NumberCombobox
                              value={selectedUsers[user.id] || ""}
                              onChange={(val) => updateAssetId(user.id, val)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-2 text-sm text-slate-500 font-medium">
                {Object.keys(selectedUsers).length} user(s) selected
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAssign}
              disabled={
                !selectedInstrumentId || 
                Object.keys(selectedUsers).length === 0 || 
                Object.values(selectedUsers).some(val => !val || val.trim() === "")
              }
              className="brand-btn brand-btn-primary brand-btn-md"
            >
              Assign Instrument
            </button>
          </div>
        </div>

        {/* 2. ASSIGNED USERS TABLE */}
        <div className={sectionCardClassName}>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Assigned Users Overview</h2>
          
          {usersWithInstruments.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
              No users have been assigned any instruments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg">User</th>
                    <th className="px-4 py-3 rounded-tr-lg rounded-br-lg">Instruments</th>
                  </tr>
                </thead>
                <tbody>
                  {usersWithInstruments.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs opacity-70">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.instruments.map((inst) => (
                            <div key={inst.id} className="inline-flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 w-full sm:w-auto sm:min-w-[220px] max-w-[300px]">
                              <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 sm:gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                    <Music className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-slate-900 dark:text-white">{inst.name}</span>
                                      {inst.assetId ? (
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                          #{inst.assetId}
                                        </span>
                                      ) : (
                                        <span className="opacity-60 text-[10px] font-medium italic text-slate-500">(No ID)</span>
                                      )}
                                    </div>
                                    {inst.assignedAt && (
                                      <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        Assigned {new Date(inst.assignedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex sm:flex-col items-center justify-end sm:justify-start gap-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2 dark:border-slate-800 w-full sm:w-auto mt-1 sm:mt-0">
                                  <button onClick={() => {
                                    setEditingAssignment({ userId: user.id, instrumentId: inst.id, currentAssetId: inst.assetId || "" });
                                    setEditingAssetId(inst.assetId || "");
                                  }} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-blue-400" title="Edit ID">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleUnassign(user.id, inst.id, inst.name, user.name)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-red-400" title="Remove Instrument">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              {editingAssignment?.userId === user.id && editingAssignment?.instrumentId === inst.id && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 w-full">
                                  <NumberCombobox
                                    value={editingAssetId}
                                    onChange={setEditingAssetId}
                                  />
                                  <button onClick={handleUpdateAssignment} className="brand-btn brand-btn-primary !px-3 !py-1.5 !text-sm whitespace-nowrap shadow-sm h-9">Save</button>
                                  <button onClick={() => setEditingAssignment(null)} className="brand-btn brand-btn-secondary !px-3 !py-1.5 !text-sm shadow-sm h-9">Cancel</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* 3. CREATED INSTRUMENTS DIRECTORY */
        <div className={sectionCardClassName}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Created Instruments Directory</h2>
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            Total: {instruments.length}
          </span>
        </div>

        {instruments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
            No instruments have been created yet. Click "Create Instrument" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg">Instrument Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg rounded-br-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((inst) => (
                  <tr key={inst.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {inst.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {inst.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteInstrument(inst.id, inst.name)}
                        className="inline-flex items-center gap-1 rounded text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
