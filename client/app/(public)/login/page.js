"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch } from "react-redux";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import SectionEyebrow from "@/components/SectionEyebrow";
import OrganizationLookupField from "@/components/OrganizationLookupField";
import {
  authCardClassName,
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName,
  authPageShellClassName,
} from "@/components/auth/AuthPageShell";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserSignInMutation } from "@/services/api/authApi";
import { setSession } from "@/store/slices/authSlice";
import { LOGIN_ROLE_OPTIONS, resolveDashboardPath, ROLES } from "@/utils/roles";
import { getErrorMessage, normalizeEmailInput } from "@/utils/formValidation";

const loginSchema = z
  .object({
    loginAs: z.string().min(1, "Login role is required"),
    email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    organizationId: z.string().optional(),
    organizationCode: z.string().optional(),
    organizationName: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.organizationId?.trim() && !value.organizationName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select or enter your organization",
        path: ["organizationId"],
      });
    }
  });

const publicRoleOptions = LOGIN_ROLE_OPTIONS.filter(
  (roleOption) => roleOption.value !== ROLES.SUPER_ADMIN
);
const shouldReportUnexpectedAuthError = (error) => {
  const status = error?.status ?? error?.originalStatus;
  return status === "FETCH_ERROR" || status === "PARSING_ERROR" || !status || Number(status) >= 500;
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, user, hydrated, redirectPath } = useAuthSession();
  const currentRole = user?.currentRole;
  const [userSignIn, { error: apiError }] = useUserSignInMutation();
  const [selectedOrganization, setSelectedOrganization] = React.useState(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "all",
    defaultValues: {
      loginAs: "",
      email: "",
      password: "",
      organizationId: "",
      organizationCode: "",
      organizationName: "",
    },
  });
  const [watchedLoginAs, watchedEmail, watchedOrganizationId, watchedOrganizationCode, watchedOrganizationName] =
    useWatch({
      control,
      name: ["loginAs", "email", "organizationId", "organizationCode", "organizationName"],
    });

  const forgotPasswordHref = (() => {
    const params = new URLSearchParams();

    if (watchedLoginAs) params.set("loginAs", watchedLoginAs);
    if (watchedEmail) params.set("email", watchedEmail);
    if (watchedOrganizationId) params.set("organizationId", watchedOrganizationId);
    if (watchedOrganizationCode) params.set("organizationCode", watchedOrganizationCode);
    if (watchedOrganizationId && watchedOrganizationName) {
      params.set("organizationName", watchedOrganizationName);
    }

    const query = params.toString();
    return query ? `/forgot-password?${query}` : "/forgot-password";
  })();

  React.useEffect(() => {
    if (!hydrated || !token) return;
    const nextPath =
      resolveDashboardPath(currentRole, user?.dashboardPath || redirectPath) ||
      "/member/dashboard";
    router.replace(nextPath);
  }, [currentRole, hydrated, redirectPath, router, token, user?.dashboardPath]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        email: normalizeEmailInput(values.email),
        organizationId: values.organizationId ? Number(values.organizationId) : undefined,
        organizationCode: values.organizationCode?.trim().toUpperCase() || undefined,
        organizationName: values.organizationName?.trim() || undefined,
      };

      const result = await userSignIn(payload).unwrap();

      dispatch(setSession(result));

      const nextPath =
        resolveDashboardPath(
          result.user?.currentRole,
          result.redirectPath || result.user?.dashboardPath
        ) || "/member/dashboard";
      router.replace(nextPath);
    } catch (err) {
      if (shouldReportUnexpectedAuthError(err)) {
        console.error("Login failed:", getErrorMessage(err, "Unable to sign in"));
      }
    }
  };

  return (
    <div className={authPageShellClassName}>
      <div className="pointer-events-none absolute inset-0">
        <div className="page-shell-orb-primary absolute left-[-6%] top-24 h-80 w-80 rounded-full blur-[120px]" />
        <div className="page-shell-orb-secondary absolute right-[-8%] top-36 h-72 w-72 rounded-full blur-[120px]" />
        <div className="page-shell-orb-tertiary absolute bottom-10 left-1/3 h-72 w-72 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className={authCardClassName}>
          <div className="surface-accent-bar h-1.5" />

          <div className="p-7 sm:p-8 md:p-12">
            <div className="mb-10 text-center">
              <SectionEyebrow className="mb-5">
                Team Login
              </SectionEyebrow>
              <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Welcome to Veagle Attendee
              </h2>
              <p className="font-medium tracking-wide text-slate-500 dark:text-slate-300">
                Sign in to manage attendance, check-ins, and your daily work in one place.
              </p>
            </div>

            {apiError ? (
              <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                {apiError?.data?.message || apiError?.message || "Login failed"}
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              <div className="group relative">
                <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Login As
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <ShieldCheck size={20} />
                  </span>
                  <span className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <ChevronDown size={18} />
                  </span>
                  <select
                    className={`${authFieldClassName} appearance-none !pl-12 pr-12 ${errors.loginAs ? authFieldErrorClassName : authFieldNormalClassName}`}
                    {...register("loginAs")}
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    {publicRoleOptions.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="ml-1 mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                  Choose the role assigned to your account.
                </p>
                {errors.loginAs ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                    {errors.loginAs.message}
                  </p>
                ) : null}
              </div>

              <div className="group relative">
                <OrganizationLookupField
                  label="Organization"
                  placeholder="Search by organization name or code"
                  helperText="Search your organization and select the correct one before signing in."
                  error={errors.organizationId?.message}
                  selectedOrganization={selectedOrganization}
                  onSelect={(organization) => {
                    setSelectedOrganization(organization);
                    setValue("organizationId", String(organization.id), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setValue("organizationCode", organization.organizationCode || "", {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setValue("organizationName", organization.name || "", {
                      shouldDirty: true,
                    });
                    clearErrors("organizationId");
                  }}
                  onClear={() => {
                    setSelectedOrganization(null);
                    setValue("organizationId", "", { shouldValidate: true, shouldDirty: true });
                    setValue("organizationCode", "", { shouldDirty: true });
                    setValue("organizationName", "", { shouldDirty: true });
                  }}
                  onInputValueChange={(value) => {
                    setValue("organizationName", value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    if (value.trim()) {
                      clearErrors("organizationId");
                    }
                  }}
                  labelClassName="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  inputClassName={authFieldClassName}
                  normalFieldClassName={authFieldNormalClassName}
                  errorFieldClassName={authFieldErrorClassName}
                />
                <input type="hidden" {...register("organizationId")} />
                <input type="hidden" {...register("organizationCode")} />
                <input type="hidden" {...register("organizationName")} />
              </div>

              <div className="group relative">
                <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <Mail size={20} />
                  </span>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className={`${authFieldClassName} !pl-12 ${errors.email ? authFieldErrorClassName : authFieldNormalClassName}`}
                    {...register("email")}
                  />
                </div>
                {errors.email ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="group relative">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <Link
                    href={forgotPasswordHref}
                    className="text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <PasswordInput
                  icon={Lock}
                  placeholder="Enter your password"
                  className={`${authFieldClassName} !pl-12 ${errors.password ? authFieldErrorClassName : authFieldNormalClassName}`}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-2 flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-[0_28px_70px_rgba(59,130,246,0.32)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_32px_80px_rgba(15,23,42,0.24)] active:scale-95 disabled:opacity-50 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)] dark:hover:bg-blue-300"
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <ArrowRight
                    size={20}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                )}
                Sign In
              </button>
            </form>

            <div className="mt-10 space-y-3 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                New here?{" "}
                <Link
                  href="/register"
                  className="font-bold text-blue-600 underline decoration-2 underline-offset-4 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Create your organization
                </Link>
              </p>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Need platform-level access?{" "}
                <Link
                  href="/super-admin/login"
                  className="font-bold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                >
                  Open super admin login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
