import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";

const navItems = [
  { label: "Dashboard", href: "/member/dashboard" },
  { label: "Attendance", href: "/member/attendance" },
  { label: "Notifications", href: "/member/notifications" },
];

export default function MemberLayout({ children }) {
  return (
    <SaaSLayoutShell title="Member" sectionRoot="/member" navItems={navItems}>
      {children}
    </SaaSLayoutShell>
  );
}
