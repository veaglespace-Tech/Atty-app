import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Team Leader Reports"
      description="Team performance summary and member-wise attendance output."
      endpoint="/team-leader/reports"
      emptyMessage="No team report data available."
    />
  );
}
