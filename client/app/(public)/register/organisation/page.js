"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import RegisterStepBack from "@/components/register/RegisterStepBack";
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
import {
  getRegistrationDraft,
  REGISTRATION_DRAFT_KEYS,
  setRegistrationDraft,
} from "@/utils/registerDraft";

const organisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name is required")
    .max(100, "Organization name is too long")
    .regex(
      ORGANIZATION_NAME_REGEX,
      "Organization name can only include letters, numbers, spaces, and . & ( ) - characters"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Business email is required")
    .email("Invalid business email address")
    .refine(isNotCommonEmailTypo, {
      message: "Did you mean .com or .co.in? Please enter a valid email address.",
    }),
  phoneCountryCode: z.string().regex(/^\+\d{1,3}$/, "Select a valid country code"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN,
      "Business phone number is too short"
    )
    .refine(
      (value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX,
      "Business phone number is too long"
    ),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(80, "City is too long")
    .regex(PLACE_NAME_REGEX, "Enter a valid city"),
  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .max(80, "State is too long")
    .regex(PLACE_NAME_REGEX, "Enter a valid state"),
  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .max(80, "Country is too long")
    .regex(PLACE_NAME_REGEX, "Enter a valid country"),
  address: z.string().trim().max(180, "Address is too long").optional(),
});

const fieldClassName =
  "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-sm text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80 dark:border-white/75 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500 dark:shadow-[0_18px_45px_rgba(2,6,23,0.35)] dark:focus:border-blue-500 dark:focus:ring-blue-500/20";
const normalFieldClassName = "border-slate-200 hover:border-slate-300 dark:border-white/80";
const errorFieldClassName =
  "border-red-400 bg-red-50/70 focus:border-red-500 focus:ring-red-500/10 dark:border-red-300 dark:bg-white";
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
const browserAutofillBlockProps = {
  autoComplete: "on",
};
const emailFieldProps = {
  ...browserAutofillBlockProps,
  inputMode: "email",
  autoCapitalize: "none",
  spellCheck: false,
};

export default function OrganisationForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(organisationSchema),
    mode: "all",
    defaultValues: organisationDefaultValues,
  });
  const phoneCountryCode = useWatch({ control, name: "phoneCountryCode" });
  const phone = useWatch({ control, name: "phone" });

  React.useEffect(() => {
    const storedOrganization = getRegistrationDraft(
      REGISTRATION_DRAFT_KEYS.organisation
    );

    if (!storedOrganization) return;

    reset({
      ...organisationDefaultValues,
      ...storedOrganization,
      phoneCountryCode:
        storedOrganization.phoneCountryCode ||
        organisationDefaultValues.phoneCountryCode,
      country: storedOrganization.country || organisationDefaultValues.country,
    });
  }, [reset]);

  const onSubmit = async (values) => {
    setRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation, {
      ...values,
      name: normalizeTextInput(values.name),
      email: normalizeEmailInput(values.email),
      city: normalizeTextInput(values.city),
      state: normalizeTextInput(values.state),
      country: normalizeTextInput(values.country),
      address: normalizeTextInput(values.address),
      phone: toDigitsOnly(values.phone),
    });
    router.push("/register/organisation/admin");
  };

  const fields = [
    { name: "name", label: "Organization Name", icon: Building2, placeholder: "Acme Corp" },
    { name: "email", label: "Business Email", icon: Mail, placeholder: "contact@acme.com", type: "email" },
    { name: "city", label: "City", icon: Globe, placeholder: "Mumbai" },
    { name: "state", label: "State", icon: Globe, placeholder: "Maharashtra" },
    { name: "country", label: "Country", icon: Globe, placeholder: "India" },
    { name: "address", label: "Office Address (Optional)", icon: MapPin, placeholder: "Street, Area, etc." },
  ];

  return (
    <RegisterFlowShell
      badge="Step 1 of 4"
      badgeIcon={ShieldCheck}
      title="Register Organization"
      description="Company profile setup"
      beforeCard={
        <RegisterStepBack
          href="/register"
          label="Back to Registration Options"
        />
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-5 md:grid-cols-2"
      >
        {fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            icon={field.icon}
            placeholder={field.placeholder}
            error={errors[field.name]?.message}
            className={field.name === "address" ? "md:col-span-2" : ""}
          >
            <input
              type={field.type || "text"}
              {...register(field.name)}
              {...(field.name === "email" ? emailFieldProps : browserAutofillBlockProps)}
              className={`${fieldClassName} !pl-12 ${errors[field.name] ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>
        ))}

        <CountryPhoneField
          label="Business Phone"
          required
          countryCode={phoneCountryCode}
          phone={phone || ""}
          countryCodeName="organisationPhoneCountryCodeDisplay"
          phoneName="organisationPhoneDisplay"
          selectAutoComplete="on"
          phoneAutoComplete="on"
          onCountryCodeChange={(event) =>
            setValue("phoneCountryCode", event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            })
          }
          onPhoneChange={(event) =>
            setValue("phone", event.target.value.replace(/[^\d]/g, ""), {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            })
          }
          countryCodeError={errors.phoneCountryCode?.message}
          phoneError={errors.phone?.message}
          helpText=""
          containerClassName="space-y-1.5 md:col-span-2"
          labelClassName="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300"
          selectProps={browserAutofillBlockProps}
          phoneProps={browserAutofillBlockProps}
        />
        <input type="hidden" {...register("phoneCountryCode")} />
        <input type="hidden" {...register("phone")} />

        <div className="mt-4 md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group mt-2 flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-[0_28px_70px_rgba(59,130,246,0.28)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_30px_76px_rgba(15,23,42,0.22)] active:scale-95 disabled:opacity-50 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)] dark:hover:bg-blue-300"
          >
            Save and Setup Admin
            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </form>
    </RegisterFlowShell>
  );
}

function Field({ label, icon: Icon, placeholder, error, className, children }) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <label className="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300">
        {label}
      </label>
      <div className="group relative">
        <Icon
          size={18}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
        />
        {React.cloneElement(children, { placeholder })}
      </div>
      {error ? (
        <p className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
