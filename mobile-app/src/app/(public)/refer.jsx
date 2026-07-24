import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';
import { ShieldCheck, ArrowRight, Users, Copy, CheckCircle2, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGetPublicPartnerStatsMutation } from '@/services/api/partnerReferralApi';

export default function PartnerReferralDashboard() {
  const [email, setEmail] = useState("");
  const [partnerReferralCode, setPartnerReferralCode] = useState("");
  const [partnerStats, setPartnerStats] = useState(null);
  const [copied, setCopied] = useState(false);

  const [getStats, { isLoading, error, isError }] = useGetPublicPartnerStatsMutation();

  const handleLogin = async () => {
    if (!email || !partnerReferralCode) return;
    try {
      const response = await getStats({ email, partnerReferralCode }).unwrap();
      setPartnerStats(response.data);
    } catch (err) {
      // Error handled by RTK Query / UI
    }
  };

  const handleLogout = () => {
    setPartnerStats(null);
    setEmail("");
    setPartnerReferralCode("");
  };

  const shareLink = partnerStats ? `https://attendee.veagle.in/register/organisation?partnerRef=${partnerStats.partnerReferralCode}` : "";

  const handleCopy = async () => {
    if (!shareLink) return;
    await Clipboard.setStringAsync(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (partnerStats) {
    const organizations = partnerStats.referredOrganizations || [];

    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-black text-slate-900 dark:text-white">Partner Portal</Text>
            <Pressable onPress={handleLogout} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-full">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Sign Out</Text>
            </Pressable>
          </View>

          {/* Welcome Card */}
          <View className="bg-blue-600 rounded-[32px] p-8 mb-6 shadow-[0_8px_30px_rgb(59,130,246,0.3)]">
            <Text className="text-3xl font-black text-white mb-2">Welcome back,</Text>
            <Text className="text-3xl font-black text-white mb-4">{partnerStats.name}!</Text>
            <Text className="text-blue-100 font-medium leading-relaxed">
              Track your referrals, manage your unique sharing links, and see your impact.
            </Text>
          </View>

          {/* Stats Card */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-white dark:bg-slate-900 rounded-[24px] p-6 items-center justify-center border border-slate-200 dark:border-slate-800">
              <View className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center mb-4">
                <Users size={32} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Text className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                {partnerStats._count?.referredOrganizations || 0}
              </Text>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Orgs Referred</Text>
            </View>
          </View>

          {/* Share Link */}
          <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              <Share2 size={20} className="text-blue-600 dark:text-blue-400" />
              <Text className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Your Link</Text>
            </View>
            <View className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-4">
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400" numberOfLines={1} ellipsizeMode="middle">
                {shareLink}
              </Text>
            </View>
            <Pressable onPress={handleCopy} className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${copied ? 'bg-emerald-600' : 'bg-slate-900 dark:bg-blue-600'}`}>
              {copied ? <CheckCircle2 size={18} color="#fff" /> : <Copy size={18} color="#fff" />}
              <Text className="text-white font-black">{copied ? 'Copied!' : 'Copy Link'}</Text>
            </Pressable>
          </View>

          {/* Organizations List */}
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-4 ml-2">Referred Orgs ({organizations.length})</Text>
          {organizations.length === 0 ? (
            <View className="bg-white dark:bg-slate-900 rounded-[24px] p-8 border border-slate-200 dark:border-slate-800 items-center">
              <Text className="text-sm font-bold text-slate-500 text-center mb-2">No organizations referred yet</Text>
              <Text className="text-xs text-slate-400 text-center">Share your link to invite organizations.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {organizations.map((org) => (
                <View key={org.id} className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200 dark:border-slate-800">
                  <Text className="text-lg font-black text-slate-900 dark:text-white mb-1">{org.name}</Text>
                  <Text className="text-sm font-medium text-slate-500 mb-3">{org.orgAdmin?.name || "-"} ({org.orgAdmin?.email})</Text>
                  <View className="flex-row items-center justify-between">
                    <View className="bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg">
                      <Text className="text-xs font-bold text-blue-700 dark:text-blue-400">{org.plan?.name || "No Plan"}</Text>
                    </View>
                    <Text className="text-xs font-semibold text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        
        <View className="w-full bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-slate-200 dark:border-slate-800">
          <View className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-blue-600 dark:text-blue-400" />
          </View>
          
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">Partner Portal</Text>
          <Text className="text-sm font-medium text-slate-500 text-center mb-8">Enter your credentials to view your referrals</Text>

          <View className="space-y-5 gap-5">
            <View>
              <Text className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Email Address</Text>
              <TextInput
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="partner@example.com"
                value={email}
                onChangeText={setEmail}
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500"
              />
            </View>
            
            <View>
              <Text className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Referral Code</Text>
              <TextInput
                autoCapitalize="characters"
                placeholder="PARTNER-1234"
                value={partnerReferralCode}
                onChangeText={(text) => setPartnerReferralCode(text.toUpperCase())}
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 text-sm font-bold text-slate-900 dark:text-white font-mono focus:border-blue-500 uppercase"
              />
            </View>

            {isError && (
              <View className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <Text className="text-xs font-bold text-rose-600">{error?.data?.message || "Invalid email or referral code."}</Text>
              </View>
            )}

            <Pressable
              disabled={isLoading || !email || !partnerReferralCode}
              onPress={handleLogin}
              className="mt-2 flex-row w-full items-center justify-center gap-2 rounded-[20px] bg-blue-600 py-4 shadow-sm active:scale-95 disabled:opacity-50">
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="font-black text-white text-base">Access Dashboard</Text>
                  <ArrowRight size={18} color="white" />
                </>
              )}
            </Pressable>
          </View>
        </View>

        <Link href="/login" asChild>
          <Pressable className="mt-8 mx-auto">
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Back to Login</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
