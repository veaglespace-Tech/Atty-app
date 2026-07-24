import React, { useState, useMemo } from "react";
import Animated, { FadeInUp } from "react-native-reanimated";
import { View, Text, Pressable, ScrollView, RefreshControl, Image, TextInput, Alert, ActivityIndicator, Modal } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Image as ImageIcon, Send, Clock, Trash2, Shield, X, Plus, Paperclip, FileText, Search, Edit2 } from "lucide-react-native";
import { useGetOrgPostsQuery, useCreatePostMutation, useDeletePostMutation, useUpdatePostMutation, useVoteOnPostMutation } from "@/services/api/postApi";
import { formatTimeAgo } from "@/utils/date";
import useLocalPagination from "@/hooks/useLocalPagination";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const TYPES = [
  { value: "NOTIFICATION", label: "Notification" },
  { value: "ARTICLE", label: "Article" },
  { value: "NEWS", label: "News" },
  { value: "POLL", label: "Poll" },
  { value: "TOURNAMENT_CARD", label: "Tournament Card" },
];

export default function OrgPostsPage() {
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "NOTIFICATION",
    metadata: { options: ["", ""] },
    attachments: []
  });
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeVoteId, setActiveVoteId] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetOrgPostsQuery("limit=2000");
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deletePost] = useDeletePostMutation();
  const [voteOnPost] = useVoteOnPostMutation();

  const posts = Array.isArray(data?.items) ? data.items : [];

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = 
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "ALL" || post.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [posts, searchTerm, typeFilter]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPosts,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredPosts, {
    initialPageSize: 10,
    dependencies: [searchTerm, typeFilter],
  });

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      type: "NOTIFICATION",
      metadata: { options: ["", ""] },
      attachments: []
    });
    setEditingId(null);
  };

  const handlePost = async () => {
    if (!form.content.trim() || !form.title.trim()) {
      Alert.alert("Error", "Title and content are required.");
      return;
    }
    const payload = { ...form };
    if (payload.type === "POLL") {
      const validOptions = payload.metadata.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        Alert.alert("Error", "Poll requires at least 2 options.");
        return;
      }
      payload.metadata.options = validOptions;
    } else {
      payload.metadata = undefined;
    }

    try {
      if (editingId) {
        await updatePost({ id: editingId, ...payload }).unwrap();
      } else {
        await createPost(payload).unwrap();
      }
      resetForm();
    } catch (err) {
      console.error("Failed to post:", err);
      Alert.alert("Error", "Failed to save post.");
    }
  };

  const handleEdit = (post) => {
    setForm({
      title: post.title || "",
      content: post.content || "",
      type: post.type || "NOTIFICATION",
      metadata: post.metadata || { options: ["", ""] },
      attachments: post.metadata?.attachments || (post.metadata?.attachment ? [post.metadata.attachment] : []),
    });
    setEditingId(post.id);
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deletePost(id).unwrap();
          } catch (err) {
            console.error("Failed to delete post:", err);
          }
        } 
      }
    ]);
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      setActiveVoteId(postId);
      await voteOnPost({ id: postId, optionIndex }).unwrap();
    } catch (err) {
      Alert.alert("Error", "Failed to submit vote.");
    } finally {
      setActiveVoteId(null);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      setForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, { dataUrl, name: asset.fileName || "image.jpg", allowDownload: true }]
      }));
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.size > 4 * 1024 * 1024) {
        Alert.alert("Error", "Document size should not exceed 4MB");
        return;
      }
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        const mimeType = asset.mimeType || 'application/octet-stream';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        setForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, { dataUrl, name: asset.name, allowDownload: true }]
        }));
      } catch (err) {
        Alert.alert("Error", "Failed to read file.");
      }
    }
  };

  const removeAttachment = (index) => {
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const updatePollOption = (text, index) => {
    const newOptions = [...form.metadata.options];
    newOptions[index] = text;
    setForm(prev => ({ ...prev, metadata: { ...prev.metadata, options: newOptions } }));
  };

  const addPollOption = () => {
    setForm(prev => ({ ...prev, metadata: { ...prev.metadata, options: [...prev.metadata.options, ""] } }));
  };
  
  const removePollOption = (index) => {
    if (form.metadata.options.length <= 2) return;
    const newOptions = form.metadata.options.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, metadata: { ...prev.metadata, options: newOptions } }));
  };

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-4 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Organization Feed</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}>
        
        <View className="bg-white dark:bg-slate-900/80 rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
          {editingId && (
            <View className="flex-row justify-between items-center mb-3">
               <Text className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Editing Post</Text>
               <Pressable onPress={resetForm}><Text className="text-xs font-bold text-slate-400">Cancel</Text></Pressable>
            </View>
          )}
          <TextInput
            placeholder="Post Title..."
            placeholderTextColor="#94a3b8"
            value={form.title}
            onChangeText={(v) => setForm(p => ({ ...p, title: v }))}
            className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
            {TYPES.map(t => (
              <Pressable
                key={t.value}
                onPress={() => setForm(p => ({ ...p, type: t.value }))}
                className={`px-3 py-1.5 rounded-full border ${form.type === t.value ? 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
              >
                <Text className={`text-[11px] font-bold ${form.type === t.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            multiline
            placeholder="Share your thoughts..."
            placeholderTextColor="#94a3b8"
            value={form.content}
            onChangeText={(v) => setForm(p => ({ ...p, content: v }))}
            className="text-[15px] text-slate-900 dark:text-white min-h-[80px]"
            textAlignVertical="top"
          />
          
          {form.type === "POLL" && (
            <View className="mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
              <Text className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 mb-2">Poll Options</Text>
              {form.metadata.options.map((opt, i) => (
                <View key={i} className="flex-row items-center mb-2 gap-2">
                  <TextInput
                    value={opt}
                    onChangeText={(v) => updatePollOption(v, i)}
                    placeholder={`Option ${i+1}`}
                    placeholderTextColor="#d97706"
                    className="flex-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                  {form.metadata.options.length > 2 && (
                    <Pressable onPress={() => removePollOption(i)} className="p-2">
                      <Trash2 size={14} className="text-amber-500" />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={addPollOption} className="flex-row items-center gap-1 mt-1">
                <Plus size={14} className="text-amber-600 dark:text-amber-500" />
                <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-500">Add Option</Text>
              </Pressable>
            </View>
          )}

          {form.attachments.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {form.attachments.map((att, i) => (
                <View key={i} className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg px-2 py-1.5 gap-2">
                  <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300 max-w-[120px]" numberOfLines={1}>{att.name}</Text>
                  <Pressable onPress={() => removeAttachment(i)}>
                    <X size={12} className="text-blue-500" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <View className="flex-row gap-2">
              <Pressable onPress={pickImage} className="w-9 h-9 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <ImageIcon size={16} className="text-slate-500 dark:text-slate-400" />
              </Pressable>
              <Pressable onPress={pickDocument} className="w-9 h-9 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <Paperclip size={16} className="text-slate-500 dark:text-slate-400" />
              </Pressable>
            </View>
            <Pressable 
              onPress={handlePost}
              disabled={isCreating || isUpdating || !form.content.trim() || !form.title.trim()}
              className={`px-5 py-2.5 rounded-full flex-row items-center gap-2 active:scale-[0.96] transition-transform ${(form.content.trim() && form.title.trim() && !isCreating && !isUpdating) ? 'bg-blue-600 shadow-sm shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {(isCreating || isUpdating) ? <ActivityIndicator size="small" color="#fff" /> : <Send size={14} color={(form.content.trim() && form.title.trim() && !isCreating && !isUpdating) ? "white" : "#94a3b8"} />}
              <Text className={`font-bold ${(form.content.trim() && form.title.trim() && !isCreating && !isUpdating) ? 'text-white' : 'text-slate-400'}`}>{editingId ? 'Save' : 'Post'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1 flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
            <Search size={16} className="text-slate-400" />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search posts..."
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-2 text-[13px] font-semibold text-slate-900 dark:text-white outline-none"
            />
          </View>
          <Pressable onPress={() => setFilterModalOpen(true)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
               {typeFilter === "ALL" ? "All Types" : TYPES.find(t => t.value === typeFilter)?.label || "Filter"}
            </Text>
          </Pressable>
        </View>

        <Modal visible={filterModalOpen} animationType="slide" transparent={true} onRequestClose={() => setFilterModalOpen(false)}>
           <Pressable className="flex-1 bg-black/40 dark:bg-black/60 justify-end" onPress={() => setFilterModalOpen(false)}>
              <View className="bg-white dark:bg-slate-950 rounded-t-3xl p-6">
                 <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">Filter by Type</Text>
                 <ScrollView>
                    <Pressable onPress={() => { setTypeFilter("ALL"); setFilterModalOpen(false); }} className={`p-4 rounded-2xl mb-2 ${typeFilter === "ALL" ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                       <Text className={`text-base font-bold ${typeFilter === "ALL" ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>All Types</Text>
                    </Pressable>
                    {TYPES.map(t => (
                       <Pressable key={t.value} onPress={() => { setTypeFilter(t.value); setFilterModalOpen(false); }} className={`p-4 rounded-2xl mb-2 ${typeFilter === t.value ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                          <Text className={`text-base font-bold ${typeFilter === t.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</Text>
                       </Pressable>
                    ))}
                 </ScrollView>
              </View>
           </Pressable>
        </Modal>

        {filteredPosts.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white dark:bg-slate-900/80 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-semibold">No posts found.</Text>
          </View>
        ) : (
          <View className="gap-4">
            {paginatedPosts.map((post, index) => (
              <Animated.View entering={FadeInUp.duration(400).delay(index * 50).springify()} key={post.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 items-center justify-center border border-blue-200 dark:border-blue-800">
                      <Text className="font-black text-blue-700 dark:text-blue-300 text-lg">
                        {post.authorName?.[0]?.toUpperCase() || "A"}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">{post.authorName || "Admin"}</Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-slate-400" />
                        <Text className="text-[11px] font-semibold text-slate-500">
                          {formatTimeAgo(post.createdAt || new Date().toISOString())}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center gap-2">
                    <View className={`px-2 py-1 rounded-md flex-row items-center gap-1 ${
                      post.type === "NOTIFICATION" ? "bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20" :
                      post.type === "POLL" ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" :
                      post.type === "NEWS" ? "bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20" :
                      post.type === "TOURNAMENT_CARD" ? "bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20" :
                      "bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20"
                    }`}>
                      {post.type === "NOTIFICATION" && <Shield size={10} className="text-amber-600 dark:text-amber-400" />}
                      {post.type === "POLL" && <MessageSquare size={10} className="text-emerald-600 dark:text-emerald-400" />}
                      {post.type === "NEWS" && <FileText size={10} className="text-purple-600 dark:text-purple-400" />}
                      {post.type === "TOURNAMENT_CARD" && <Shield size={10} className="text-rose-600 dark:text-rose-400" />}
                      {post.type === "ARTICLE" && <FileText size={10} className="text-blue-600 dark:text-blue-400" />}
                      <Text className={`text-[9px] font-black uppercase tracking-wider ${
                        post.type === "NOTIFICATION" ? "text-amber-600 dark:text-amber-400" :
                        post.type === "POLL" ? "text-emerald-600 dark:text-emerald-400" :
                        post.type === "NEWS" ? "text-purple-600 dark:text-purple-400" :
                        post.type === "TOURNAMENT_CARD" ? "text-rose-600 dark:text-rose-400" :
                        "text-blue-600 dark:text-blue-400"
                      }`}>{post.type ? post.type.replace('_', ' ') : "Post"}</Text>
                    </View>
                    <Pressable onPress={() => handleEdit(post)} className="p-2 opacity-50 hover:opacity-100">
                      <Edit2 size={16} className="text-blue-500" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(post.id)} className="p-2 -mr-2 opacity-50 hover:opacity-100">
                      <Trash2 size={16} className="text-rose-500" />
                    </Pressable>
                  </View>
                </View>
                
                {post.title && <Text className="text-slate-900 dark:text-white text-base font-bold mb-1">{post.title}</Text>}
                <Text className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed mt-1">{post.content}</Text>
                
                {post.type === "POLL" && post.metadata?.options && (
                  <View className="mt-4 gap-2">
                    {post.metadata.options.map((opt, i) => (
                      <Pressable 
                        key={i} 
                        onPress={() => handleVote(post.id, i)}
                        disabled={activeVoteId === post.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex-row justify-between items-center"
                      >
                         <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt}</Text>
                         {activeVoteId === post.id ? <ActivityIndicator size="small" /> : null}
                      </Pressable>
                    ))}
                  </View>
                )}

                {post.imageUrl && (
                  <Image 
                    source={{ uri: post.imageUrl }} 
                    className="w-full h-48 rounded-xl mt-4 bg-slate-100 dark:bg-slate-800" 
                    resizeMode="cover"
                  />
                )}
                
                {post.attachments && post.attachments.length > 0 && (
                  <View className="mt-4 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Text className="text-[10px] font-black uppercase text-slate-400">Attachments</Text>
                    {post.attachments.map((att, i) => (
                      <View key={i} className="flex-row items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <FileText size={16} className="text-blue-500" />
                        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">{att.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
