import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const navItems = [
  { label: "Dashboard", href: "/org/dashboard" },
  { label: "My Attendance", href: "/org/my-attendance" },
  { label: "Notifications", href: "/org/notifications", permission: PERMISSIONS.USERS.UPDATE_STATUS },
  { label: "Requests", href: "/org/registration-requests", permission: PERMISSIONS.USERS.UPDATE_STATUS },
  { label: "Users", href: "/org/users", permission: PERMISSIONS.USERS.CREATE },
  { label: "Teams", href: "/org/teams", permission: PERMISSIONS.TEAM.VIEW_ALL },
  { label: "Attendance", href: "/org/attendance", permission: PERMISSIONS.ATTENDANCE.VIEW_ALL },
  { label: "Posts", href: "/org/posts", permission: PERMISSIONS.POSTS.CREATE },
  { label: "Reports", href: "/org/reports", permission: PERMISSIONS.REPORTS.VIEW },
  { label: "Subscription", href: "/org/subscription", permission: PERMISSIONS.SUBSCRIPTION.VIEW },
];

export default function OrgLayout({ children }) {
  return (
    <SaaSLayoutShell title="Organization" sectionRoot="/org" navItems={navItems}>
      {children}
    </SaaSLayoutShell>
  );
}
