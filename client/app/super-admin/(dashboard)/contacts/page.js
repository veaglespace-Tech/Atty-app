"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { 
  Search, 
  Loader2, 
  RefreshCcw, 
  ArrowRight, 
  MessageSquare,
  Filter,
  Trash2
} from "lucide-react";
import { 
  useGetSuperAdminContactInquiriesQuery, 
  useDeleteSuperAdminContactMutation,
  useDeleteAllSuperAdminContactsMutation 
} from "@/services/api/superAdminApi";
import SectionEyebrow from "@/components/SectionEyebrow";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { addNotification } from "@/store/slices/notificationSlice";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

export default function SuperAdminContactsPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminContactInquiriesQuery();
  const [deleteContact] = useDeleteSuperAdminContactMutation();
  const [deleteAllContacts, { isLoading: isDeletingAll }] = useDeleteAllSuperAdminContactsMutation();

  const inquiries = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(() => data?.summary || [], [data]);
  const loading = isLoading || isFetching;

  const handleDeleteAll = async () => {
    if (window.confirm("CRITICAL: This will permanently delete ALL contact inquiries. Are you absolutely sure?")) {
      try {
        await deleteAllContacts().unwrap();
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            title: "Action failed",
            message: err?.data?.message || "Failed to delete all messages",
          })
        );
      }
    }
  };

  const filteredInquiries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (!item) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!query) return true;
      return (
        (item.name || "").toLowerCase().includes(query) ||
        (item.email || "").toLowerCase().includes(query) ||
        (item.subject || "").toLowerCase().includes(query)
      );
    });
  }, [inquiries, searchTerm, statusFilter]);

  const {
    paginatedItems,
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredInquiries, {
    initialPageSize: 10,
    dependencies: [searchTerm, statusFilter],
  });

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Delete this message?")) {
      await deleteContact(id).unwrap();
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case "NEW": return "bg-blue-50 text-blue-700 border-blue-100";
      case "RESOLVED": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "IN_PROGRESS": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <section className="space-y-6">
      {/* Header Panel */}
      <div className={`${panelClassName} mobile-compact-panel relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_32%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionEyebrow className="border-blue-200 bg-blue-50 text-blue-700">
              Support Center
            </SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              Contact Inquiries
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Manage messages from the public contact form. Click on any record to view details, update status, or delete.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              onClick={refetch}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-md h-fit"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
            
            {inquiries.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                className="brand-btn brand-btn-soft text-rose-600 hover:bg-rose-50 brand-btn-md h-fit"
              >
                {isDeletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(summary || []).map((item) => {
          if (!item?.label) return null;
          return (
            <div key={item.label} className="dashboard-summary-card rounded-[1.75rem] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* List Panel */}
      <div className={panelClassName}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-[300px]">
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email or subject..."
                  className="dashboard-field-control w-full pl-11"
                />
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Filter size={16} className="text-slate-400" />
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="dashboard-field-control dashboard-select-control h-12"
             >
               <option value="ALL">All Status</option>
               <option value="NEW">New</option>
               <option value="IN_PROGRESS">In Progress</option>
               <option value="RESOLVED">Resolved</option>
               <option value="CLOSED">Closed</option>
             </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-500">Loading messages...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="rounded-full bg-slate-50 p-6 dark:bg-slate-900">
               <MessageSquare size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No inquiries found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-[1.45rem] border border-slate-100 bg-white/50 dark:border-slate-800 dark:bg-slate-950/50">
              <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Name / Email</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Subject</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Received</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-blue-50/30 dark:hover:bg-slate-900/30">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">{item.subject}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusTone(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <Link 
                             href={`/super-admin/contacts/${item.id}`}
                             className="brand-btn brand-btn-soft brand-btn-sm"
                           >
                             <ArrowRight size={14} />
                             Open
                           </Link>
                           <button 
                             onClick={(e) => handleDelete(e, item.id)}
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

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredInquiries.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
              label="messages"
            />
          </div>
        )}
      </div>
    </section>
  );
}
