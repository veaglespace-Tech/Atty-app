import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { useAuthSession } from '@/hooks/useAuthSession';
import { useUserSignInMutation, useVerifySuperAdminOtpMutation } from '@/services/api/authApi';
import { setSession } from '@/store/slices/authSlice';
import { resolveDashboardPath } from '@/utils/roles';

export function useAuthFlow() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const { token, user, hydrated, redirectPath } = useAuthSession();
  const currentRole = user?.currentRole;
  
  const [userSignIn, { isLoading: isSigningIn }] = useUserSignInMutation();
  const [verifyOtp, { isLoading: isOtpVerifying }] = useVerifySuperAdminOtpMutation();

  const [step, setStep] = useState('LOGIN');
  const [loginData, setLoginData] = useState(null);
  const [authError, setAuthError] = useState('');
  
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState(null);

  useEffect(() => {
    if (!hydrated || !token) return;
    const nextPath = resolveDashboardPath(currentRole, user?.dashboardPath || redirectPath) || "/member/dashboard";
    router.replace(nextPath);
  }, [currentRole, hydrated, redirectPath, token, user?.dashboardPath, router]);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        if (Platform.OS === 'web') return;
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

  const saveCredentialsSecurely = async (email, password) => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('userEmail', email);
        await SecureStore.setItemAsync('userPassword', password);
      } else {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userPassword', password);
      }
    } catch (e) {
      console.log("Failed to securely store credentials", e);
    }
  };

  const handleLogin = async (values) => {
    setAuthError("");
    try {
      const result = await userSignIn(values).unwrap();
      
      if (result.requires2FA) {
        setLoginData(values);
        setStep('OTP');
        return;
      }

      dispatch(setSession(result));
      await saveCredentialsSecurely(values.email, values.password);
      
      const nextPath = resolveDashboardPath(result.user?.currentRole, result.redirectPath || result.user?.dashboardPath) || "/member/dashboard";
      router.replace(nextPath);
    } catch (err) {
      setAuthError(err?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  const handleOtpVerify = async (otpValue) => {
    setAuthError("");
    try {
      const otpPayload = {
        email: loginData.email,
        password: loginData.password,
        otp: otpValue,
      };
      
      const result = await verifyOtp(otpPayload).unwrap();
      dispatch(setSession(result));
      await saveCredentialsSecurely(loginData.email, loginData.password);
      
      const nextPath = resolveDashboardPath(result.user?.currentRole, result.redirectPath || result.user?.dashboardPath) || "/super-admin/dashboard";
      router.replace(nextPath);
    } catch (err) {
      setAuthError(err?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  const handleBiometricLogin = async () => {
    if (!storedCredentials) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Veagle Attendee',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        await handleLogin(storedCredentials);
      }
    } catch (err) {
      console.log("Biometric authentication failed:", err);
    }
  };

  return {
    step,
    authError,
    isSigningIn,
    isOtpVerifying,
    hasBiometrics,
    storedCredentials,
    handleLogin,
    handleOtpVerify,
    handleBiometricLogin,
  };
}
