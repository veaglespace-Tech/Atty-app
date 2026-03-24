"use client"

import { useState } from "react";
import DataPanelPage from "@/components/saas/DataPanelPage";
import {
  useDownloadSuperAdminDashboardExcelMutation,
  useDownloadSuperAdminDashboardPdfMutation,
} from "@/store/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import { getErrorMessage } from "@/utils/formValidation";

export default function Page() {
  const [downloadError, setDownloadError] = useState("");
  const [downloadDashboardPdf, { isLoading: downloadingPdf }] =
    useDownloadSuperAdminDashboardPdfMutation();
  const [downloadDashboardExcel, { isLoading: downloadingExcel }] =
    useDownloadSuperAdminDashboardExcelMutation();

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadDashboardPdf("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-dashboard-records.pdf");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download dashboard PDF"));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadDashboardExcel("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-dashboard-records.xlsx");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download dashboard Excel"));
    }
  };

  return (
    <DataPanelPage
      title="Super Admin Dashboard"
      description="Global SaaS usage, subscription health, and revenue summary."
      endpoint="/super-admin/dashboard"
      emptyMessage="No dashboard metrics found."
      hiddenSummaryLabels={["Revenue"]}
      recordsView="table"
      tableColumns={[
        { key: "organization", label: "Organization" },
        { key: "code", label: "Org Code" },
        { key: "planName", label: "Plan" },
        { key: "subscriptionStatus", label: "Subscription", type: "badge" },
        { key: "users", label: "Users" },
        { key: "teams", label: "Teams" },
        {
          key: "active",
          label: "Access",
          type: "badge",
          badgeMap: {
            true: "ACTIVE",
            false: "INACTIVE",
          },
        },
        {
          key: "blocked",
          label: "Block",
          type: "badge",
          badgeMap: {
            true: "BLOCKED",
            false: "UNBLOCKED",
          },
        },
        { key: "createdAt", label: "Created At", type: "datetime" },
      ]}
    />
  )
}
