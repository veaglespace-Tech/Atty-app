import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, TextInput, Modal, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Building2, Search, ChevronDown, Check, RefreshCcw, Download, Plus, ChevronRight, X } from "lucide-react-native";
import MobileDashboardShell from "@/components/dashboard/MobileDashboardShell";
import { 
  useGetSuperAdminOrganizationsQuery, 
  useDownloadSuperAdminOrganizationsExcelMutation,
  useCreateSuperAdminOrganizationMutation,
  useGetSuperAdminPlansQuery
} from "@/services/api/superAdminApi";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

const SUBSCRIPTION_OPTIONS = ["ALL", "TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID"];
const ACCESS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE"];
const BLOCK_OPTIONS = ["ALL", "BLOCKED", "UNBLOCKED"];

export default function OrganizationsPage() {
  const [searchInputValue, setSearchInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("ALL");
  const [access, setAccess] = useState("ALL");
  const [block, setBlock] = useState("ALL");
  
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRowsModalOpen, setIsRowsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState(null); // 'subscription', 'access', 'block' or null

  const [downloadOrganizationsExcel, { isLoading: downloadingExcel }] = useDownloadSuperAdminOrganizationsExcelMutation();
  const { data: plansData } = useGetSuperAdminPlansQuery();
  const plans = useMemo(() => plansData?.items || [], [plansData]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "2000");
      if (search.trim()) params.set("search", search.trim());
      if (subscriptionStatus !== "ALL") params.set("subscriptionStatus", subscriptionStatus);
      if (access !== "ALL") params.set("access", access);
      if (block !== "ALL") params.set("block", block);

      const blob = await downloadOrganizationsExcel(params.toString()).unwrap();
      await downloadAndShareBlob(blob, "super-admin-organizations-records.xlsx");
    } catch (err) {
      Alert.alert("Download Failed", "There was an error downloading the records.");
    }
  };

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInputValue);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInputValue]);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminOrganizationsQuery({
    search,
    subscriptionStatus: subscriptionStatus === "ALL" ? undefined : subscriptionStatus,
    access: access === "ALL" ? undefined : access,
    block: block === "ALL" ? undefined : block,
    limit: 2000,
  });

  const organizations = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(() => {
    const map = new Map();
    (data?.summary || []).forEach(item => {
      if (item?.label) map.set(item.label, item.value);
    });
    return map;
  }, [data]);

  const loading = isLoading || isFetching;
  
  const totalPages = Math.ceil(organizations.length / rowsPerPage) || 1;
  const currentItems = organizations.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const getTone = (value) => {
    switch (String(value || "").toUpperCase()) {
      case "ACTIVE":
      case "UNBLOCKED":
        return "bg-emerald-50 border-emerald-200 text-emerald-600 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "BLOCKED":
      case "EXPIRED":
      case "INACTIVE":
        return "bg-rose-50 border-rose-200 text-rose-600 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-400";
      case "PAYMENT_PENDING":
      case "TRIAL":
        return "bg-amber-50 border-amber-200 text-amber-600 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-slate-100 border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const renderFilterOptions = () => {
    let options = [];
    let currentValue = "";
    let setValue = null;
    let title = "";

    if (activeFilter === "subscription") {
      options = SUBSCRIPTION_OPTIONS;
      currentValue = subscriptionStatus;
      setValue = setSubscriptionStatus;
      title = "Filter by Subscription";
    } else if (activeFilter === "access") {
      options = ACCESS_OPTIONS;
      currentValue = access;
      setValue = setAccess;
      title = "Filter by Access";
    } else if (activeFilter === "block") {
      options = BLOCK_OPTIONS;
      currentValue = block;
      setValue = setBlock;
      title = "Filter by Block State";
    }

    return (
      <Modal visible={!!activeFilter} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setActiveFilter(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-slate-900/80 rounded-t-3xl p-6 pb-12 shadow-sm">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">{title}</Text>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setValue(opt);
                  setActiveFilter(null);
                  setPage(1);
                }}
                className={`py-4 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between`}
              >
                <Text className={`text-base font-bold ${currentValue === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt === "ALL" ? "All Options" : opt.replace("_", " ")}
                </Text>
                {currentValue === opt && <Check size={20} className="text-blue-600 dark:text-blue-400" />}
              </Pressable>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <MobileDashboardShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2563eb" />}
      >
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20">
              <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400">Workspace Directory</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Organizations</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">This page stays focused on list data only. Open any organization to view full details, edit fields, and manage block or unblock actions from the detail screen.</Text>
          </View>
          
          <View className="items-end gap-3">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={refetch} disabled={loading} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <RefreshCcw size={14} className="text-slate-600 dark:text-slate-300" />}
              </Pressable>
              <Pressable 
                onPress={handleDownload} 
                disabled={downloadingExcel}
                className={`h-9 px-3 flex-row items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${downloadingExcel ? 'opacity-50' : ''}`}
              >
                {downloadingExcel ? <ActivityIndicator size="small" color="#64748b" className="mr-1" /> : <Download size={14} className="text-slate-600 dark:text-slate-300 mr-1" />}
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Download</Text>
              </Pressable>
            </View>
            <Pressable 
              onPress={() => setIsCreateModalOpen(true)}
              className="h-9 px-4 flex-row items-center justify-center rounded-xl bg-blue-600 active:bg-blue-700 shadow-sm shadow-blue-500/30"
            >
              <Plus size={16} className="text-white mr-1" />
              <Text className="text-xs font-bold text-white">Create</Text>
            </Pressable>
            <View className="items-end mt-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live View</Text>
              <Text className="text-[10px] font-semibold text-slate-500">{organizations.length} organizations visible.</Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3 mb-8">
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Organizations</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Organizations") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Active</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Active") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Blocked</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Blocked") || 0}</Text>
          </View>
          <View className="w-[48%] bg-white dark:bg-slate-900/80 p-4 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Payments</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">{summary.get("Successful Payments") || 0}</Text>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900/80 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
          <View className="p-5 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">Organization List</Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">Minimal list view here. Full profile, subscription, usage, and control actions move to the detail page.</Text>
            
            <View className="flex-row flex-wrap gap-3">
              <View className="w-full">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Search</Text>
                <View className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
                  <Search size={16} className="text-slate-400 ml-1" />
                  <TextInput
                    value={searchInputValue}
                    onChangeText={setSearchInputValue}
                    placeholder="Name, code, email"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 h-8"
                    returnKeyType="search"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Subscription</Text>
                <Pressable 
                  onPress={() => setActiveFilter("subscription")}
                  className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
                >
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300" numberOfLines={1}>{subscriptionStatus}</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Access</Text>
                <Pressable 
                  onPress={() => setActiveFilter("access")}
                  className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
                >
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300" numberOfLines={1}>{access}</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Block</Text>
                <Pressable 
                  onPress={() => setActiveFilter("block")}
                  className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
                >
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300" numberOfLines={1}>{block}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="p-4">
              <View className="flex-row items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-2 min-w-[800px]">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-48">Organization</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Org Code</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-40">Plan</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-center">Subscription</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-center">Access</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 text-right">Details</Text>
              </View>

              {currentItems.map((org) => (
                <View key={org.id} className="flex-row items-center py-4 border-b border-slate-100 dark:border-slate-800/50 min-w-[800px]">
                  <Text className="text-xs font-bold text-slate-900 dark:text-white w-48 pr-2" numberOfLines={1}>{org.name}</Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32">{org.code}</Text>
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-40" numberOfLines={1}>{org.planName || "TRIAL"}</Text>
                  
                  <View className="w-32 items-center">
                    <View className={`px-2 py-1 rounded-full border ${getTone(org.subscriptionStatus)}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${getTone(org.subscriptionStatus)} bg-transparent border-transparent`}>{org.subscriptionStatus || 'TRIAL'}</Text>
                    </View>
                  </View>
                  
                  <View className="w-32 items-center">
                    <View className={`px-2 py-1 rounded-full border ${getTone(org.blocked ? "BLOCKED" : org.active ? "ACTIVE" : "INACTIVE")}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-widest ${getTone(org.blocked ? "BLOCKED" : org.active ? "ACTIVE" : "INACTIVE")} bg-transparent border-transparent`}>{org.blocked ? "BLOCKED" : org.active ? "ACTIVE" : "INACTIVE"}</Text>
                    </View>
                  </View>

                  <View className="w-32 items-end">
                    <Pressable
                      className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full active:bg-slate-200 dark:active:bg-slate-700"
                      onPress={() => router.push(`/super-admin/organization/${org.id}`)}
                    >
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Open Detail</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              
              {!isLoading && currentItems.length === 0 && (
                <View className="py-8 items-center">
                  <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">No organizations found.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          {organizations.length > 0 && (
            <View className="p-5 border-t border-slate-200 dark:border-slate-800 flex-col md:flex-row md:items-center justify-between gap-4">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Page View</Text>
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Showing {organizations.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, organizations.length)} of {organizations.length} entries
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-medium text-slate-500">Rows</Text>
                  <Pressable 
                    onPress={() => setIsRowsModalOpen(true)}
                    className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"
                  >
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{rowsPerPage}</Text>
                  </Pressable>
                </View>

                <View className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                <View className="flex-row items-center gap-2">
                  <Pressable 
                    onPress={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === 1 ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                  >
                    <ChevronLeft size={14} className={page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                    <Text className={`text-xs font-bold ${page === 1 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Prev</Text>
                  </Pressable>

                  <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2">
                    {page} / {totalPages}
                  </Text>

                  <Pressable 
                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${page === totalPages ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 opacity-50' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700'}`}
                  >
                    <Text className={`text-xs font-bold ${page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Next</Text>
                    <ChevronRight size={14} className={page === totalPages ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      
      {renderFilterOptions()}
      
      {/* Rows Per Page Modal */}
      <Modal visible={isRowsModalOpen} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/50 justify-center p-6" 
          onPress={() => setIsRowsModalOpen(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
            <View className="p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-base font-black text-slate-900 dark:text-white">Rows Per Page</Text>
            </View>
            <View className="p-2">
              {[10, 25, 50].map((rows) => (
                <TouchableOpacity
                  key={rows}
                  className={`p-4 rounded-xl mb-1 flex-row items-center justify-between ${rowsPerPage === rows ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  onPress={() => {
                    setRowsPerPage(rows);
                    setIsRowsModalOpen(false);
                    setPage(1);
                  }}
                >
                  <Text className={`text-sm font-semibold ${rowsPerPage === rows ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{rows} Rows</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CreateOrganizationModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        plans={plans}
        onCreated={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />
    </MobileDashboardShell>
  );
}

function CreateOrganizationModal({ isOpen, onClose, plans, onCreated }) {
  const [createOrganization, { isLoading: isCreating }] = useCreateSuperAdminOrganizationMutation();
  const [form, setForm] = useState({
    organization: { name: "", email: "", phone: "", phoneCountryCode: "+91", address: "", city: "", state: "", country: "India", latitude: "", longitude: "" },
    admin: { name: "", email: "", mobile: "", mobileCountryCode: "+91", password: "" },
    planCode: "",
  });

  const onChange = (section, field, value) => {
    setForm(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const onSubmit = async () => {
    if (!form.planCode) {
      Alert.alert("Error", "Please select a plan.");
      return;
    }
    if (!form.organization.name || !form.organization.email || !form.admin.name || !form.admin.email || !form.admin.password) {
      Alert.alert("Error", "Please fill out all required fields.");
      return;
    }
    try {
      await createOrganization(form).unwrap();
      Alert.alert("Success", "Organization created successfully.");
      onCreated();
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to create organization.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-slate-950">
        <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <View>
            <Text className="text-lg font-black text-slate-900 dark:text-white uppercase">Create Organization</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bypass payment and onboard a workspace.</Text>
          </View>
          <Pressable onPress={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
            <X size={20} className="text-slate-600 dark:text-slate-300" />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Organization Info</Text>
          <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 gap-3">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Name</Text>
              <TextInput
                value={form.organization.name}
                onChangeText={(v) => onChange("organization", "name", v)}
                placeholder="Acme Corp"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Email</Text>
              <TextInput
                value={form.organization.email}
                onChangeText={(v) => onChange("organization", "email", v)}
                placeholder="org@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">City</Text>
                <TextInput
                  value={form.organization.city}
                  onChangeText={(v) => onChange("organization", "city", v)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Country</Text>
                <TextInput
                  value={form.organization.country}
                  onChangeText={(v) => onChange("organization", "country", v)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>
          </View>

          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Admin Account</Text>
          <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 gap-3">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Admin Name</Text>
              <TextInput
                value={form.admin.name}
                onChangeText={(v) => onChange("admin", "name", v)}
                placeholder="John Doe"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Admin Email</Text>
              <TextInput
                value={form.admin.email}
                onChangeText={(v) => onChange("admin", "email", v)}
                placeholder="admin@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 ml-1">Initial Password</Text>
              <TextInput
                value={form.admin.password}
                onChangeText={(v) => onChange("admin", "password", v)}
                placeholder="••••••••"
                secureTextEntry
                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Subscription Plan</Text>
          <View className="flex-row flex-wrap gap-3 pb-20">
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() => setForm(prev => ({ ...prev, planCode: plan.code }))}
                className={`w-[48%] p-4 rounded-2xl border ${form.planCode === plan.code ? 'bg-blue-50 border-blue-500 dark:bg-blue-500/10 dark:border-blue-500' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
              >
                <Text className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{plan.name}</Text>
                <Text className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">₹{plan.price}</Text>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{plan.durationInDays} Days</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-row gap-3">
          <Pressable 
            onPress={onClose}
            className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 items-center"
          >
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Cancel</Text>
          </Pressable>
          <Pressable 
            onPress={onSubmit}
            disabled={isCreating}
            className={`flex-[2] p-4 rounded-xl bg-blue-600 items-center justify-center flex-row ${isCreating ? 'opacity-50' : ''}`}
          >
            {isCreating ? <ActivityIndicator size="small" color="#ffffff" className="mr-2" /> : <Plus size={18} className="text-white mr-2" />}
            <Text className="text-sm font-bold text-white">Create Organization</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
