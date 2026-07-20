import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName } from
'@/components/auth/AuthPageShell';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useUserSignInMutation, useVerifySuperAdminOtpMutation } from '@/services/api/authApi';
import { setSession } from '@/store/slices/authSlice';
import { resolveDashboardPath } from '@/utils/roles';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  otp: z.string().optional()
});

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { token, user, hydrated, redirectPath } = useAuthSession();
  const currentRole = user?.currentRole;
  const [userSignIn] = useUserSignInMutation();
  const [verifyOtp, { isLoading: isOtpVerifying }] = useVerifySuperAdminOtpMutation();

  const [step, setStep] = useState('LOGIN');
  const [loginData, setLoginData] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', otp: '' }
  });

  useEffect(() => {
    if (!hydrated || !token) return;
    const nextPath = resolveDashboardPath(currentRole, user?.dashboardPath || redirectPath) || "/member/dashboard";
    router.replace(nextPath);
  }, [currentRole, hydrated, redirectPath, token, user?.dashboardPath, router]);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          setHasBiometrics(true);
          const email = await SecureStore.getItemAsync('userEmail');
          const password = await SecureStore.getItemAsync('userPassword');
          if (email && password) {
            setStoredCredentials({ email, password });
          }
        }
      } catch (err) {
        console.log("Biometrics check failed:", err);
      }
    };
    checkBiometrics();
  }, []);

  const handleBiometricLogin = async () => {
    if (!storedCredentials) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Veagle Attendee',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        onSubmit(storedCredentials);
      }
    } catch (err) {
      console.log("Biometric authentication failed:", err);
    }
  };

  const onSubmit = async (values) => {
    try {
      setAuthError("");
      
      if (step === 'LOGIN') {
        const result = await userSignIn(values).unwrap();
        
        if (result.requires2FA) {
          setLoginData(values);
          setStep('OTP');
          return;
        }

        dispatch(setSession(result));
        
        // Save credentials for future biometric login
        try {
          await SecureStore.setItemAsync('userEmail', values.email);
          await SecureStore.setItemAsync('userPassword', values.password);
        } catch (e) {
          console.log("Failed to securely store credentials", e);
        }
        const nextPath = resolveDashboardPath(result.user?.currentRole, result.redirectPath || result.user?.dashboardPath) || "/member/dashboard";
        router.replace(nextPath);
      } else if (step === 'OTP') {
        const otpPayload = {
          email: loginData.email,
          password: loginData.password,
          otp: values.otp,
        };
        const result = await verifyOtp(otpPayload).unwrap();
        dispatch(setSession(result));
        
        try {
          await SecureStore.setItemAsync('userEmail', loginData.email);
          await SecureStore.setItemAsync('userPassword', loginData.password);
        } catch (e) {
          console.log("Failed to securely store credentials", e);
        }
        const nextPath = resolveDashboardPath(result.user?.currentRole, result.redirectPath || result.user?.dashboardPath) || "/super-admin/dashboard";
        router.replace(nextPath);
      }
    } catch (err) {
      setAuthError(err?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Team Login"
          title="Welcome to Veagle Attendee"
          description="Sign in to manage attendance, check-ins, and your daily work in one place."
          footer={null}>
          
          {authError ?
          <View className="mb-4 rounded-xl bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-600">{authError}</Text>
            </View> :
          null}

          <View className="space-y-5 sm:space-y-6 gap-5">
            {step === 'LOGIN' && (
              <>
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
                      render={({ field: { onChange, onBlur, value } }) =>
                      <TextInput
                        className={`${authFieldClassName} pl-12 pr-4 ${
                        errors.email ? authFieldErrorClassName : authFieldNormalClassName}`
                        }
                        placeholder="name@company.com"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value} />
                    } />
                  </View>
                  {errors.email ?
                  <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                      {errors.email.message}
                    </Text> :
                  null}
                </View>

                <View className="group relative">
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <Text className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Password
                    </Text>
                    <Link href={"/forgot-password"} asChild>
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
                      render={({ field: { onChange, onBlur, value } }) =>
                      <TextInput
                        className={`${authFieldClassName} pl-12 pr-12 ${
                        errors.password ? authFieldErrorClassName : authFieldNormalClassName}`
                        }
                        placeholder="Enter your password"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value} />
                    } />
                    <Pressable
                      className="absolute right-4 z-10 p-2"
                      onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ?
                      <EyeOff size={20} className="text-slate-400" /> :
                      <Eye size={20} className="text-slate-400" />
                      }
                    </Pressable>
                  </View>
                  {errors.password ?
                  <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                      {errors.password.message}
                    </Text> :
                  null}
                </View>
              </>
            )}

            {step === 'OTP' && (
              <View className="group relative">
                <Text className="mb-1.5 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Verification Code (OTP)
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-1">
                  Please enter the 6-digit code sent to your email.
                </Text>
                <View className="relative justify-center">
                  <View className="absolute left-4 z-10">
                    <Lock size={20} className="text-slate-400" />
                  </View>
                  <Controller
                    control={control}
                    name="otp"
                    render={({ field: { onChange, onBlur, value } }) =>
                    <TextInput
                      className={`${authFieldClassName} pl-12 pr-4 ${
                      errors.otp ? authFieldErrorClassName : authFieldNormalClassName}`
                      }
                      placeholder="123456"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={6}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value} />
                  } />
                </View>
                {errors.otp ?
                <Text className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                    {errors.otp.message}
                  </Text> :
                null}
                
                <Pressable onPress={() => setStep('LOGIN')} className="mt-4">
                  <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Back to login
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              disabled={isSubmitting || isOtpVerifying}
              onPress={handleSubmit(onSubmit)}
              className="group mt-2 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 shadow-[0_28px_70px_rgba(59,130,246,0.32)] active:scale-95 dark:bg-blue-400 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)]">
              
              {isSubmitting || isOtpVerifying ?
              <ActivityIndicator color="white" /> :
              <ArrowRight size={20} color="white" className="dark:text-slate-950" />
              }
              <Text className="font-black text-white dark:text-slate-950 text-base">
                {step === 'LOGIN' ? 'Sign In' : 'Verify & Sign In'}
              </Text>
            </Pressable>

            {hasBiometrics && storedCredentials && step === 'LOGIN' && (
              <Pressable
                disabled={isSubmitting}
                onPress={handleBiometricLogin}
                className="mt-1 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-slate-100 dark:bg-slate-800 py-5 active:scale-95"
              >
                <Fingerprint size={20} className="text-slate-700 dark:text-slate-300" />
                <Text className="font-bold text-slate-700 dark:text-slate-300 text-base">Login with Biometrics</Text>
              </Pressable>
            )}
          </View>
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>);

}