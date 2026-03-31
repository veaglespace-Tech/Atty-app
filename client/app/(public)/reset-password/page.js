"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName,
} from "@/components/auth/AuthPageShell";
import {
  useResetPasswordMutation,
  useValidateResetPasswordTokenMutation,
} from "@/services/api/authApi";
import { getErrorMessage } from "@/utils/formValidation";
import { formatRoleLabel } from "@/utils/roles";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters")
      .max(128, "Password is too long"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<ResetPasswordPageFallback />}>
      <ResetPasswordPageContent />
    </React.Suspense>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();
  const [tokenState, setTokenState] = React.useState(null);
  const [validationMessage, setValidationMessage] = React.useState(
    token ? "" : "Reset link is missing. Please request a new password reset email."
  );
  const [isValidating, setIsValidating] = React.useState(Boolean(token));
  const [resetComplete, setResetComplete] = React.useState(null);
  const [validateResetPasswordToken] = useValidateResetPasswordTokenMutation();
  const [resetPassword, { error: resetError }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "all",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!token) {
      setTokenState(null);
      setValidationMessage("Reset link is missing. Please request a new password reset email.");
      setIsValidating(false);
      return undefined;
    }

    setIsValidating(true);
    setValidationMessage("");
    setTokenState(null);

    const verifyToken = async () => {
      try {
        const response = await validateResetPasswordToken({ token }).unwrap();
        if (cancelled) return;

        setTokenState({
          emailHint: response?.emailHint || "",
          role: response?.role || "",
          loginPath: response?.loginPath || "/login",
        });
      } catch (error) {
        if (cancelled) return;

        setValidationMessage(getErrorMessage(error, "Reset link is invalid or expired."));
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, [token, validateResetPasswordToken]);

  const loginPath = resetComplete?.loginPath || tokenState?.loginPath || "/login";
  const loginLabel =
    loginPath === "/super-admin/login" ? "Return to super admin login" : "Return to login";

  const onSubmit = async (values) => {
    try {
      const response = await resetPassword({
        token,
        password: values.password,
      }).unwrap();

      reset();
      setResetComplete({
        message:
          response?.message ||
          "Password reset successful. Please sign in with your new password.",
        loginPath: response?.loginPath || tokenState?.loginPath || "/login",
      });
    } catch (error) {
      console.error("Reset password failed:", error);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Choose a new password"
      description="Use a strong new password for your Veagle Attendee account. Once saved, your previous password will stop working."
      footer={
        <div className="space-y-3">
          <Link
            href={loginPath}
            className="inline-flex items-center gap-2 font-bold text-blue-600 underline decoration-2 underline-offset-4 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <ArrowLeft size={16} />
            {loginLabel}
          </Link>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Need a new link?{" "}
            <Link
              href="/forgot-password"
              className="font-bold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
            >
              Request workspace reset
            </Link>
            {" or "}
            <Link
              href="/super-admin/forgot-password"
              className="font-bold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
            >
              super admin reset
            </Link>
          </p>
        </div>
      }
    >
      {resetComplete ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-6 text-center shadow-[0_24px_60px_rgba(16,185,129,0.12)] dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
              Password updated
            </h3>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
              {resetComplete.message}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Your old password is no longer valid.
            </p>
          </div>

          <Link
            href={resetComplete.loginPath}
            className="group flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-[0_28px_70px_rgba(59,130,246,0.32)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_32px_80px_rgba(15,23,42,0.24)] dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)] dark:hover:bg-blue-300"
          >
            <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
            Sign in now
          </Link>
        </div>
      ) : isValidating ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950/72">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
            Verifying reset link
          </h3>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            Please wait while we confirm your password reset request.
          </p>
        </div>
      ) : validationMessage ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50/90 p-6 text-center shadow-[0_24px_60px_rgba(239,68,68,0.10)] dark:border-rose-500/25 dark:bg-rose-500/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:bg-rose-400/15 dark:text-rose-300">
            <AlertTriangle size={28} />
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
            Link unavailable
          </h3>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            {validationMessage}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This can happen if the link expired, was already used, or the password was already changed.
          </p>
        </div>
      ) : (
        <>
          {tokenState ? (
            <div className="mb-6 rounded-[1.8rem] border border-blue-100 bg-blue-50/90 px-5 py-4 shadow-[0_18px_46px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                Verified Account
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck size={16} className="text-blue-600 dark:text-blue-300" />
                {formatRoleLabel(tokenState.role)}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {tokenState.emailHint}
              </p>
            </div>
          ) : null}

          {resetError ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
              {getErrorMessage(resetError, "Unable to update your password right now.")}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
            <div className="group relative">
              <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                  <Lock size={20} />
                </span>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  className={`${authFieldClassName} !pl-12 ${errors.password ? authFieldErrorClassName : authFieldNormalClassName}`}
                  {...register("password")}
                />
              </div>
              <p className="ml-1 mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                Use at least 8 characters so your account stays secure.
              </p>
              {errors.password ? (
                <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="group relative">
              <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                  <Lock size={20} />
                </span>
                <input
                  type="password"
                  placeholder="Re-enter your new password"
                  className={`${authFieldClassName} !pl-12 ${errors.confirmPassword ? authFieldErrorClassName : authFieldNormalClassName}`}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword ? (
                <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                  {errors.confirmPassword.message}
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
              Save New Password
            </button>
          </form>
        </>
      )}
    </AuthPageShell>
  );
}

function ResetPasswordPageFallback() {
  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Choose a new password"
      description="Loading your password reset request..."
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950/72">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Verifying your password reset request.
        </p>
      </div>
    </AuthPageShell>
  );
}
