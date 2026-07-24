import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ChevronLeft, Link2, Lock, Mail, MapPin, Phone, ShieldCheck, User, UserCircle2, Eye, EyeOff, Globe } from "lucide-react-native";

import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import CountryPhoneField from "@/components/CountryPhoneField";
import { useJoinOrganizationMutation } from "@/services/api/authApi";
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  PLACE_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
  isNotCommonEmailTypo } from
"@/utils/formValidation";

const userSchema = z.object({
  name: z.string().trim().min(2, "Required").max(120, "Too long").regex(PERSON_NAME_REGEX, "Invalid chars"),
  email: z.string().trim().min(1, "Required").email("Invalid email").refine(isNotCommonEmailTypo, { message: "Typo in email?" }),
  mobileCountryCode: z.string().regex(/^\+\d{1,3}$/, "Invalid code"),
  mobile: z.string().trim().refine((value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN, "Too short").refine((value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX, "Too long"),
  password: z.string().min(8, "Min 8 chars").max(64, "Max 64 chars").regex(/[A-Z]/, "Needs capital").regex(/[a-z]/, "Needs small letter").regex(/\d/, "Needs number").regex(/[!@#$%^&*(),.?":{}|<>]/, "Needs special char"),
  confirmPassword: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Gender is required" }),
  city: z.string().trim().min(1, "Required").max(80, "Too long").regex(PLACE_NAME_REGEX, "Invalid city"),
  emergencyContact: z.string().trim().refine((value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN, "Too short").refine((value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX, "Too long"),
  currentAddress: z.string().trim().min(5, "Required").max(191, "Too long"),
  permanentAddress: z.string().trim().min(5, "Required").max(191, "Too long"),
  referralCode: z.string().trim().min(1, "Required").regex(/^REF-[A-Za-z0-9]{8}$/i, "Format: REF-XXXXXXXX")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

const fieldClassName = "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-sm text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950 dark:text-slate-100";
const normalFieldClassName = "border-slate-200 dark:border-slate-800";
const errorFieldClassName = "border-red-400 bg-red-50/70 dark:border-red-900 dark:bg-red-900/20";

export default function UserRegisterPage() {
  const router = useRouter();
  const { ref: refParam } = useLocalSearchParams();

  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [joinOrganization, { isLoading: isSubmittingUser }] = useJoinOrganizationMutation();

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "", email: "", mobileCountryCode: "+91", mobile: "",
      password: "", confirmPassword: "", gender: "MALE",
      city: "", emergencyContact: "", currentAddress: "",
      permanentAddress: "", referralCode: ""
    }
  });

  const genderValue = useWatch({ control, name: "gender" });

  useEffect(() => {
    if (refParam) {
      setValue("referralCode", refParam, { shouldValidate: true });
    }
  }, [refParam, setValue]);

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      setSubmitMessage("");

      const payload = {
        ...values,
        name: normalizeTextInput(values.name),
        email: normalizeEmailInput(values.email),
        city: normalizeTextInput(values.city),
        mobile: toDigitsOnly(values.mobile),
        emergencyContact: toDigitsOnly(values.emergencyContact),
        currentAddress: normalizeTextInput(values.currentAddress),
        permanentAddress: normalizeTextInput(values.permanentAddress)
      };
      const normalizedReferralCode = values.referralCode.trim().toUpperCase();

      const response = await joinOrganization({
        referralCode: normalizedReferralCode,
        data: payload
      }).unwrap();

      setSubmitMessage(response?.message || "Registration submitted successfully. Wait for admin approval.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (error) {
      setSubmitError(error.data?.message || error.message || "Registration failed");
    }
  };

  const fields = [
  { name: "referralCode", label: "Referral Code", icon: Link2, placeholder: "REF-XXXXXXXX", type: "default" },
  { name: "name", label: "Full Name", icon: User, placeholder: "John Doe", type: "default" },
  { name: "email", label: "Email Address", icon: Mail, placeholder: "john@company.com", type: "email-address" },
  { name: "mobile", label: "Mobile Number", icon: Globe, placeholder: "9876543210", type: "phone-pad" },
  { name: "password", label: "Password", icon: Lock, placeholder: "Enter your password", type: "password" },
  { name: "confirmPassword", label: "Confirm Password", icon: ShieldCheck, placeholder: "Confirm your password", type: "password" },
  { name: "city", label: "City", icon: MapPin, placeholder: "Pune", type: "default" },
  { name: "emergencyContact", label: "Emergency Contact", icon: Phone, placeholder: "Emergency contact number", type: "phone-pad" }];


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <RegisterFlowShell
          badge="Member Registration"
          badgeIcon={UserCircle2}
          title="Join Your Team"
          description="Register as a member in your organization"
          beforeCard={
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 group">
            
              <ChevronLeft size={20} color="#64748b" className="dark:text-slate-300" />
              <Text className="text-sm font-bold text-slate-500 dark:text-slate-300">Back to Selection</Text>
            </Pressable>
          }>
          
          {submitError ?
          <View className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-rose-500/25 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-red-700 dark:text-rose-200">{submitError}</Text>
            </View> :
          null}

          {submitMessage ?
          <View className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
              <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">{submitMessage}</Text>
            </View> :
          null}

          <View className="gap-6">
            {fields.map((field) => {
              if (field.name === "mobile") {
                return (
                  <View key={field.name}>
                    <Controller
                      control={control}
                      name="mobileCountryCode"
                      render={({ field: countryField }) =>
                      <Controller
                        control={control}
                        name="mobile"
                        render={({ field: mobileField }) =>
                        <CountryPhoneField
                          label={field.label}
                          countryCode={countryField.value}
                          phone={mobileField.value}
                          onCountryCodeChange={countryField.onChange}
                          onPhoneChange={mobileField.onChange}
                          countryCodeError={errors.mobileCountryCode?.message}
                          phoneError={errors.mobile?.message} />

                        } />

                      } />
                    
                  </View>);

              }

              return (
                <View key={field.name} className="space-y-1.5">
                  <Text className="ml-1 mb-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    {field.label}
                  </Text>
                  <View className="relative justify-center">
                  <View className="absolute left-4 z-10">
                    <field.icon size={18} className="text-slate-400" />
                  </View>
                  <Controller
                      control={control}
                      name={field.name}
                      render={({ field: { onChange, onBlur, value } }) =>
                      <TextInput
                        className={`${fieldClassName} pl-12 ${field.type === 'password' ? 'pr-12' : ''} ${errors[field.name] ? errorFieldClassName : normalFieldClassName}`}
                        placeholder={field.placeholder}
                        placeholderTextColor="#94a3b8"
                        keyboardType={field.type === "password" ? "default" : field.type || "default"}
                        autoCapitalize={field.name === "referralCode" ? "characters" : "none"}
                        secureTextEntry={field.type === "password" ? field.name === "password" ? !showPassword : !showConfirmPassword : false}
                        editable={field.name === "referralCode" ? !refParam : true}
                        style={field.name === "referralCode" && refParam ? { opacity: 0.7 } : {}}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value} />

                      } />
                    
                  {field.type === "password" &&
                    <Pressable
                      className="absolute right-4 z-10 p-2"
                      onPress={() => field.name === "password" ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)}>
                      
                      {(field.name === "password" ? showPassword : showConfirmPassword) ?
                      <EyeOff size={18} className="text-slate-400" /> :

                      <Eye size={18} className="text-slate-400" />
                      }
                    </Pressable>
                    }
                </View>
                {errors[field.name] &&
                  <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">
                    {errors[field.name]?.message}
                  </Text>
                  }
              </View>);

            })}

            <View className="space-y-1.5 mt-2">
              <Text className="ml-1 mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                Gender
              </Text>
              <View className="flex-row gap-3">
                {["MALE", "FEMALE", "OTHER"].map((gender) =>
                <Pressable
                  key={gender}
                  onPress={() => setValue("gender", gender, { shouldValidate: true })}
                  className={`flex-1 items-center justify-center rounded-2xl border-2 py-4 ${
                  genderValue === gender ?
                  "border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400" :
                  "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`
                  }>
                  
                    <Text
                    className={`text-xs font-black uppercase tracking-wider ${
                    genderValue === gender ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"}`
                    }>
                    
                      {gender}
                    </Text>
                  </Pressable>
                )}
              </View>
              {errors.gender &&
              <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">
                  {errors.gender.message}
                </Text>
              }
            </View>

            <View className="space-y-1.5">
              <Text className="ml-1 mb-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Current Address</Text>
              <Controller
                control={control}
                name="currentAddress"
                render={({ field: { onChange, onBlur, value } }) =>
                <TextInput
                  multiline
                  numberOfLines={3}
                  className={`${fieldClassName} min-h-[100px] text-left align-top ${errors.currentAddress ? errorFieldClassName : normalFieldClassName}`}
                  placeholder="Enter your current address"
                  placeholderTextColor="#94a3b8"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value} />

                } />
              
              {errors.currentAddress && <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{errors.currentAddress.message}</Text>}
            </View>

            <View className="space-y-1.5">
              <Text className="ml-1 mb-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Permanent Address</Text>
              <Controller
                control={control}
                name="permanentAddress"
                render={({ field: { onChange, onBlur, value } }) =>
                <TextInput
                  multiline
                  numberOfLines={3}
                  className={`${fieldClassName} min-h-[100px] text-left align-top ${errors.permanentAddress ? errorFieldClassName : normalFieldClassName}`}
                  placeholder="Enter your permanent address"
                  placeholderTextColor="#94a3b8"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value} />

                } />
              
              {errors.permanentAddress && <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{errors.permanentAddress.message}</Text>}
            </View>

            <Pressable
              disabled={isSubmittingUser}
              onPress={handleSubmit(onSubmit)}
              className="group mt-4 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 active:scale-95 disabled:opacity-50 dark:bg-blue-400">
              
              {isSubmittingUser ?
              <ActivityIndicator color="white" /> :

              <>
                  <Text className="font-black text-white dark:text-slate-950 text-base">Complete Registration</Text>
                  <ArrowRight size={20} color="white" className="dark:text-slate-950" />
                </>
              }
            </Pressable>
          </View>
        </RegisterFlowShell>
      </ScrollView>
    </KeyboardAvoidingView>);

}
