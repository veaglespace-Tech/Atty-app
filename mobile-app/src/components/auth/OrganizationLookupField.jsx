import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList, Modal, SafeAreaView } from 'react-native';
import { Building2, X, Search, ChevronRight } from 'lucide-react-native';
import { useLazySearchOrganizationsQuery } from '@/services/api/authApi';
import { authFieldClassName, authFieldErrorClassName, authFieldNormalClassName } from './AuthPageShell';

export default function OrganizationLookupField({
  label = "Organization",
  placeholder = "Search by organization name or code",
  helperText = "",
  error = "",
  selectedOrganization = null,
  onSelect,
  onClear,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  
  const [searchOrganizations, { isFetching }] = useLazySearchOrganizationsQuery();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await searchOrganizations({ query: trimmed, limit: 8 }).unwrap();
        setResults(Array.isArray(response?.items) ? response.items : []);
      } catch (err) {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query, searchOrganizations]);

  const handleSelect = (org) => {
    onSelect(org);
    setModalVisible(false);
    setQuery("");
  };

  const formatMeta = (org) => {
    return [org?.city, org?.state, org?.country].filter(Boolean).join(", ");
  };

  return (
    <View className="space-y-1.5 w-full">
      <Text className="ml-1 mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </Text>

      {selectedOrganization ? (
        <View className="relative w-full rounded-2xl border-2 border-blue-500 bg-blue-50/50 p-4 dark:border-blue-500/50 dark:bg-blue-900/20">
          <View className="flex-row items-start justify-between pr-8">
            <View className="flex-1">
              <Text className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Selected Workspace
              </Text>
              <Text className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {selectedOrganization.name}
              </Text>
              <Text className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedOrganization.organizationCode}
                {formatMeta(selectedOrganization) ? ` - ${formatMeta(selectedOrganization)}` : ""}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClear}
            className="absolute right-3 top-3 rounded-full bg-blue-100 p-2 active:bg-blue-200 dark:bg-blue-900/50 dark:active:bg-blue-800"
          >
            <X size={16} className="text-blue-700 dark:text-blue-300" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setModalVisible(true)}
          className={`relative justify-center ${authFieldClassName} pl-12 pr-4 ${error ? authFieldErrorClassName : authFieldNormalClassName} h-14`}
        >
          <View className="absolute left-4 z-10">
            <Building2 size={20} className="text-slate-400" />
          </View>
          <Text className="text-slate-400">
            {placeholder}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text className="ml-1 mt-1 text-xs font-medium text-red-500">{error}</Text>
      ) : helperText ? (
        <Text className="ml-1 mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
          {helperText}
        </Text>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Find Organization</Text>
            <Pressable onPress={() => setModalVisible(false)} className="p-2">
              <Text className="font-bold text-blue-600 dark:text-blue-400">Cancel</Text>
            </Pressable>
          </View>

          <View className="p-4 bg-white dark:bg-slate-900">
            <View className="relative justify-center">
              <View className="absolute left-4 z-10">
                <Search size={20} className="text-slate-400" />
              </View>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Type organization name..."
                placeholderTextColor="#94a3b8"
                className="w-full rounded-2xl border-2 border-blue-500 bg-white pl-12 pr-10 py-4 text-base font-medium text-slate-900 dark:bg-slate-950 dark:text-white"
              />
              {isFetching && (
                <View className="absolute right-4 z-10">
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              )}
            </View>
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={() => (
              <View className="py-8 items-center">
                <Text className="text-slate-500 dark:text-slate-400 font-medium">
                  {query.length < 2 ? "Type at least 2 characters to search" : "No organizations found"}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                className="mb-3 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 active:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:active:bg-slate-800"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {item.organizationCode}
                  </Text>
                  {formatMeta(item) ? (
                    <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatMeta(item)}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={20} className="text-slate-300" />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
