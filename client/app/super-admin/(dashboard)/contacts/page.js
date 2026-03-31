"use client";

import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Contact Inquiries"
      description="Public contact form submissions stored with delivery status for follow-up."
      endpoint="/super-admin/contacts?limit=500"
      emptyMessage="No contact inquiries found yet."
      recordsView="table"
      tableColumns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "subject", label: "Subject" },
        { key: "message", label: "Message" },
        {
          key: "status",
          label: "Status",
          type: "badge",
          badgeMap: {
            NEW: "PENDING",
          },
        },
        { key: "adminMailStatus", label: "Admin Mail", type: "badge" },
        { key: "requesterMailStatus", label: "Sender Mail", type: "badge" },
        { key: "createdAt", label: "Created At", type: "datetime" },
      ]}
    />
  );
}
