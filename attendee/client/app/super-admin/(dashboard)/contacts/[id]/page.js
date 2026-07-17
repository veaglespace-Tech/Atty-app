"use client";

import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Clock, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Trash
} from "lucide-react";
import { 
  useGetSuperAdminContactByIdQuery, 
  usePatchSuperAdminContactMutation, 
  useDeleteSuperAdminContactMutation 
} from "@/services/api/superAdminApi";
import Link from "next/link";
import SectionEyebrow from "@/components/SectionEyebrow";
import { addNotification } from "@/store/slices/notificationSlice";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-8";

export default function ContactDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const { data, isLoading, error } = useGetSuperAdminContactByIdQuery(id);
  const [patchContact, { isLoading: isUpdating }] = usePatchSuperAdminContactMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteSuperAdminContactMutation();

  const inquiry = data?.item;

  const handleStatusChange = async (newStatus) => {
    try {
      await patchContact({ id, status: newStatus }).unwrap();
    } catch (err) {
      dispatch(
        addNotification({
          type: "error",
          title: "Action failed",
          message: err?.data?.message || "Failed to update status",
        })
      );
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
      try {
        await deleteContact(id).unwrap();
        router.push("/super-admin/contacts");
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            title: "Action failed",
            message: err?.data?.message || "Failed to delete message",
          })
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inquiry not found</h2>
        <Link href="/super-admin/contacts" className="brand-btn brand-btn-primary">
          Go back to list
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/super-admin/contacts" 
          className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to Inquiries
        </Link>

        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="brand-btn brand-btn-soft text-rose-600 hover:bg-rose-50"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete Message
        </button>
      </div>

      <div className={panelClassName}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <SectionEyebrow className="border-blue-200 bg-blue-50 text-blue-700">
              Message ID: #{inquiry.id}
            </SectionEyebrow>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              {inquiry.subject}
            </h1>
            <div className="flex flex-wrap gap-4">
              <InfoBadge icon={<User size={14} />} label="From" value={inquiry.name} />
              <InfoBadge icon={<Mail size={14} />} label="Email" value={inquiry.email} />
              <InfoBadge 
                icon={<Clock size={14} />} 
                label="Received" 
                value={new Date(inquiry.createdAt).toLocaleString()} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-[200px]">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
               Update Status
             </label>
             <select 
               value={inquiry.status}
               onChange={(e) => handleStatusChange(e.target.value)}
               disabled={isUpdating}
               className="dashboard-field-control dashboard-select-control w-full"
             >
               <option value="NEW">New / Pending</option>
               <option value="IN_PROGRESS">In Progress</option>
               <option value="RESOLVED">Resolved</option>
               <option value="CLOSED">Closed</option>
             </select>
             {isUpdating && (
               <p className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
                 <Loader2 size={12} className="animate-spin" />
                 Updating...
               </p>
             )}
          </div>
        </div>

        <hr className="my-8 border-slate-100 dark:border-slate-800" />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            <MessageSquare size={16} />
            Message Content
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
              {inquiry.message}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
           <StatusCard 
             label="Admin Notification" 
             status={inquiry.adminMailStatus} 
             error={inquiry.adminNotificationError}
           />
           <StatusCard 
             label="Requester Confirmation" 
             status={inquiry.requesterMailStatus} 
             error={inquiry.requesterNotificationError}
           />
        </div>
      </div>
    </section>
  );
}

function InfoBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}:</span>
      <span className="text-xs font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function StatusCard({ label, status, error }) {
  const isSuccess = status === "SUCCESS";
  return (
    <div className={`rounded-2xl border p-4 ${isSuccess ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
        {isSuccess ? (
          <CheckCircle size={16} className="text-emerald-500" />
        ) : (
          <AlertCircle size={16} className="text-amber-500" />
        )}
      </div>
      <p className={`mt-2 text-sm font-bold ${isSuccess ? 'text-emerald-700' : 'text-amber-700'}`}>
        {status}
      </p>
      {error && <p className="mt-1 text-[10px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
}
