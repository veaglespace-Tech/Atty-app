import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const navItems = [
  { label: "Dashboard", href: "/org/dashboard" },
  { label: "Notifications", href: "/org/notifications", permission: PERMISSIONS.USERS_STATUS_UPDATE },
  { label: "Requests", href: "/org/registration-requests", permission: PERMISSIONS.USERS_STATUS_UPDATE },
  { label: "Users", href: "/org/users", permission: PERMISSIONS.USERS_CREATE },
  { label: "Teams", href: "/org/teams", permission: PERMISSIONS.TEAM_VIEW },
  { label: "Attendance", href: "/org/attendance", permission: PERMISSIONS.ATTENDANCE_VIEW },
  { label: "Posts", href: "/org/posts", permission: PERMISSIONS.POST_CREATE },
  { label: "Reports", href: "/org/reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Subscription", href: "/org/subscription", permission: PERMISSIONS.SUBSCRIPTION_VIEW },
];

export default function OrgLayout({ children }) {
  return (
    <SaaSLayoutShell title="Organization" sectionRoot="/org" navItems={navItems}>
      {children}
    </SaaSLayoutShell>
  );
}
