import React from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal, Switch, ActivityIndicator } from "react-native";
import { X, UserPlus } from "lucide-react-native";
import { formatPermissionLabel } from "@/utils/roles";

const STATUS_OPTIONS = ["APPROVED", "PENDING"];

export default function CreateOrgUserModal({
  visible,
  onClose,
  form,
  setForm,
  error,
  submitting,
  createUser,
  manageableRoleOptions,
  permissionGroups,
  onPermissionToggle
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-[#020617]">
        <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Create User</Text>
          <Pressable onPress={onClose} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
            <X size={18} color="#94a3b8" />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="gap-4">
            {/* Name */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Full Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="Enter full name"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Email */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                placeholder="Enter email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Mobile */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Mobile Number</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={form.mobileCountryCode}
                  onChangeText={(v) => setForm((p) => ({ ...p, mobileCountryCode: v }))}
                  className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
                <TextInput
                  value={form.mobile}
                  onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^\d]/g, "") }))}
                  placeholder="Mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>

            {/* Role */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {manageableRoleOptions.map((roleOpt) => (
                  <Pressable
                    key={roleOpt.value}
                    onPress={() => setForm((p) => ({ ...p, role: roleOpt.value }))}
                    className={`px-4 py-2.5 rounded-2xl border ${
                      form.role === roleOpt.value
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}>
                    <Text className={`text-[13px] font-bold ${
                      form.role === roleOpt.value ? "text-white" : "text-slate-600 dark:text-slate-400"
                    }`}>
                      {roleOpt.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Status */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Status</Text>
              <View className="flex-row gap-2">
                {STATUS_OPTIONS.map((statusOpt) => (
                  <Pressable
                    key={statusOpt}
                    onPress={() => setForm((p) => ({ ...p, status: statusOpt }))}
                    className={`flex-1 py-2.5 rounded-2xl border items-center ${
                      form.status === statusOpt
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}>
                    <Text className={`text-[13px] font-bold ${
                      form.status === statusOpt ? "text-white" : "text-slate-600 dark:text-slate-400"
                    }`}>
                      {statusOpt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">Password (Optional)</Text>
              <TextInput
                value={form.password}
                onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                placeholder="Leave blank for auto-generated"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </View>

            {/* Permissions */}
            <View className="gap-3 bg-slate-50 dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
              <Text className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Permissions
              </Text>
              {permissionGroups.map((group) => (
                <View key={group.key} className="bg-white dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 gap-2">
                  <Text className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group.label}
                  </Text>
                  {group.items.map((permission) => (
                    <Pressable
                      key={permission}
                      onPress={() => onPermissionToggle(permission)}
                      className="flex-row items-center justify-between py-1.5">
                      <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                        {formatPermissionLabel(permission)}
                      </Text>
                      <View pointerEvents="none">
                        <Switch
                          value={form.permissions.includes(permission)}
                          trackColor={{ false: "#e2e8f0", true: "#2563eb" }}
                          thumbColor="#fff"
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            {/* Error in modal */}
            {error ? (
              <View className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Create Button */}
        <View className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Pressable
            onPress={createUser}
            disabled={submitting}
            className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center gap-2 ${
              submitting ? "bg-blue-400" : "bg-blue-600"
            }`}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <UserPlus size={16} color="#fff" />
            )}
            <Text className="text-white text-sm font-bold">Create User</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
