const fs = require('fs');
const path = require('path');

const generatePlaceholder = (title, description, icon = 'Component') => `import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, ${icon} } from "lucide-react-native";

export default function ${title.replace(/\s+/g, '')}Page() {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">${title}</Text>
          <View className="w-10" />
        </View>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <${icon} size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
        <Text className="text-xl font-black text-slate-900 dark:text-white text-center">${title} Coming Soon</Text>
        <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
          ${description}
        </Text>
      </View>
    </View>
  );
}
`;

const pages = {
  'super-admin': [
    { file: 'organizations.tsx', title: 'Organizations', desc: 'Inspect registered workspaces and organization status.', icon: 'Building2' },
    { file: 'payments.tsx', title: 'Payments', desc: 'Review orders, invoices, coupons, and subscription state.', icon: 'CreditCard' },
    { file: 'analytics.tsx', title: 'Analytics', desc: 'See platform usage and growth summaries.', icon: 'BarChart3' },
    { file: 'access.tsx', title: 'Access', desc: 'Manage platform roles, permissions, and security.', icon: 'ShieldCheck' },
    { file: 'leads.tsx', title: 'Leads', desc: 'Manage sales leads and inquiries.', icon: 'Users' },
    { file: 'attendance.tsx', title: 'Attendance', desc: 'Review global attendance records.', icon: 'CalendarCheck2' },
    { file: 'users.tsx', title: 'Users', desc: 'Manage platform users.', icon: 'Users' },
    { file: 'contacts.tsx', title: 'Contacts', desc: 'Manage contacts and addresses.', icon: 'Book' },
    { file: 'referrals.tsx', title: 'Referrals', desc: 'Manage referral partners and payouts.', icon: 'Gift' },
    { file: 'plans.tsx', title: 'Plans', desc: 'Manage subscription plans.', icon: 'CreditCard' },
    { file: 'posts.tsx', title: 'Posts', desc: 'Manage platform announcements.', icon: 'MessageSquare' },
    { file: 'notifications.tsx', title: 'Notifications', desc: 'Manage system notifications.', icon: 'Bell' },
    { file: 'backup.tsx', title: 'Backup', desc: 'Manage system backups and exports.', icon: 'Database' },
  ],
  'org': [
    { file: 'subscription.tsx', title: 'Subscription', desc: 'Manage your organization subscription plan.', icon: 'CreditCard' },
  ],
  'team-leader': [
    { file: 'teams.tsx', title: 'Teams', desc: 'Manage your teams and groups.', icon: 'Component' },
    { file: 'attendance.tsx', title: 'Attendance', desc: 'Review team attendance records.', icon: 'CalendarCheck2' },
    { file: 'users.tsx', title: 'Users', desc: 'Manage team members.', icon: 'Users' },
    { file: 'requests.tsx', title: 'Requests', desc: 'Manage member requests.', icon: 'ClipboardCheck' },
    { file: 'posts.tsx', title: 'Posts', desc: 'Manage team announcements.', icon: 'MessageSquare' },
    { file: 'reports.tsx', title: 'Reports', desc: 'Generate team attendance reports.', icon: 'FileBarChart' },
    { file: 'subscription.tsx', title: 'Subscription', desc: 'View subscription plan details.', icon: 'CreditCard' },
    { file: 'notifications.tsx', title: 'Notifications', desc: 'View team alerts and updates.', icon: 'Bell' },
  ],
  'member': [
    { file: 'attendance.tsx', title: 'My Attendance', desc: 'Mark and review your attendance.', icon: 'CalendarCheck2' },
    { file: 'teams.tsx', title: 'My Teams', desc: 'View your teams and colleagues.', icon: 'Component' },
    { file: 'posts.tsx', title: 'Posts', desc: 'View organization announcements.', icon: 'MessageSquare' },
    { file: 'reports.tsx', title: 'Reports', desc: 'View your personal reports.', icon: 'FileBarChart' },
    { file: 'notifications.tsx', title: 'Notifications', desc: 'View your alerts and updates.', icon: 'Bell' },
  ]
};

const basePath = path.join(__dirname, 'mobile-app/src/app');

Object.keys(pages).forEach(folder => {
  const folderPath = path.join(basePath, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  pages[folder].forEach(page => {
    const filePath = path.join(folderPath, page.file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, generatePlaceholder(page.title, page.desc, page.icon));
      console.log(`Created ${filePath}`);
    }
  });
});
