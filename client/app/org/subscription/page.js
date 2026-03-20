import DataPanelPage from "@/components/saas/DataPanelPage";

export default function Page() {
  return (
    <DataPanelPage
      title="Organization Subscription"
      description="Plan, billing, payment logs, and subscription lifecycle details."
      endpoint="/org/subscription"
      emptyMessage="No subscription records available."
    />
  );
}
