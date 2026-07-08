import React, { useEffect } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ChevronRight, Globe, Mail, MapPin, ShieldCheck } from "lucide-react-native";

import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import RegisterStepBack from "@/components/register/RegisterStepBack";
import CountryPhoneField from "@/components/CountryPhoneField";
import { API_BASE_URL } from "@/services/api/baseApi";
import {
  ORGANIZATION_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  PLACE_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
  isNotCommonEmailTypo,
} from "@/utils/formValidation";
import { getRegistrationDraft, REGISTRATION_DRAFT_KEYS, setRegistrationDraft } from "@/utils/registerDraft";

const organisationSchema = z.object({
  name: z.string().trim().min(2, "Required").max(100, "Too long").regex(ORGANIZATION_NAME_REGEX, "Invalid chars"),
  email: z.string().trim().min(1, "Required").email("Invalid email").refine(isNotCommonEmailTypo, { message: "Typo in email?" }),
  phoneCountryCode: z.string().regex(/^\+\d{1,3}$/, "Invalid code"),
  phone: z.string().trim().min(1, "Required").refine((value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN, "Too short").refine((value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX, "Too long"),
  city: z.string().trim().min(1, "Required").max(80, "Too long").regex(PLACE_NAME_REGEX, "Invalid city"),
  state: z.string().trim().min(1, "Required").max(80, "Too long").regex(PLACE_NAME_REGEX, "Invalid state"),
  country: z.string().trim().min(1, "Required").max(80, "Too long").regex(PLACE_NAME_REGEX, "Invalid country"),
  address: z.string().trim().max(180, "Too long").optional(),
});

const fieldClassName = "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-sm text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:bg-slate-950 dark:text-slate-100";
const normalFieldClassName = "border-slate-200 dark:border-slate-800";
const errorFieldClassName = "border-red-400 bg-red-50/70 dark:border-red-900 dark:bg-red-900/20";

const organisationDefaultValues = {
  name: "",
  email: "",
  phoneCountryCode: "+91",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
};

export default function OrganisationForm() {
  const router = useRouter();
  const { partnerRef } = useLocalSearchParams<{ partnerRef: string }>();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(organisationSchema),
    defaultValues: organisationDefaultValues,
  });

  useEffect(() => {
    let activePartnerRef = partnerRef;
    const storedOrganization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);

    if (!storedOrganization) {
      if (activePartnerRef) {
        setRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation, { partnerReferralCode: activePartnerRef });
      }
      return;
    }

    if (activePartnerRef && !storedOrganization.partnerReferralCode) {
      storedOrganization.partnerReferralCode = activePartnerRef;
      setRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation, storedOrganization);
    }

    reset({
      ...organisationDefaultValues,
      ...storedOrganization,
      phoneCountryCode: storedOrganization.phoneCountryCode || organisationDefaultValues.phoneCountryCode,
      country: storedOrganization.country || organisationDefaultValues.country,
    });
  }, [reset, partnerRef]);

  const onSubmit = async (values: any) => {
    const existingDraft = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation) || {};
    const orgDraft = {
      ...existingDraft,
      ...values,
      name: normalizeTextInput(values.name),
      email: normalizeEmailInput(values.email),
      city: normalizeTextInput(values.city),
      state: normalizeTextInput(values.state),
      country: normalizeTextInput(values.country),
      address: normalizeTextInput(values.address),
      phone: toDigitsOnly(values.phone),
    };
    setRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation, orgDraft);

    try {
      await fetch(`${API_BASE_URL}/auth/save-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: orgDraft, admin: {} }),
      });
    } catch (err) {
      console.error("Failed to save lead:", err);
    }

    // Navigate to next step
    router.push("/register/organisation/admin" as any);
  };

  const fields = [
    { name: "name", label: "Organization Name", icon: Building2, placeholder: "Acme Corp" },
    { name: "email", label: "Business Email", icon: Mail, placeholder: "contact@acme.com", type: "email-address" },
    { name: "phone", label: "Phone", icon: Globe, placeholder: "9876543210", type: "phone-pad" },
    { name: "city", label: "City", icon: Globe, placeholder: "Mumbai" },
    { name: "state", label: "State", icon: Globe, placeholder: "Maharashtra" },
    { name: "country", label: "Country", icon: Globe, placeholder: "India" },
    { name: "address", label: "Office Address (Optional)", icon: MapPin, placeholder: "Street, Area, etc." },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <RegisterFlowShell
          badge="Step 1 of 4"
          badgeIcon={ShieldCheck}
          title="Register Organization"
          description="Company profile setup"
          beforeCard={
            <RegisterStepBack href="/register" label="Back to Registration Options" />
          }
        >
          <View className="gap-5">
            {fields.map((field) => {
              if (field.name === "phone") {
                return (
                  <View key={field.name}>
                    <Controller
                      control={control}
                      name="phoneCountryCode"
                      render={({ field: countryField }) => (
                        <Controller
                          control={control}
                          name="phone"
                          render={({ field: phoneField }) => (
                            <CountryPhoneField
                              label={field.label}
                              countryCode={countryField.value}
                              phone={phoneField.value}
                              onCountryCodeChange={countryField.onChange}
                              onPhoneChange={phoneField.onChange}
                              countryCodeError={errors.phoneCountryCode?.message as string}
                              phoneError={errors.phone?.message as string}
                            />
                          )}
                        />
                      )}
                    />
                  </View>
                );
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
                    name={field.name as any}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`${fieldClassName} pl-12 ${errors[field.name as keyof typeof errors] ? errorFieldClassName : normalFieldClassName}`}
                        placeholder={field.placeholder}
                        placeholderTextColor="#94a3b8"
                        keyboardType={(field.type as any) || "default"}
                        autoCapitalize="none"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                </View>
                {errors[field.name as keyof typeof errors] && (
                  <Text className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">
                    {errors[field.name as keyof typeof errors]?.message as string}
                  </Text>
                )}
              </View>
              );
            })}

            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              className="group mt-4 flex-row w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 active:scale-95 disabled:opacity-50 dark:bg-blue-400"
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-black text-white dark:text-slate-950 text-base">Save and Setup Admin</Text>
              )}
              {!isSubmitting && <ChevronRight size={20} color="white" className="dark:text-slate-950" />}
            </Pressable>
          </View>
        </RegisterFlowShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
