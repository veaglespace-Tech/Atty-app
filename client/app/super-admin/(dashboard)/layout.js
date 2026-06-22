import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";

const navItems = [
  { label: "Dashboard", href: "/super-admin/dashboard" },
  { label: "Organizations", href: "/super-admin/organizations" },
  { label: "Users", href: "/super-admin/users" },
  { label: "Contacts", href: "/super-admin/contacts" },
  { label: "Plans", href: "/super-admin/plans" },
  { label: "Access", href: "/super-admin/access" },
  { label: "Posts", href: "/super-admin/posts" },
  { label: "Payments", href: "/super-admin/payments" },
  { label: "Analytics", href: "/super-admin/analytics" },
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
