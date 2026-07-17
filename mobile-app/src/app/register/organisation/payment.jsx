import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Modal, SafeAreaView, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { ShieldCheck, CheckCircle2, ChevronRight, Lock, Building, Zap } from "lucide-react-native";

import RegisterStepBack from "@/components/register/RegisterStepBack";
import { useArchiveFailedRegistrationMutation, useCreatePaymentOrderMutation, useVerifyAndRegisterPaymentMutation, useGetGstRateQuery } from "@/services/api/paymentApi";
import { isHiddenPaidMonthlyPlan } from "@/utils/plans";
import { clearAllRegistrationDrafts, clearRegistrationDraft, getRegistrationDraft, REGISTRATION_DRAFT_KEYS, setRegistrationDraft } from "@/utils/registerDraft";
import { API_BASE_URL } from "@/services/api/baseApi";


const PAYMENT_FEATURES = [
{ icon: ShieldCheck, title: "Enterprise-grade Security", desc: "Your data is 100% encrypted and secure." },
{ icon: Zap, title: "Instant Activation", desc: "Get full access immediately after successful payment." },
{ icon: Building, title: "Scalable Infrastructure", desc: "Grows seamlessly as your team expands." }];


const PAYMENT_BADGES = ["PayU", "Visa / Mastercard", "Protected Checkout"];
const PLAN_CODE_BY_NAME = { basic: "BASIC", pro: "PRO", advanced: "ADVANCED" };

const normalizePlan = (plan) => {
  if (!plan) return null;
  const fallbackCode = PLAN_CODE_BY_NAME[String(plan.name || "").toLowerCase()];
  return { ...plan, code: plan.code || fallbackCode };
};

const getApiErrorMessage = (error, fallback = "Unable to process request.") => {
  const msg = error?.data?.message || error?.error || error?.message || error?.originalStatusText || "";
  return String(msg || "").trim() || fallback;
};

export default function PaymentPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [successState, setSuccessState] = useState(null);
  const [payuData, setPayuData] = useState(null);

  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyAndRegisterPayment] = useVerifyAndRegisterPaymentMutation();
  const [archiveFailedRegistration] = useArchiveFailedRegistrationMutation();
  const { data: gstData } = useGetGstRateQuery(undefined);

  useEffect(() => {
    if (params?.payustatus === "success") {
      const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
      const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
      const plan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
      finalizeSuccess({ organization, admin, plan, emailSent: true, freeTrial: false });
      router.setParams({ payustatus: null, reason: null });
    } else if (params?.payustatus === "failed") {
      setPaymentError(params?.reason || "Payment failed or was cancelled.");
      setLoading(false);
      router.setParams({ payustatus: null, reason: null });
    }
  }, [params?.payustatus]);

  const gstRate = gstData?.gstRate ?? 18;
  const originalPlanPrice = selectedPlan ? Number(selectedPlan.price) : 0;

  let planPrice = originalPlanPrice;
  let discountAmount = 0;

  if (appliedCoupon && originalPlanPrice > 0) {
    if (appliedCoupon.discountType === "PERCENTAGE") {
      discountAmount = originalPlanPrice * appliedCoupon.discountValue / 100;
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
    planPrice = Math.max(0, originalPlanPrice - discountAmount);
  }

  const gstAmount = planPrice * gstRate / 100;
  const finalPrice = planPrice + gstAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setAppliedCoupon(null);

    try {
      const res = await fetch(`${API_BASE_URL}/coupons/validate/${encodeURIComponent(couponCode.trim())}?planCode=${encodeURIComponent(selectedPlan?.code || "")}`);
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.data);
      } else {
        setCouponError(data.message || "Invalid coupon code");
      }
    } catch (err) {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleArchive = async (reason = "Registration abandoned") => {
    try {
      const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
      const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
      if (organization && admin) await archiveFailedRegistration({ organization, admin, reason }).unwrap();
    } catch {}
  };

  useEffect(() => {
    if (successState) return;
    const org = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    if (!org) {router.replace("/register/organisation");return;}
    const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!admin) {router.replace("/register/organisation/admin");return;}
    const plan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
    if (!plan) {router.replace("/register/organisation/plan");return;}

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
    setSuccessState({
      organizationName: organization?.name || "Your organization",
      adminEmail: admin?.email || "",
      planName: plan?.name || selectedPlan?.name || "Selected Plan",
      emailSent: emailSent !== false,
      freeTrial
    });
    clearAllRegistrationDrafts();
    setPaymentStatus("");
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      Alert.alert("Action failed", "Please select a plan first.");
      router.push("/register/organisation/plan");
      return;
    }
    const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
    const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
    if (!organization || !admin) {
      Alert.alert("Action failed", "Registration details are missing. Please start again.");
      router.push("/register/organisation");
      return;
    }

    setLoading(true);
    setPaymentError("");

    try {
      const payload = { planCode: selectedPlan.code, organization, admin };
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon.code;
      }
      if (Platform.OS === 'web') {
        payload.redirectBase = window.location.href.split('?')[0]; // Strip existing queries
      }
      const orderResponse = await createPaymentOrder(payload).unwrap();

      // Free trial flow
      if (orderResponse?.freeTrial) {
        setPaymentStatus("Activating free trial...");
        const verifyResult = await verifyAndRegisterPayment({ organization, admin, plan: orderResponse.plan || selectedPlan }).unwrap();
        if (!verifyResult?.success) {
          await handleArchive("Free trial activation failed");
          throw new Error("Free trial activation failed.");
        }
        finalizeSuccess({ organization, admin, plan: orderResponse.plan || selectedPlan, emailSent: verifyResult?.emailSent, freeTrial: true });
        return;
      }

      // Paid flow (PayU) - Native app behavior
      if (!orderResponse?.payuParams || !orderResponse?.baseUrl) throw new Error("Failed to create payment order.");

      if (Platform.OS === 'web') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = orderResponse.baseUrl;
        
        Object.keys(orderResponse.payuParams).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = orderResponse.payuParams[key];
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        return;
      }

      setPayuData({
        baseUrl: orderResponse.baseUrl,
        payuParams: orderResponse.payuParams
      });

    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to start payment.");
      setPaymentStatus("");
      setPaymentError(message);
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ padding: 16, paddingTop: 40, paddingBottom: 60 }}>
      {!successState &&
      <RegisterStepBack href="/register/organisation/plan" label="Back to Plan Selection" className="mb-6" />
      }

      <View style={{ display: successState ? 'flex' : 'none' }}>
        <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4">
          <View className="items-center mb-8">
            <View className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center border border-emerald-100 dark:border-emerald-800 mb-4">
              <CheckCircle2 size={36} className="text-emerald-500 dark:text-emerald-400" />
            </View>
            <Text className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">
              {successState?.freeTrial ? "Registration Success" : "Payment Success"}
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
              {successState?.freeTrial ? "Workspace Activated" : "Payment Completed"}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {successState?.emailSent ?
            "Your registration is complete. We have shared the organization code on your registered email." :
            "Registration complete, but the confirmation email could not be sent. Please contact support."}
            </Text>
          </View>

          <View className="gap-4 mb-8">
            <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
              <Text className="text-[10px] font-black uppercase text-slate-400 mb-1">Plan</Text>
              <Text className="text-sm font-black text-slate-900 dark:text-white">{successState?.planName || ""}</Text>
            </View>
            <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
              <Text className="text-[10px] font-black uppercase text-slate-400 mb-1">Workspace</Text>
              <Text className="text-sm font-black text-slate-900 dark:text-white">{successState?.organizationName || ""}</Text>
            </View>
            <View className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl">
              <Text className="text-[10px] font-black uppercase text-emerald-600/60 dark:text-emerald-400/60 mb-1">Email</Text>
              <Text className="text-sm font-black text-emerald-700 dark:text-emerald-300">{successState?.adminEmail || ""}</Text>
            </View>
          </View>

          <View className="gap-3">
            <Pressable
            onPress={() => {clearAllRegistrationDrafts();router.push("/login");}}
            className="bg-slate-900 dark:bg-blue-600 py-4 rounded-full items-center justify-center flex-row gap-2">
            
              <Text className="text-white font-black text-sm">Go to Login</Text>
              <ChevronRight size={18} color="white" />
            </Pressable>
            <Pressable
            onPress={() => {clearAllRegistrationDrafts();router.push("/");}}
            className="border border-slate-200 dark:border-slate-700 py-4 rounded-full items-center justify-center">
            
              <Text className="text-slate-700 dark:text-slate-300 font-black text-sm">Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ display: successState ? 'none' : 'flex' }}>
          <View className="items-center mb-6 mt-2">
            <View className="h-16 w-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-blue-600 dark:text-blue-400" />
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">Final Step</Text>
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">Complete Registration</Text>
          </View>

          <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            {paymentError ? (
              paymentError.toLowerCase().includes("already exists") ? (
                <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-2xl mb-4 items-center">
                  <View className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mb-3">
                    <ShieldCheck size={24} className="text-blue-600 dark:text-blue-400" />
                  </View>
                  <Text className="text-sm font-black text-slate-900 dark:text-white text-center mb-1">Account Already Exists</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 leading-relaxed">
                    The email you provided is already registered. Please log in to manage your organization or choose a different email.
                  </Text>
                  <Pressable
                    onPress={() => {
                      clearAllRegistrationDrafts();
                      router.push("/login");
                    }}
                    className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center justify-center gap-2 active:scale-95">
                    <Text className="font-bold text-white text-xs">Go to Login</Text>
                    <ChevronRight size={16} color="white" />
                  </Pressable>
                </View>
              ) : (
                <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl mb-4 flex-row items-center gap-3">
                  <Zap size={20} className="text-red-600 dark:text-red-400" />
                  <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">Transaction Issue</Text>
                    <Text className="text-xs font-bold text-red-900 dark:text-red-200">{paymentError}</Text>
                  </View>
                </View>
              )
            ) : null}

            <Text className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-3">Your Plan Summary</Text>
            
            <View className="flex-row justify-between items-end mb-6">
              <Text className="text-xl font-black text-slate-900 dark:text-white flex-1">{selectedPlan ? selectedPlan.name : "Loading..."}</Text>
              {selectedPlan && Number(selectedPlan.price) === 0 ?
            <Text className="text-2xl font-black text-slate-900 dark:text-white">Free</Text> :

            <View className="items-end">
                  <Text className="text-2xl font-black text-slate-900 dark:text-white">Rs. {finalPrice.toLocaleString("en-IN")}</Text>
                  <Text className="text-[10px] font-medium text-slate-500">/ lifetime (incl. GST)</Text>
                </View>
            }
            </View>

            {selectedPlan && Number(selectedPlan.price) > 0 &&
          <View className="mb-6">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Have a coupon code?</Text>
                {!appliedCoupon ?
            <View className="flex-row gap-2 mb-4">
                    <TextInput
                value={couponCode}
                onChangeText={(t) => setCouponCode(t.toUpperCase())}
                placeholder="ENTER CODE"
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-bold dark:text-white"
                autoCapitalize="characters" />
              
                    <Pressable
                onPress={handleApplyCoupon}
                disabled={!couponCode.trim() || isApplyingCoupon}
                className="bg-slate-900 dark:bg-blue-600 px-4 justify-center rounded-xl active:scale-95 disabled:opacity-50">
                
                      {isApplyingCoupon ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-xs">Apply</Text>}
                    </Pressable>
                  </View> :

            <View className="flex-row justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4">
                    <View className="flex-row items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{appliedCoupon.code} Applied</Text>
                    </View>
                    <Pressable onPress={removeCoupon}><Text className="text-xs font-bold text-red-600">Remove</Text></Pressable>
                  </View>
            }
                {couponError ? <Text className="text-xs text-red-500 mb-4">{couponError}</Text> : null}

                <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500">Base Price</Text>
                    <Text className={`text-xs ${appliedCoupon ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>Rs. {originalPlanPrice.toLocaleString("en-IN")}</Text>
                  </View>
                  {appliedCoupon &&
              <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Discount</Text>
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">- Rs. {discountAmount.toLocaleString("en-IN")}</Text>
                    </View>
              }
                  {appliedCoupon &&
              <View className="flex-row justify-between">
                      <Text className="text-xs text-slate-500">Discounted Price</Text>
                      <Text className="text-xs text-slate-700 dark:text-slate-300">Rs. {planPrice.toLocaleString("en-IN")}</Text>
                    </View>
              }
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500">GST ({gstRate}%)</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">Rs. {gstAmount.toLocaleString("en-IN")}</Text>
                  </View>
                  <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-1" />
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-black text-slate-900 dark:text-white">Total Payable</Text>
                    <Text className="text-sm font-black text-slate-900 dark:text-white">Rs. {finalPrice.toLocaleString("en-IN")}</Text>
                  </View>
                </View>
              </View>
          }

            <View className="h-[1px] bg-slate-100 dark:bg-slate-800 mb-5" />

            <View className="gap-3 mb-6">
              {(selectedPlan?.features || ["Core Platform Features", "Advanced Location & Attendance", "Admin Role Controls", "Premium Support"]).slice(0, 4).map((f, i) =>
            <View key={i} className="flex-row items-center gap-3">
                  <View className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center">
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                  </View>
                  <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex-1">{f}</Text>
                </View>
            )}
            </View>

            <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex-row gap-3 mb-5 border border-blue-100 dark:border-blue-900/50">
              <Lock size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <Text className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed flex-1">
                {selectedPlan && Number(selectedPlan.price) === 0 ?
              "Free trial activated instantly upon confirmation." :
              "Payments securely processed via PayU. Your details are encrypted."}
              </Text>
            </View>

            {paymentStatus ?
          <View className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex-row items-center justify-center gap-2 mb-4 border border-amber-100 dark:border-amber-900/50">
                {loading && <ActivityIndicator size="small" color="#d97706" />}
                <Text className="text-xs font-bold text-amber-900 dark:text-amber-300">{paymentStatus}</Text>
              </View> :
          null}

            <Pressable
            onPress={handlePayment}
            disabled={loading || !selectedPlan}
            className="bg-blue-600 py-4 rounded-full items-center justify-center flex-row gap-2 active:scale-95 disabled:opacity-70 mb-4">
            
              {loading ?
            <><ActivityIndicator size="small" color="white" /><Text className="text-white font-black text-sm">Processing...</Text></> :

            <>
                  <Text className="text-white font-black text-sm">
                    {paymentError ? "Retry Payment" : selectedPlan && Number(selectedPlan.price) === 0 ? "Activate Details & Login" : "Confirm & Pay"}
                  </Text>
                  <ChevronRight size={18} color="white" />
                </>
            }
            </Pressable>

            <View className="flex-row flex-wrap justify-center gap-2">
              {PAYMENT_BADGES.map((badge) =>
            <View key={badge} className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">{badge}</Text>
                </View>
            )}
            </View>
          </View>
        </View>

      {payuData &&
      <Modal visible={true} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
              <Text className="font-black text-slate-900">Secure Payment Gateway</Text>
              <Pressable onPress={() => {setPayuData(null);setLoading(false);}}>
                <Text className="font-bold text-red-500">Cancel</Text>
              </Pressable>
            </View>
            <WebView
            source={{
              html: `
                  <html>
                    <body onload="document.forms[0].submit()">
                      <div style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                        <p>Redirecting to secure payment gateway...</p>
                      </div>
                      <form action="${payuData.baseUrl}" method="POST">
                        ${Object.entries(payuData.payuParams).
              map(([k, v]) => "<input type='hidden' name='" + k + "' value='" + String(v).replace(/'/g, "&apos;") + "' />").
              join('')}
                      </form>
                    </body>
                  </html>
                `
            }}
            onNavigationStateChange={(navState) => {
              if (navState.url.includes("payustatus=success")) {
                setPayuData(null);
                const organization = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation);
                const admin = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin);
                const plan = getRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan);
                finalizeSuccess({ organization, admin, plan, emailSent: true, freeTrial: false });
              } else if (navState.url.includes("payustatus=failed")) {
                setPayuData(null);
                setPaymentError("Payment failed or was cancelled.");
                setLoading(false);
              }
            }}
            startInLoadingState={true}
            renderLoading={() =>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
            } />
          
          </SafeAreaView>
        </Modal>
      }
    </ScrollView>);

}