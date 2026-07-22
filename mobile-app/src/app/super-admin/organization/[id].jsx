import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Receipt, Users as UsersIcon, ShieldAlert, Mail, Phone, MapPin, User, Briefcase, Building2, Ban, Power, Pencil, Save, X, CalendarClock, Download, Layers } from "lucide-react-native";
import { 
  useGetSuperAdminOrganizationByIdQuery, 
  useGetSuperAdminOrganizationUsersQuery, 
  useGetSuperAdminOrganizationTeamsQuery, 
  useExportSuperAdminOrganizationUsersExcelMutation,
  useUpdateOrganizationAccessMutation,
  usePatchSuperAdminOrganizationMutation
} from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

export default function OrganizationDetailsPage() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, error } = useGetSuperAdminOrganizationByIdQuery(id, { skip: !id || isNaN(Number(id)) });
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: usersData, isLoading: isLoadingUsers } = useGetSuperAdminOrganizationUsersQuery(id, { skip: !id || activeTab !== "Users" });
  const { data: teamsData, isLoading: isLoadingTeams } = useGetSuperAdminOrganizationTeamsQuery(id, { skip: !id || activeTab !== "Teams" });
  const [exportOrgUsersExcel, { isLoading: isExporting }] = useExportSuperAdminOrganizationUsersExcelMutation();
  const [updateAccess, { isLoading: isUpdatingAccess }] = useUpdateOrganizationAccessMutation();
  const [patchOrg, { isLoading: isPatchingOrg }] = usePatchSuperAdminOrganizationMutation();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const handleExportUsers = async () => {
    try {
      const blob = await exportOrgUsersExcel(id).unwrap();
      const safeOrgName = (data?.item?.name || "Organization").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await downloadAndShareBlob(blob, `users_${safeOrgName}.xlsx`);
    } catch (err) {
      console.error("Failed to export users:", err);
      alert("Failed to export users to Excel.");
    }
  };

  const handleAccessUpdate = async (payload) => {
    try {
      await updateAccess({ organizationId: id, ...payload }).unwrap();
      alert("Organization access updated successfully.");
    } catch (err) {
      alert("Failed to update access.");
    }
  };

  const handleEditProfile = () => {
    const orgData = data?.item || {};
    setForm({
      name: orgData.name || "",
      email: orgData.email || "",
      phone: orgData.phone || "",
      address: orgData.address || "",
      city: orgData.city || "",
      state: orgData.state || "",
      country: orgData.country || "India",
      attendanceRadius: String(orgData.attendanceRadius || 25),
      latitude: String(orgData.latitude || ""),
      longitude: String(orgData.longitude || ""),
      hasERP: orgData.hasERP || false,
    });
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    try {
      await patchOrg({
        organizationId: id,
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        attendanceRadius: Number(form.attendanceRadius),
      }).unwrap();
      alert("Profile updated successfully.");
      setEditMode(false);
    } catch (err) {
      alert("Failed to update profile.");
    }
  };


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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="mt-4 px-6 py-3 bg-blue-600 rounded-xl">
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

  const tabs = ["Overview", "Profile", "Users", "Teams"];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0F172A]">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0F172A]">
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')} className="flex-row items-center self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 mb-4">
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
                {renderBadge(org.blocked ? "BLOCKED" : "UNBLOCKED", org.blocked ? "danger" : "success")}
              </View>
            </View>

            {/* Right Side: Stats Grid */}
            <View className="w-full md:w-64 gap-2">

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
            <View className="flex-1 space-y-4">
              <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
                <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">At a Glance</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Important account, subscription, usage, and admin details in one place.</Text>
                
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {renderOverviewField("Email", org.email || org.admin?.email || "-")}
                  {renderOverviewField("Phone", org.phone ? `${org.phoneCountryCode || ''} ${org.phone}` : (org.admin?.mobile ? `${org.admin.mobileCountryCode || ''} ${org.admin.mobile}` : "-"))}
                  {renderOverviewField("Location", [org.city, org.state, org.country].filter(Boolean).join(", ") || "-")}

                  {renderOverviewField("Referred By", org.referredByPartner?.name || "-")}
                </View>
              </View>

              <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
                <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-6">Admin & Limits</Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {renderOverviewField("Admin Name", org.admin?.name || "-")}
                  {renderOverviewField("Admin Email", org.admin?.email || "-")}
                  {renderOverviewField("Partner Code", org.referredByPartner?.partnerReferralCode || "-")}
                  {renderOverviewField("Partner Email", org.referredByPartner?.email || "-")}
                  {renderOverviewField("Member Limit", org.plan?.memberLimit || "-")}
                  {renderOverviewField("Max Teams", org.plan?.maxTeams || "-")}
                </View>              </View>
            </View>

            {/* ACCESS & RISK */}
            <View className="w-full md:w-80 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6 mt-4 md:mt-0">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Access & Risk</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Use these controls only when the organization should be restricted or restored.</Text>
              
              <View className="border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 mb-3 flex-row justify-between items-center">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Access</Text>
                {renderBadge(org.active ? "ACTIVE" : "INACTIVE", org.active ? "success" : "default")}
              </View>
              
              <View className="border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 mb-6 flex-row justify-between items-center">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Block State</Text>
                {renderBadge(org.blocked ? "BLOCKED" : "UNBLOCKED", org.blocked ? "danger" : "success")}
              </View>

              <Pressable
                onPress={() => handleAccessUpdate({ isBlocked: !org.blocked })}
                disabled={isUpdatingAccess}
                className={`flex-row items-center justify-center p-3 rounded-xl mb-3 ${org.blocked ? 'bg-slate-100 dark:bg-slate-800' : 'bg-rose-500'}`}
              >
                {isUpdatingAccess ? <ActivityIndicator size="small" color={org.blocked ? "#334155" : "white"} className="mr-2" /> : <Ban size={16} className={org.blocked ? 'text-slate-700 dark:text-slate-300 mr-2' : 'text-white mr-2'} />}
                <Text className={`font-bold ${org.blocked ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`}>
                  {org.blocked ? "Unblock Organization" : "Block Organization"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleAccessUpdate({ isActive: !org.active })}
                disabled={isUpdatingAccess}
                className="flex-row items-center justify-center p-3 rounded-xl bg-slate-100 dark:bg-[#1E293B]"
              >
                {isUpdatingAccess ? <ActivityIndicator size="small" color="#64748B" className="mr-2" /> : <Power size={16} className="text-slate-700 dark:text-slate-300 mr-2" />}
                <Text className="font-bold text-slate-700 dark:text-slate-300">
                  {org.active ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}


        {activeTab === "Profile" && (
          <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Organization Profile</Text>
              {!editMode ? (
                <Pressable onPress={handleEditProfile} className="flex-row items-center bg-blue-500 px-4 py-2 rounded-xl">
                  <Pencil size={14} color="white" className="mr-2" />
                  <Text className="text-white text-xs font-bold">Edit</Text>
                </Pressable>
              ) : (
                <View className="flex-row gap-2">
                  <Pressable onPress={() => setEditMode(false)} className="flex-row items-center bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-xl">
                    <X size={14} className="text-slate-700 dark:text-white mr-1" />
                    <Text className="text-slate-700 dark:text-white text-xs font-bold">Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSaveProfile} disabled={isPatchingOrg} className="flex-row items-center bg-blue-500 px-4 py-2 rounded-xl">
                    {isPatchingOrg ? <ActivityIndicator size="small" color="white" className="mr-1" /> : <Save size={14} color="white" className="mr-1" />}
                    <Text className="text-white text-xs font-bold">Save</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {editMode ? (
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-1">Name</Text>
                  <TextInput value={form.name} onChangeText={(t) => setForm({...form, name: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-1">Email</Text>
                  <TextInput value={form.email} onChangeText={(t) => setForm({...form, email: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-1">Phone</Text>
                  <TextInput value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" keyboardType="phone-pad" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-1">Address</Text>
                  <TextInput value={form.address} onChangeText={(t) => setForm({...form, address: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" multiline />
                </View>
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1">City</Text>
                    <TextInput value={form.city} onChangeText={(t) => setForm({...form, city: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1">State</Text>
                    <TextInput value={form.state} onChangeText={(t) => setForm({...form, state: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" />
                  </View>
                </View>
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1">Latitude</Text>
                    <TextInput value={form.latitude} onChangeText={(t) => setForm({...form, latitude: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" keyboardType="numeric" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-500 mb-1">Longitude</Text>
                    <TextInput value={form.longitude} onChangeText={(t) => setForm({...form, longitude: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" keyboardType="numeric" />
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-1">Attendance Radius (m)</Text>
                  <TextInput value={form.attendanceRadius} onChangeText={(t) => setForm({...form, attendanceRadius: t})} className="bg-slate-50 dark:bg-[#1E293B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white" keyboardType="numeric" />
                </View>
                
                <View className="flex-row items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#1E293B]/50 mt-2">
                  <View>
                    <Text className="text-xs font-bold text-slate-900 dark:text-white">ERP Module Access</Text>
                    <Text className="text-[10px] text-slate-500">Enable Funds & Expenses / Instruments</Text>
                  </View>
                  <Pressable 
                    onPress={() => setForm(prev => ({ ...prev, hasERP: !prev.hasERP }))}
                    className={`w-12 h-6 rounded-full flex-row items-center px-1 transition-colors ${form.hasERP ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <View className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.hasERP ? 'translate-x-6' : 'translate-x-0'}`} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-y-4 justify-between">
                {renderOverviewField("Name", org.name || "-")}
                {renderOverviewField("Code", org.code || "-")}
                {renderOverviewField("Email", org.email || "-")}
                {renderOverviewField("Phone", org.phone ? `${org.phoneCountryCode || ''} ${org.phone}` : "-")}
                {renderOverviewField("Address", org.address || "-")}
                {renderOverviewField("City", org.city || "-")}
                {renderOverviewField("State", org.state || "-")}
                {renderOverviewField("Country", org.country || "-")}
                {renderOverviewField("Attendance Radius", `${org.attendanceRadius || 25} m`)}
                {renderOverviewField("Coordinates", org.latitude || org.longitude ? `${org.latitude || "-"}, ${org.longitude || "-"}` : "-")}
                {renderOverviewField("ERP Module", org.hasERP ? "Enabled" : "Disabled")}
                {org.agreementPdfUrl && (
                  <View className="w-[48%] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 bg-transparent mb-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Agreement PDF</Text>
                    <Pressable onPress={() => {}} className="flex-row items-center">
                      <Download size={14} className="text-blue-500 mr-2" />
                      <Text className="text-sm font-bold text-blue-500">View Agreement</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === "Users" && (
          <View className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Organization Users</Text>
              {usersData?.items?.length > 0 && (
                <Pressable
                  onPress={handleExportUsers}
                  disabled={isExporting}
                  className={`flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 ${isExporting ? 'opacity-50' : ''}`}
                >
                  {isExporting ? <ActivityIndicator size="small" color="#64748b" className="mr-2" /> : null}
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Export Excel</Text>
                </Pressable>
              )}
            </View>            {isLoadingUsers ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : usersData?.items?.length > 0 ? (
              <View className="space-y-3">
                {usersData.items.map((user, idx) => (
                  <Pressable 
                    key={user.id || idx} 
                    onPress={() => router.push(`/super-admin/users/${user.id}`)}
                    className="border border-slate-100 dark:border-[#1E293B] rounded-xl p-4 flex-row items-center justify-between active:bg-slate-50 dark:active:bg-[#1E293B]/50"
                  >
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
                  </Pressable>
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
