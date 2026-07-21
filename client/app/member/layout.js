"use client";

import { useMemo } from "react";
import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";
import { PERMISSIONS } from "@/utils/roles";

const baseNavItems = [
  { label: "Dashboard", href: "/member/dashboard" },
  { label: "Attendance", href: "/member/attendance" },
  { label: "Teams", href: "/member/teams", permission: PERMISSIONS.TEAM.VIEW_ALL },
  { label: "Instruments", href: "/member/instruments" },
  { label: "Posts", href: "/member/posts", permission: PERMISSIONS.POSTS.CREATE },
  { label: "Reports", href: "/member/reports", permission: PERMISSIONS.REPORTS.VIEW },
  { label: "Notifications", href: "/member/notifications" },
];

export default function MemberLayout({ children }) {
  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    const notifIndex = items.findIndex(item => item.label === "Notifications");
    if (notifIndex !== -1) {
      items.splice(notifIndex, 0, { label: "Expenses", href: "/member/expenses" });
    } else {
      items.push({ label: "Expenses", href: "/member/expenses" });
    }
    return items;
  }, []);

  return (
    <SaaSLayoutShell title="Member" sectionRoot="/member" navItems={navItems}>
      {children}
    </SaaSLayoutShell>
  );
}

