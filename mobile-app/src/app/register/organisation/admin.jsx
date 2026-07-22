import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, Lock, Mail, MapPin, ShieldCheck, User, Eye, EyeOff, Globe, CheckCircle2 } from "lucide-react-native";

import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import RegisterStepBack from "@/components/register/RegisterStepBack";
import CountryPhoneField from "@/components/CountryPhoneField";
import { API_BASE_URL } from "@/services/api/baseApi";
import { useCheckEmailMutation } from "@/services/api/authApi";
import { ROLES } from "@/utils/roles";
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
import { getRegistrationDraft, REGISTRATION_DRAFT_KEYS, setRegistrationDraft, clearAllRegistrationDrafts } from "@/utils/registerDraft";

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Required").max(120, "Too long").regex(PERSON_NAME_REGEX, "Invalid chars"),
  email: z.string().trim().min(1, "Required").email("Invalid email address").refine(isNotCommonEmailTypo, { message: "Typo in email?" }),
  mobileCountryCode: z.string().regex(/^\+\d{1,3}$/, "Invalid code"),
  mobile: z.string().trim().refine((value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN, "Too short").refine((value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX, "Too long"),
  password: z.string().min(8, "Min 8 chars").max(64, "Max 64 chars").regex(/[A-Z]/, "Needs capital").regex(/[a-z]/, "Needs small letter").regex(/\d/, "Needs number").regex(/[!@#$%^&*(),.?":{}|<>]/, "Needs special char"),
  confirmPassword: z.string(),
  city: z.string().trim().min(1, "Required").max(80, "Too long").regex(PLACE_NAME_REGEX, "Invalid city"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Gender is required" }),
  role: z.string().default(ROLES.ORG_ADMIN)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

const fieldClassName = "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-sm text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950 dark:text-slate-100";
const normalFieldClassName = "border-slate-200 dark:border-slate-800";
const errorFieldClassName = "border-red-400 bg-red-50/70 dark:border-red-900 dark:bg-red-900/20";

const adminDefaultValues = {
  name: "",
  email: "",
  mobileCountryCode: "+91",
  mobile: "",
  password: "",
  confirmPassword: "",
  city: "",
  gender: "MALE",
  role: ROLES.ORG_ADMIN
};

export default function AdminRegistration() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [successState, setSuccessState] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, setValue, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: adminDefaultValues
  });
  
  const [checkEmail] = useCheckEmailMutation();

  const genderValue = useWatch({ control, name: "gender" });

  const onSubmit = async (values) => {
    setSubmitError("");
    try {
      const adminDraft = {
        ...values,
        name: normalizeTextInput(values.name),
        email: normalizeEmailInput(values.email),
        city: normalizeTextInput(values.city),
        mobile: toDigitsOnly(values.mobile)
      };

      try {
        const res = await checkEmail(adminDraft.email).unwrap();
        if (res.exists) {
          setError("email", { type: "manual", message: "This email is already registered." });
          return;
        }
      } catch (err) {
        console.error("Failed to check email:", err);
        setError("email", { type: "manual", message: "Failed to verify email availability." });
        return;
      }

      setRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin, adminDraft);

      const orgDraft = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
      
      const res = await fetch(`${API_BASE_URL}/auth/register-org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: orgDraft,
          admin: adminDraft,
          plan: { name: 'Free Trial', code: 'FREE' }
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setSuccessState({
        organizationName: orgDraft?.name || "Your organization",
        adminEmail: adminDraft?.email || "",
        planName: "Free Trial",
        emailSent: true,
        freeTrial: true
      });
    } catch (error) {
      setSubmitError(error.message || "Something went wrong during registration.");
    }
  };

  const fields = [
  { name: "name", label: "Full Name", icon: User, placeholder: "John Doe" },
  { name: "email", label: "Admin Email", icon: Mail, placeholder: "admin@company.com", type: "email-address" },
  { name: "mobile", label: "Mobile Number", icon: Globe, placeholder: "9876543210", type: "phone-pad" },
  { name: "city", label: "City", icon: MapPin, placeholder: "Mumbai" },
  { name: "password", label: "Password", icon: Lock, placeholder: "Enter your password", type: "password" },
  { name: "confirmPassword", label: "Confirm Password", icon: ShieldCheck, placeholder: "Confirm your password", type: "password" }];


  useEffect(() => {
    const storedOrganization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    if (!storedOrganization) {
      router.replace("/register/organisation");
      return;
    }

    const storedAdmin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!storedAdmin) return;

    reset({
      ...adminDefaultValues,
      ...storedAdmin,
      mobileCountryCode: storedAdmin.mobileCountryCode || adminDefaultValues.mobileCountryCode,
      gender: storedAdmin.gender || adminDefaultValues.gender,
      role: storedAdmin.role || adminDefaultValues.role
    });
  }, [reset, router]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <RegisterFlowShell
          badge="Step 2 of 4"
          badgeIcon={ShieldCheck}
          title="Admin Profile"
          description="Create your organization's primary administrator"
          beforeCard={
            !successState ? (
              <RegisterStepBack href="/register/organisation" label="Back to Organization Details" />
            ) : null
          }>
          
          {submitError && !successState ? (
            <View className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-rose-500/25 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-red-700 dark:text-rose-200">{submitError}</Text>
            </View>
          ) : null}

          {successState ? (
            <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4">
              <View className="items-center mb-8">
                <View className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center border border-emerald-100 dark:border-emerald-800 mb-4">
                  <CheckCircle2 size={36} className="text-emerald-500 dark:text-emerald-400" />
                </View>
                <Text className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">
                  Registration Success
                </Text>
                <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
                  Workspace Activated
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Your registration is complete. We have shared the organization code on your registered email.
                </Text>
              </View>

              <View className="gap-4 mb-8">

                <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <Text className="text-[10px] font-black uppercase text-slate-400 mb-1">Workspace</Text>
                  <Text className="text-sm font-black text-slate-900 dark:text-white">{successState.organizationName}</Text>
                </View>
                <View className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl">
                  <Text className="text-[10px] font-black uppercase text-emerald-600/60 dark:text-emerald-400/60 mb-1">Email</Text>
                  <Text className="text-sm font-black text-emerald-700 dark:text-emerald-300">{successState.adminEmail}</Text>
                </View>
              </View>

              <View className="gap-3">
                <Pressable
                  onPress={() => { clearAllRegistrationDrafts(); router.replace("/login"); }}
                  className="bg-slate-900 dark:bg-blue-600 py-4 rounded-full items-center justify-center flex-row gap-2">
                  <Text className="text-white font-black text-sm">Go to Login</Text>
                  <ChevronRight size={18} color="white" />
                </Pressable>
                <Pressable
                  onPress={() => { clearAllRegistrationDrafts(); router.replace("/"); }}
                  className="border border-slate-200 dark:border-slate-700 py-4 rounded-full items-center justify-center">
                  <Text className="text-slate-700 dark:text-slate-300 font-black text-sm">Back to Home</Text>
                </Pressable>
              </View>
            </View>
          ) : (
          <View className="gap-5">
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
                        autoCapitalize="none"
                        secureTextEntry={field.type === "password" ? field.name === "password" ? !showPassword : !showConfirmPassword : false}
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
                  onPress={() => setValue("gender", gender, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
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

            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              className="group mt-6 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 active:scale-95 disabled:opacity-50 dark:bg-blue-400">
              
              {isSubmitting ?
              <ActivityIndicator color="white" /> :

              <Text className="font-black text-white dark:text-slate-950 text-base">Next</Text>
              }
              {!isSubmitting && <ChevronRight size={20} color="white" className="dark:text-slate-950" />}
            </Pressable>
          </View>
          )}
        </RegisterFlowShell>
      </ScrollView>
    </KeyboardAvoidingView>);

}