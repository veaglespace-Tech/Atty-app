import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";

const navItems = [
  { label: "Dashboard", href: "/super-admin/dashboard" },
  { label: "Organizations", href: "/super-admin/organizations" },
  { label: "Leads", href: "/super-admin/leads" },
  { label: "Attendance", href: "/super-admin/attendance" },
  { label: "Users", href: "/super-admin/users" },
  { label: "Contacts", href: "/super-admin/contacts" },
  { label: "Referrals", href: "/super-admin/referrals" },
  { label: "Plans", href: "/super-admin/plans" },
  { label: "Access", href: "/super-admin/access" },
  { label: "Roles", href: "/super-admin/roles" },
  { label: "Posts", href: "/super-admin/posts" },
  { label: "Notifications", href: "/super-admin/notifications" },
  { label: "Payments", href: "/super-admin/payments" },
  { label: "Coupons", href: "/super-admin/coupons" },
  { label: "Analytics", href: "/super-admin/analytics" },
  { label: "Backup", href: "/super-admin/backup" },
];

export default function SuperAdminLayout({ children }) {
  return (
    <SaaSLayoutShell
      title="Super Admin"
      sectionRoot="/super-admin"
      navItems={navItems}
    >
      {children}
    </SaaSLayoutShell>
  );
}
