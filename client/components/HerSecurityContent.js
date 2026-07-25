"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetMeQuery } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/baseApi";
import {
  ShieldAlert,
  PhoneCall,
  MessageSquare,
  Mail,
  MapPin,
  RefreshCw,
  UserCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Shield,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

const EMERGENCY_TEST_NUMBER = "8237999101";

export default function HerSecurityContent() {
  const { user, token } = useAuthSession();
  const { data: meData } = useGetMeQuery(undefined, { skip: !token });
  const currentUser = meData?.data || meData?.user || meData?.result || user;

  const displayName = currentUser?.name || user?.name || "User Name";
  const displayEmail = currentUser?.email || user?.email || "N/A";
  const displayMobile = currentUser?.mobile || user?.mobile || "N/A";
  const displayEmergencyContact =
    currentUser?.emergencyContact || user?.emergencyContact || displayMobile || EMERGENCY_TEST_NUMBER;
  const avatarSrc =
    currentUser?.profileImageUrl ||
    currentUser?.profileImage ||
    currentUser?.avatarUrl ||
    currentUser?.avatar ||
    user?.profileImageUrl ||
    user?.profileImage ||
    user?.avatarUrl ||
    user?.avatar ||
    null;
  const displayOrgName =
    currentUser?.organization?.name ||
    currentUser?.orgName ||
    currentUser?.organizationName ||
    user?.organization?.name ||
    user?.orgName ||
    "Organisation";
  const displayOrgId =
    currentUser?.orgId ||
    currentUser?.organizationId ||
    currentUser?.organization?.id ||
    currentUser?.organizationCode ||
    currentUser?.organization?.organizationCode ||
    user?.orgId ||
    user?.organizationId ||
    user?.organization?.id ||
    user?.organizationCode ||
    user?.organization?.organizationCode ||
    "N/A";

  // Location states
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: "initializing", // initializing | success | denied | error
    errorMessage: "",
  });

  // Alert execution states
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [sosResult, setSosResult] = useState(null); // { success: boolean, message: string }

  // Function to capture Geolocation
  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        status: "error",
        errorMessage: "Geolocation API is not supported by your browser.",
      });
      return;
    }

    setLocation((prev) => ({ ...prev, status: "initializing" }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          status: "success",
          errorMessage: "",
        });
      },
      (error) => {
        let msg = "Could not fetch location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Retrying...";
        }
        setLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: "denied",
          errorMessage: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request location on page load
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Construct Google Maps Live Link
  const mapsUrl =
    location.latitude && location.longitude
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : null;

  // WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const emergencyNum = displayEmergencyContact;
    const photoLine = avatarSrc ? `\n🖼️ *Profile Photo:* ${avatarSrc}` : "";
    const text = encodeURIComponent(
      `🚨 *EMERGENCY SOS DISTRESS ALERT* 🚨\n\n` +
      `👤 *Name:* ${displayName}\n` +
      `📧 *Email:* ${displayEmail}\n` +
      `📱 *Contact:* ${displayMobile}\n` +
      `🆘 *Emergency Contact:* ${emergencyNum}\n` +
      `🏢 *Organisation:* ${displayOrgName} (ID: ${displayOrgId})${photoLine}\n\n` +
      `📍 *LIVE GPS LOCATION:* ${mapsUrl || "Location Permission Denied"}\n\n` +
      `⚠️ *I need immediate assistance! Please verify my safety.*`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  // Trigger SOS Alert (Email, WhatsApp, and Dialer)
  const handleTriggerSosAlert = async () => {
    if (isSendingSos) return;
    setIsSendingSos(true);
    setSosResult(null);

    // 1. Immediately open WhatsApp with pre-filled distress message & live GPS location
    if (typeof window !== "undefined") {
      const waUrl = generateWhatsAppUrl();
      window.open(waUrl, "_blank");
    }

    // 2. Open device Phone Dialer with emergency number
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = `tel:${displayEmergencyContact}`;
      }, 400);
    }

    // 3. Dispatch high-priority emergency Email to Org Admin & Support
    try {
      const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const response = await fetch(`${API_BASE_URL}/her-security/sos-alert`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: authToken } : {}),
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          mapsUrl: mapsUrl,
          deviceInfo: typeof window !== "undefined" ? navigator.userAgent : "",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSosResult({
          success: true,
          message: "🚨 SOS Alert successfully triggered across Email, WhatsApp & Dialer!",
          recipients: data.recipientsSent || [],
        });
      } else {
        setSosResult({
          success: false,
          message: data.message || "Failed to dispatch SOS email alert.",
        });
      }
    } catch (err) {
      console.error("SOS Trigger Error:", err);
      setSosResult({
        success: false,
        message: "Network error occurred while dispatching SOS email alert.",
      });
    } finally {
      setIsSendingSos(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 p-6 text-white shadow-2xl shadow-rose-950/30 sm:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3.5 py-1 text-xs font-semibold text-rose-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              REAL-TIME DISTRESS & EMERGENCY SYSTEM
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              तिची सुरक्षा <span className="text-rose-400">/ Her Security</span>
            </h1>
            <p className="max-w-xl text-sm text-slate-300">
              Personal safety, live GPS location dispatch, and high-priority emergency support system for all organization members.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: User Profile Card (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          {/* User Auto-Filled Profile Card */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <UserCheck className="h-5 w-5 text-rose-500" />
                Auto-Filled Profile Information
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Verified Profile
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative">
                <UserAvatar
                  src={avatarSrc}
                  name={displayName}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl border-2 border-rose-500/30 text-2xl font-black shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-rose-600 p-1 text-white shadow">
                  <Shield className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {displayName}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {displayEmail}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  {displayOrgName} (ID: {displayOrgId})
                </div>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 rounded-2xl bg-slate-50/80 p-4 dark:divide-slate-800 dark:bg-slate-950/60 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Contact Number:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{displayMobile}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Emergency Contact:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {displayEmergencyContact}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">System Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {currentUser?.role || user?.role || "MEMBER"}
                </span>
              </div>
            </div>
          </div>

          {/* Live Location Card */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <MapPin className="h-5 w-5 text-rose-500" />
                Live Real-Time GPS Location
              </h2>
              <button
                onClick={requestLocation}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${location.status === "initializing" ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {location.status === "initializing" && (
                <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
                  <p className="text-sm font-medium">Acquiring high-accuracy GPS coordinates...</p>
                </div>
              )}

              {location.status === "success" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-3.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Live Location Locked
                    </div>
                    <span className="rounded-lg bg-emerald-200/60 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      ±{location.accuracy}m Accuracy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <span className="text-slate-500 dark:text-slate-400">Latitude</span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{location.latitude}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <span className="text-slate-500 dark:text-slate-400">Longitude</span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{location.longitude}</p>
                    </div>
                  </div>

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Live Map on Google Maps
                    </a>
                  )}
                </div>
              )}

              {location.status === "denied" && (
                <div className="rounded-2xl bg-rose-50 p-4 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    GPS Permission Required
                  </div>
                  <p>{location.errorMessage}</p>
                  <button
                    onClick={requestLocation}
                    className="mt-1 font-bold underline hover:text-rose-900"
                  >
                    Click to retry location access
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: SOS Emergency Action Control Center (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          <div className="rounded-[2rem] border-2 border-rose-500/40 bg-white p-6 shadow-2xl shadow-rose-500/10 dark:border-rose-900/60 dark:bg-slate-900/90 dark:shadow-black/50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-6 w-6" />
                  EMERGENCY SOS DISPATCH
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  One-click immediate assistance & multi-channel alert dispatcher
                </p>
              </div>
            </div>

            {/* BIG RED SOS BUTTON */}
            <div className="my-8 flex flex-col items-center justify-center text-center">
              <button
                onClick={handleTriggerSosAlert}
                disabled={isSendingSos}
                className="group relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white shadow-2xl shadow-rose-600/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span className="absolute inset-0 rounded-full bg-rose-600 animate-ping opacity-25 group-hover:opacity-40" />
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  {isSendingSos ? (
                    <RefreshCw className="h-10 w-10 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-12 w-12" />
                  )}
                  <span className="text-xl font-black tracking-wider">
                    {isSendingSos ? "DISPATCHING" : "PRESS SOS"}
                  </span>
                  <span className="text-[10px] font-semibold tracking-widest text-rose-200">
                    URGENT ALERT
                  </span>
                </div>
              </button>
              <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Clicking this button automatically dispatches an emergency email with your live location & details to your Org Admin and Support Team.
              </p>
            </div>

            {/* SOS Dispatch Result Banner */}
            {sosResult && (
              <div
                className={`mb-6 rounded-2xl p-4 text-sm font-semibold shadow-inner ${sosResult.success
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                  }`}
              >
                <div className="flex items-start gap-3">
                  {sosResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p>{sosResult.message}</p>
                    {sosResult.recipients && sosResult.recipients.length > 0 && (
                      <p className="mt-1 text-xs font-normal opacity-80">
                        Dispatched to: {sosResult.recipients.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3 Quick Action Buttons: Call, WhatsApp, Email */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Direct Emergency Channels
              </h3>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* Call Button */}
                <a
                  href={`tel:${EMERGENCY_TEST_NUMBER}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-center text-rose-700 shadow-sm transition-all hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60"
                >
                  <PhoneCall className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-extrabold">CALL 100 / TEST</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{EMERGENCY_TEST_NUMBER}</span>
                </a>

                {/* WhatsApp Button */}
                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                >
                  <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-extrabold">WHATSAPP</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Share Live Location</span>
                </a>

                {/* Email Dispatch */}
                <button
                  onClick={handleTriggerSosAlert}
                  disabled={isSendingSos}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-center text-blue-700 shadow-sm transition-all hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/60"
                >
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-extrabold">EMAIL ALERT</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Org Admin & Support</span>
                </button>
              </div>
            </div>
          </div>

          {/* Educational / Technology Explanation Box */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/40">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
              <Info className="h-4 w-4 text-blue-500" />
              सिस्टम कसे कार्य करते? (How this feature works)
            </h3>

            <ul className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500 font-bold">•</span>
                <span><strong>ऑटो-फील प्रोफाइल:</strong> तुमचे नाव, ईमेल, फोन नंबर आणि संस्था (Org Name/ID) आपोआप प्रदर्शित होतात.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500 font-bold">•</span>
                <span><strong>Live GPS Location:</strong> Browser Geolocation API द्वारे तुमचे अचूक अक्षांश व रेखांश मिळवून Google Maps लिंक तयार केली जाते.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500 font-bold">•</span>
                <span><strong>तत्काळ ईमेल अलर्ट:</strong> SOS बटण दाबल्यावर Nodemailer द्वारे तुमच्या संस्थेच्या Admin ला आणि Support टीमला त्वरित ईमेल पाठवला जातो.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500 font-bold">•</span>
                <span><strong>व्हॉट्सअॅप व कॉल:</strong> Direct Call व WhatsApp शेअर लिंकद्वारे तुम्ही एका क्लिकवर तुमच्या जवळच्या व्यक्तींना माहिती पाठवू शकता.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
