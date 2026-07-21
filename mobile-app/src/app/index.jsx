import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { StatusBar } from 'expo-status-bar';
import { useAuthSession } from '@/hooks/useAuthSession';
import AnimatedLogo from '../components/AnimatedLogo.jsx';
import { resolveDashboardPath } from '@/utils/roles';

export default function Home() {
  const router = useRouter();
  const { token, user, hydrated, redirectPath } = useAuthSession();
  
  React.useEffect(() => {
    if (hydrated && token && user) {
      const nextPath = resolveDashboardPath(user.currentRole, user.dashboardPath || redirectPath) || "/member/dashboard";
      router.replace(nextPath);
    }
  }, [hydrated, token, user, redirectPath, router]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View className="flex-1 items-center justify-center px-6 py-16">
          

          {/* Logo */}
          <View className="mb-8 h-24 w-24 items-center justify-center">
            <AnimatedLogo
              style={{ width: "100%", height: "100%" }}
            />
          </View>

          {/* Heading */}
          <View className="flex-row items-baseline gap-2 mb-4 justify-center">
            <Text 
              adjustsFontSizeToFit 
              numberOfLines={1} 
              className="text-center text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
            >
              Veagle
            </Text>
            <Text 
              adjustsFontSizeToFit 
              numberOfLines={1} 
              className="text-center text-4xl sm:text-5xl font-black tracking-tight text-blue-500 dark:text-blue-400"
            >
              Attendee
            </Text>
          </View>

          {/* Eyebrow Component Equivalent */}
          <View className="mb-6 rounded-full bg-blue-50 dark:bg-blue-500/10 px-4 py-2 border border-blue-100 dark:border-blue-500/20">
            <Text className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Attendance Made Simple
            </Text>
          </View>

<<<<<<< HEAD
=======
          {/* Heading */}
          <Text className="mb-2 text-center text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Veagle
          </Text>
          <Text className="mb-6 text-center text-5xl font-black tracking-tight text-blue-500 dark:text-blue-400">
            Space
          </Text>

>>>>>>> 89f1cc1 (Update mobile UI, branding, and implement role-based dashboard navigation)
          {/* Subheading */}
          <Text className="mb-12 text-center text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            Manage attendance, teams, and daily check-ins in one place with a system that feels clear, fast, and easy to use.
          </Text>

          {/* Action Buttons using our new UI Component */}
          <View className="w-full max-w-sm gap-4">
            <Link href="/login" asChild>
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={22} color="white" />}
                className="w-full">
                Sign In
              </Button>
            </Link>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
