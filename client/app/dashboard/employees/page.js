"use client";
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  UserCircle,
  Trash2,
  Edit2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLES } from "@/utils/roles";
import { useGetOrgUsersQuery } from "@/store/api/orgApi";

export default function EmployeesPage() {
  const { user } = useSelector((state) => state.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data, isLoading, isFetching } = useGetOrgUsersQuery(300, { skip: !user });
  const loading = isLoading || isFetching;

  const staff = useMemo(() => {
    const users = Array.isArray(data?.items) ? data.items : [];
    return users.map((u) => ({
      ...u,
      status: u.active ? "Active" : "Inactive",
    }));
  }, [data]);

  const summary = useMemo(
    () => ({
      total: staff.length,
      admin: staff.filter((u) => u.role === ROLES.SUBADMIN || u.role === ROLES.ADMIN).length,
      tl: staff.filter((u) => u.role === ROLES.TEAM_LEADER).length,
      active: staff.filter((u) => u.status === "Active").length,
    }),
    [staff]
  );

  const userRole = user?.role || ROLES.MEMBER;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workspace Directory</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Managing members in <strong>{user?.organizationCode}</strong></p>
        </div>

        {userRole === ROLES.ADMIN && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-sm group active:scale-95"
          >
            <UserPlus size={20} />
            Onboard New Staff
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
           <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
           <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing User Directory...</p>
        </div>
      ) : (
        <>
          {/* Stats Quick View */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
             <StatsBox label="Total Staff" value={summary.total.toString().padStart(2, '0')} />
             <StatsBox label="Workspace Admins" value={summary.admin.toString().padStart(2, '0')} />
             <StatsBox label="Team Leaders" value={summary.tl.toString().padStart(2, '0')} />
             <StatsBox label="Active Status" value={summary.active.toString().padStart(2, '0')} />
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
               <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, email..."
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl outline-none focus:border-blue-600 transition-all text-sm font-medium shadow-sm"
                  />
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Profile</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace Role</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staff.length > 0 ? staff.map((person, i) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={person._id || i}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            {person.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 leading-none mb-1">{person.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{person.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {(person.role === ROLES.ADMIN || person.role === ROLES.SUBADMIN) ? <ShieldCheck className="text-blue-600" size={16} /> : <ShieldAlert className="text-amber-500" size={16} />}
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                            {person.role?.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          person.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {person.status || "Active"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-md transition-all">
                              <Edit2 size={16} />
                           </button>
                           {userRole === ROLES.ADMIN && (
                             <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-600 hover:shadow-md transition-all">
                                <Trash2 size={16} />
                             </button>
                           )}
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="py-20 text-center font-medium text-slate-400">
                         No users found in this organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-3xl overflow-hidden p-10 md:p-12"
             >
                <div className="mb-10 text-center">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight">Onboard Staff</h3>
                   <p className="text-slate-500 text-sm font-medium mt-2">Set hierarchy level for your workspace</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Staff Role</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold appearance-none">
                         <option value={ROLES.MEMBER}>Member (Default)</option>
                         <option value={ROLES.TEAM_LEADER}>Team Leader</option>
                         <option value={ROLES.SUBADMIN}>Sub-Admin</option>
                      </select>
                   </div>
                   <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border-2 border-transparent focus:border-blue-600 transition-all" />
                   <input type="email" placeholder="Work Email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border-2 border-transparent focus:border-blue-600 transition-all" />

                   <button className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
                      Confirm Onboarding
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsBox({ label, value }) {
  return (
    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
       <p className="text-4xl font-black text-slate-900 mb-1">{value}</p>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">{label}</p>
    </div>
  );
}
