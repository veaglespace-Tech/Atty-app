import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Team Leader Reports"
      description="Member-wise attendance summary with clean, export-ready report records."
      endpoint="/team-leader/reports"
      emptyMessage="No team report data available."
      tableColumns={[
        { key: "member", label: "Member" },
        { key: "role", label: "Role", align: "center" },
        { key: "presentDays", label: "Present", align: "center" },
        { key: "halfDays", label: "Half Day", align: "center" },
        { key: "absentDays", label: "Absent", align: "center" },
        { key: "workedHours", label: "Worked Hrs", align: "center" },
      ]}
    />
  );
}
