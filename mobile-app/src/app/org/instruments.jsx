import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Share,
} from "react-native";
import {
  useGetOrgInstrumentsQuery,
  useCreateOrgInstrumentMutation,
  useDeleteOrgInstrumentMutation,
  useAssignOrgInstrumentMutation,
  useUnassignOrgInstrumentMutation,
  useUpdateOrgInstrumentAssignmentMutation,
  useGetOrgUsersQuery,
} from "@/services/api/orgApi";
import {
  Music,
  Plus,
  X,
  Trash2,
  Hash,
  User,
  Download,
  Search,
  Check,
  Edit3,
  Users,
  ChevronDown,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react-native";
import { downloadAndShareBlob } from "@/utils/downloadMobile";

export default function OrgInstrumentsPage() {
  const [activeTab, setActiveTab] = useState("instruments"); // 'instruments' | 'assign' | 'assigned_users'
  const [selectedInstrumentId, setSelectedInstrumentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({}); // { [userId]: assetId }

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null); // { userId, instrumentId, userName, instName, currentAssetId }
  const [editingAssetId, setEditingAssetId] = useState("");

  const [reportFilterId, setReportFilterId] = useState("all");

  // API Hooks
  const {
    data: instrumentsData,
    isLoading: instLoading,
    isFetching: instFetching,
    refetch: refetchInstruments,
  } = useGetOrgInstrumentsQuery();

  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useGetOrgUsersQuery(1000);

  const [createInstrument, { isLoading: isCreating }] = useCreateOrgInstrumentMutation();
  const [deleteInstrument, { isLoading: isDeleting }] = useDeleteOrgInstrumentMutation();
  const [assignInstrument, { isLoading: isAssigning }] = useAssignOrgInstrumentMutation();
  const [unassignInstrument, { isLoading: isUnassigning }] = useUnassignOrgInstrumentMutation();
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateOrgInstrumentAssignmentMutation();

  const instruments = useMemo(() => instrumentsData?.items || [], [instrumentsData]);
  const users = useMemo(() => usersData?.items || [], [usersData]);

  const isRefreshing = instFetching || usersFetching;

  const handleRefresh = () => {
    refetchInstruments();
    refetchUsers();
  };

  const filteredInstrumentsList = useMemo(() => {
    if (!listSearchQuery.trim()) return instruments;
    const q = listSearchQuery.toLowerCase();
    return instruments.filter(
      (i) =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
    );
  }, [listSearchQuery, instruments]);

  // Filtered users for Assign tab
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
    );
  }, [searchQuery, users]);

  // Users who currently have instruments assigned
  const usersWithInstruments = useMemo(() => {
    return users.filter((u) => u.instruments && u.instruments.length > 0);
  }, [users]);

  // Total assignment count
  const totalAssignedCount = useMemo(() => {
    return usersWithInstruments.reduce((acc, u) => acc + (u.instruments?.length || 0), 0);
  }, [usersWithInstruments]);

  // -------------------------------------------------------------
  // HANDLERS: Create Instrument
  // -------------------------------------------------------------
  const handleCreateSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Please enter an instrument name.");
      return;
    }
    try {
      await createInstrument({
        name: form.name.trim(),
        description: form.description.trim(),
      }).unwrap();
      setForm({ name: "", description: "" });
      setCreateModalOpen(false);
      Alert.alert("Success", "Instrument created successfully.");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to create instrument.");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Delete Instrument
  // -------------------------------------------------------------
  const handleDeleteInstrument = (item) => {
    Alert.alert(
      "Delete Instrument",
      `Are you sure you want to delete "${item.name}"? This will also remove it from any assigned users.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInstrument(item.id).unwrap();
              if (selectedInstrumentId === String(item.id)) {
                setSelectedInstrumentId("");
              }
              Alert.alert("Deleted", "Instrument deleted successfully.");
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to delete instrument.");
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // HANDLERS: Assign Instruments
  // -------------------------------------------------------------
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      const next = { ...prev };
      if (next[userId] !== undefined) {
        delete next[userId];
      } else {
        next[userId] = "";
      }
      return next;
    });
  };

  const updateUserAssetId = (userId, assetId) => {
    setSelectedUsers((prev) => ({ ...prev, [userId]: assetId }));
  };

  const handleBulkAssign = async () => {
    const userIds = Object.keys(selectedUsers);
    if (!selectedInstrumentId) {
      Alert.alert("Select Instrument", "Please select an instrument to assign first.");
      return;
    }
    if (userIds.length === 0) {
      Alert.alert("Select Users", "Please select at least one user to assign.");
      return;
    }

    const assignments = userIds.map((id) => ({
      userId: Number(id),
      assetId: selectedUsers[id] || null,
    }));

    try {
      await assignInstrument({
        instrumentId: Number(selectedInstrumentId),
        assignments,
      }).unwrap();
      setSelectedUsers({});
      Alert.alert("Success", "Instruments assigned successfully!");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to assign instrument.");
    }
  };

  const handleSingleAssign = async (userId) => {
    if (!selectedInstrumentId) {
      Alert.alert("Select Instrument", "Please choose an instrument from the top first.");
      return;
    }
    const assetId = selectedUsers[userId];
    try {
      await assignInstrument({
        instrumentId: Number(selectedInstrumentId),
        assignments: [{ userId: Number(userId), assetId: assetId || null }],
      }).unwrap();

      setSelectedUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      Alert.alert("Success", "Instrument assigned to user successfully.");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to assign instrument.");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Unassign & Update
  // -------------------------------------------------------------
  const handleUnassign = (userId, instrumentId, instName, userName) => {
    Alert.alert(
      "Remove Assignment",
      `Remove "${instName}" from ${userName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await unassignInstrument({ userId, instrumentId }).unwrap();
              Alert.alert("Removed", "Instrument assignment removed.");
            } catch (err) {
              Alert.alert("Error", err?.data?.message || "Failed to remove instrument.");
            }
          },
        },
      ]
    );
  };

  const handleOpenEditModal = (userId, instrumentId, userName, instName, currentAssetId) => {
    setEditingAssignment({ userId, instrumentId, userName, instName });
    setEditingAssetId(currentAssetId ? String(currentAssetId) : "");
    setEditModalOpen(true);
  };

  const handleSaveEditAssignment = async () => {
    if (!editingAssignment) return;
    try {
      await updateAssignment({
        userId: editingAssignment.userId,
        instrumentId: editingAssignment.instrumentId,
        assetId: editingAssetId.trim() || null,
      }).unwrap();
      setEditModalOpen(false);
      setEditingAssignment(null);
      Alert.alert("Updated", "Asset ID updated successfully.");
    } catch (err) {
      Alert.alert("Error", err?.data?.message || "Failed to update asset ID.");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Download / Export CSV Report
  // -------------------------------------------------------------
  const handleExportCsv = async () => {
    try {
      let csv = "Instrument Type,User Name,User Email,Instrument ID / Number,Assigned Date\n";
      usersWithInstruments.forEach((user) => {
        const list =
          reportFilterId === "all"
            ? user.instruments
            : user.instruments?.filter((i) => String(i.id) === String(reportFilterId));

        list?.forEach((inst) => {
          const dateStr = inst.assignedAt
            ? new Date(inst.assignedAt).toLocaleDateString()
            : "";
          csv += `"${inst.name || ""}","${user.name || ""}","${user.email || ""}","${
            inst.assetId || ""
          }","${dateStr}"\n`;
        });
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      await downloadAndShareBlob(blob, `instrument-assignments.csv`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to export report.");
    }
  };

  if (instLoading && usersLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER SECTION */}
      <View className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">
              Instruments
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage organization physical assets and assignments
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleExportCsv}
              className="flex-row items-center bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              <Download size={16} color="#10b981" />
            </Pressable>
            <Pressable
              onPress={() => setCreateModalOpen(true)}
              className="flex-row items-center bg-blue-600 px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-transform"
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text className="text-white font-bold text-xs">New</Text>
            </Pressable>
          </View>
        </View>

        {/* TABS SELECTOR */}
        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <Pressable
            onPress={() => setActiveTab("instruments")}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === "instruments"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : ""
            }`}
          >
            <Music
              size={14}
              color={activeTab === "instruments" ? "#2563eb" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "instruments"
                  ? "text-blue-600 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              List ({instruments.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("assign")}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === "assign"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : ""
            }`}
          >
            <Plus
              size={14}
              color={activeTab === "assign" ? "#2563eb" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "assign"
                  ? "text-blue-600 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Assign
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("assigned_users")}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === "assigned_users"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : ""
            }`}
          >
            <Users
              size={14}
              color={activeTab === "assigned_users" ? "#2563eb" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === "assigned_users"
                  ? "text-blue-600 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Assigned ({totalAssignedCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* TAB 1: INSTRUMENTS LIST */}
      {activeTab === "instruments" && (
        <View className="flex-1">
          <View className="px-4 py-2">
            <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <TextInput 
                value={listSearchQuery} 
                onChangeText={setListSearchQuery} 
                placeholder="Search instruments..." 
                placeholderTextColor="#94a3b8" 
                className="flex-1 ml-2 text-sm text-slate-900 dark:text-white"
              />
              {listSearchQuery ? (
                <Pressable onPress={() => setListSearchQuery("")}>
                  <X size={14} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>
          </View>
          <FlatList
            data={filteredInstrumentsList}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
              <View className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-4">
                <Music size={32} color="#3b82f6" />
              </View>
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No Instruments Created
              </Text>
              <Text className="text-xs text-slate-500 text-center px-8 mb-4">
                Add instruments such as Guitars, Laptops, Keyboards, or Badges to assign them to your members.
              </Text>
              <Pressable
                onPress={() => setCreateModalOpen(true)}
                className="bg-blue-600 px-5 py-2.5 rounded-xl flex-row items-center active:scale-95"
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-xs">Create Instrument</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center shrink-0 mr-3">
                  <Music size={22} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                onPress={() => handleDeleteInstrument(item)}
                className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 items-center justify-center border border-rose-100 dark:border-rose-900/40 active:scale-95"
              >
                <Trash2 size={16} color="#e11d48" />
              </Pressable>
            </View>
          )}
        />
        </View>
      )}

      {/* TAB 2: ASSIGN INSTRUMENTS */}
      {activeTab === "assign" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
            />
          }
        >
          {/* STEP 1: CHOOSE INSTRUMENT */}
          <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
            <Text className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              1. Choose Instrument
            </Text>
            {instruments.length === 0 ? (
              <View className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200">
                <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  No instruments available. Create an instrument first.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                {instruments.map((inst) => {
                  const isSelected = selectedInstrumentId === String(inst.id);
                  return (
                    <Pressable
                      key={inst.id}
                      onPress={() => setSelectedInstrumentId(String(inst.id))}
                      className={`mr-2.5 px-4 py-2.5 rounded-xl border flex-row items-center ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Music
                        size={14}
                        color={isSelected ? "#ffffff" : "#64748b"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          isSelected
                            ? "text-white"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {inst.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* STEP 2: SEARCH & SELECT USERS */}
          <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-black uppercase tracking-wider text-slate-400">
                2. Select Users & Asset ID
              </Text>
              {Object.keys(selectedUsers).length > 0 && (
                <Pressable
                  onPress={handleBulkAssign}
                  className="bg-blue-600 px-3.5 py-1.5 rounded-lg active:scale-95"
                >
                  <Text className="text-white text-xs font-bold">
                    Assign ({Object.keys(selectedUsers).length})
                  </Text>
                </Pressable>
              )}
            </View>

            {/* SEARCH BOX */}
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 mb-3">
              <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search user by name or email..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-xs text-slate-900 dark:text-white p-0"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={14} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {/* USERS LIST */}
            {filteredUsers.length === 0 ? (
              <Text className="text-xs text-slate-400 text-center py-6">
                No users found.
              </Text>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsers[user.id] !== undefined;
                const assetIdValue = selectedUsers[user.id] || "";

                return (
                  <View
                    key={user.id}
                    className={`p-3 rounded-xl mb-2.5 border ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Pressable
                        onPress={() => toggleUserSelection(user.id)}
                        className="flex-row items-center flex-1 mr-2"
                      >
                        <View
                          className={`w-5 h-5 rounded-md items-center justify-center mr-2.5 border ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check size={12} color="#ffffff" />}
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-900 dark:text-white">
                            {user.name}
                          </Text>
                          <Text className="text-[10px] text-slate-500 dark:text-slate-400">
                            {user.email}
                          </Text>
                        </View>
                      </Pressable>

                      {isSelected && (
                        <Pressable
                          onPress={() => handleSingleAssign(user.id)}
                          className="bg-blue-600 px-2.5 py-1 rounded-md active:scale-95"
                        >
                          <Text className="text-[10px] font-bold text-white">
                            Assign
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* ID / NUMBER INPUT */}
                    {isSelected && (
                      <View className="flex-row items-center mt-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-2">
                          ID / Number:
                        </Text>
                        <TextInput
                          placeholder="e.g. 001, G-12"
                          placeholderTextColor="#94a3b8"
                          value={assetIdValue}
                          onChangeText={(text) => updateUserAssetId(user.id, text)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-medium"
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* TAB 3: ASSIGNED USERS DIRECTORY */}
      {activeTab === "assigned_users" && (
        <FlatList
          data={usersWithInstruments}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
            />
          }
          ListHeaderComponent={
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Assigned Users Directory
                </Text>
              </View>

              {/* FILTER BY INSTRUMENT */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                <Pressable
                  onPress={() => setReportFilterId("all")}
                  className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                    reportFilterId === "all"
                      ? "bg-blue-600 border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      reportFilterId === "all"
                        ? "text-white"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    All Types
                  </Text>
                </Pressable>
                {instruments.map((inst) => {
                  const isSel = reportFilterId === String(inst.id);
                  return (
                    <Pressable
                      key={inst.id}
                      onPress={() => setReportFilterId(String(inst.id))}
                      className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                        isSel
                          ? "bg-blue-600 border-blue-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSel
                            ? "text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {inst.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View className="py-16 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
              <View className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-4">
                <Users size={32} color="#3b82f6" />
              </View>
              <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No Assigned Users
              </Text>
              <Text className="text-xs text-slate-500 text-center px-8">
                No members currently have any instruments assigned. Switch to the Assign tab to allocate equipment.
              </Text>
            </View>
          }
          renderItem={({ item: user }) => {
            const filteredInsts =
              reportFilterId === "all"
                ? user.instruments
                : user.instruments?.filter((i) => String(i.id) === String(reportFilterId));

            if (!filteredInsts || filteredInsts.length === 0) return null;

            return (
              <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                    <User size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      {user.name}
                    </Text>
                    <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                      {user.email}
                    </Text>
                  </View>
                </View>

                {/* INSTRUMENTS LIST FOR USER */}
                <View className="space-y-2">
                  {filteredInsts.map((inst) => (
                    <View
                      key={inst.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <Music size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-bold text-slate-800 dark:text-slate-200 mr-2">
                          {inst.name}
                        </Text>
                        {inst.assetId ? (
                          <View className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                              #{inst.assetId}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <Pressable
                          onPress={() =>
                            handleOpenEditModal(
                              user.id,
                              inst.id,
                              user.name,
                              inst.name,
                              inst.assetId
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95"
                        >
                          <Edit3 size={12} color="#64748b" />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            handleUnassign(user.id, inst.id, inst.name, user.name)
                          }
                          className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/30 items-center justify-center border border-rose-200 dark:border-rose-900/40 active:scale-95"
                        >
                          <Trash2 size={12} color="#e11d48" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* CREATE INSTRUMENT MODAL */}
      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                Create Instrument
              </Text>
              <Pressable
                onPress={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </Pressable>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instrument Name *
              </Text>
              <TextInput
                placeholder="e.g. Acoustic Guitar, MacBook Air"
                placeholderTextColor="#94a3b8"
                value={form.name}
                onChangeText={(t) => setForm((prev) => ({ ...prev, name: t }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </Text>
              <TextInput
                placeholder="Details, model or department notes..."
                placeholderTextColor="#94a3b8"
                value={form.description}
                onChangeText={(t) => setForm((prev) => ({ ...prev, description: t }))}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: "top" }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white min-h-[70px]"
              />
            </View>

            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => setCreateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateSubmit}
                disabled={isCreating}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center justify-center active:scale-95"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT ASSET ID MODAL */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Asset ID
              </Text>
              <Pressable
                onPress={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </Pressable>
            </View>

            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Editing ID for <Text className="font-bold text-slate-800 dark:text-slate-200">{editingAssignment?.userName}</Text> (
              {editingAssignment?.instName})
            </Text>

            <View className="mb-5">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instrument ID / Number
              </Text>
              <TextInput
                placeholder="e.g. 001, G-12"
                placeholderTextColor="#94a3b8"
                value={editingAssetId}
                onChangeText={setEditingAssetId}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </View>

            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEditAssignment}
                disabled={isUpdating}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center justify-center active:scale-95"
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
