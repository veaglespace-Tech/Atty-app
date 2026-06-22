"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  useArchiveFailedRegistrationMutation,
  useCreatePaymentOrderMutation,
  useVerifyAndRegisterPaymentMutation,
  useGetGstRateQuery,
} from "@/services/api/paymentApi";
import {
  CreditCard, ShieldCheck, CheckCircle2, ChevronRight,
  Loader2, Lock, Building, Zap, Mail,
} from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
import RegisterStepBack from "@/components/register/RegisterStepBack";
import { addNotification } from "@/store/slices/notificationSlice";
import { isHiddenPaidMonthlyPlan } from "@/utils/plans";
import {
  clearAllRegistrationDrafts, clearRegistrationDraft,
  getRegistrationDraft, REGISTRATION_DRAFT_KEYS, setRegistrationDraft,
} from "@/utils/registerDraft";

const PAYMENT_FEATURES = [
  { icon: ShieldCheck, title: "Enterprise-grade Security", desc: "Your data is 100% encrypted and secure." },
  { icon: Zap, title: "Instant Activation", desc: "Get full access immediately after successful payment." },
  { icon: Building, title: "Scalable Infrastructure", desc: "Grows seamlessly as your team expands." },
];
const PAYMENT_BADGES = ["PayU", "Visa / Mastercard", "Protected Checkout"];
const PLAN_CODE_BY_NAME = { basic: "BASIC", pro: "PRO", advanced: "ADVANCED" };

const normalizePlan = (plan) => {
  if (!plan) return null;
  const fallbackCode = PLAN_CODE_BY_NAME[String(plan.name || "").toLowerCase()];
  return { ...plan, code: plan.code || fallbackCode };
};

// Submit a hidden form to PayU
const submitPayuForm = ({ baseUrl, payuParams }) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = baseUrl;
  Object.entries(payuParams).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value ?? "");
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
};

const getApiErrorMessage = (error, fallback = "Unable to process request.") => {
  const msg = error?.data?.message || error?.error || error?.message || error?.originalStatusText || "";
  return String(msg || "").trim() || fallback;
};

export default function PaymentPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [successState, setSuccessState] = useState(null);
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyAndRegisterPayment] = useVerifyAndRegisterPaymentMutation();
  const [archiveFailedRegistration] = useArchiveFailedRegistrationMutation();
  const { data: gstData } = useGetGstRateQuery();
  const gstRate = gstData?.gstRate || 0;
  const isFreePlan = selectedPlan && Number(selectedPlan.price) === 0;
  const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const gstAmount = (planPrice * gstRate) / 100;
  const finalPrice = planPrice + gstAmount;

  // Check for PayU redirect result
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payuStatus = params.get("payustatus");
    
    if (payuStatus === "failed") {
      setPaymentError(params.get("reason") || "Payment failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payuStatus === "success") {
      // If success, we should have the data in drafts still
      const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
      const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
      const plan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
      
      if (organization && admin) {
        setSuccessState({
          organizationName: organization.name || "Your organization",
          adminEmail: admin.email || "",
          planName: plan?.name || "Selected Plan",
          emailSent: true,
          freeTrial: false
        });
        // DON'T clear drafts here yet, it triggers redirects in the other useEffect
      } else {
        setSuccessState({
          organizationName: "Your organization",
          adminEmail: "your registered email",
          planName: "Selected Plan",
          emailSent: true,
          freeTrial: false
        });
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleArchive = async (reason = "Registration abandoned") => {
    try {
      const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
      const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
      if (organization && admin) await archiveFailedRegistration({ organization, admin, reason }).unwrap();
    } catch {}
  };

  useEffect(() => {
    if (successState) return; // Skip checks if we already finished successfully
    const org = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    if (!org) { router.replace("/register/organisation"); return; }
    const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!admin) { router.replace("/register/organisation/admin"); return; }
    const plan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
    if (!plan) { router.replace("/register/organisation/plan"); return; }
    const normalized = normalizePlan(plan);
    if (!normalized?.code || isHiddenPaidMonthlyPlan(normalized)) {
      clearRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
      router.replace("/register/organisation/plan");
      return;
    }
    setSelectedPlan(normalized);
    setRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan, normalized);
  }, [router, successState]);

  const finalizeSuccess = ({ organization, admin, plan, emailSent, freeTrial = false }) => {
    setSuccessState({ organizationName: organization?.name || "Your organization", adminEmail: admin?.email || "", planName: plan?.name || selectedPlan?.name || "Selected Plan", emailSent: emailSent !== false, freeTrial });
    clearAllRegistrationDrafts();
    setPaymentStatus("");
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      dispatch(
        addNotification({
          type: "error",
          title: "Action failed",
          message: "Please select a plan first.",
        })
      );
      router.push("/register/organisation/plan");
      return;
    }
    const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!organization || !admin) {
      dispatch(
        addNotification({
          type: "error",
          title: "Action failed",
          message: "Registration details are missing. Please start again.",
        })
      );
      router.push("/register/organisation");
      return;
    }
                      {PAYMENT_BADGES.map((badge) => (<span key={badge} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">{badge}</span>))}
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
