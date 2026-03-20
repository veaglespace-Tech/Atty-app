import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const navItems = [
  { label: "Dashboard", href: "/team-leader/dashboard" },
  { label: "Teams", href: "/team-leader/teams", permission: PERMISSIONS.TEAM_VIEW },
  { label: "Attendance", href: "/team-leader/attendance", permission: PERMISSIONS.ATTENDANCE_VIEW },
  { label: "Reports", href: "/team-leader/reports", permission: PERMISSIONS.REPORTS_VIEW },
];

export default function TeamLeaderLayout({ children }) {
  return (
    <SaaSLayoutShell
      title="Team Leader"
      sectionRoot="/team-leader"
      navItems={navItems}
    >
      {children}
    </SaaSLayoutShell>
  );
}
