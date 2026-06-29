"use client";

import React, { useState } from "react";
import { useGetSuperAdminLeadsQuery, useDeleteSuperAdminLeadMutation } from "@/services/api/superAdminApi";
import { Eye, X, Trash2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function LeadsPage() {
  const { data, isLoading, error } = useGetSuperAdminLeadsQuery();
  const leads = data?.data || [];
  const [selectedLead, setSelectedLead] = useState(null);
  const dispatch = useDispatch();
  const [deleteSuperAdminLead, { isLoading: isDeleting }] = useDeleteSuperAdminLeadMutation();

  const handleDelete = async (leadId) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await deleteSuperAdminLead(leadId).unwrap();
        dispatch(addNotification({ type: "success", title: "Success", message: "Lead deleted successfully" }));
      } catch (err) {
        console.error("Failed to delete lead:", err);
      }
    }
  };

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
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
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
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {lead.adminName !== "-" ? lead.adminName : "(Not provided)"}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {lead.adminEmail !== "-" ? lead.adminEmail : lead.email}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {lead.adminPhone !== "-" ? lead.adminPhone : (lead.phone || "-")}
                        </div>
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
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedLead(lead)}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-lg"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(lead.id)}
                            disabled={isDeleting}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                            title="Delete Lead"
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

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Lead Details</h3>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Organization Details</p>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Name:</span> {selectedLead.name}</p>
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span> {selectedLead.email}</p>
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span> {selectedLead.phone || "-"}</p>
                  {selectedLead.city && <p><span className="font-semibold text-slate-700 dark:text-slate-300">City:</span> {selectedLead.city}</p>}
                  {selectedLead.state && <p><span className="font-semibold text-slate-700 dark:text-slate-300">State:</span> {selectedLead.state}</p>}
                  {selectedLead.country && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Country:</span> {selectedLead.country}</p>}
                  {selectedLead.address && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span> {selectedLead.address}</p>}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Info</p>
                {selectedLead.adminName === "-" && selectedLead.adminEmail === "-" ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-500 italic text-center py-2">User did not proceed to the admin setup step.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Name:</span> {selectedLead.adminName !== "-" ? selectedLead.adminName : "(Not provided)"}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span> {selectedLead.adminEmail !== "-" ? selectedLead.adminEmail : "(Not provided)"}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span> {selectedLead.adminPhone !== "-" ? selectedLead.adminPhone : "(Not provided)"}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Date</p>
                <p className="text-slate-700 dark:text-slate-300 font-medium ml-1">
                  {new Date(selectedLead.createdAt).toLocaleString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
