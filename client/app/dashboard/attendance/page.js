"use client";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Users,
  Clock,
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  MoreVertical,
  Loader2,
  CalendarDays
} from "lucide-react";
import { useGetAttendanceQuery, useGetAttendanceSummaryQuery } from "@/store/api/attendanceApi";

export default function AttendancePage() {
  const { user } = useSelector((state) => state.auth);
  const { data: attendanceData, isLoading: attendanceLoading, isFetching: attendanceFetching } =
    useGetAttendanceQuery("", { skip: !user });
  const { data: summaryData, isLoading: summaryLoading, isFetching: summaryFetching } =
    useGetAttendanceSummaryQuery(undefined, { skip: !user });
  const loading = attendanceLoading || attendanceFetching || summaryLoading || summaryFetching;
  const attendance = useMemo(() => (Array.isArray(attendanceData) ? attendanceData : []), [attendanceData]);
  const summary = summaryData || { present: 0, late: 0, absent: 0, leaves: 0 };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Logs</h1>
          <p className="teqxt-slate-500 font-medium text-sm mt-1">Real-time records for <strong>{user?.organizationCode}</strong></p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all text-sm">
            <Download size={18} />
            Export Data
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
           <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
           <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Fetching Daily Logs...</p>
        </div>
      ) : (
        <>
          {/* Stats Quick Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <MiniStat cardColor="bg-blue-50" icon={<UserCheck className="text-blue-600" size={20} />} label="Present" value={summary.present} />
            <MiniStat cardColor="bg-amber-50" icon={<Clock className="text-amber-600" size={20} />} label="Late" value={summary.late} />
            <MiniStat cardColor="bg-red-50" icon={<UserX className="text-red-600" size={20} />} label="Absent" value={summary.absent} />
            <MiniStat cardColor="bg-indigo-50" icon={<CalendarDays className="text-indigo-600" size={20} />} label="On Leave" value={summary.leaves} />
          </div>

          {/* Main Table Content */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-4">
               <div className="relative flex-1 group max-w-sm">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input type="text" placeholder="Quick search members..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all text-sm font-medium" />
               </div>
            </div>

            <div className="overflow-x-auto text-sm md:text-base">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">In-Time</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendance.length > 0 ? attendance.map((row, i) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={row._id || i}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                            {row.userName?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 leading-none mb-1">{row.userName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          row.status === "Present" ? "bg-emerald-50 text-emerald-600" :
                          row.status === "Absent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-600">{row.checkIn || "--:--"}</p>
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{row.locationName || "Office Space"}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="py-20 text-center font-medium text-slate-400">
                         No logs found for today in this organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, cardColor }) {
  return (
    <div className={`p-6 md:p-8 rounded-[2rem] border border-white/20 shadow-sm ${cardColor}`}>
       <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
             {icon}
          </div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Today</p>
       </div>
       <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
