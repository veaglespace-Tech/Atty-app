import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ChevronLeft, MessageSquare, Plus, Trash2, Edit2, X, Search, FileText, Megaphone, BarChart2, Trophy, CheckCircle2, Image as ImageIcon } from "lucide-react-native";
import { 
  useGetOrgPostsQuery, 
  useCreatePostMutation, 
  useUpdatePostMutation, 
  useVoteOnPostMutation,
  useDeletePostMutation 
} from "@/services/api/postApi";
import { useGetTeamLeaderTeamsQuery } from "@/services/api/teamLeaderApi";
import { useAuthSession } from "@/hooks/useAuthSession";

const POST_TYPES = [
  { value: "NOTIFICATION", label: "Notification", icon: Megaphone, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30" },
  { value: "ARTICLE", label: "Article", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  { value: "NEWS", label: "News", icon: Megaphone, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/30" },
  { value: "POLL", label: "Poll", icon: BarChart2, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30" },
  { value: "TOURNAMENT_CARD", label: "Tournament", icon: Trophy, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/30" },
];

export default function TeamLeaderPostsPage() {
  const { user } = useAuthSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeVoteId, setActiveVoteId] = useState(null);
  
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "NOTIFICATION",
    options: ["", ""],
    attachment: null
  });
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const { data: teamsData } = useGetTeamLeaderTeamsQuery(100);
  const teams = useMemo(() => teamsData?.items || teamsData?.teams || [], [teamsData]);

  const { data, isLoading, isFetching, refetch } = useGetOrgPostsQuery({ authorId: user?.id }, { skip: !user?.id });
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [voteOnPost] = useVoteOnPostMutation();

  const posts = useMemo(() => data?.items || [], [data]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = 
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "ALL" || post.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [posts, searchTerm, typeFilter]);

  const resetForm = () => {
    setForm({ title: "", content: "", type: "NOTIFICATION", options: ["", ""], attachment: null });
    setSelectedTeamId("");
    setEditingId(null);
    setModalVisible(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (post) => {
    setForm({
      title: post.title || "",
      content: post.content || "",
      type: post.type || "NOTIFICATION",
      options: post.metadata?.options || ["", ""],
      attachment: post.metadata?.attachment ? { uri: post.metadata.attachment.url, existing: true } : null
    });
    setSelectedTeamId(post.teamId ? post.teamId.toString() : "");
    setEditingId(post.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert("Error", "Title and content are required.");
      return;
    }

    try {
      const payload = { 
        title: form.title, 
        content: form.content, 
        type: form.type 
      };

      if (selectedTeamId) {
        payload.teamId = Number(selectedTeamId);
      }

      if (form.attachment) {
        if (!form.attachment.existing) {
          payload.attachmentDataUrl = `data:${form.attachment.mimeType || 'image/jpeg'};base64,${form.attachment.base64}`;
          payload.attachmentName = form.attachment.name || 'image.jpg';
        }
      } else {
        payload.attachmentDataUrl = "";
      }

      if (form.type === "POLL") {
        const validOptions = form.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          Alert.alert("Error", "A poll must have at least 2 options.");
          return;
        }
        payload.metadata = { options: validOptions };
      }

      if (editingId) {
        await updatePost({ id: editingId, ...payload }).unwrap();
      } else {
        await createPost(payload).unwrap();
      }
      resetForm();
    } catch (error) {
      Alert.alert("Error", error?.data?.message || "Failed to save post.");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await deletePost(id).unwrap();
          } catch (error) {
            Alert.alert("Error", error?.data?.message || "Failed to delete post.");
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
      Alert.alert("Error", err?.data?.message || "Failed to save poll response");
    } finally {
      setActiveVoteId(null);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setForm({
        ...form,
        attachment: {
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'upload.jpg',
        }
      });
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft size={20} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Announcements</Text>
          <Pressable onPress={openAddModal} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Plus size={20} className="text-blue-600 dark:text-blue-400" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
          <Search size={16} className="text-slate-400 ml-2" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search posts..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900 dark:text-white font-medium p-1"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <Pressable 
            onPress={() => setTypeFilter("ALL")}
            className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === "ALL" ? 'bg-slate-800 border-slate-800 dark:bg-white dark:border-white' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
          >
            <Text className={`text-xs font-black uppercase tracking-widest ${typeFilter === "ALL" ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>All Types</Text>
          </Pressable>
          {POST_TYPES.map(t => (
            <Pressable 
              key={t.value}
              onPress={() => setTypeFilter(t.value)}
              className={`px-4 py-2 rounded-full mr-2 border flex-row items-center gap-1 ${typeFilter === t.value ? 'bg-slate-800 border-slate-800 dark:bg-white dark:border-white' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <t.icon size={12} className={typeFilter === t.value ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'} />
              <Text className={`text-xs font-black uppercase tracking-widest ${typeFilter === t.value ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading || isFetching} onRefresh={refetch} tintColor="#2563eb" />}
      >
        {isLoading && posts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-4">
            <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <Text className="text-slate-500 font-medium text-center">No posts found.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {filteredPosts.map((post) => {
              const typeInfo = POST_TYPES.find(t => t.value === post.type) || POST_TYPES[0];
              const Icon = typeInfo.icon;
              
              const isPoll = post.type === "POLL";
              const totalVotes = isPoll && post.pollResults ? post.pollResults.reduce((sum, res) => sum + res.count, 0) : 0;
              const hasVoted = isPoll && post.pollResults ? post.pollResults.some(res => res.hasVoted) : false;

              return (
                <View key={post.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center flex-wrap gap-2 mb-2">
                        <View className={`px-2 py-1 rounded-md flex-row items-center gap-1 ${typeInfo.bg}`}>
                          <Icon size={10} className={typeInfo.color} />
                          <Text className={`text-[9px] font-black uppercase tracking-widest ${typeInfo.color}`}>{typeInfo.label}</Text>
                        </View>
                        {post.teamId && (
                          <View className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30">
                            <Text className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Team Post</Text>
                          </View>
                        )}
                        <Text className="text-[10px] font-bold text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-lg font-black text-slate-900 dark:text-white">{post.title}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Pressable onPress={() => openEditModal(post)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Edit2 size={14} className="text-slate-600 dark:text-slate-400" />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(post.id)} disabled={isDeleting} className="h-8 w-8 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30">
                        <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                      </Pressable>
                    </View>
                  </View>

                  <Text className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {post.content}
                  </Text>

                  {post.metadata?.attachment?.url && (
                    <View className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-slate-100 dark:border-slate-800">
                      <Image 
                        source={{ uri: post.metadata.attachment.url }} 
                        className="w-full h-full"
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                  )}

                  {isPoll && post.metadata?.options && (
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                      {post.metadata.options.map((option, idx) => {
                        const result = post.pollResults?.find((r) => r.optionIndex === idx);
                        const count = result?.count || 0;
                        const voted = result?.hasVoted || false;
                        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const isVotingThis = activeVoteId === post.id;

                        return (
                          <View key={idx} className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            {hasVoted && (
                              <View 
                                className="absolute left-0 top-0 bottom-0 bg-blue-100 dark:bg-blue-900/30" 
                                style={{ width: `${percentage}%` }} 
                              />
                            )}
                            <Pressable 
                              disabled={hasVoted || isVotingThis}
                              onPress={() => handleVote(post.id, idx)}
                              className="p-3 flex-row items-center justify-between relative z-10"
                            >
                              <View className="flex-row items-center gap-2 flex-1">
                                {voted ? (
                                  <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <View className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />
                                )}
                                <Text className={`text-sm font-semibold flex-1 ${voted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{option}</Text>
                              </View>
                              {hasVoted && (
                                <Text className="text-xs font-black text-slate-500">{percentage}%</Text>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                      <Text className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mt-2">
                        {totalVotes} Total Votes
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[90%] p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {editingId ? "Edit Post" : "Create Post"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                
                {teams.length > 0 && (
                  <View>
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Target Audience</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                      <Pressable 
                        onPress={() => setSelectedTeamId("")}
                        className={`px-4 py-2 rounded-xl mr-2 border ${!selectedTeamId ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                      >
                        <Text className={`text-xs font-bold ${!selectedTeamId ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>🏢 Whole Organization</Text>
                      </Pressable>
                      {teams.map(team => (
                        <Pressable 
                          key={team.id}
                          onPress={() => setSelectedTeamId(team.id.toString())}
                          className={`px-4 py-2 rounded-xl mr-2 border ${selectedTeamId === team.id.toString() ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                        >
                          <Text className={`text-xs font-bold ${selectedTeamId === team.id.toString() ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{team.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                    {POST_TYPES.map(t => (
                      <Pressable 
                        key={t.value}
                        onPress={() => setForm({ ...form, type: t.value })}
                        className={`px-4 py-2 rounded-xl mr-2 border flex-row items-center gap-2 ${form.type === t.value ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                      >
                        <t.icon size={14} className={form.type === t.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'} />
                        <Text className={`text-xs font-bold ${form.type === t.value ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>{t.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                
                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Title</Text>
                  <TextInput
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    placeholder="Enter announcement title"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white font-medium"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Content</Text>
                  <TextInput
                    value={form.content}
                    onChangeText={(text) => setForm({ ...form, content: text })}
                    placeholder="Write your message..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    textAlignVertical="top"
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 h-32 text-slate-900 dark:text-white font-medium"
                  />
                </View>

                {form.type !== "POLL" && (
                  <View>
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Attachment</Text>
                    {form.attachment ? (
                      <View className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <Image source={{ uri: form.attachment.uri }} className="w-full h-full" contentFit="cover" />
                        <Pressable 
                          onPress={() => setForm({ ...form, attachment: null })}
                          className="absolute top-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                        >
                          <X size={16} className="text-white" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable 
                        onPress={pickImage}
                        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl p-6 items-center justify-center flex-row gap-2"
                      >
                        <ImageIcon size={20} className="text-slate-400" />
                        <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Add an image</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {form.type === "POLL" && (
                  <View className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                    <Text className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-3">Poll Options</Text>
                    <View className="space-y-3">
                      {form.options.map((opt, idx) => (
                        <View key={idx} className="flex-row items-center gap-2">
                          <TextInput
                            value={opt}
                            onChangeText={(text) => {
                              const newOpts = [...form.options];
                              newOpts[idx] = text;
                              setForm({ ...form, options: newOpts });
                            }}
                            placeholder={`Option ${idx + 1}`}
                            placeholderTextColor="#cbd5e1"
                            className="flex-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3 text-slate-900 dark:text-white text-sm"
                          />
                          {form.options.length > 2 && (
                            <Pressable 
                              onPress={() => {
                                const newOpts = form.options.filter((_, i) => i !== idx);
                                setForm({ ...form, options: newOpts });
                              }}
                              className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/50"
                            >
                              <Trash2 size={16} className="text-rose-500" />
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                    {form.options.length < 5 && (
                      <Pressable 
                        onPress={() => setForm({ ...form, options: [...form.options, ""] })}
                        className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-700/50 items-center border-dashed"
                      >
                        <Text className="text-xs font-bold text-amber-600 dark:text-amber-500">+ Add Option</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              <Pressable 
                onPress={handleSave} 
                disabled={isCreating || isUpdating}
                className="bg-blue-600 active:bg-blue-700 p-4 rounded-xl items-center justify-center mt-8 mb-4 shadow-sm shadow-blue-600/20"
              >
                {isCreating || isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {editingId ? "Save Changes" : "Publish Post"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}