import { BarChart3, ShieldCheck, Zap } from "lucide-react";

export const FEATURE_CARDS = [
  {
    icon: Zap,
    title: "Smart Attendance Tracking",
    desc: "Track check-ins, workdays, and attendance updates without chasing people for status.",
    accent: "text-blue-600 dark:text-blue-300",
  },
  {
    icon: ShieldCheck,
    title: "Secure Organization Access",
    desc: "Each organization gets its own protected workspace with role-based access and safe data handling.",
    accent: "text-blue-600 dark:text-blue-300",
  },
  {
    icon: BarChart3,
    title: "Clear Attendance Reports",
    desc: "See present, absent, and late records in reports that managers can understand at a glance.",
    accent: "text-blue-600 dark:text-blue-300",
  },
];

export const SPOTLIGHT_TAGS = ["Attendance", "Teams", "Reports", "Role Based"];

export const SPOTLIGHT_STATS = [
  { value: "50K+", label: "Check-ins" },
  { value: "100+", label: "Organizations" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];
