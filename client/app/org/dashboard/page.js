import DataPanelPage from "@/components/saas/DataPanelPage";
import { attendanceDashboardTableColumns } from "@/components/saas/attendanceDashboardColumns";

export default function Page() {
  return (
    <DataPanelPage
      title="Organization Dashboard"
      description="Workspace summary for users, teams, attendance, and subscription usage."
      endpoint="/org/dashboard"
      emptyMessage="No dashboard activity found."
      tableColumns={attendanceDashboardTableColumns}
      hiddenRecordColumns={["punchInLocationMeta", "punchOutLocationMeta"]}
    />
  );
}
