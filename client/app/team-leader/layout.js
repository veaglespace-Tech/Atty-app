import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const navItems = [
  { label: "Dashboard", href: "/team-leader/dashboard" },
  { label: "Teams", href: "/team-leader/teams", permission: PERMISSIONS.TEAM_VIEW },
  { label: "Attendance", href: "/team-leader/attendance" },
  { label: "Users", href: "/team-leader/users", permission: PERMISSIONS.USERS_VIEW },
  { label: "Requests", href: "/team-leader/requests", permission: PERMISSIONS.USERS_STATUS_UPDATE },
  { label: "Posts", href: "/team-leader/posts", permission: PERMISSIONS.POST_CREATE },
  { label: "Reports", href: "/team-leader/reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Subscription", href: "/team-leader/subscription", permission: PERMISSIONS.SUBSCRIPTION_VIEW },
  { label: "Notifications", href: "/team-leader/notifications" },
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


