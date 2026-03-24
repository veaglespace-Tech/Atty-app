import DataPanelPage from "@/components/saas/DataPanelPage"

export default function Page() {
  return (
    <DataPanelPage
      title="Super Admin Analytics"
      description="Monthly growth trend for revenue, organizations, users, and payments."
      endpoint="/super-admin/analytics"
      emptyMessage="No analytics data found."
      hiddenSummaryLabels={["Revenue"]}
      recordsView="table"
      tableColumns={[
        { key: "month", label: "Month" },
        { key: "organizations", label: "Organizations" },
        { key: "users", label: "Users" },
        { key: "payments", label: "Payments" },
        { key: "revenue", label: "Revenue", type: "currency", currency: "INR" },
      ]}
    />
  )
}
