"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserCircle2,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import CountryPhoneField from "@/components/CountryPhoneField";
import PasswordInput from "@/components/PasswordInput";
import RegisterFlowShell from "@/components/register/RegisterFlowShell";
import { 
  useJoinOrganizationMutation, 
  useValidateReferralCodeQuery 
} from "@/services/api/authApi";
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  PLACE_NAME_REGEX,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
  isNotCommonEmailTypo,
} from "@/utils/formValidation";

const joinSchema = z
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
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Invalid email address")
      .refine(isNotCommonEmailTypo, {
        message: "Did you mean .com or .co.in? Please enter a valid email address.",
      }),
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
      .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { required_error: "Gender is required" }),
    city: z
      .string()
      .trim()
      .min(1, "City is required")
      .max(80, "City is too long")
      .regex(PLACE_NAME_REGEX, "Enter a valid city"),
    emergencyContact: z
      .string()
      .trim()
      .refine(
        (value) => toDigitsOnly(value).length >= PHONE_DIGIT_MIN,
        "Emergency contact number is too short"
      )
      .refine(
        (value) => toDigitsOnly(value).length <= PHONE_DIGIT_MAX,
        "Emergency contact number is too long"
      ),
    currentAddress: z
      .string()
      .trim()
      .min(5, "Current address is required")
      .max(191, "Current address is too long"),
    permanentAddress: z
      .string()
      .trim()
      .min(5, "Permanent address is required")
      .max(191, "Permanent address is too long"),
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

export default function JoinPage() {
  const { referralCode } = useParams();
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { 
    data: orgData, 
    isLoading: isOrgLoading, 
    error: orgError 
  } = useValidateReferralCodeQuery(referralCode);

  const [joinOrganization, { isLoading: isJoining }] = useJoinOrganizationMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(joinSchema),
    mode: "all",
    defaultValues: {
      name: "",
      email: "",
      mobileCountryCode: "+91",
      mobile: "",
      password: "",
      confirmPassword: "",
      gender: "MALE",
      city: "",
      emergencyContact: "",
      currentAddress: "",
      permanentAddress: "",
    },
  });

  const mobileCountryCode = useWatch({ control, name: "mobileCountryCode" });
  const mobile = useWatch({ control, name: "mobile" });

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      const payload = {
        ...values,
        name: normalizeTextInput(values.name),
        email: normalizeEmailInput(values.email),
        city: normalizeTextInput(values.city),
        mobile: toDigitsOnly(values.mobile),
        emergencyContact: toDigitsOnly(values.emergencyContact),
        currentAddress: normalizeTextInput(values.currentAddress),
        permanentAddress: normalizeTextInput(values.permanentAddress),
      };

      const response = await joinOrganization({ referralCode, data: payload }).unwrap();
      setSuccessMessage(response?.message || "Registration request submitted. Wait for admin approval.");
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setSubmitError(error.data?.message || "Registration failed. Try again.");
    }
  };

  if (isOrgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (orgError) {
    return (
      <RegisterFlowShell
        badge="Invalid Link"
        badgeIcon={AlertCircle}
        title="Link Expired or Invalid"
        description="The referral link you followed is no longer valid."
      >
        <div className="text-center">
          <p className="mb-8 text-slate-500 dark:text-slate-400">
            Please ask your organization administrator for a new join link.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-slate-900"
          >
            Go to Login
          </button>
        </div>
      </RegisterFlowShell>
    );
  }

  const organization = orgData?.organization;

  if (successMessage) {
    return (
      <RegisterFlowShell
        badge="Request Submitted"
        badgeIcon={CheckCircle2}
        title="Check Pending"
        description={`Your request to join ${organization?.name} was submitted.`}
      >
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-500/10">
              <CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {successMessage}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Redirecting you to login in a few seconds...
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white transition-all hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </RegisterFlowShell>
    );
  }

  return (
    <RegisterFlowShell
      badge="Join Organization"
      badgeIcon={Building2}
      title={organization?.name || "Join Our Team"}
      description={`${organization?.city ? `${organization.city}, ` : ""}${organization?.country || ""}`}
    >
      {submitError ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={18} />
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Full Name" icon={User} placeholder="John Doe" error={errors.name?.message}>
            <input
              type="text"
              {...register("name")}
              className={`${fieldClassName} !pl-12 ${errors.name ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <Field label="Email Address" icon={Mail} placeholder="john@company.com" error={errors.email?.message}>
            <input
              type="email"
              {...register("email")}
              className={`${fieldClassName} !pl-12 ${errors.email ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <CountryPhoneField
            label="Mobile Number"
            required
            countryCode={mobileCountryCode}
            phone={mobile || ""}
            onCountryCodeChange={(event) =>
              setValue("mobileCountryCode", event.target.value, { shouldValidate: true })
            }
            onPhoneChange={(event) =>
              setValue("mobile", event.target.value.replace(/[^\d]/g, ""), { shouldValidate: true })
            }
            countryCodeError={errors.mobileCountryCode?.message}
            phoneError={errors.mobile?.message}
            containerClassName="space-y-1.5"
            labelClassName="ml-1 block text-[11px] font-black uppercase tracking-widest leading-none text-slate-500 dark:text-slate-300"
          />

          <Field label="City" icon={MapPin} placeholder="e.g. Pune" error={errors.city?.message}>
            <input
              type="text"
              {...register("city")}
              className={`${fieldClassName} !pl-12 ${errors.city ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <Field label="Password" icon={Lock} placeholder="Create password" error={errors.password?.message}>
            <PasswordInput
              icon={null}
              {...register("password")}
              className={`${fieldClassName} !pl-12 ${errors.password ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <Field label="Confirm Password" icon={ShieldCheck} placeholder="Confirm password" error={errors.confirmPassword?.message}>
            <PasswordInput
              icon={null}
              {...register("confirmPassword")}
              className={`${fieldClassName} !pl-12 ${errors.confirmPassword ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <Field label="Gender" error={errors.gender?.message}>
            <select
              {...register("gender")}
              className={`${fieldClassName} appearance-none ${errors.gender ? errorFieldClassName : normalFieldClassName}`}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field
            label="Emergency Contact"
            icon={Phone}
            placeholder="Emergency contact number"
            error={errors.emergencyContact?.message}
          >
            <input
              type="tel"
              {...register("emergencyContact")}
              className={`${fieldClassName} !pl-12 ${errors.emergencyContact ? errorFieldClassName : normalFieldClassName}`}
            />
          </Field>

          <div className="md:col-span-2">
            <Field
              label="Current Address"
              placeholder="Enter your current address"
              error={errors.currentAddress?.message}
            >
              <textarea
                rows={3}
                {...register("currentAddress")}
                className={`${fieldClassName} resize-none ${errors.currentAddress ? errorFieldClassName : normalFieldClassName}`}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field
              label="Permanent Address"
              placeholder="Enter your permanent address"
              error={errors.permanentAddress?.message}
            >
              <textarea
                rows={3}
                {...register("permanentAddress")}
                className={`${fieldClassName} resize-none ${errors.permanentAddress ? errorFieldClassName : normalFieldClassName}`}
              />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={isJoining}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 active:scale-95 disabled:opacity-50 dark:bg-blue-400 dark:text-slate-950"
        >
          {isJoining ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
          Join Organization
        </button>
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
        {Icon && (
          <Icon
            size={18}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
          />
        )}
        {React.cloneElement(children, { placeholder })}
      </div>
      {error && <p className="ml-1 mt-1 text-[10px] font-black uppercase text-red-500">{error}</p>}
    </div>
  );
}
