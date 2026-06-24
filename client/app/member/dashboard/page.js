"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { Filter } from "lucide-react";
import DataPanelPage from "@/components/saas/DataPanelPage";
import { attendanceDashboardTableColumns } from "@/components/saas/attendanceDashboardColumns";
import DownloadMenuButton from "@/components/saas/DownloadMenuButton";
import { useDownloadMemberAttendancePdfMutation, useDownloadMemberAttendanceExcelMutation } from "@/services/api/memberApi";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/slices/notificationSlice";

export default function Page() {
  const dispatch = useDispatch();
  const [filterType, setFilterType] = useState("ALL");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const [downloadPdfMutation, { isLoading: downloadingPdf }] = useDownloadMemberAttendancePdfMutation();
  const [downloadExcelMutation, { isLoading: downloadingExcel }] = useDownloadMemberAttendanceExcelMutation();

  const getDateParams = () => {
    let params = "";
    const today = new Date();
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    if (filterType === "DAILY") {
      const todayStr = formatDate(today);
      params += `&from=${todayStr}&to=${todayStr}&limit=100`;
    } else if (filterType === "WEEKLY") {
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 6);
      params += `&from=${formatDate(fromDate)}&to=${formatDate(today)}&limit=100`;
    } else if (filterType === "MONTHLY") {
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 29);
      params += `&from=${formatDate(fromDate)}&to=${formatDate(today)}&limit=100`;
    } else if (filterType === "CUSTOM") {
      if (customRange.from) params += `&from=${customRange.from}`;
      if (customRange.to) params += `&to=${customRange.to}`;
      params += `&limit=100`;
    }
    return params;
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadPdfMutation(`?period=${filterType}`).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-logs-${filterType.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Failed to download PDF" }));
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const blob = await downloadExcelMutation(`?period=${filterType}`).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-logs-${filterType.toLowerCase()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      dispatch(addNotification({ type: "error", message: "Failed to download Excel" }));
    }
  };

  const customActions = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex items-center">
        <Filter className="absolute left-3 text-slate-400" size={14} />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="block w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All Records</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="CUSTOM">Custom Date</option>
        </select>
      </div>
      {filterType === "CUSTOM" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
          <span className="text-slate-400 text-sm font-medium">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>
      )}
      <DownloadMenuButton
        onDownloadPdf={handleDownloadPdf}
        onDownloadExcel={handleDownloadExcel}
        isDownloading={downloadingPdf || downloadingExcel}
      />
    </div>
  );

  return (
    <div className="pb-24">
      <DataPanelPage
        title="Member Dashboard"
        description="Your daily attendance status, month summary, and streak insights."
        endpoint={`/member/dashboard?timestamp=${new Date().getTime()}${getDateParams()}`}
        emptyMessage="No dashboard entries available."
        tableColumns={attendanceDashboardTableColumns}
        customActions={customActions}
      />
    </div>
  );
}

