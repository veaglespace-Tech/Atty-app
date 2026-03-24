"use client";

import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
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
  );
}
