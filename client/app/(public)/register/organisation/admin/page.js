"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import PasswordInput from "@/components/PasswordInput";
import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import { ROLES } from "@/utils/roles";
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  PLACE_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
} from "@/utils/formValidation";

const registrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name is required")
      .max(120, "Full name is too long")
      .regex(
        PERSON_NAME_REGEX,
        "Full name can only include letters, spaces, apostrophes, dots, or hyphens"
      ),
    email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
    mobileCountryCode: z.string().regex(/^\+\d{1,3}$/, "Select a valid country code"),
    mobile: z
      .string()
      .trim()
      .refine(
        (value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN,
        "Mobile number is too short"
      )
      .refine(
        (value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX,
        "Mobile number is too long"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(64, "Password must be at most 64 characters")
      .regex(/[A-Z]/, "Password must contain at least one capital letter")
      .regex(/[a-z]/, "Password must contain at least one small letter")
      .regex(/\d/, "Password must contain at least one number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
    city: z
      .string()
      .trim()
      .min(1, "City is required")
      .max(80, "City is too long")
      .regex(PLACE_NAME_REGEX, "Enter a valid city"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { required_error: "Gender is required" }),
    role: z.string().default(ROLES.ORG_ADMIN),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const fieldClassName =
  "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-sm text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80 dark:border-white/75 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500 dark:shadow-[0_18px_45px_rgba(2,6,23,0.35)] dark:focus:border-blue-500 dark:focus:ring-blue-500/20";
const normalFieldClassName = "border-slate-200 hover:border-slate-300 dark:border-white/80";
const errorFieldClassName =
  "border-red-400 bg-red-50/70 focus:border-red-500 focus:ring-red-500/10 dark:border-red-300 dark:bg-white";

export default function AdminRegistration() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    mode: "all",
    defaultValues: {
      name: "",
      email: "",
      mobileCountryCode: "+91",
      mobile: "",
      password: "",
      confirmPassword: "",
      city: "",
      gender: "MALE",
      role: ROLES.ORG_ADMIN,
    },
  });

  const genderValue = useWatch({
    control,
    name: "gender",
  });

  const onSubmit = async (values) => {
    setSubmitError("");
    try {
      localStorage.setItem(
        "adminData",
        JSON.stringify({
          ...values,
          name: normalizeTextInput(values.name),
          email: normalizeEmailInput(values.email),
          city: normalizeTextInput(values.city),
          mobile: toDigitsOnly(values.mobile),
        })
      );
      router.push("/register/organisation/plan");
    } catch (error) {
      setSubmitError(error.message || "Something went wrong during registration.");
    }
  };

  const fields = [
    { name: "name", label: "Full Name", icon: User, placeholder: "John Doe" },
    { name: "email", label: "Admin Email", icon: Mail, placeholder: "admin@company.com", type: "email" },
    { name: "city", label: "City", icon: MapPin, placeholder: "Mumbai" },
    { name: "password", label: "Password", icon: Lock, placeholder: "Enter your password", type: "password" },
    { name: "confirmPassword", label: "Confirm Password", icon: ShieldCheck, placeholder: "Confirm your password", type: "password" },
  ];
  const mobileCountryCode = useWatch({ control, name: "mobileCountryCode" });
  const mobile = useWatch({ control, name: "mobile" });

  return (
    <RegisterFlowShell
      badge="Step 2 of 4"
      badgeIcon={ShieldCheck}
      title="Admin Profile"
      description="Create your organization&apos;s primary administrator"
    >
      {submitError ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
          {submitError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            icon={field.icon}
            placeholder={field.placeholder}
            error={errors[field.name]?.message}
          >
            {field.type === "password" ? (
              <PasswordInput
                icon={null}
                {...register(field.name)}
                className={`${fieldClassName} !pl-12 ${errors[field.name] ? errorFieldClassName : normalFieldClassName}`}
              />
            ) : (
              <input
                type={field.type || "text"}
                {...register(field.name)}
                className={`${fieldClassName} !pl-12 ${errors[field.name] ? errorFieldClassName : normalFieldClassName}`}
              />
            )}
          </Field>
        ))}

        <CountryPhoneField
          label="Admin Mobile Number"
          required
          countryCode={mobileCountryCode}
          phone={mobile || ""}
          onCountryCodeChange={(event) =>
            setValue("mobileCountryCode", event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onPhoneChange={(event) =>
            setValue("mobile", event.target.value.replace(/[^\d]/g, ""), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          countryCodeError={errors.mobileCountryCode?.message}
          phoneError={errors.mobile?.message}
          containerClassName="space-y-1.5 md:col-span-2"
          labelClassName="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300"
        />
        <input type="hidden" {...register("mobileCountryCode")} />
        <input type="hidden" {...register("mobile")} />

        <div className="space-y-1.5 md:col-span-2">
          <label className="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300">
            Gender
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            {["MALE", "FEMALE", "OTHER"].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() =>
                  setValue("gender", gender, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
                className={`rounded-[1.4rem] border-2 px-4 py-4 text-sm font-black uppercase tracking-wider transition-all duration-300 ${genderValue === gender ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 dark:border-white/80 dark:bg-white dark:text-slate-700"}`}
              >
                {gender}
              </button>
            ))}
          </div>
          {errors.gender ? (
            <p className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">
              {errors.gender.message}
            </p>
          ) : null}
        </div>

        <div className="mt-6 md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-[0_28px_70px_rgba(59,130,246,0.28)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_30px_76px_rgba(15,23,42,0.22)] active:scale-95 disabled:opacity-50 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)] dark:hover:bg-blue-300"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </form>
    </RegisterFlowShell>
  );
}

function Field({ label, icon: Icon, placeholder, error, children }) {
  return (
    <div className="space-y-1.5">
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
