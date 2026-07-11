import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Receipt, Users as UsersIcon, ShieldAlert, Mail, Phone, MapPin, User, Briefcase, Building2 } from "lucide-react-native";
import { useGetSuperAdminOrganizationByIdQuery, useGetSuperAdminOrganizationUsersQuery, useGetSuperAdminOrganizationTeamsQuery } from "@/services/api/superAdminApi";

export default function OrganizationDetailsPage() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, error } = useGetSuperAdminOrganizationByIdQuery(id);
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: usersData, isLoading: isLoadingUsers } = useGetSuperAdminOrganizationUsersQuery(id, { skip: activeTab !== "Users" });
  const { data: teamsData, isLoading: isLoadingTeams } = useGetSuperAdminOrganizationTeamsQuery(id, { skip: activeTab !== "Teams" });

  const org = data?.item;

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0F172A] items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error || !org) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#0F172A] items-center justify-center p-6">
        <Text className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center">
          {error?.message || error?.data?.message || "Organization not found"}
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-blue-600 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderBadge = (text, type = "default") => {
    let colors = "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50";
    if (type === "success") colors = "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30";
    if (type === "danger") colors = "bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/30";
    if (type === "info") colors = "bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30";

    return (
      <View className={`px-2.5 py-1 rounded border ${colors}`}>
        <Text className={`text-[10px] font-black uppercase tracking-widest ${colors.split(' ')[2]} ${colors.split(' ')[3]}`}>
          {text}
        </Text>
      </View>
    );
  };

  const renderStatCard = (label, value) => (
    <View className="flex-1 border border-slate-200 dark:border-[#1E293B] rounded-xl p-3 bg-slate-50/50 dark:bg-[#1E293B]/20">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{label}</Text>
      <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</Text>
    </View>
  );

  const renderOverviewField = (label, value) => (
    <View className="w-[48%] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 bg-transparent mb-3">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{label}</Text>
      <Text className="text-sm font-bold text-slate-900 dark:text-slate-100" numberOfLines={2}>{value}</Text>
    </View>
  );

  const tabs = ["Overview", "Profile", "Billing", "Users", "Teams"];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0F172A]">
        <Pressable onPress={() => router.back()} className="flex-row items-center self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 mb-4">
          <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300 mr-1" />
          <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Back</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        {/* ORGANIZATION DETAIL HERO CARD */}
        <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 mb-6">
          <View className="flex-col md:flex-row md:justify-between gap-6">
            
            {/* Left Side: Title and Badges */}
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Organization Detail</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white mb-4" numberOfLines={2}>{org.name}</Text>
              
              <View className="flex-row flex-wrap gap-2">
                {renderBadge(`ORG - ${org.code || '---'}`)}
                {renderBadge(org.active ? "ACTIVE" : "INACTIVE", org.active ? "success" : "default")}
                {renderBadge(org.subscriptionStatus || "TRIAL", org.subscriptionStatus === "ACTIVE" ? "success" : "info")}
                {renderBadge(org.blocked ? "BLOCKED" : "UNBLOCKED", org.blocked ? "danger" : "success")}
              </View>
            </View>

            {/* Right Side: Stats Grid */}
            <View className="w-full md:w-64 gap-2">
              <View className="flex-row gap-2">
                {renderStatCard("Plan", org.plan?.name || "Free Trial")}
                {renderStatCard("Revenue", `₹${org.paymentSummary?.totalRevenue || 0}`)}
              </View>
              <View className="flex-row gap-2">
                {renderStatCard("Users", org.counts?.users || 0)}
                {renderStatCard("Teams", org.counts?.teams || 0)}
              </View>
            </View>
          </View>
        </View>

        {/* TAB NAVIGATION */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
          <View className="flex-row rounded-full bg-slate-100 dark:bg-[#1E293B] p-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-full ${isActive ? 'bg-blue-500 dark:bg-[#3B82F6]' : 'bg-transparent'}`}
                >
                  <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* TAB CONTENT */}
        {activeTab === "Overview" && (
          <View className="flex-col md:flex-row gap-4">
            {/* AT A GLANCE */}
            <View className="flex-1 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">At a Glance</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Important account, subscription, usage, and admin details in one place.</Text>
              
              <View className="flex-row flex-wrap justify-between">
                {renderOverviewField("Email", org.email || org.admin?.email || "-")}
                {renderOverviewField("Phone", org.phone ? `${org.phoneCountryCode} ${org.phone}` : (org.admin?.mobile ? `${org.admin.mobileCountryCode} ${org.admin.mobile}` : "-"))}
                {renderOverviewField("Subscription Expiry", org.subscriptionExpiry ? new Date(org.subscriptionExpiry).toLocaleDateString() : "Never")}
                {renderOverviewField("Location", [org.city, org.state, org.country].filter(Boolean).join(", ") || "-")}
                {renderOverviewField("Successful Payments", org.paymentSummary?.successfulPayments || "0")}
                {renderOverviewField("Last Payment", org.paymentSummary?.lastPaymentAt ? new Date(org.paymentSummary.lastPaymentAt).toLocaleString() : "-")}
                {renderOverviewField("Referred By", org.referredByPartner?.name || "-")}
              </View>
            </View>

            {/* ACCESS & RISK */}
            <View className="w-full md:w-80 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 mt-4 md:mt-0">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Access & Risk</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Use these controls only when the organization should be restricted or restored.</Text>
              
              <View className="border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 mb-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Access</Text>
                {renderBadge(org.active ? "ACTIVE" : "INACTIVE", org.active ? "success" : "default")}
              </View>
              
              <View className="border border-slate-200 dark:border-[#1E293B] rounded-xl p-4">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Block State</Text>
                {renderBadge(org.blocked ? "BLOCKED" : "UNBLOCKED", org.blocked ? "danger" : "success")}
              </View>
            </View>
          </View>
        )}

        {activeTab === "Billing" && (
          <View className="space-y-4">
            {org.activeSubscription ? (
              <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 mb-4">
                <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4">Active Subscription</Text>
                <View className="space-y-3">
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-500">Plan</Text><Text className="text-sm font-bold text-slate-900 dark:text-white">{org.activeSubscription.planName}</Text></View>
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-500">Amount</Text><Text className="text-sm font-bold text-slate-900 dark:text-white">{org.activeSubscription.currency} {org.activeSubscription.amount}</Text></View>
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-500">Valid Until</Text><Text className="text-sm font-bold text-slate-900 dark:text-white">{org.activeSubscription.endDate ? new Date(org.activeSubscription.endDate).toLocaleDateString() : "Never"}</Text></View>
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-500">Gateway</Text><Text className="text-sm font-bold text-slate-900 dark:text-white">{org.activeSubscription.paymentGateway || "N/A"}</Text></View>
                </View>
              </View>
            ) : null}
            
            <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4">Recent Payments</Text>
              {(org.recentPayments && org.recentPayments.length > 0) ? (
                org.recentPayments.map((payment, index) => (
                  <View key={payment.id || index} className="border-b border-slate-100 dark:border-[#1E293B] py-3 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center">
                        <Receipt size={18} className="text-emerald-500" />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{payment.planName}</Text>
                        <Text className="text-xs text-slate-500">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : ""}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-black text-slate-900 dark:text-white">₹{payment.amount}</Text>
                      <Text className="text-[10px] font-black uppercase text-emerald-600">{payment.status}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-sm text-slate-500">No payments found.</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === "Profile" && (
          <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-6">Organization Profile</Text>
            <View className="space-y-4">
              <View>
                <Text className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Organization Name</Text>
                <View className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B]">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{org.name}</Text>
                </View>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Code</Text>
                <View className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B]">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{org.code}</Text>
                </View>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Email Address</Text>
                <View className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] flex-row items-center gap-3">
                  <Mail size={16} className="text-slate-400" />
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{org.email || org.admin?.email || "N/A"}</Text>
                </View>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Phone Number</Text>
                <View className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] flex-row items-center gap-3">
                  <Phone size={16} className="text-slate-400" />
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{org.phone ? `${org.phoneCountryCode} ${org.phone}` : (org.admin?.mobile ? `${org.admin.mobileCountryCode} ${org.admin.mobile}` : "N/A")}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === "Users" && (
          <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4">Organization Users</Text>
            {isLoadingUsers ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : usersData?.items?.length > 0 ? (
              <View className="space-y-3">
                {usersData.items.map((user, idx) => (
                  <View key={user.id || idx} className="border border-slate-100 dark:border-[#1E293B] rounded-xl p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                        <UsersIcon size={18} className="text-blue-500" />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</Text>
                        <Text className="text-xs text-slate-500">{user.email}</Text>
                      </View>
                    </View>
                    {renderBadge(user.role, "default")}
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-slate-500">No users found in this organization.</Text>
            )}
          </View>
        )}

        {activeTab === "Teams" && (
          <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4">Organization Teams</Text>
            {isLoadingTeams ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : teamsData?.items?.length > 0 ? (
              <View className="space-y-3">
                {teamsData.items.map((team, idx) => (
                  <View key={team.id || idx} className="border border-slate-100 dark:border-[#1E293B] rounded-xl p-4 flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</Text>
                    <Text className="text-xs font-semibold text-slate-500">{team.membersCount || 0} Members</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-slate-500">No teams found in this organization.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
