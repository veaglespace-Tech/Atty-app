import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { ArrowRight, Building2, UserCircle2 } from 'lucide-react-native';

export default function RegisterScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View className="flex-1 px-6 py-12 justify-center">
          
          <View className="mb-10 text-center items-center">
            <View className="mb-6 rounded-full bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 border border-blue-100 dark:border-blue-500/20">
              <Text className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                Get Started
              </Text>
            </View>
            <Text className="mb-2 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white text-center">
              Veagle <Text className="text-blue-600 dark:text-blue-400">Attendee</Text>
            </Text>
            <Text className="font-medium tracking-wide text-slate-500 dark:text-slate-400 text-center mt-2">
              Pick the setup that matches you, whether you are creating an organization or joining an existing team.
            </Text>
          </View>

          <View className="gap-6">
            <RegistrationCard
              icon={Building2}
              title="Create Organization"
              desc="Set up your organization, invite your team, and start managing attendance from one place."
              badge="Owner / Admin"
              href="/register/organisation"
            />

            <RegistrationCard
              icon={UserCircle2}
              title="Join as Member"
              desc="Join an existing organization as an employee, team leader, or sub-admin and start checking in."
              badge="Staff / Team"
              href="/register/user"
            />
          </View>

          <View className="mt-12 flex-row justify-center items-center gap-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Already have an account?
            </Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Sign in here
                </Text>
              </Pressable>
            </Link>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RegistrationCard({ icon: Icon, title, desc, badge, href }: any) {
  return (
    <Link href={href} asChild>
      <Pressable 
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 active:opacity-80"
      >
        <View className="mb-6 flex-row items-start justify-between gap-4">
          <View className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
            <Icon size={32} color="#2563eb" className="dark:text-blue-400" />
          </View>
          <View className="rounded-full bg-blue-600 px-3 py-1.5 dark:bg-blue-400">
            <Text className="text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-950">
              {badge}
            </Text>
          </View>
        </View>

        <Text className="mb-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </Text>
        <Text className="mb-8 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-300">
          {desc}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
            Continue
          </Text>
          <ArrowRight size={16} color="#2563eb" className="dark:text-blue-400" />
        </View>
      </Pressable>
    </Link>
  );
}
