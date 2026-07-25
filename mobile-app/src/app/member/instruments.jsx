import React, { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable, Modal, TextInput, ScrollView, Alert } from "react-native";
import { 
  useGetOrgInstrumentsQuery, 
  useCreateOrgInstrumentMutation, 
  useUpdateOrgInstrumentMutation, 
  useDeleteOrgInstrumentMutation,
  useAssignOrgInstrumentMutation,
  useRevokeOrgInstrumentMutation,
  useGetOrgWorkspaceUsersQuery 
} from "@/services/api/orgApi";
import { Box, Plus, X, Pencil, Trash2, Calendar, Hash, User } from "lucide-react-native";

export default function OrgInstrumentsPage() {
  const { data, isLoading, isFetching, refetch } = useGetOrgInstrumentsQuery();
  const { data: usersData } = useGetOrgWorkspaceUsersQuery({ limit: 1000 });
  
  const [createInstrument, { isLoading: isCreating }] = useCreateOrgInstrumentMutation();
  const [updateInstrument, { isLoading: isUpdating }] = useUpdateOrgInstrumentMutation();
  const [deleteInstrument, { isLoading: isDeleting }] = useDeleteOrgInstrumentMutation();
  const [assignInstrument, { isLoading: isAssigning }] = useAssignOrgInstrumentMutation();
  const [revokeInstrument, { isLoading: isRevoking }] = useRevokeOrgInstrumentMutation();

  const instruments = data?.data || [];
  const users = usersData?.items || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "IT",
    serialNumber: "",
    description: "",
    status: "ACTIVE",
    userId: ""
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({ name: "", type: "IT", serialNumber: "", description: "", status: "ACTIVE", userId: "" });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      type: item.type || "IT",
      serialNumber: item.serialNumber || "",
      description: item.description || "",
      status: item.status || "ACTIVE",
      userId: item.assignedUserId ? String(item.assignedUserId) : ""
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        Alert.alert("Error", "Name is required");
        return;
      }
      
      const payload = {
        name: form.name,
        type: form.type,
        serialNumber: form.serialNumber,
        description: form.description,
        status: form.status,
      };

      if (editingItem) {
        await updateInstrument({ id: editingItem.id, ...payload }).unwrap();
        
        // Handle assignment changes
        const wasAssignedTo = editingItem.assignedUserId ? String(editingItem.assignedUserId) : "";
        if (form.userId !== wasAssignedTo) {
          if (form.userId) {
            await assignInstrument({ id: editingItem.id, userId: Number(form.userId) }).unwrap();
          } else {
            await revokeInstrument(editingItem.id).unwrap();
          }
        }
        Alert.alert("Success", "Instrument updated successfully");
      } else {
        const res = await createInstrument(payload).unwrap();
        if (form.userId && res?.data?.id) {
          await assignInstrument({ id: res.data.id, userId: Number(form.userId) }).unwrap();
        }
        Alert.alert("Success", "Instrument created successfully");
      }
      setModalVisible(false);
      refetch();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Operation failed");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Instrument", "Are you sure you want to delete this instrument?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await deleteInstrument(id).unwrap();
            Alert.alert("Success", "Instrument deleted");
            refetch();
          } catch (err) {
            Alert.alert("Error", err?.data?.message || "Failed to delete");
          }
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const isSaving = isCreating || isUpdating || isAssigning || isRevoking;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <FlatList
        data={instruments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#2563eb" />}
        ListEmptyComponent={
          <View className="py-12 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
            <Box size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <Text className="text-slate-500 font-medium">No instruments found.</Text>
            <Pressable onPress={openCreateModal} className="mt-4 px-4 py-2 bg-blue-600 rounded-full">
              <Text className="text-white font-bold">Add Instrument</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">Instruments</Text>
              <Text className="text-sm font-medium text-slate-500">Manage organizational assets</Text>
            </View>
            <Pressable onPress={openCreateModal} className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center shadow-sm">
              <Plus size={20} color="white" />
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable 
            onPress={() => openEditModal(item)}
            className="bg-white dark:bg-slate-900 p-4 rounded-[20px] mb-4 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.name}</Text>
                {item.description ? (
                  <Text className="text-xs text-slate-500">{item.description}</Text>
                ) : null}
              </View>
              <View className={`px-2 py-1 rounded-md ${
                item.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                item.status === 'MAINTENANCE' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-slate-100 dark:bg-slate-800'
              }`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${
                  item.status === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-400' :
                  item.status === 'MAINTENANCE' ? 'text-amber-700 dark:text-amber-400' :
                  'text-slate-600 dark:text-slate-400'
                }`}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <View className="flex-row items-center flex-1">
                <Hash size={14} className="text-slate-400 mr-1.5" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {item.serialNumber || "N/A"}
                </Text>
              </View>
              
              {item.assignedUserId ? (
                <View className="flex-row items-center flex-1 justify-end">
                  <User size={14} className="text-blue-500 mr-1.5" />
                  <Text className="text-xs font-bold text-blue-600 dark:text-blue-400" numberOfLines={1}>
                    {users.find(u => u.id === item.assignedUserId)?.name || `User #${item.assignedUserId}`}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center flex-1 justify-end">
                  <Text className="text-xs font-bold text-slate-400">Unassigned</Text>
                </View>
              )}
            </View>
            
            <View className="absolute top-4 right-16 flex-row gap-2">
              <Pressable 
                onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 items-center justify-center"
              >
                <Trash2 size={14} className="text-rose-500" />
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-slate-50 dark:bg-slate-950">
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Text className="text-lg font-black text-slate-900 dark:text-white">
              {editingItem ? "Edit Instrument" : "New Instrument"}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} className="p-2">
              <X size={24} className="text-slate-500 dark:text-slate-400" />
            </Pressable>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }} className="flex-1">
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-1">Name</Text>
              <TextInput 
                value={form.name} 
                onChangeText={(t) => setForm({...form, name: t})} 
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" 
                placeholder="MacBook Pro"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-1">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {['IT', 'VEHICLE', 'FURNITURE', 'OTHER'].map(type => (
                  <Pressable 
                    key={type} 
                    onPress={() => setForm({...form, type})}
                    className={`px-4 py-2 rounded-lg border ${form.type === type ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                  >
                    <Text className={`text-xs font-bold ${form.type === type ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-1">Serial Number</Text>
              <TextInput 
                value={form.serialNumber} 
                onChangeText={(t) => setForm({...form, serialNumber: t})} 
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" 
                placeholder="SN-12345"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-1">Description</Text>
              <TextInput 
                value={form.description} 
                onChangeText={(t) => setForm({...form, description: t})} 
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white min-h-[80px]" 
                placeholder="Details..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-1">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {['ACTIVE', 'MAINTENANCE', 'RETIRED'].map(status => (
                  <Pressable 
                    key={status} 
                    onPress={() => setForm({...form, status})}
                    className={`px-4 py-2 rounded-lg border ${form.status === status ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                  >
                    <Text className={`text-xs font-bold ${form.status === status ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-500 mb-1">Assign To (Optional)</Text>
              <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  <Pressable 
                    onPress={() => setForm({...form, userId: ""})}
                    className={`p-4 border-b border-slate-100 dark:border-slate-800 ${!form.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <Text className={`font-medium ${!form.userId ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>Unassigned</Text>
                  </Pressable>
                  {users.map(user => (
                    <Pressable 
                      key={user.id}
                      onPress={() => setForm({...form, userId: String(user.id)})}
                      className={`p-4 border-b border-slate-100 dark:border-slate-800 ${form.userId === String(user.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <Text className={`font-medium ${form.userId === String(user.id) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{user.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>

          <View className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <Pressable 
              onPress={handleSave} 
              disabled={isSaving}
              className={`w-full py-4 rounded-xl items-center justify-center flex-row ${isSaving ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-600'}`}
            >
              {isSaving && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-white font-black">{editingItem ? "Update Instrument" : "Create Instrument"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
