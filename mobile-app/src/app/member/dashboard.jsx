import { CalendarCheck2, Component, MessageSquare, FileBarChart, Bell } from "lucide-react-native";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function MemberDashboard() {
  const { user } = useAuthSession();

  return (
    <MobileDashboardShell
      title="Member Dashboard"
      subtitle="Track your daily check-ins, attendance history, posts, and team updates."
      actions={[
      {
        title: "My Attendance",
        description: "Mark and review your attendance.",
        icon: <CalendarCheck2 size={22} color="#2563eb" />,
        href: "attendance"
      },
      {
        title: "My Teams",
        description: "View your teams and colleagues.",
        icon: <Component size={22} color="#2563eb" />,
        href: "teams"
      },
      {
        title: "Posts",
        description: "View organization announcements.",
        icon: <MessageSquare size={22} color="#2563eb" />,
        href: "posts"
      },
      {
        title: "Reports",
        description: "View your personal reports.",
        icon: <FileBarChart size={22} color="#2563eb" />,
        href: "reports"
      },
      {
        title: "Notifications",
        description: "View your alerts and updates.",
        icon: <Bell size={22} color="#2563eb" />,
        href: "notifications"
      }]
      }>
      
      <MyAttendanceCore user={user} isEmbedded={true} />
    </MobileDashboardShell>);

}