import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react-native';

import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName
} from '@/components/auth/AuthPageShell';
import { useValidateResetPasswordTokenMutation, useResetPasswordMutation } from '@/services/api/authApi';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [validateToken] = useValidateResetPasswordTokenMutation();
  const [resetPassword] = useResetPasswordMutation();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [validationError, setValidationError] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setIsTokenValid(false);
      setValidationError("No reset token provided. Please use the link sent to your email.");
      return;
    }

    const checkToken = async () => {
      try {
        await validateToken({ token }).unwrap();
        setIsTokenValid(true);
      } catch (error) {
        setIsTokenValid(false);
        setValidationError(error?.data?.message || "Invalid or expired password reset token.");
      } finally {
        setIsValidating(false);
      }
    };

    checkToken();
  }, [token, validateToken]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  const onSubmit = async (values) => {
    try {
      setAuthError("");
      await resetPassword({
        token,
        newPassword: values.newPassword,
      }).unwrap();
      setSuccess(true);
    } catch (err) {
      setAuthError(err?.data?.message || "Failed to reset password. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Account Recovery"
          title="Create new password"
          description={success ? "Your password has been successfully reset." : "Please enter a strong new password for your account."}
          footer={
            <View className="space-y-4">
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-300">
                Remembered your old password?{" "}
                <Link href="/login" asChild>
                  <Text className="font-bold text-blue-600 underline dark:text-blue-300">
                    Sign In
                  </Text>
                </Link>
              </Text>
            </View>
          }>
          
          {isValidating ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="mt-4 font-semibold text-slate-500">Validating token...</Text>
            </View>
          ) : !isTokenValid ? (
            <View className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
              <View className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
                <AlertCircle size={28} className="text-rose-600" />
              </View>
              <Text className="text-xl font-black text-slate-950 text-center mb-2">
                Invalid Link
              </Text>
              <Text className="text-sm font-medium text-slate-600 text-center mb-6">
                {validationError}
              </Text>
              <Link href="/forgot-password" asChild>
                <Pressable className="flex-row w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-4 shadow-sm active:scale-95">
                  <Text className="font-black text-slate-900 text-base">Request New Link</Text>
                </Pressable>
              </Link>
            </View>
          ) : success ? (
            <View className="space-y-6">
              <View className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
                <View className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </View>
                <Text className="text-xl font-black text-slate-950 text-center mb-2">
                  Password Reset!
                </Text>
                <Text className="text-sm font-medium text-slate-600 text-center">
                  You can now safely sign in with your new password.
                </Text>
              </View>

              <Link href="/login" asChild>
                <Pressable className="mt-2 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 shadow-sm active:scale-95">
                  <Text className="font-black text-white text-base">Continue to Sign In</Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <>
              {authError ? (
                <View className="mb-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-sm font-semibold text-red-600">{authError}</Text>
                </View>
              ) : null}

              <View className="space-y-5 gap-5">
                <View className="group relative">
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    New Password
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                      <Lock size={20} className="text-slate-400" />
                    </View>
                    <Controller
                      control={control}
                      name="newPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className={`${authFieldClassName} pl-12 pr-12 ${errors.newPassword ? authFieldErrorClassName : authFieldNormalClassName}`}
                          placeholder="Enter new password"
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
                      onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}
                    </Pressable>
                  </View>
                  {errors.newPassword && (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                      {errors.newPassword.message}
                    </Text>
                  )}
                </View>

                <View className="group relative">
                  <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Confirm Password
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                      <Lock size={20} className="text-slate-400" />
                    </View>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className={`${authFieldClassName} pl-12 pr-12 ${errors.confirmPassword ? authFieldErrorClassName : authFieldNormalClassName}`}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#94a3b8"
                          secureTextEntry={!showConfirmPassword}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value} 
                        />
                      )} 
                    />
                    <Pressable
                      className="absolute right-4 z-10 p-2"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}
                    </Pressable>
                  </View>
                  {errors.confirmPassword && (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                      {errors.confirmPassword.message}
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
                  <Text className="font-black text-white dark:text-slate-950 text-base">Reset Password</Text>
                </Pressable>
              </View>
            </>
          )}
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
