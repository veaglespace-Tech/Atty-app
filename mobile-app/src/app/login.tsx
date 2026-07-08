import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react-native';

import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName,
} from '@/components/auth/AuthPageShell';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useUserSignInMutation } from '@/services/api/authApi';
import { setSession } from '@/store/slices/authSlice';
import { resolveDashboardPath } from '@/utils/roles';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { token, user, hydrated, redirectPath } = useAuthSession();
  const currentRole = user?.currentRole;
  const [userSignIn] = useUserSignInMutation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!hydrated || !token) return;
    const nextPath = resolveDashboardPath(currentRole, user?.dashboardPath || redirectPath) || "/member/dashboard";
    router.replace(nextPath as any);
  }, [currentRole, hydrated, redirectPath, token, user?.dashboardPath, router]);

  const onSubmit = async (values: any) => {
    try {
      setAuthError("");
      const result = await userSignIn(values).unwrap();
      dispatch(setSession(result));
      const nextPath = resolveDashboardPath(result.user?.currentRole, result.redirectPath || result.user?.dashboardPath) || "/member/dashboard";
      router.replace(nextPath as any);
    } catch (err: any) {
      setAuthError(err?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Team Login"
          title="Welcome to Veagle Attendee"
          description="Sign in to manage attendance, check-ins, and your daily work in one place."
          footer={
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-300">
              New here?{" "}
              <Link href="/register" asChild>
                <Text className="font-bold text-blue-600 underline dark:text-blue-300">
                  Create your organization
                </Text>
              </Link>
            </Text>
          }
        >
          {authError ? (
            <View className="mb-4 rounded-xl bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-600">{authError}</Text>
            </View>
          ) : null}

          <View className="space-y-5 sm:space-y-6 gap-5">
            <View className="group relative">
              <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email Address
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Mail size={20} className="text-slate-400" />
                </View>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`${authFieldClassName} pl-12 pr-4 ${
                        errors.email ? authFieldErrorClassName : authFieldNormalClassName
                      }`}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
              </View>
              {errors.email ? (
                <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                  {errors.email.message as string}
                </Text>
              ) : null}
            </View>

            <View className="group relative">
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password
                </Text>
                <Link href={"/forgot-password" as any} asChild>
                  <Text className="text-xs font-bold text-blue-600 dark:text-blue-300">
                    Forgot Password?
                  </Text>
                </Link>
              </View>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Lock size={20} className="text-slate-400" />
                </View>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`${authFieldClassName} pl-12 pr-12 ${
                        errors.password ? authFieldErrorClassName : authFieldNormalClassName
                      }`}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                <Pressable 
                  className="absolute right-4 z-10 p-2" 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-slate-400" />
                  ) : (
                    <Eye size={20} className="text-slate-400" />
                  )}
                </Pressable>
              </View>
              {errors.password ? (
                <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                  {errors.password.message as string}
                </Text>
              ) : null}
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              className="group mt-2 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 shadow-[0_28px_70px_rgba(59,130,246,0.32)] active:scale-95 dark:bg-blue-400 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)]"
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ArrowRight size={20} color="white" className="dark:text-slate-950" />
              )}
              <Text className="font-black text-white dark:text-slate-950 text-base">Sign In</Text>
            </Pressable>
          </View>
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
