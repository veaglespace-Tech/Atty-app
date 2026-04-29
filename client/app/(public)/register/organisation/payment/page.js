"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useArchiveFailedRegistrationMutation,
  useCreatePaymentOrderMutation,
  useLazyGetPaymentPublicKeyQuery,
  useVerifyAndRegisterPaymentMutation,
} from "@/services/api/paymentApi";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  Building,
  Zap,
  Mail,
} from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
import RegisterStepBack from "@/components/register/RegisterStepBack";
import { isHiddenPaidMonthlyPlan } from "@/utils/plans";
import {
  clearAllRegistrationDrafts,
  clearRegistrationDraft,
  getRegistrationDraft,
  REGISTRATION_DRAFT_KEYS,
  setRegistrationDraft,
} from "@/utils/registerDraft";

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

const getApiErrorMessage = (error, fallback = "Unable to process request.") => {
  const message =
    error?.data?.message ||
    error?.error ||
    error?.message ||
    error?.originalStatusText ||
    "";

  const normalizedMessage = String(message || "").trim();
  return normalizedMessage || fallback;
};

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [successState, setSuccessState] = useState(null);
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyAndRegisterPayment] = useVerifyAndRegisterPaymentMutation();
  const [getPaymentPublicKey] = useLazyGetPaymentPublicKeyQuery();
  const [archiveFailedRegistration] = useArchiveFailedRegistrationMutation();
  const handleArchive = async (reason = "Registration abandoned") => {
    try {
      const organization = getRegistrationDraft(
        REGISTRATION_DRAFT_KEYS.organisation
      );
      const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);

      if (organization && admin) {
        await archiveFailedRegistration({
          organization,
          admin,
          reason,
        }).unwrap();
      }
    } catch (err) {
      console.error("Failed to archive registration attempt", err);
    }
  };

  useEffect(() => {
    const storedOrganization = getRegistrationDraft(
      REGISTRATION_DRAFT_KEYS.organisation
    );
    if (!storedOrganization) {
      router.replace("/register/organisation");
      return;
    }

    const storedAdmin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!storedAdmin) {
      router.replace("/register/organisation/admin");
      return;
    }

    const storedPlan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
    if (!storedPlan) {
      router.replace("/register/organisation/plan");
      return;
    }

    const normalized = normalizePlan(storedPlan);
    if (!normalized?.code || isHiddenPaidMonthlyPlan(normalized)) {
      clearRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
      router.replace("/register/organisation/plan");
      return;
    }

    setSelectedPlan(normalized);
    setRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan, normalized);
  }, [router]);

  const finalizeSuccess = ({ organization, admin, plan, emailSent, freeTrial = false }) => {
    setSuccessState({
      organizationName: organization?.name || "Your organization",
      adminEmail: admin?.email || "",
      planName: plan?.name || selectedPlan?.name || "Selected Plan",
      emailSent: emailSent !== false,
      freeTrial,
    });
    clearAllRegistrationDrafts();
    setPaymentStatus("");
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      router.push("/register/organisation/plan");
      return;
    }

    const organization = getRegistrationDraft(
      REGISTRATION_DRAFT_KEYS.organisation
    );
    const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    const adminPrefillContact = `${admin?.mobileCountryCode || ""}${admin?.mobile || ""}`;
    const organizationPrefillContact = `${organization?.phoneCountryCode || ""}${organization?.phone || ""}`;

    if (!organization || !admin) {
      alert("Registration details are missing. Please start again.");
      router.push("/register/organisation");
      return;
    }

    setLoading(true);
    setPaymentError("");

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
          color: "#2563eb",
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
            const message = getApiErrorMessage(
              error,
              "Payment captured but registration failed."
            );
            setPaymentStatus("");
            setPaymentError(message);
            setLoading(false);
          }
        },
      });

      paymentObject.on("payment.failed", (response) => {
        const failureMessage =
          String(response?.error?.description || "").trim() || "Payment failed. Please try again.";
        setPaymentStatus("");
        setPaymentError(failureMessage);
        setLoading(false);
        handleArchive(`Payment failed: ${failureMessage}`);
      });

      paymentObject.open();
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to start payment.");
      setPaymentStatus("");
      setPaymentError(message);
      setLoading(false);
    }
  };

  const theme = {
    bg: "page-shell",
    card: "surface-card border-[rgb(var(--brand-line)/0.82)]",
    textMain: "text-slate-900 dark:text-white",
    textSub: "text-slate-600 dark:text-slate-300",
    badgeBg:
      "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-300",
    iconBoxBg:
      "bg-white dark:bg-slate-900/75 border-slate-200 dark:border-slate-700/60 shadow-sm",
    planBox:
      "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-900/80 group-hover:border-blue-100 dark:group-hover:border-blue-500/30",
    featureText: "text-slate-600 dark:text-slate-300",
    checkBg: "bg-emerald-100 dark:bg-emerald-500/10",
    checkIcon: "text-emerald-600 dark:text-emerald-400",
    securityBox: "bg-blue-50/80 dark:bg-blue-500/10 border-blue-100/50 dark:border-blue-500/20",
    securityIcon: "text-blue-600 dark:text-blue-300",
    securityText: "text-blue-900 dark:text-blue-100",
    buttonBase:
      "border border-blue-500/20 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_24px_54px_rgba(37,99,235,0.28)] hover:-translate-y-0.5 hover:shadow-[0_30px_68px_rgba(37,99,235,0.36)] active:translate-y-0 active:scale-[0.995]",
    blob1: "bg-blue-500/18 dark:bg-blue-600/16 mix-blend-multiply dark:mix-blend-screen",
    blob2: "bg-sky-400/18 dark:bg-blue-500/14 mix-blend-multiply dark:mix-blend-screen",
    blob3: "bg-emerald-500/10 dark:bg-emerald-600/10 mix-blend-multiply dark:mix-blend-screen",
    divider: "bg-slate-200/60 dark:bg-slate-700/50",
    statusBadge:
      "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-900 dark:text-amber-300",
  };

  return (
    <div
      className={`relative mt-20 min-h-[calc(100vh-5rem)] overflow-hidden font-sans selection:bg-blue-500/20 transition-colors duration-700 ${theme.bg}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 15s infinite alternate; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 5s; }
      `,
        }}
      />

      <div
        className={`absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full blur-[120px] animate-blob pointer-events-none transition-colors duration-700 ${theme.blob1}`}
      />
      <div
        className={`absolute right-[-10%] bottom-[-10%] h-[50%] w-[50%] rounded-full blur-[120px] animate-blob animation-delay-2000 pointer-events-none transition-colors duration-700 ${theme.blob2}`}
      />
      <div
        className={`absolute top-[20%] right-[10%] h-[30%] w-[30%] rounded-full blur-[100px] animate-blob animation-delay-4000 pointer-events-none transition-colors duration-700 ${theme.blob3}`}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-4 sm:py-6 lg:grid-cols-12 lg:gap-10 lg:py-4">
        {!successState ? (
          <div className="lg:col-span-12">
            <RegisterStepBack
              href="/register/organisation/plan"
              label="Back to Plan Selection"
            />
          </div>
        ) : null}

        <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:gap-6 lg:pl-6">
          <div>
            <SectionEyebrow className="mb-6">Final step to get started</SectionEyebrow>
            <h1
              className={`mb-4 text-4xl font-extrabold leading-tight tracking-tight transition-colors duration-500 xl:text-5xl ${theme.textMain}`}
            >
              Secure & Complete <br />
              <span className="bg-gradient-to-r from-blue-600 to-slate-900 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-200">
                Your Registration
              </span>
            </h1>
            <p
              className={`max-w-md text-lg leading-relaxed transition-colors duration-500 ${theme.textSub}`}
            >
              You are just one click away from transforming your organization&apos;s attendance
              management.
            </p>
          </div>

          <div className="mt-4 space-y-6">
            {PAYMENT_FEATURES.map((feature) => (
              <div key={feature.title} className="group flex items-start gap-4">
                <div
                  className={`h-12 w-12 shrink-0 rounded-2xl transition-all duration-500 group-hover:scale-110 ${theme.iconBoxBg} flex items-center justify-center`}
                >
                  <feature.icon className="text-blue-600 dark:text-blue-300" size={24} />
                </div>
                <div>
                  <h4
                    className={`text-base font-bold transition-colors duration-500 ${theme.textMain}`}
                  >
                    {feature.title}
                  </h4>
                  <p
                    className={`mt-0.5 text-sm transition-colors duration-500 ${theme.textSub}`}
                  >
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center perspective-[1000px] lg:col-span-7">
          <div
            className={`card relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-700 ${theme.card}`}
          >
            <div className="surface-accent-bar absolute inset-x-0 top-0 h-1.5 transition-all duration-700" />

            <div className="card-body p-6 sm:p-8 lg:p-9">
              {successState ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-emerald-200 bg-emerald-50 shadow-[0_24px_54px_rgba(16,185,129,0.18)] dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 size={42} className="text-emerald-500 dark:text-emerald-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-500 dark:text-emerald-300">
                      {successState.freeTrial ? "Registration Success" : "Payment Success"}
                    </p>
                    <h2
                      className={`mt-3 text-3xl font-black tracking-tight transition-colors duration-500 ${theme.textMain}`}
                    >
                      {successState.freeTrial ? "Workspace Activated" : "Payment Completed"}
                    </h2>
                    <p
                      className={`mx-auto mt-3 max-w-md text-sm leading-relaxed transition-colors duration-500 ${theme.textSub}`}
                    >
                      {successState.emailSent
                        ? "Your registration is complete. We have shared the organization code and login details only on your registered email."
                        : "Registration is complete, but the confirmation email could not be sent. Please contact support to receive your organization code."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <CreditCard size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Plan
                      </p>
                      <p className={`mt-2 text-sm font-black ${theme.textMain}`}>
                        {successState.planName}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <Building size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Workspace
                      </p>
                      <p className={`mt-2 text-sm font-black ${theme.textMain}`}>
                        {successState.organizationName}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70">
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Mail size={18} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Email
                      </p>
                      <p className={`mt-2 break-all text-sm font-black ${theme.textMain}`}>
                        {successState.adminEmail}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-3xl border p-5 ${successState.emailSent ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"}`}
                  >
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black">
                          {successState.emailSent
                            ? "Organization code is email-only"
                            : "Email delivery needs attention"}
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
                      className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
                    >
                      Go to Login
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="inline-flex h-14 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:text-blue-300"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 text-center lg:hidden">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 transition-colors duration-500 dark:bg-blue-500/20 dark:text-blue-300">
                      <ShieldCheck size={32} />
                    </div>
                    <h2
                      className={`mb-2 text-3xl font-extrabold transition-colors duration-500 ${theme.textMain}`}
                    >
                      Final Step
                    </h2>
                    <p
                      className={`text-xs font-bold uppercase tracking-widest transition-colors duration-500 ${theme.textSub}`}
                    >
                      Complete Registration
                    </p>
                  </div>

                  <div
                    className={`relative mb-6 rounded-3xl border p-5 transition-all duration-500 ${theme.planBox}`}
                  >
                    <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-[0.03]">
                      <CreditCard size={80} className="-rotate-12 text-blue-600 dark:text-white" />
                    </div>

                    <div className="relative z-10">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-300">
                        Your Plan Summary
                      </p>
                      <div className="mb-4 flex items-end justify-between">
                        <h4
                          className={`text-2xl font-black transition-colors duration-500 ${theme.textMain}`}
                        >
                          {selectedPlan ? selectedPlan.name : "Loading..."}
                        </h4>
                        <div className="text-right">
                          <span
                            className={`text-3xl font-black tracking-tight transition-colors duration-500 ${theme.textMain}`}
                          >
                            {selectedPlan
                              ? Number(selectedPlan.price) === 0
                                ? "Free"
                                : `Rs. ${Number(selectedPlan.price).toLocaleString("en-IN")}`
                              : "--"}
                          </span>
                          {selectedPlan && Number(selectedPlan.price) !== 0 && (
                            <span
                              className={`mt-1 block text-xs font-medium transition-colors duration-500 ${theme.textSub}`}
                            >
                              / lifetime or cycle
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`my-4 h-[1px] w-full transition-colors duration-500 ${theme.divider}`} />

                      <div className="flex flex-col gap-3">
                        {(
                          selectedPlan?.features || [
                            "Core Platform Features",
                            "Advanced Location & Attendance",
                            "Admin Role Controls",
                            "Premium Support",
                          ]
                        )
                          .slice(0, 4)
                          .map((feature, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2.5 text-sm font-semibold transition-colors duration-500 ${theme.featureText}`}
                            >
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${theme.checkBg}`}
                              >
                                <CheckCircle2
                                  size={12}
                                  className={`transition-colors duration-500 ${theme.checkIcon}`}
                                />
                              </div>
                              {feature}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors duration-500 ${theme.securityBox}`}
                    >
                      <Lock
                        className={`shrink-0 transition-colors duration-500 ${theme.securityIcon}`}
                        size={20}
                      />
                      <p
                        className={`text-sm font-semibold leading-snug transition-colors duration-500 ${theme.securityText}`}
                      >
                        {selectedPlan && Number(selectedPlan.price) === 0
                          ? "Free trial activated instantly upon confirmation."
                          : "Payments securely processed via Razorpay. Your details are encrypted."}
                      </p>
                    </div>

                    {paymentStatus ? (
                      <div className="overflow-hidden">
                        <div
                          className={`mt-2 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-colors duration-500 ${theme.statusBadge}`}
                        >
                          {loading && (
                            <Loader2
                              className="animate-spin text-amber-600 dark:text-amber-400"
                              size={16}
                            />
                          )}
                          {paymentStatus}
                        </div>
                      </div>
                    ) : null}

                    {paymentError ? (
                      <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                        {paymentError}
                      </div>
                    ) : null}

                    <div className="card-actions mt-2">
                      <button
                        onClick={handlePayment}
                        disabled={loading || !selectedPlan}
                        className={`relative flex h-[3.25rem] w-full items-center justify-center overflow-hidden rounded-full px-6 text-base font-black tracking-tight transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${theme.buttonBase}`}
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
                              {selectedPlan && Number(selectedPlan.price) === 0
                                ? "Activate Details & Login"
                                : "Confirm & Pay Now"}
                              <ChevronRight
                                size={22}
                                className="translate-x-0.5 transition-transform duration-300"
                              />
                            </>
                          )}
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
