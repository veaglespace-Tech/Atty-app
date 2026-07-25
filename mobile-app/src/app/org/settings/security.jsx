import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Link2, CheckCircle2, Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import { useAuthSession } from "@/hooks/useAuthSession";
import { ROLES } from "@/utils/roles";
import { useForgotPasswordMutation } from "@/services/api/authApi";

export default function SecuritySettings() {
  const { user } = useAuthSession();
  const [forgotPassword, { isLoading: isResetting }] = useForgotPasswordMutation();
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  
  const effectiveRole = user?.currentRole || user?.role || ROLES.MEMBER;
  const isSuperAdmin = effectiveRole === ROLES.SUPER_ADMIN;

  const referralCode = user?.organization?.referralCode || "";
  const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "https://attendee.veaglespace.com";
  const referralLink = referralCode ? `${APP_URL}/register/user?ref=${referralCode}` : "";

  const copyToClipboard = useCallback(async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  }, [referralLink]);

  const copyCodeToClipboard = useCallback(async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCopiedReferralCode(true);
    setTimeout(() => setCopiedReferralCode(false), 2000);
  }, [referralCode]);

  const handleResetPassword = useCallback(async () => {
    if (!user?.email) return;
    try {
      await forgotPassword({
        email: user.email,
        loginAs: user.currentRole || user.role,
        organizationId: user.organization?.id,
      }).unwrap();
      Alert.alert("Success", "Reset link sent to your registered email address.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to send reset email.");
    }
  }, [user, forgotPassword]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex-row items-center gap-3">
        <Pressable 
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
          <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 dark:text-white flex-1">
          Security Settings
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {!isSuperAdmin && !!referralCode && (
          <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/20">
                <Link2 size={18} className="text-blue-600 dark:text-blue-400" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-slate-900 dark:text-white">Referral Link</Text>
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invite members to your workspace</Text>
              </View>
            </View>
            <View className="flex-col gap-4">
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Referral Code</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 pl-4">
                  <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-slate-100" numberOfLines={1}>
                    {referralCode}
                  </Text>
                  <Pressable 
                    onPress={copyCodeToClipboard}
                    className="flex-row items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl"
                  >
                    {copiedReferralCode ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Copied</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Copy Code</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Link</Text>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 pl-4">
                  <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300" numberOfLines={1} ellipsizeMode="tail">
                    {referralLink}
                  </Text>
                  <Pressable 
                    onPress={copyToClipboard}
                    className="flex-row items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl"
                  >
                    {copiedReferral ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Copied</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500 dark:text-slate-400" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Copy Link</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <Text className="text-base font-black text-slate-900 dark:text-white mb-2">
            Security
          </Text>
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-5">
            Manage your account security and password.
          </Text>
          
          <Pressable
            onPress={handleResetPassword}
            disabled={isResetting}
            className={`flex-row items-center justify-center py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 ${isResetting ? 'opacity-70' : ''}`}>
            {isResetting ? (
              <ActivityIndicator color="#3b82f6" size="small" />
            ) : (
              <Text className="font-bold text-slate-900 dark:text-white text-[15px]">Request Password Reset</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
