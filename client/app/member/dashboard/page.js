import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Member Dashboard"
      description="Your daily attendance status, month summary, and streak insights."
      endpoint="/member/dashboard"
      emptyMessage="No dashboard entries available."
    />
  );
}
