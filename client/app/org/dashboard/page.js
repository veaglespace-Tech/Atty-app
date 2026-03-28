import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Organization Dashboard"
      description="Workspace summary for users, teams, attendance, and subscription usage."
      endpoint="/org/dashboard"
      emptyMessage="No dashboard activity found."
      tableColumns={[
        { key: "date", label: "Date" },
        { key: "memberId", label: "Member ID" },
        { key: "member", label: "Member" },
        { key: "role", label: "Role" },
        { key: "teamId", label: "Team ID" },
        { key: "teamName", label: "Team Name" },
        { key: "status", label: "Status" },
        { key: "punchInAt", label: "Punch In" },
        { key: "punchOutAt", label: "Punch Out" },
        { key: "workedMinutes", label: "Worked (min)" },
        { key: "lateMinutes", label: "Late (min)" },
        { key: "punchInValid", label: "Check-In Valid" },
        { key: "punchOutValid", label: "Check-Out Valid" },
        { key: "punchInDistanceMeters", label: "Check-In Distance" },
        { key: "punchOutDistanceMeters", label: "Check-Out Distance" },
        { key: "punchInCoordinates", label: "Check-In Coordinates" },
        { key: "punchOutCoordinates", label: "Check-Out Coordinates" },
      ]}
      hiddenRecordColumns={["punchInLocationMeta", "punchOutLocationMeta"]}
    />
  );
}
