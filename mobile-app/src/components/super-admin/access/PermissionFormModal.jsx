import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

export default function PermissionFormModal({ visible, onClose, onSubmit, initialData, isLoading }) {
  const [formData, setFormData] = useState({ key: '', name: '', description: '' });

  useEffect(() => {
    if (visible) {
      setFormData(initialData || { key: '', name: '', description: '' });
    }
  }, [visible, initialData]);

  const isEditing = !!initialData;

  const handleSubmit = () => {
    if (!formData.name.trim() || (!isEditing && !formData.key.trim())) return;
    onSubmit(formData);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white dark:bg-slate-950 rounded-t-[32px] max-h-[90%]">
          <View className="items-center py-3">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </View>
          
          <ScrollView className="px-6 pb-8 pt-4">
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {isEditing ? 'Edit Permission' : 'New Permission'}
            </Text>
            {isEditing && (
              <Text className="text-xs font-mono font-bold text-indigo-500 uppercase tracking-widest mb-6">{formData.key}</Text>
            )}

            <View className="space-y-5 mt-4">
              {!isEditing && (
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Unique Key *</Text>
                  <TextInput
                    value={formData.key}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, key: text.toUpperCase().replace(/\s+/g, "_") }))}
                    placeholder="e.g. USER_DELETE"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono"
                  />
                </View>
              )}

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Display Name *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g. Delete User"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold"
                />
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Description</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="What does this allow?"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 h-28 text-slate-900 dark:text-white font-medium"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-8">
              <Pressable
                onPress={onClose}
                disabled={isLoading}
                className="flex-1 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <Text className="text-slate-600 dark:text-slate-300 font-bold">Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading || !formData.name.trim() || (!isEditing && !formData.key.trim())}
                className={`flex-1 p-4 rounded-xl items-center justify-center ${
                  !formData.name.trim() || (!isEditing && !formData.key.trim())
                    ? 'bg-blue-300 dark:bg-blue-900/50'
                    : 'bg-blue-600 active:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">{isEditing ? 'Save Changes' : 'Create Permission'}</Text>
                )}
              </Pressable>
            </View>
            <View className="h-12" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
