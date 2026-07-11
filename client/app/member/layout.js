import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const navItems = [
  { label: "Dashboard", href: "/member/dashboard" },
  { label: "Attendance", href: "/member/attendance" },
  { label: "Teams", href: "/member/teams", permission: PERMISSIONS.TEAM_VIEW },
  { label: "Posts", href: "/member/posts", permission: PERMISSIONS.POST_CREATE },
  { label: "Reports", href: "/member/reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Notifications", href: "/member/notifications" },
];

export default function MemberLayout({ children }) {
  return (
    <SaaSLayoutShell title="Member" sectionRoot="/member" navItems={navItems}>
      {children}
    </SaaSLayoutShell>
  );
}

