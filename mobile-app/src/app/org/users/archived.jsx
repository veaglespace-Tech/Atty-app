import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, ArchiveRestore, UserX } from "lucide-react-native";
import { useGetArchivedUsersQuery, useRestoreArchivedUserMutation } from "@/services/api/orgApi";
import { getErrorMessage } from "@/utils/formValidation";

export default function ArchivedUsersScreen() {
  const { data: usersData, isLoading, isFetching, refetch } = useGetArchivedUsersQuery();
  const [restoreArchivedUser, { isLoading: isRestoring }] = useRestoreArchivedUserMutation();
  const [restoringId, setRestoringId] = useState(null);

  const archivedUsers = Array.isArray(usersData?.items) ? usersData.items : [];

  const handleRestore = (user) => {
    Alert.alert(
      "Restore User",
      `Are you sure you want to restore ${user.name}? They will be moved back to the active directory.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "default",
          onPress: async () => {
            try {
              setRestoringId(user.id);
              await restoreArchivedUser(user.id).unwrap();
              Alert.alert("Success", "User restored successfully.");
            } catch (err) {
              Alert.alert("Error", getErrorMessage(err, "Failed to restore user."));
            } finally {
              setRestoringId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center gap-3 mb-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95"
          >
            <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
          </Pressable>
          <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Archived Users</Text>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Restore previously deleted or archived organization members.
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {archivedUsers.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <UserX size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold text-center">
              {isLoading ? "Loading..." : "No archived users found."}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {archivedUsers.map((user) => (
              <View
                key={user.id}
                className="bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-lg font-black text-slate-900 dark:text-white mb-1">{user.name}</Text>
                    <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">{user.email}</Text>
                    {user.mobile && (
                      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{user.mobile}</Text>
                    )}
                  </View>
                  <View className="items-end bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-800">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Archived</Text>
                  </View>
                </View>

                <View className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Reason & Date</Text>
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {user.archiveReason || "User archived"}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500">
                    {formatDate(user.archivedAt)}
                  </Text>
                </View>

                <View className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 flex-row items-center justify-end">
                  <Pressable
                    onPress={() => handleRestore(user)}
                    disabled={isRestoring && restoringId === user.id}
                    className="flex-row items-center gap-2 bg-slate-900 dark:bg-white px-5 py-2.5 rounded-xl active:scale-95"
                  >
                    <ArchiveRestore size={16} className={isRestoring && restoringId === user.id ? "text-slate-400" : "text-white dark:text-slate-900"} />
                    <Text className="text-sm font-bold text-white dark:text-slate-900">
                      {isRestoring && restoringId === user.id ? "Restoring..." : "Restore User"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
