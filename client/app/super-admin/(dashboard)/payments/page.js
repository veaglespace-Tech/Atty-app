"use client";

import { useState } from "react";
import DataPanelPage from "@/components/saas/DataPanelPage";
import {
  useDownloadSuperAdminPaymentsExcelMutation,
  useDownloadSuperAdminPaymentsPdfMutation,
} from "@/services/api/superAdminApi";
import { downloadBlobFile } from "@/utils/download";
import { getErrorMessage } from "@/utils/formValidation";

export default function Page() {
  const [downloadError, setDownloadError] = useState("");
  const [downloadPaymentsPdf, { isLoading: downloadingPdf }] =
    useDownloadSuperAdminPaymentsPdfMutation();
  const [downloadPaymentsExcel, { isLoading: downloadingExcel }] =
    useDownloadSuperAdminPaymentsExcelMutation();

  const onDownloadPdf = async () => {
    try {
      setDownloadError("");
      const blob = await downloadPaymentsPdf("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-payments-records.pdf");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download payments PDF"));
    }
  };

  const onDownloadExcel = async () => {
    try {
      setDownloadError("");
      const blob = await downloadPaymentsExcel("limit=500").unwrap();
      downloadBlobFile(blob, "super-admin-payments-records.xlsx");
    } catch (error) {
      setDownloadError(getErrorMessage(error, "Failed to download payments Excel"));
    }
  };

  return (
    <DataPanelPage
      title="Super Admin Payments"
      description="Recent platform-wide payment transactions and statuses."
      endpoint="/super-admin/payments"
      emptyMessage="No payment records found."
      hiddenSummaryLabels={["Revenue"]}
      recordsView="table"
      tableColumns={[
        { key: "organization", label: "Organization" },
        { key: "organizationCode", label: "Org Code" },
        { key: "user", label: "User" },
        { key: "userEmail", label: "User Email" },
        { key: "planCode", label: "Plan" },
        { key: "amount", label: "Amount", type: "currency", currencyKey: "currency" },
        { key: "status", label: "Status", type: "badge" },
        { key: "gateway", label: "Gateway" },
        { key: "orderId", label: "Order Id" },
        { key: "paymentId", label: "Payment Id" },
        { key: "createdAt", label: "Created At", type: "datetime" },
      ]}
      downloadSection={{
        title: "Records Download",
        description:
          "Download the current payment records in PDF or Excel format from one menu.",
        mode: "menu",
        buttonLabel: "Download",
        downloadingPdf,
        downloadingExcel,
        onDownloadPdf,
        onDownloadExcel,
        error: downloadError,
      }}
    />
  );
}
