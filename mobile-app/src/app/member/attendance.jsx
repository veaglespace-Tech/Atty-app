import React from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function MemberAttendancePage() {
  const { user } = useAuthSession();

  return (
    <MobileDashboardShell>
      <MyAttendanceCore user={user} />
    </MobileDashboardShell>
  );
}