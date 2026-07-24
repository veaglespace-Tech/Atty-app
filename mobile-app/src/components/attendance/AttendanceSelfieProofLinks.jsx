import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Camera } from "lucide-react-native";







export default function AttendanceSelfieProofLinks({
  punchInSelfieUrl,
  punchOutSelfieUrl,
  missingLabel = "Missing"
}) {
  if (!punchInSelfieUrl && !punchOutSelfieUrl) {
    return (
      <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {missingLabel}
      </Text>);

  }

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {punchInSelfieUrl ?
      <Pressable
        onPress={() => handleOpenLink(punchInSelfieUrl)}
        className="flex-row items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 dark:border-blue-900/50 dark:bg-blue-900/20 active:bg-blue-100">
        
          <Camera size={11} className="text-blue-700 dark:text-blue-300 opacity-80" />
          <Text className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
            In Selfie
          </Text>
        </Pressable> :
      null}
      {punchOutSelfieUrl ?
      <Pressable
        onPress={() => handleOpenLink(punchOutSelfieUrl)}
        className="flex-row items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-900/50 dark:bg-emerald-900/20 active:bg-emerald-100">
        
          <Camera size={11} className="text-emerald-700 dark:text-emerald-300 opacity-80" />
          <Text className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            Out Selfie
          </Text>
        </Pressable> :
      null}
    </View>);

}
