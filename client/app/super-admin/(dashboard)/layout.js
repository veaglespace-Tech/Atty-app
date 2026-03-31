import SaaSLayoutShell from "@/components/saas/SaaSLayoutShell";

const navItems = [
  { label: "Dashboard", href: "/super-admin/dashboard" },
  { label: "Organizations", href: "/super-admin/organizations" },
  { label: "Contacts", href: "/super-admin/contacts" },
  { label: "Plans", href: "/super-admin/plans" },
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
