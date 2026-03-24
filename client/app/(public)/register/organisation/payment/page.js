"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useArchiveFailedRegistrationMutation,
  useCreatePaymentOrderMutation,
  useLazyGetPaymentPublicKeyQuery,
  useVerifyAndRegisterPaymentMutation,
} from "@/services/api/paymentApi";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sparkles,
  Lock,
  Building,
  Zap,
  Mail,
  Moon,
  Sun
} from "lucide-react";
import { isHiddenPaidMonthlyPlan } from "@/utils/plans";

const PAYMENT_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Enterprise-grade Security",
    desc: "Your data is 100% encrypted and secure with us.",
  },
  {
    icon: Zap,
    title: "Instant Activation",
    desc: "Get full access immediately after successful payment.",
  },
  {
    icon: Building,
    title: "Scalable Infrastructure",
    desc: "Grows seamlessly as your team expands.",
  },
];

const PAYMENT_BADGES = ["Razorpay", "Visa / Mastercard", "Protected Checkout"];

const PLAN_CODE_BY_NAME = {
  basic: "BASIC",
  pro: "PRO",
  advanced: "ADVANCED",
};

const normalizePlan = (plan) => {
  if (!plan) return null;
  const fallbackCode = PLAN_CODE_BY_NAME[String(plan.name || "").toLowerCase()];

  return {
    ...plan,
    code: plan.code || fallbackCode,
  };
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [successState, setSuccessState] = useState(null);
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyAndRegisterPayment] = useVerifyAndRegisterPaymentMutation();
  const [getPaymentPublicKey] = useLazyGetPaymentPublicKeyQuery();
  const [archiveFailedRegistration] = useArchiveFailedRegistrationMutation();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleArchive = async (reason = "Registration abandoned") => {
    try {
      const organization = JSON.parse(localStorage.getItem("organisationData") || "null");
      const admin = JSON.parse(localStorage.getItem("adminData") || "null");

      if (organization && admin) {
        await archiveFailedRegistration({
          organization,
          admin,
          reason
        }).unwrap();
      }
    } catch (err) {
      console.error("Failed to archive registration attempt", err);
    }
  };

  useEffect(() => {
    const storedPlan = localStorage.getItem("selectedPlan");
    if (!storedPlan) {
      router.push("/register/organisation/plan");
      return;
    }

    try {
      const parsedPlan = JSON.parse(storedPlan);
      const normalized = normalizePlan(parsedPlan);
      if (!normalized?.code || isHiddenPaidMonthlyPlan(normalized)) {
        localStorage.removeItem("selectedPlan");
        router.push("/register/organisation/plan");
        return;
      }

      setSelectedPlan(normalized);
      localStorage.setItem("selectedPlan", JSON.stringify(normalized));
    } catch {
      localStorage.removeItem("selectedPlan");
      router.push("/register/organisation/plan");
    }
  }, [router]);

  const finalizeSuccess = ({ organization, admin, plan, emailSent, freeTrial = false }) => {
    setSuccessState({
      organizationName: organization?.name || "Your organization",
      adminEmail: admin?.email || "",
      planName: plan?.name || selectedPlan?.name || "Selected Plan",
      emailSent: emailSent !== false,
      freeTrial,
    });
    localStorage.removeItem("organisationData");
    localStorage.removeItem("adminData");
    localStorage.removeItem("selectedPlan");
    setPaymentStatus("");
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      router.push("/register/organisation/plan");
      return;
    }

    const organization = JSON.parse(localStorage.getItem("organisationData") || "null");
    const admin = JSON.parse(localStorage.getItem("adminData") || "null");
    const adminPrefillContact = `${admin?.mobileCountryCode || ""}${admin?.mobile || ""}`;
    const organizationPrefillContact = `${organization?.phoneCountryCode || ""}${organization?.phone || ""}`;

    if (!organization || !admin) {
      alert("Registration details are missing. Please start again.");
      router.push("/register/organisation");
      return;
    }

    setLoading(true);

    try {
      const orderResponse = await createPaymentOrder({
        planCode: selectedPlan.code,
        organization,
        admin,
      }).unwrap();

      if (orderResponse?.freeTrial) {
        setPaymentStatus("Activating free trial...");
        const verifyResult = await verifyAndRegisterPayment({
          organization,
          admin,
          plan: orderResponse.plan || selectedPlan,
        }).unwrap();

        if (!verifyResult?.success) {
          await handleArchive("Free trial activation failed");
          throw new Error("Free trial activation failed.");
        }
        finalizeSuccess({
          organization,
          admin,
          plan: orderResponse.plan || selectedPlan,
          emailSent: verifyResult?.emailSent,
          freeTrial: true,
        });
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Unable to load Razorpay checkout.");
      }
      setPaymentStatus("Connecting to secure gateway...");

      const keyResponse = await getPaymentPublicKey().unwrap();
      if (!keyResponse?.key) {
        throw new Error("Razorpay key not found.");
      }

      const order = orderResponse?.order;
      if (!order?.id) {
        throw new Error("Failed to create payment order.");
      }
      setPaymentStatus("Opening payment window...");

      const paymentObject = new window.Razorpay({
        key: keyResponse.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Veagle Attendee",
        description: `${selectedPlan.name} Plan Activation`,
        image: "/logo1-clean.webp",
        prefill: {
          name: admin.name || "",
          email: admin.email || "",
          contact: adminPrefillContact || organizationPrefillContact || "",
        },
        notes: {
          planCode: selectedPlan.code,
        },
        theme: {
          color: isDarkMode ? "#4f46e5" : "#4f46e5",
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus("Payment cancelled.");
            setLoading(false);
            handleArchive("Payment dismissed by user");
          },
        },
        handler: async (response) => {
          try {
            setPaymentStatus("Verifying secure payment...");
            const verifyResult = await verifyAndRegisterPayment({
              ...response,
              organization,
              admin,
              plan: selectedPlan,
            }).unwrap();

            if (!verifyResult?.success) {
              await handleArchive("Payment verified but registration step failed");
              throw new Error("Payment verified but registration failed.");
            }
            setPaymentStatus("Activation successful! Redirecting...");
            finalizeSuccess({
              organization,
              admin,
              plan: selectedPlan,
              emailSent: verifyResult?.emailSent,
            });
          } catch (error) {
            alert(error?.data?.message || error?.message || "Payment captured but registration failed.");
            setPaymentStatus(error?.data?.message || error?.message || "Payment processing failed.");
            setLoading(false);
          }
        },
      });

      paymentObject.on("payment.failed", (response) => {
        alert(response?.error?.description || "Payment failed. Please try again.");
        setPaymentStatus(response?.error?.description || "Payment failed.");
        setLoading(false);
        handleArchive(`Payment failed: ${response?.error?.description}`);
      });

      paymentObject.open();
    } catch (err) {
      alert(err.message || "Unable to start payment.");
      setPaymentStatus(err.message || "Unable to start payment.");
      setLoading(false);
    }
  };

  // Theme object to centralize color choices based on Dark Mode
  const theme = {
    bg: "bg-[#f8fafc] dark:bg-[#0B101E]",
    card: "bg-white/80 dark:bg-[#111827]/80 border-white dark:border-white/10 shadow-[0_36px_104px_rgba(99,102,241,0.16),0_18px_44px_rgba(15,23,42,0.10)] dark:shadow-[0_36px_104px_rgba(2,6,23,0.62)]",
    textMain: "text-slate-900 dark:text-white",
    textSub: "text-slate-500 dark:text-slate-400",
    badgeBg: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300",
    iconBoxBg: "bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-inner dark:shadow-white/5",
    planBox: "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 group-hover:border-indigo-100 dark:group-hover:border-indigo-500/30",
    featureText: "text-slate-600 dark:text-slate-300",
    checkBg: "bg-emerald-100 dark:bg-emerald-500/10",
    checkIcon: "text-emerald-600 dark:text-emerald-400",
    securityBox: "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-100/50 dark:border-indigo-500/20",
    securityIcon: "text-indigo-600 dark:text-indigo-400",
    securityText: "text-indigo-900 dark:text-indigo-200",
    buttonBase:
      "border border-indigo-400/25 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 text-white shadow-[0_24px_54px_rgba(99,102,241,0.36)] hover:-translate-y-0.5 hover:shadow-[0_30px_68px_rgba(99,102,241,0.44)] active:translate-y-0 active:scale-[0.995]",
    blob1: "bg-indigo-500/20 dark:bg-indigo-600/15 mix-blend-multiply dark:mix-blend-screen",
    blob2: "bg-blue-500/20 dark:bg-violet-600/15 mix-blend-multiply dark:mix-blend-screen",
    blob3: "bg-emerald-500/10 dark:bg-emerald-600/10 mix-blend-multiply dark:mix-blend-screen",
    divider: "bg-slate-200/60 dark:bg-slate-700/50",
    statusBadge: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-900 dark:text-amber-300",
  };

  return (
    <div className={`min-h-screen flex justify-center items-center relative overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-700 ${theme.bg}`}>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 p-3 lg:p-4 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl border shadow-xl group bg-white/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-indigo-600 dark:text-amber-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-indigo-500/20 dark:hover:shadow-amber-500/10"
        aria-label="Toggle Dark Mode"
      >
        <span className={`inline-flex transition-transform duration-500 ${isDarkMode ? "scale-110 rotate-[360deg]" : ""}`}>
          {isDarkMode ? (
            <Sun size={24} strokeWidth={2.5} className="drop-shadow-lg group-hover:text-amber-400 transition-colors" />
          ) : (
            <Moon size={24} strokeWidth={2.5} className="drop-shadow-sm group-hover:text-indigo-700 transition-colors" />
          )}
        </span>
      </button>

      {/* Global CSS for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 15s infinite alternate; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 5s; }
      `}} />

      {/* Dynamic Background Elements */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-blob pointer-events-none transition-colors duration-700 ${theme.blob1}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-blob animation-delay-2000 pointer-events-none transition-colors duration-700 ${theme.blob2}`} />
      <div className={`absolute top-[20%] right-[10%] w-[30%] h-[30%] blur-[100px] rounded-full animate-blob animation-delay-4000 pointer-events-none transition-colors duration-700 ${theme.blob3}`} />

      <div className="w-full max-w-6xl px-4 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Section - Context Info */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center gap-8 pl-4 lg:pl-8">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-6 shadow-sm transition-colors duration-500 ${theme.badgeBg}`}>
              <Sparkles size={16} />
              <span>Final step to get started</span>
            </div>
            <h1 className={`text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-4 transition-colors duration-500 ${theme.textMain}`}>
              Secure & Complete <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-blue-500 dark:to-purple-400">
                Your Registration
              </span>
            </h1>
            <p className={`text-lg leading-relaxed max-w-md transition-colors duration-500 ${theme.textSub}`}>
              You are just one click away from transforming your organization&apos;s attendance management.
            </p>
          </div>

          <div className="space-y-6 mt-4">
            {PAYMENT_FEATURES.map((feature) => (
               <div key={feature.title} className="flex items-start gap-4 group">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${theme.iconBoxBg} group-hover:scale-110`}>
                   <feature.icon className="text-indigo-600 dark:text-indigo-400" size={24} />
                 </div>
                 <div>
                   <h4 className={`text-base font-bold transition-colors duration-500 ${theme.textMain}`}>{feature.title}</h4>
                   <p className={`text-sm mt-0.5 transition-colors duration-500 ${theme.textSub}`}>{feature.desc}</p>
                 </div>
               </div>
            ))}
          </div>
        </div>

        {/* Right Section - Payment Card */}
        <div className="lg:col-span-7 flex justify-center perspective-[1000px]">
          <div className={`card w-full max-w-lg backdrop-blur-2xl rounded-[2.5rem] border overflow-hidden relative group transition-all duration-700 ${theme.card}`}>
            {/* Top decorative gradient line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r transition-all duration-700 from-indigo-500 dark:from-purple-500 via-blue-500 dark:via-indigo-500 to-emerald-500 dark:to-emerald-400" />

            <div className="card-body p-8 sm:p-12">
              {successState ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-emerald-200 bg-emerald-50 shadow-[0_24px_54px_rgba(16,185,129,0.18)] dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 size={42} className="text-emerald-500 dark:text-emerald-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-500 dark:text-emerald-300">
                      {successState.freeTrial ? "Registration Success" : "Payment Success"}
                    </p>
                    <h2 className={`mt-3 text-3xl font-black tracking-tight transition-colors duration-500 ${theme.textMain}`}>
                      {successState.freeTrial ? "Workspace Activated" : "Payment Completed"}
                    </h2>
                    <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed transition-colors duration-500 ${theme.textSub}`}>
                      {successState.emailSent
                        ? "Your registration is complete. We have shared the organization code and login details only on your registered email."
                        : "Registration is complete, but the confirmation email could not be sent. Please contact support to receive your organization code."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <CreditCard size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Plan
                      </p>
                      <p className={`mt-2 text-sm font-black ${theme.textMain}`}>{successState.planName}</p>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <Building size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Workspace
                      </p>
                      <p className={`mt-2 text-sm font-black ${theme.textMain}`}>{successState.organizationName}</p>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Mail size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Email
                      </p>
                      <p className={`mt-2 break-all text-sm font-black ${theme.textMain}`}>{successState.adminEmail}</p>
                    </div>
                  </div>

                  <div className={`rounded-3xl border p-5 ${successState.emailSent ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"}`}>
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black">
                          {successState.emailSent ? "Organization code is email-only" : "Email delivery needs attention"}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed opacity-90">
                          {successState.emailSent
                            ? "For security, the organization code is not shown on screen. Please check your mailbox to continue."
                            : "The org code is not shown on screen. Please contact support if you do not receive the confirmation email."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400"
                    >
                      Go to Login
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="inline-flex h-14 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/30 dark:hover:text-indigo-300"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8 lg:hidden">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-6 transition-colors duration-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <ShieldCheck size={32} />
                    </div>
                    <h2 className={`text-3xl font-extrabold mb-2 transition-colors duration-500 ${theme.textMain}`}>Final Step</h2>
                    <p className={`uppercase tracking-widest text-xs font-bold transition-colors duration-500 ${theme.textSub}`}>Complete Registration</p>
                  </div>

                  {/* Selected Plan Details */}
                  <div className={`relative rounded-3xl p-6 mb-8 border transition-all duration-500 ${theme.planBox}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                      <CreditCard size={80} className="text-indigo-600 dark:text-white -rotate-12" />
                    </div>

                    <div className="relative z-10">
                      <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                         Your Plan Summary
                      </p>
                      <div className="flex items-end justify-between mb-4">
                        <h4 className={`text-2xl font-black transition-colors duration-500 ${theme.textMain}`}>
                          {selectedPlan ? selectedPlan.name : "Loading..."}
                        </h4>
                        <div className="text-right">
                          <span className={`text-3xl font-black tracking-tight transition-colors duration-500 ${theme.textMain}`}>
                            {selectedPlan
                              ? Number(selectedPlan.price) === 0
                                ? "Free"
                                : `Rs. ${Number(selectedPlan.price).toLocaleString("en-IN")}`
                              : "--"}
                          </span>
                          {selectedPlan && Number(selectedPlan.price) !== 0 && (
                            <span className={`text-xs block font-medium mt-1 transition-colors duration-500 ${theme.textSub}`}>/ lifetime or cycle</span>
                          )}
                        </div>
                      </div>

                      <div className={`h-[1px] w-full my-5 transition-colors duration-500 ${theme.divider}`} />

                      <div className="flex flex-col gap-3">
                        {(selectedPlan?.features || ["Core Platform Features", "Advanced Location & Attendance", "Admin Role Controls", "Premium Support"]).slice(0, 4).map((feature, i) => (
                          <div key={i} className={`flex items-center gap-2.5 text-sm font-semibold transition-colors duration-500 ${theme.featureText}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${theme.checkBg}`}>
                              <CheckCircle2 size={12} className={`transition-colors duration-500 ${theme.checkIcon}`} />
                            </div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Security Badge Info */}
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors duration-500 ${theme.securityBox}`}>
                      <Lock className={`shrink-0 transition-colors duration-500 ${theme.securityIcon}`} size={20} />
                      <p className={`text-sm font-semibold leading-snug transition-colors duration-500 ${theme.securityText}`}>
                        {selectedPlan && Number(selectedPlan.price) === 0
                          ? "Free trial activated instantly upon confirmation."
                          : "Payments securely processed via Razorpay. Your details are encrypted."}
                      </p>
                    </div>

                    {/* Status Message */}
                    {paymentStatus ? (
                      <div className="overflow-hidden">
                        <div className={`py-3 px-4 rounded-xl border flex justify-center items-center gap-2 text-sm font-bold shadow-sm mt-2 transition-colors duration-500 ${theme.statusBadge}`}>
                          {loading && <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" size={16} />}
                          {paymentStatus}
                        </div>
                      </div>
                    ) : null}

                    {/* Primary CTA */}
                    <div className="card-actions mt-4">
                      <button
                        onClick={handlePayment}
                        disabled={loading || !selectedPlan}
                        className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full px-6 text-base font-black tracking-tight transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${theme.buttonBase}`}
                      >
                        <span className="absolute inset-[1px] rounded-full bg-white/10 dark:bg-white/5" />
                        <span className="absolute inset-y-0 left-0 w-24 rounded-full bg-white/18 blur-2xl opacity-70" />
                        <span className="relative z-10 flex items-center gap-2 text-white">
                          {loading ? (
                            <>
                              <Loader2 className="animate-spin" size={22} />
                              Processing...
                            </>
                          ) : (
                            <>
                              {selectedPlan && Number(selectedPlan.price) === 0 ? "Activate Details & Login" : "Confirm & Pay Now"}
                              <ChevronRight size={22} className="transition-transform duration-300 translate-x-0.5" />
                            </>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Badges footer */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                      {PAYMENT_BADGES.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
