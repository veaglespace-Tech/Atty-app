"use client";
import React from "react";
import { useSelector } from "react-redux";
import {
  BarChart3,
  FileText,
  Download,
  Filter,
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { ROLES } from "@/utils/roles";

export default function ReportsPage() {
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role || ROLES.MEMBER;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence & Reports</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Exportable analytics for <strong>{user?.organizationCode}</strong></p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-blue-600 transition-all shadow-xl text-sm group">
            <Download size={20} />
            Bulk Export
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportStat icon={<TrendingUp />} label="Team Efficiency" value="94.2%" color="blue" />
        <ReportStat icon={<Clock />} label="Avg Login Time" value="09:12 AM" color="emerald" />
        <ReportStat icon={<CalendarDays />} label="Monthly Avg" value="23.5 Days" color="indigo" />
      </div>

      {/* Main Report List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
           <h3 className="text-xl font-black text-slate-900 tracking-tight">Available Artifacts</h3>
           <button className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:gap-3 transition-all">
             Global Filters <Filter size={14} />
           </button>
        </div>

        <div className="p-4 md:p-8 space-y-4">
           {REPORT_TYPES.map((report, i) => (
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: i * 0.1 }}
               key={report.id}
               className="group p-6 bg-white border border-slate-100 rounded-[2.2rem] hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50 transition-all cursor-pointer flex flex-col md:flex-row items-center gap-6"
             >
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${report.color} transition-transform group-hover:rotate-6`}>
                   {report.icon}
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h4 className="text-lg font-black text-slate-900 mb-1">{report.title}</h4>
                   <p className="text-xs font-medium text-slate-500">{report.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                      <Download size={20} />
                   </button>
                   <button className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                      Generate <ChevronRight size={18} className="inline ml-1" />
                   </button>
                </div>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}

const REPORT_TYPES = [
  {
    id: 1,
    title: "Daily Attendance Ledger",
    desc: "Detailed per-employee check-in/out logs with GPS metadata.",
    icon: <FileText size={24} />,
    color: "bg-blue-50 text-blue-600"
  },
  {
    id: 2,
    title: "Monthly Productivity Audit",
    desc: "Aggregated performance scorecards based on working hours.",
    icon: <BarChart3 size={24} />,
    color: "bg-indigo-50 text-indigo-600"
  },
  {
    id: 3,
    title: "Anomaly & Late Entry Log",
    desc: "Automated flagging of irregular patterns and policy violations.",
    icon: <ShieldCheck size={24} />,
    color: "bg-emerald-50 text-emerald-600"
  }
];

function ReportStat({ icon, label, value, color }) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className={`p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm group hover:shadow-md transition-all`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${styles[color]} shadow-sm`}>
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{label}</p>
    </div>
  );
}
