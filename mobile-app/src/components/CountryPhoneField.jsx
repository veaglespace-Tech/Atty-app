import React from "react";
import { View, Text, TextInput } from "react-native";
import { Phone } from "lucide-react-native";
import { cn } from "@/lib/utils";

export default function CountryPhoneField({
  label = "Mobile Number",
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  countryCodeError = "",
  phoneError = "",
  helpText = "",
  disabled = false,
  required = false,
  containerClassName = ""
}) {
  const hasError = Boolean(countryCodeError || phoneError);

  return (
    <View className={containerClassName}>
      <View className="flex-row items-center mb-1.5 ml-1">
        <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
          {label}
        </Text>
        {required && <Text className="text-red-500 ml-1">*</Text>}
      </View>

      <View
        className={cn(
          "flex-row min-w-0 overflow-hidden rounded-[1.4rem] border-2 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950",
          hasError ?
          "border-red-400 bg-red-50/70 dark:border-red-400/60 dark:bg-rose-500/10" :
          "border-slate-200 dark:border-slate-700"
        )}>
        
        <View className="items-center justify-center border-r border-slate-200 px-3 text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Phone size={18} color="#94a3b8" />
        </View>

        <TextInput
          value={countryCode}
          onChangeText={onCountryCodeChange}
          editable={!disabled}
          placeholder="+91"
          placeholderTextColor="#94a3b8"
          textContentType="none"
          autoComplete="off"
          className="w-[3.5rem] sm:w-[4.5rem] border-r border-slate-200 bg-white px-2 py-3 text-xs font-semibold text-slate-900 sm:px-3 sm:py-4 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        

        <TextInput
          keyboardType="phone-pad"
          value={phone}
          onChangeText={onPhoneChange}
          editable={!disabled}
          placeholder="Enter phone"
          placeholderTextColor="#94a3b8"
          textContentType="telephoneNumber"
          autoComplete="tel"
          className="flex-1 bg-white px-3 py-3 text-sm text-slate-900 sm:px-4 sm:py-4 dark:bg-slate-950 dark:text-slate-100" />
        
      </View>

      {hasError ?
      <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">
          {countryCodeError || phoneError}
        </Text> :
      helpText ?
      <Text className="ml-1 mt-1 text-xs font-medium text-slate-400">
          {helpText}
        </Text> :
      null}
    </View>);

}