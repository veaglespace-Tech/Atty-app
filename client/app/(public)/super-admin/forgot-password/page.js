"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import AuthPageShell, {
  authFieldClassName,
  authFieldErrorClassName,
  authFieldNormalClassName,
} from "@/components/auth/AuthPageShell";
import { useForgotPasswordMutation } from "@/services/api/authApi";
import { getErrorMessage, normalizeEmailInput } from "@/utils/formValidation";
import { ROLES } from "@/utils/roles";

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
});

export default function SuperAdminForgotPasswordPage() {
  return (
    <React.Suspense fallback={<SuperAdminForgotPasswordPageFallback />}>
      <SuperAdminForgotPasswordPageContent />
    </React.Suspense>
  );
}

function SuperAdminForgotPasswordPageContent() {
  const searchParams = useSearchParams();
  const [requestSent, setRequestSent] = React.useState(null);
  const [forgotPassword, { error: apiError }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "all",
    defaultValues: {
      email: String(searchParams.get("email") || "").trim(),
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        email: normalizeEmailInput(values.email),
        loginAs: ROLES.SUPER_ADMIN,
      };

      const response = await forgotPassword(payload).unwrap();
      setRequestSent({
        message: response?.message || "If this account exists, a reset link has been sent.",
        email: payload.email,
      });
    } catch (error) {
      console.error("Super admin forgot password request failed:", error);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Platform Recovery"
      title="Reset your super admin password"
      description="Enter the registered super admin email address. We will send a secure password reset link if the account exists."
      footer={
        <div className="space-y-3">
          <Link
            href="/super-admin/login"
            className="inline-flex items-center gap-2 font-bold text-blue-600 underline decoration-2 underline-offset-4 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <ArrowLeft size={16} />
            Return to super admin login
          </Link>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Workspace account?{" "}
            <Link
              href="/forgot-password"
              className="font-bold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
            >
              Use regular password reset
            </Link>
          </p>
        </div>
      }
    >
      {requestSent ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-6 text-center shadow-[0_24px_60px_rgba(16,185,129,0.12)] dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
              Reset email sent
            </h3>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
              {requestSent.message}
            </p>
            <div className="mt-5 rounded-[1.6rem] border border-white/70 bg-white/80 px-5 py-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                Email
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {requestSent.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRequestSent(null)}
            className="flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/80 py-4 font-black text-slate-900 shadow-[0_20px_46px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:hover:border-blue-400/30 dark:hover:text-blue-200"
          >
            Send another reset link
          </button>
        </div>
      ) : (
        <>
          {apiError ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
              {getErrorMessage(apiError, "Unable to process the reset request right now.")}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
            <div className="group relative">
              <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Super Admin Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                  <Mail size={20} />
                </span>
                <input
                  type="email"
                  placeholder="admin@veagle.com"
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
              Send Reset Link
            </button>
          </form>
        </>
      )}
    </AuthPageShell>
  );
}

function SuperAdminForgotPasswordPageFallback() {
  return (
    <AuthPageShell
      eyebrow="Platform Recovery"
      title="Reset your super admin password"
      description="Loading your recovery form..."
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950/72">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Preparing the password reset form.
        </p>
      </div>
    </AuthPageShell>
  );
}
