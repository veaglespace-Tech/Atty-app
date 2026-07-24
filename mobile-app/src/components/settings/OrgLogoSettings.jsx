import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { Building2, Save, Trash2, ImageUp } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import { useUpdateOrgLogoMutation } from "@/services/api/orgApi";
import { setCurrentUser } from "@/store/slices/authSlice";

export default function OrgLogoSettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [updateOrgLogo, { isLoading }] = useUpdateOrgLogoMutation();
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);

  const currentLogoUrl = user?.organization?.logoUrl || "";
  const previewLogoUrl = logoDataUrl || (removeLogo ? "" : currentLogoUrl);
  const hasPendingChange = Boolean(logoDataUrl) || removeLogo;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setLogoDataUrl(base64Img);
        setRemoveLogo(false);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const toggleLogoRemoval = () => {
    if (removeLogo) {
      setRemoveLogo(false);
      return;
    }
    if (logoDataUrl) {
      setLogoDataUrl("");
      return;
    }
    if (currentLogoUrl) {
      setRemoveLogo(true);
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

      if (user) {
        const updatedUser = {
          ...user,
          organization: {
            ...(user.organization || {}),
            logoUrl: updatedLogoUrl,
          },
        };
        dispatch(setCurrentUser(updatedUser));
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
      <View className="flex-row items-center gap-3 mb-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/20">
          <ImageUp size={18} className="text-purple-600 dark:text-purple-400" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-black text-slate-900 dark:text-white">Organization Logo</Text>
          <Text className="text-xs font-semibold text-slate-500">Upload a logo for the dashboard.</Text>
        </View>
      </View>

      <View className="gap-y-4">
        <View className="flex-row items-center gap-4">
          <View className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center overflow-hidden">
            {previewLogoUrl ? (
              <Image source={{ uri: previewLogoUrl }} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={32} className="text-slate-400" />
            )}
          </View>
          <View className="flex-1 gap-2">
            <TouchableOpacity onPress={pickImage} className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 flex-row items-center justify-center gap-2">
              <ImageUp size={14} className="text-slate-700 dark:text-slate-300" />
              <Text className="font-bold text-slate-700 dark:text-slate-300 text-sm">{previewLogoUrl ? "Change" : "Upload"}</Text>
            </TouchableOpacity>
            {(removeLogo || logoDataUrl || currentLogoUrl) ? (
              <TouchableOpacity onPress={toggleLogoRemoval} className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 flex-row items-center justify-center gap-2">
                <Trash2 size={14} className="text-rose-500" />
                <Text className="font-bold text-rose-500 text-sm">{removeLogo ? "Keep Current" : logoDataUrl ? "Clear" : "Remove"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading || !hasPendingChange}
          className={`mt-2 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-white active:scale-95 transition-transform ${isLoading || !hasPendingChange ? 'opacity-50' : ''}`}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white dark:text-slate-900 text-sm">Save Logo Update</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
