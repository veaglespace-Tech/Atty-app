import { CalendarCheck2, FileBarChart, MapPinned, Users, Component, ClipboardCheck, MessageSquare, CreditCard, Bell, Gift } from "lucide-react-native";

import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";

export default function TeamLeaderDashboard() {
  return (
    <MobileDashboardShell
      title="Team Leader Dashboard"
      subtitle="Follow team attendance, live locations, requests, reports, and posts."
      groups={[
        {
          name: "Team",
          actions: [
            { title: "Team Members", description: "Review assigned users and team structure.", icon: <Users size={22} color="#2563eb" />, href: "members" },
            { title: "Teams", description: "Manage your assigned teams.", icon: <Component size={22} color="#2563eb" />, href: "teams" },
            { title: "Requests", description: "Manage member requests.", icon: <ClipboardCheck size={22} color="#2563eb" />, href: "requests" }
          ]
        },
        {
          name: "Attendance",
          actions: [
            { title: "Team Attendance", description: "View today status and member attendance details.", icon: <CalendarCheck2 size={22} color="#2563eb" />, href: "attendance" },
            { title: "Live Location", description: "Open location context for active team members.", icon: <MapPinned size={22} color="#2563eb" />, href: "location" },
            { title: "Reports", description: "Check team summaries and performance reports.", icon: <FileBarChart size={22} color="#2563eb" />, href: "reports" }
          ]
        },
        {
          name: "Settings",
          actions: [
            { title: "Posts", description: "Manage team announcements.", icon: <MessageSquare size={22} color="#2563eb" />, href: "posts" },
            { title: "Subscription", description: "View subscription plan details.", icon: <CreditCard size={22} color="#2563eb" />, href: "subscription" },
            { title: "Notifications", description: "View team alerts and updates.", icon: <Bell size={22} color="#2563eb" />, href: "notifications" },
            { title: "Coupons", description: "Manage referral and discount coupons.", icon: <Gift size={22} color="#2563eb" />, href: "coupons" }
          ]
        }
      ]}
       />);
}