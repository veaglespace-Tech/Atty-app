import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react-native';

import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName
} from '@/components/auth/AuthPageShell';
import { useForgotPasswordMutation } from '@/services/api/authApi';
import { ROLES, LOGIN_ROLE_OPTIONS } from '@/utils/roles';

const forgotPasswordSchema = z.object({
  loginAs: z.string().min(1, 'Role is required'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
});

const roleOptions = LOGIN_ROLE_OPTIONS.filter((roleOption) => roleOption.value !== ROLES.SUPER_ADMIN);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [forgotPassword] = useForgotPasswordMutation();
  const [requestSent, setRequestSent] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', loginAs: ROLES.MEMBER }
  });

  const selectedRole = watch("loginAs");
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);

  const onSubmit = async (values) => {
    try {
      setAuthError("");
      await forgotPassword({
        loginAs: values.loginAs,
        email: values.email.trim(),
      }).unwrap();
      setRequestSent(true);
    } catch (err) {
      setAuthError(err?.data?.message || "Failed to send reset link. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Account Recovery"
          title="Reset your password"
          description="Enter your email and role to receive a secure password reset link."
          footer={
            <View className="space-y-4">
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-300">
                Remembered your password?{" "}
                <Link href="/login" asChild>
                  <Text className="font-bold text-blue-600 underline dark:text-blue-300">
                    Sign In
                  </Text>
                </Link>
              </Text>
            </View>
          }>
          
          {requestSent ? (
            <View className="space-y-6">
              <View className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
                <View className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </View>
                <Text className="text-xl font-black text-slate-950 text-center mb-2">
                  Check your inbox
                </Text>
                <Text className="text-sm font-medium text-slate-600 text-center">
                  If this account exists, a reset link has been sent to your email address.
                </Text>
              </View>

              <Pressable
                onPress={() => setRequestSent(false)}
                className="mt-2 flex-row w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-5 shadow-sm active:scale-95">
                <Text className="font-black text-slate-900 text-base">Send another link</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {authError ? (
                <View className="mb-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-sm font-semibold text-red-600">{authError}</Text>
                </View>
              ) : null}

              <View className="space-y-5 gap-5">
                <View className="group relative z-20">
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Login As
                  </Text>
                  <Pressable 
                    onPress={() => setRoleSelectOpen(!roleSelectOpen)}
                    className={`${authFieldClassName} ${authFieldNormalClassName} flex-row items-center justify-between px-4`}
                  >
                    <View className="flex-row items-center">
                      <ShieldCheck size={20} className="text-slate-400 mr-3" />
                      <Text className="text-slate-900 dark:text-white font-medium">
                        {roleOptions.find(r => r.value === selectedRole)?.label || "Select Role"}
                      </Text>
                    </View>
                    <ChevronDown size={20} className="text-slate-400" />
                  </Pressable>
                  
                  {roleSelectOpen && (
                    <View className="absolute top-20 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg z-50 overflow-hidden">
                      {roleOptions.map((role) => (
                        <Pressable
                          key={role.value}
                          onPress={() => {
                            setValue("loginAs", role.value);
                            setRoleSelectOpen(false);
                          }}
                          className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
                        >
                          <Text className="text-slate-900 dark:text-white font-medium">{role.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View className="group relative z-10">
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
                          className={`${authFieldClassName} pl-12 pr-4 ${errors.email ? authFieldErrorClassName : authFieldNormalClassName}`}
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
                  {errors.email && (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                      {errors.email.message}
                    </Text>
                  )}
                </View>

                <Pressable
                  disabled={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                  className="group mt-2 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 shadow-[0_28px_70px_rgba(59,130,246,0.32)] active:scale-95 dark:bg-blue-400 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)]">
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ArrowRight size={20} color="white" className="dark:text-slate-950" />
                  )}
                  <Text className="font-black text-white dark:text-slate-950 text-base">Send Reset Link</Text>
                </Pressable>
              </View>
            </>
          )}
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
