"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAdminSigninMutation } from "@/store/api/authApi";
import { hydrateFromStorage } from "@/store/slices/authSlice";
import { resolveDashboardPath, ROLES } from "@/utils/roles";
import { normalizeEmailInput } from "@/utils/formValidation";

const superAdminLoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

const fieldClassName =
  "w-full rounded-[1.6rem] border-2 bg-white px-4 py-4 text-slate-900 shadow-[0_18px_46px_rgba(59,130,246,0.12),0_10px_28px_rgba(15,23,42,0.07)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80 dark:border-white/75 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500 dark:shadow-[0_18px_45px_rgba(2,6,23,0.35)] dark:focus:border-blue-500 dark:focus:ring-blue-500/20";
const normalFieldClassName =
  "border-slate-200 hover:border-slate-300 dark:border-white/80";
const errorFieldClassName =
  "border-red-400 bg-red-50/70 focus:border-red-500 focus:ring-red-500/10 dark:border-red-300 dark:bg-white";

export default function SuperAdminLoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, user, hydrated, redirectPath } = useSelector((state) => state.auth);
  const [adminSignin, { error: apiError }] = useAdminSigninMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(superAdminLoginSchema),
    mode: "all",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (!hydrated || !token) return;
    if (user?.role === ROLES.SUPER_ADMIN) {
      const nextPath =
        resolveDashboardPath(user?.role, user?.dashboardPath || redirectPath) ||
        "/super-admin/dashboard";
      router.replace(nextPath);
    }
  }, [hydrated, redirectPath, router, token, user?.dashboardPath, user?.role]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        email: normalizeEmailInput(values.email),
        loginAs: ROLES.SUPER_ADMIN,
        organizationCode: "",
      };

      const result = await adminSignin(payload).unwrap();
      dispatch(hydrateFromStorage());

      const nextPath =
        resolveDashboardPath(result.user?.role, result.redirectPath || result.user?.dashboardPath) ||
        "/super-admin/dashboard";
      router.replace(nextPath);
    } catch (err) {
      console.error("Super Admin Login failed:", err);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 pb-12 pt-32 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-24 h-80 w-80 rounded-full bg-indigo-400/16 blur-[120px] dark:bg-blue-500/12" />
        <div className="absolute right-[-8%] top-36 h-72 w-72 rounded-full bg-blue-500/18 blur-[120px] dark:bg-indigo-500/16" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-cyan-400/12 blur-[120px] dark:bg-cyan-500/10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 shadow-[0_34px_100px_rgba(59,130,246,0.16),0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-colors duration-500 dark:border-slate-700/80 dark:bg-slate-950/78 dark:shadow-[0_35px_100px_rgba(2,6,23,0.55)] md:rounded-[2.4rem]">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300" />

          <div className="p-7 sm:p-8 md:p-12">
            <div className="mb-10 text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 shadow-lg shadow-blue-100/60 dark:border-blue-400/20 dark:bg-slate-900/70 dark:text-blue-200">
                <ShieldCheck size={14} className="text-blue-600 dark:text-blue-300" />
                Super Admin Access
              </div>
              <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Veagle Control Panel
              </h2>
              <p className="font-medium tracking-wide text-slate-500 dark:text-slate-300">
                Securely access platform-wide administration
              </p>
            </div>

            {apiError ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                {apiError?.data?.message || apiError?.message || "Login failed"}
              </motion.div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
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
                    placeholder="admin@veagle.com"
                    className={`${fieldClassName} !pl-12 ${errors.email ? errorFieldClassName : normalFieldClassName}`}
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
                <label className="mb-1.5 ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <Lock size={20} />
                  </span>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className={`${fieldClassName} !pl-12 ${errors.password ? errorFieldClassName : normalFieldClassName}`}
                    {...register("password")}
                  />
                </div>
                {errors.password ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-red-500">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-3 rounded-3xl bg-blue-600 py-5 font-black text-white shadow-[0_24px_60px_rgba(59,130,246,0.30)] transition-all duration-500 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_24px_60px_rgba(15,23,42,0.24)] active:scale-95 disabled:opacity-50 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_24px_60px_rgba(37,99,235,0.24)] dark:hover:bg-blue-300"
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <ArrowRight size={20} />
                )}
                Sign In to Veagle
              </button>
            </form>

            <div className="mt-10 text-center">
              <Link
                href="/login"
                className="font-bold text-blue-600 underline decoration-2 underline-offset-4 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Return to regular login
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
