import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert } from "react-native";
import { Building2, ImageUp, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useSelector, useDispatch } from "react-redux";
import { useUpdateOrgLogoMutation } from "@/services/api/orgApi";
import { setCurrentUser } from "@/store/slices/authSlice";

export default function OrgLogoSettings() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [updateOrgLogo, { isLoading }] = useUpdateOrgLogoMutation();
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);

  const currentLogoUrl = user?.organization?.logoUrl || "";
  const previewLogoUrl = logoDataUrl || (removeLogo ? "" : currentLogoUrl);
  const hasPendingChange = Boolean(logoDataUrl) || removeLogo;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || "image/jpeg";
        const base64Img = `data:${mimeType};base64,${asset.base64}`;
        setLogoDataUrl(base64Img);
        setRemoveLogo(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const toggleLogoRemoval = () => {
    if (removeLogo) {
      setRemoveLogo(false);
    } else {
      if (logoDataUrl) {
        setLogoDataUrl("");
      } else {
        if (currentLogoUrl) {
          setRemoveLogo(true);
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      const payload = {};
      if (logoDataUrl) {
        payload.logoDataUrl = logoDataUrl;
      } else if (removeLogo) {
        payload.removeLogo = true;
      }

      const response = await updateOrgLogo(payload).unwrap();
      const updatedLogoUrl = response?.data?.logoUrl || null;
      
      if (user?.organization) {
        dispatch(
          setCurrentUser({
            ...user,
            organization: {
              ...user.organization,
              logoUrl: updatedLogoUrl,
            },
          })
        );
      }

      setLogoDataUrl("");
      setRemoveLogo(false);
      Alert.alert("Success", "Organization logo updated successfully.");
    } catch (error) {
      Alert.alert("Error", error?.data?.message || error?.message || "Failed to update organization logo.");
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-[24px] p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Organization Logo</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">Upload a logo to appear in the dashboard navigation.</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center gap-4">
        <View className="h-24 w-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 items-center justify-center overflow-hidden shadow-sm">
          {previewLogoUrl ? (
            <Image source={{ uri: previewLogoUrl }} className="h-full w-full object-cover" />
          ) : (
            <Building2 size={32} className="text-slate-400" />
          )}
        </View>
        <View className="flex-1 min-w-[200px]">
          <View className="flex-row flex-wrap items-center gap-2 mb-3">
            <Pressable onPress={pickImage} className="flex-row items-center justify-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-2.5 active:bg-blue-100 dark:active:bg-blue-500/20">
              <ImageUp size={16} className="text-blue-600 dark:text-blue-400" />
              <Text className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {previewLogoUrl ? "Change Logo" : "Upload Logo"}
              </Text>
            </Pressable>
            {(removeLogo || logoDataUrl || currentLogoUrl) ? (
              <Pressable onPress={toggleLogoRemoval} className="flex-row items-center justify-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-2.5 active:bg-rose-100 dark:active:bg-rose-500/20">
                <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {removeLogo ? "Keep Current Logo" : logoDataUrl ? "Clear Selection" : "Remove Logo"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {removeLogo ? "Your current logo will be removed when you save." : logoDataUrl ? "New logo is ready. Save changes to publish it." : "Supported formats: JPG, PNG, WEBP. Max: 10 MB."}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={isLoading || !hasPendingChange}
        className={`mt-6 w-full flex-row items-center justify-center py-3.5 rounded-2xl ${isLoading || !hasPendingChange ? 'bg-blue-400' : 'bg-blue-600 shadow-sm active:bg-blue-700'}`}
      >
        {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white text-[15px]">Save Logo Update</Text>}
      </Pressable>
    </View>
  );
}
