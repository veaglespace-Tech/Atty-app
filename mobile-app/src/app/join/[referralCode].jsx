import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, MapPin, Building2, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react-native';

import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName
} from '@/components/auth/AuthPageShell';
import { useJoinOrganizationMutation, useValidateReferralCodeQuery } from '@/services/api/authApi';
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  PLACE_NAME_REGEX,
  toDigitsOnly
} from '@/utils/formValidation';

const joinSchema = z.object({
  name: z.string().trim().min(2, "Name is required").regex(PERSON_NAME_REGEX, "Invalid name"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  mobile: z.string().trim()
    .refine((v) => toDigitsOnly(v).length >= PHONE_DIGIT_MIN, "Mobile too short")
    .refine((v) => toDigitsOnly(v).length <= PHONE_DIGIT_MAX, "Mobile too long"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one capital letter")
    .regex(/[a-z]/, "Password must contain at least one small letter")
    .regex(/\d/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { required_error: "Gender is required" }),
  bloodGroup: z.string().optional(),
  city: z.string().trim().min(1, "City is required").regex(PLACE_NAME_REGEX, "Enter a valid city"),
  emergencyContact: z.string().trim()
    .refine((v) => toDigitsOnly(v).length >= PHONE_DIGIT_MIN, "Emergency contact too short")
    .refine((v) => toDigitsOnly(v).length <= PHONE_DIGIT_MAX, "Emergency contact too long"),
  currentAddress: z.string().trim().min(5, "Address is required"),
  permanentAddress: z.string().trim().min(5, "Address is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function JoinPage() {
  const { referralCode } = useLocalSearchParams();
  const router = useRouter();

  const { data: orgData, isLoading: isOrgLoading, error: orgError } = useValidateReferralCodeQuery(referralCode, {
    skip: !referralCode,
  });

  const [joinOrganization] = useJoinOrganizationMutation();
  
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      name: "", email: "", mobile: "", password: "", confirmPassword: "",
      gender: "MALE", bloodGroup: "", city: "", emergencyContact: "",
      currentAddress: "", permanentAddress: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      const payload = {
        ...values,
        mobileCountryCode: "+91", // Default for mobile app for simplicity
        mobile: toDigitsOnly(values.mobile),
        emergencyContact: toDigitsOnly(values.emergencyContact),
      };

      const response = await joinOrganization({ referralCode, data: payload }).unwrap();
      setSuccessMessage(response?.message || "Registration request submitted. Wait for admin approval.");
      
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
    } catch (error) {
      setSubmitError(error.data?.message || "Registration failed. Try again.");
    }
  };

  if (!referralCode || isOrgLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-5">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-sm font-semibold text-slate-500">Validating invite link...</Text>
      </View>
    );
  }

  if (orgError) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
        <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center mb-6">
          <AlertCircle size={32} className="text-rose-600" />
        </View>
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Invalid Link</Text>
        <Text className="text-sm font-medium text-slate-500 text-center mb-8">
          The referral link you followed is expired or invalid. Please ask your admin for a new link.
        </Text>
        <Pressable onPress={() => router.replace("/login")} className="w-full bg-blue-600 py-4 rounded-2xl items-center">
          <Text className="text-white font-black">Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  if (successMessage) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center p-6">
        <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-6">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </View>
        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Request Submitted</Text>
        <Text className="text-sm font-medium text-slate-500 text-center mb-8">
          {successMessage}
        </Text>
      </View>
    );
  }

  const organization = orgData?.organization;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthPageShell
          eyebrow="Join Organization"
          title={organization?.name || "Join Our Team"}
          description={`${organization?.city ? `${organization.city}, ` : ""}${organization?.country || ""}`}>
          
          {submitError ? (
            <View className="mb-4 rounded-xl bg-red-50 p-3 flex-row items-center gap-2">
              <AlertCircle size={16} color="#dc2626" />
              <Text className="text-sm font-semibold text-red-600 flex-1">{submitError}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            <Field name="name" control={control} errors={errors} icon={User} placeholder="Full Name" />
            <Field name="email" control={control} errors={errors} icon={Mail} placeholder="Email Address" type="email-address" autoCapitalize="none" />
            <Field name="mobile" control={control} errors={errors} icon={Phone} placeholder="Mobile Number" type="phone-pad" />
            
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Gender</Text>
                <Controller control={control} name="gender" render={({ field: { onChange, value } }) => (
                  <View className="relative justify-center">
                    <Text className={`absolute left-4 z-10 font-medium ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {value === "MALE" ? "Male" : value === "FEMALE" ? "Female" : "Other"}
                    </Text>
                    <TextInput 
                      className={`${authFieldClassName} pl-4 pr-10 text-transparent opacity-0 absolute inset-0 z-20`}
                    />
                    <View className={`${authFieldClassName} ${errors.gender ? authFieldErrorClassName : authFieldNormalClassName} pl-4 pr-10`} />
                    <ChevronDown size={18} className="absolute right-4 text-slate-400 z-10" />
                  </View>
                )} />
              </View>

              <View className="flex-1">
                <Text className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-widest text-slate-500">Blood Grp</Text>
                <Controller control={control} name="bloodGroup" render={({ field: { onChange, value } }) => (
                  <View className="relative justify-center">
                    <TextInput 
                      className={`${authFieldClassName} ${errors.bloodGroup ? authFieldErrorClassName : authFieldNormalClassName} px-4`}
                      placeholder="e.g. O+"
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="characters"
                    />
                  </View>
                )} />
              </View>
            </View>

            <Field name="city" control={control} errors={errors} icon={MapPin} placeholder="City" />
            <Field name="emergencyContact" control={control} errors={errors} icon={Phone} placeholder="Emergency Contact" type="phone-pad" />
            
            <View className="space-y-1.5">
              <Text className="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300">
                Current Address
              </Text>
              <Controller control={control} name="currentAddress" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`${authFieldClassName} ${errors.currentAddress ? authFieldErrorClassName : authFieldNormalClassName} px-4 py-3 min-h-[80px]`}
                  placeholder="Enter your current address"
                  multiline
                  textAlignVertical="top"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value} />
              )} />
              {errors.currentAddress && <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{errors.currentAddress.message}</Text>}
            </View>

            <View className="space-y-1.5">
              <Text className="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300">
                Permanent Address
              </Text>
              <Controller control={control} name="permanentAddress" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`${authFieldClassName} ${errors.permanentAddress ? authFieldErrorClassName : authFieldNormalClassName} px-4 py-3 min-h-[80px]`}
                  placeholder="Enter your permanent address"
                  multiline
                  textAlignVertical="top"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value} />
              )} />
              {errors.permanentAddress && <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{errors.permanentAddress.message}</Text>}
            </View>

            <Field name="password" control={control} errors={errors} icon={Lock} placeholder="Create Password" secureTextEntry />
            <Field name="confirmPassword" control={control} errors={errors} icon={ShieldCheck} placeholder="Confirm Password" secureTextEntry />
            
            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              className="mt-6 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 shadow-[0_28px_70px_rgba(59,130,246,0.32)] active:scale-95 dark:bg-blue-400">
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ArrowRight size={20} color="white" className="dark:text-slate-950" />
              )}
              <Text className="font-black text-white dark:text-slate-950 text-base">Submit Request</Text>
            </Pressable>
          </View>
        </AuthPageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ name, control, errors, icon: Icon, placeholder, type = "default", autoCapitalize = "words", secureTextEntry = false }) {
  return (
    <View className="space-y-1.5">
      <Text className="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300">
        {placeholder}
      </Text>
      <View className="group relative justify-center">
        {Icon && (
          <View className="absolute left-4 z-10">
            <Icon size={18} className="text-slate-400" />
          </View>
        )}
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`${authFieldClassName} ${Icon ? 'pl-12' : 'pl-4'} pr-4 ${errors[name] ? authFieldErrorClassName : authFieldNormalClassName}`}
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              keyboardType={type}
              autoCapitalize={autoCapitalize}
              secureTextEntry={secureTextEntry}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value} />
          )} />
      </View>
      {errors[name] && <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{errors[name].message}</Text>}
    </View>
  );
}
