import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  Alert 
} from 'react-native';
import { router } from 'expo-router';
import { 
  ChevronLeft, 
  Shield, 
  Plus, 
  Edit2, 
  X, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react-native';
import { 
  useGetRolesQuery, 
  useCreateRoleMutation, 
  useUpdateRoleMutation, 
  useDeleteRoleMutation 
} from '@/services/api/roleApi';

const DASHBOARD_PATHS = [
  { label: 'Member Dashboard (Standard)', value: '/member/dashboard' },
  { label: 'Team Leader Dashboard (Managerial)', value: '/team-leader/dashboard' },
  { label: 'Organization Admin Dashboard', value: '/org/dashboard' },
  { label: 'Super Admin Dashboard', value: '/super-admin/dashboard' },
];

export default function RolesPage() {
  const { data, isLoading, isFetching, refetch } = useGetRolesQuery();
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  
  const [form, setForm] = useState({ 
    code: '', 
    name: '', 
    description: '', 
    dashboardPath: '/member/dashboard' 
  });

  const roles = useMemo(() => data?.data || [], [data]);

  const handleRefresh = () => {
    refetch();
  };

  const openAddModal = () => {
    setEditingRole(null);
    setForm({ 
      code: '', 
      name: '', 
      description: '', 
      dashboardPath: '/member/dashboard' 
    });
    setModalVisible(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description || '',
      dashboardPath: role.dashboardPath || '/member/dashboard',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || (!editingRole && !form.code)) {
      Alert.alert('Error', 'Name and Code are required fields.');
      return;
    }

    try {
      if (editingRole) {
        await updateRole({ ...form, code: editingRole.code }).unwrap();
      } else {
        await createRole({ ...form, code: form.code.toUpperCase().replace(/\s+/g, '_') }).unwrap();
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error?.data?.message || 'Failed to save role.');
    }
  };

  const handleDelete = (code, name) => {
    Alert.alert(
      'Delete Role', 
      `Are you sure you want to permanently delete the role '${name}'?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteRole(code).unwrap();
            } catch (error) {
              Alert.alert('Error', error?.data?.message || 'Failed to delete role.');
            }
          } 
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0A0F1C]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-[#0A0F1C] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.push('/super-admin/dashboard')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Custom Roles</Text>
          <Pressable onPress={openAddModal} className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-600/20">
            <Plus size={20} className="text-indigo-600 dark:text-indigo-400" />
          </Pressable>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manage Dynamic Access</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={handleRefresh} tintColor="#4f46e5" />}
      >
        {isLoading && roles.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : roles.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-slate-800">
            <Shield size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-lg font-black text-slate-900 dark:text-white text-center">No Roles</Text>
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mt-2">
              There are no custom roles configured yet.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {roles.map((role) => (
              <View key={role.code} className="bg-white dark:bg-[#151E2F] rounded-[24px] border border-slate-200 dark:border-[#1E293B] p-5 shadow-sm">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                      <Shield size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>{role.name}</Text>
                      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{role.code}</Text>
                    </View>
                  </View>
                  {role.isSystem ? (
                    <View className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">System</Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 min-h-[32px]">
                  {role.description || 'No description provided.'}
                </Text>

                <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <View className="flex-1 pr-2">
                    <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Dashboard Path</Text>
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300" numberOfLines={1}>{role.dashboardPath}</Text>
                  </View>
                  {!role.isSystem && (
                    <View className="flex-row items-center gap-2">
                      <Pressable 
                        onPress={() => openEditModal(role)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
                      >
                        <Edit2 size={14} className="text-slate-600 dark:text-slate-300" />
                      </Pressable>
                      <Pressable 
                        disabled={isDeleting}
                        onPress={() => handleDelete(role.code, role.name)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10"
                      >
                        <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Role Form Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-[#151E2F] rounded-t-3xl p-6 shadow-sm border-t border-slate-200 dark:border-[#1E293B] max-h-[85%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                {!editingRole && (
                  <View>
                    <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Role Code</Text>
                    <TextInput
                      value={form.code}
                      onChangeText={(text) => setForm({ ...form, code: text.toUpperCase().replace(/\s+/g, '_') })}
                      placeholder="e.g. SUB_TEAM_LEADER"
                      placeholderTextColor="#64748b"
                      autoCapitalize="characters"
                      className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                    />
                    <Text className="text-[10px] text-slate-400 mt-1">Unique identifier. Cannot be changed later.</Text>
                  </View>
                )}
                
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Display Name</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    placeholder="e.g. Sub Team Leader"
                    placeholderTextColor="#64748b"
                    className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold"
                  />
                </View>

                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Dashboard UI Experience</Text>
                  <View className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl overflow-hidden">
                    {DASHBOARD_PATHS.map((path, idx) => {
                      const isSelected = form.dashboardPath === path.value;
                      return (
                        <Pressable 
                          key={path.value}
                          onPress={() => setForm({ ...form, dashboardPath: path.value })}
                          className={`p-4 flex-row items-center justify-between ${idx !== DASHBOARD_PATHS.length - 1 ? 'border-b border-slate-200 dark:border-slate-800/50' : ''} ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                        >
                          <Text className={`text-sm font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {path.label}
                          </Text>
                          {isSelected && (
                            <View className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text className="text-[10px] text-slate-400 mt-1">The UI layout and experience this role will see upon logging in.</Text>
                </View>

                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Description</Text>
                  <TextInput
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    placeholder="Optional role description"
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-[#1E293B] rounded-xl p-4 text-sm text-slate-900 dark:text-white font-bold min-h-[100px]"
                  />
                </View>
              </View>

              <Pressable 
                onPress={handleSave} 
                disabled={isCreating || isUpdating}
                className={`bg-indigo-600 active:bg-indigo-700 flex-row items-center justify-center p-4 rounded-xl mt-8 mb-6 shadow-sm ${isCreating || isUpdating ? 'opacity-70' : ''}`}
              >
                {isCreating || isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <ShieldCheck size={18} className="text-white mr-2" />
                    <Text className="text-white font-bold text-sm">
                      {editingRole ? 'Save Changes' : 'Create Role'}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
