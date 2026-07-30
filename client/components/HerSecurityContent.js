"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGetMeQuery } from "@/services/api/authApi";
import { API_BASE_URL } from "@/services/api/baseApi";
import { CLIENT_BASE_URL } from "@/config";
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
import DashboardFooter from "@/components/dashboard/DashboardFooter";

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

  const publicPhotoUrl = avatarSrc
    ? (avatarSrc.startsWith("http") ? avatarSrc : `${CLIENT_BASE_URL}${avatarSrc.startsWith("/") ? "" : "/"}${avatarSrc}`)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=dc2626&color=ffffff&size=250&bold=true`;

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
  const [isSosActive, setIsSosActive] = useState(false); // Tracks if SOS is currently active

  // Screen Wake Lock API to prevent phone from sleeping during SOS
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
          return;
        }
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Screen Wake Lock is active. Screen will not turn off automatically.");
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        console.warn(`Wake Lock warning: ${err.name}, ${err.message}`);
      }
    }
  }, []);

  // Hold-to-activate logic
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 3 seconds
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef(null);

  const handleStopSosAlert = async () => {
    if (isSendingSos) return;
    setIsSendingSos(true);
    setSosResult(null);

    try {
      const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const response = await fetch(`${API_BASE_URL}/her-security/stop-sos-alert`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: authToken } : {}),
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSosActive(false);
        setSosResult({
          success: true,
          message: "✅ SOS Alert has been successfully stopped and cancelled.",
          recipients: data.recipientsSent || [],
        });
      } else {
        setSosResult({
          success: false,
          message: data.message || "Failed to cancel SOS alert.",
        });
      }
    } catch (err) {
      console.error("SOS Stop Error:", err);
      setSosResult({
        success: false,
        message: "Network error occurred while cancelling SOS alert.",
      });
    } finally {
      setIsSendingSos(false);
    }
  };

  // Construct Google Maps Live Link
  const mapsUrl =
    location.latitude && location.longitude
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : null;

  // WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const emergencyNum = displayEmergencyContact;
    const text = encodeURIComponent(
      `🚨 *EMERGENCY SOS DISTRESS ALERT* 🚨\n\n` +
      `👤 *Name:* ${displayName}\n` +
      `📧 *Email:* ${displayEmail}\n` +
      `📱 *Contact:* ${displayMobile}\n` +
      `🆘 *Emergency Contact:* ${emergencyNum}\n` +
      `🏢 *Organisation:* ${displayOrgName} (ID: ${displayOrgId})\n` +
      `🖼️ *Profile Photo:* ${publicPhotoUrl}\n\n` +
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

    // 2. Dispatch high-priority emergency Email to Org Admin & Support
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
        setIsSosActive(true);
        setSosResult({
          success: true,
          message: "🚨 SOS Alert successfully triggered across Email, WhatsApp & Dialer! Live location tracking is active.",
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

    // 3. Open device Phone Dialer with emergency number after API call
    if (typeof window !== "undefined" && displayEmergencyContact) {
      setTimeout(() => {
        window.location.href = `tel:${displayEmergencyContact}`;
      }, 300);
    }
  };

  const startHold = () => {
    if (isSendingSos) return;

    // Immediate click to stop
    if (isSosActive) {
      handleStopSosAlert();
      return;
    }

    setIsHolding(true);
    setHoldProgress(0);

    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 1;
      setHoldProgress(progress);

      if (progress >= 3) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        handleTriggerSosAlert();
      }
    }, 1000); // 1 second intervals
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current !== null) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Screen Wake Lock released.');
    }
  }, []);

  // Re-acquire wake lock if document becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSosActive) {
        requestWakeLock();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [isSosActive, requestWakeLock]);

  // Request or release on isSosActive change
  useEffect(() => {
    if (isSosActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
  }, [isSosActive, requestWakeLock, releaseWakeLock]);

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

  // Periodic Location Updates during active SOS
  useEffect(() => {
    let intervalId;

    if (isSosActive) {
      intervalId = setInterval(() => {
        if (typeof window === "undefined" || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const liveMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

            try {
              const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
              await fetch(`${API_BASE_URL}/her-security/sos-alert`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  ...(authToken ? { Authorization: authToken } : {}),
                },
                body: JSON.stringify({
                  latitude: lat,
                  longitude: lng,
                  mapsUrl: liveMapsUrl,
                  isUpdate: true,
                  deviceInfo: navigator.userAgent,
                }),
              });
            } catch (e) {
              console.error("Failed to send background location update", e);
            }
          },
          (error) => {
            console.error("Background location tracking error:", error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }, 15 * 60 * 1000); // 15 minutes in milliseconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSosActive, token]);

  // TEMPORARILY DISABLED FEATURE SWITCH (Change to true to enable)
  const IS_ENABLED = false;
  if (!IS_ENABLED) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-5xl space-y-6 pb-12 bg-pink-50/50 dark:bg-pink-950/20 p-4 sm:p-8 rounded-[3rem]">
        {/* Header Banner Area */}
        <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-4 md:gap-8 lg:gap-10 relative w-full">
          {/* Organization Logo */}
          {user?.organization?.logoUrl && (
            <div className="shrink-0 flex items-center justify-center order-1">
              <div className="relative w-fit h-fit rounded-xl md:rounded-3xl bg-white shadow-xl md:shadow-2xl border-2 md:border-[3px] border-indigo-900/10 dark:border-slate-700 overflow-hidden transition-transform hover:scale-105 flex items-center justify-center">
                <img
                  src={user.organization.logoUrl}
                  alt={user?.organization?.name || "Organization"}
                  className="h-28 sm:h-32 md:h-48 lg:h-64 w-auto max-w-[6rem] sm:max-w-[10rem] md:max-w-[14rem] lg:max-w-[20rem] object-contain"
                />
              </div>
            </div>
          )}

          {/* Header Banner */}
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-4 sm:p-6 md:p-8 text-white shadow-[0_30px_60px_rgba(249,115,22,0.3)] border border-white/20 order-3 md:order-2 col-span-2 justify-self-center mx-auto">
            {/* Modern decorative background elements */}
            <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-yellow-400/30 blur-3xl mix-blend-screen" />
            <div className="absolute right-0 top-0 h-[30rem] w-[30rem] rounded-full bg-red-400/20 blur-3xl mix-blend-screen -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 flex flex-col items-center justify-center w-full">
              <div className="space-y-6">

                <div className="flex flex-col items-center justify-center gap-5 md:gap-6 text-center">

                  {/* Logo Wrapper */}
                  <div className="relative shrink-0 group">
                    <div className="absolute inset-0 rounded-full bg-pink-300/50 blur-xl animate-pulse" />
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-32 lg:w-32 rounded-full border-2 md:border-[4px] border-pink-200 bg-pink-100 shadow-xl md:shadow-2xl z-10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
                      <img
                        src="/her-security-logo.png"
                        alt="तिची सुरक्षा Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Simple Typography */}
                  <div className="space-y-1.5 md:space-y-3 flex flex-col items-center">
                    <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md whitespace-nowrap">
                      “तिची सुरक्षा”
                    </h1>
                    <div className="inline-block rounded-full bg-white/10 px-2 sm:px-4 py-1 sm:py-1.5 backdrop-blur-sm border border-white/20 shadow-sm">
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-lg font-bold text-white tracking-wide whitespace-nowrap">
                        तिची सुरक्षा,आपली जबाबदारी
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Logo (Police / 112) */}
          <div className="shrink-0 flex items-center justify-center order-2 md:order-3">
            <div className="relative w-fit h-fit rounded-xl md:rounded-3xl bg-white shadow-xl md:shadow-2xl border-2 md:border-[3px] border-indigo-900/10 dark:border-slate-700 overflow-hidden transition-transform hover:scale-105 flex items-center justify-center">
              <img
                src="/police-logo.jpg"
                alt="112 Police Logo"
                className="h-28 sm:h-32 md:h-48 lg:h-64 w-auto max-w-[6rem] sm:max-w-[10rem] md:max-w-[14rem] lg:max-w-[20rem] object-contain"
              />
            </div>
          </div>

        </div>
        {/* SOS EMERGENCY ACTION (Moved to Top) */}
        <div className="rounded-[2.5rem] border-2 border-rose-500/40 bg-white p-6 sm:p-10 shadow-2xl shadow-rose-500/10 dark:border-rose-900/60 dark:bg-slate-900/90 dark:shadow-black/50 overflow-hidden relative">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 justify-center">

            {/* Left Side: SOS Buttons */}
            <div className="flex flex-col items-center justify-center text-center shrink-0">
              <h2 className="flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mb-6 whitespace-nowrap">
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 animate-bounce" />
                EMERGENCY SOS DISPATCH
              </h2>
              <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8">
                <button
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={() => startHold()}
                  onTouchEnd={cancelHold}
                  disabled={isSendingSos}
                  className={`group relative flex h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 items-center justify-center rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 touch-none select-none ${isSosActive
                      ? "bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 shadow-[0_0_50px_rgba(225,29,72,0.6)]"
                      : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 shadow-[0_0_50px_rgba(16,185,129,0.6)]"
                    }`}
                >
                  <span className={`absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite] opacity-40 group-hover:opacity-60 ${isSosActive ? "bg-rose-600" : "bg-emerald-600"
                    }`} />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-2 sm:gap-3">
                    {isSendingSos ? (
                      <RefreshCw className="h-10 w-10 sm:h-14 sm:w-14 animate-spin" />
                    ) : (
                      isSosActive ? (
                        <Shield className="h-10 w-10 sm:h-14 sm:w-14" />
                      ) : (
                        <ShieldAlert className="h-10 w-10 sm:h-14 sm:w-14" />
                      )
                    )}
                    {isHolding ? (
                      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide drop-shadow-md text-center leading-tight">
                        Hold... {3 - holdProgress}s
                      </span>
                    ) : (
                      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide drop-shadow-md text-center leading-tight">
                        {isSendingSos ? "..." : (isSosActive ? "STOP SOS" : "START SOS")}
                      </span>
                    )}
                    {!isSendingSos && (
                      <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest opacity-80 mt-1">
                        {isHolding ? "Keep Holding" : (isSosActive ? "Tap to Cancel" : "Hold 3 sec to Alert")}
                      </span>
                    )}
                  </div>
                </button>
              </div>
              <p className="mt-8 max-w-sm text-sm font-semibold text-slate-500 dark:text-slate-400">
                Click START SOS to automatically dispatch an emergency email with your live location. Click STOP SOS to cancel the alert when safe.
              </p>
            </div>

            {/* Right Side: Dispatch Result & Quick Actions */}
            <div className="w-full lg:w-auto flex-1 max-w-2xl space-y-8">
              {sosResult && (
                <div
                  className={`rounded-2xl p-5 text-sm font-semibold shadow-inner ${sosResult.success
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {sosResult.success ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-base">{sosResult.message}</p>
                      {sosResult.recipients && sosResult.recipients.length > 0 && (
                        <p className="mt-2 text-xs font-medium opacity-90 bg-white/50 dark:bg-black/20 p-2 rounded-lg inline-block">
                          Dispatched to: {sosResult.recipients.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 text-center lg:text-left flex items-center justify-center lg:justify-start gap-2">
                  <span className="h-px w-8 bg-slate-300 dark:bg-slate-700"></span>
                  Direct Emergency Channels
                  <span className="h-px w-8 bg-slate-300 dark:bg-slate-700"></span>
                </h3>

                <div className="flex flex-row justify-between gap-2 sm:gap-4 w-full">
                  <a
                    href={`tel:${EMERGENCY_TEST_NUMBER}`}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-[1.5rem] border-2 border-rose-500/30 bg-rose-500/5 p-3 sm:p-5 text-center text-rose-600 shadow-sm transition-all hover:bg-rose-500/10 hover:border-rose-500/60 hover:-translate-y-1 dark:text-rose-400 min-w-0"
                  >
                    <PhoneCall className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
                    <span className="text-[10px] sm:text-sm font-black tracking-wide truncate w-full">CALL 112</span>
                    <span className="text-[8px] sm:text-[10px] opacity-80 font-bold uppercase leading-tight truncate w-full">Emergency</span>
                  </a>

                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-[1.5rem] border-2 border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-5 text-center text-emerald-600 shadow-sm transition-all hover:bg-emerald-500/10 hover:border-emerald-500/60 hover:-translate-y-1 dark:text-emerald-400 min-w-0"
                  >
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
                    <span className="text-[10px] sm:text-sm font-black tracking-wide truncate w-full">WHATSAPP</span>
                    <span className="text-[8px] sm:text-[10px] opacity-80 font-bold uppercase leading-tight truncate w-full">Location</span>
                  </a>

                  <button
                    onClick={handleTriggerSosAlert}
                    disabled={isSendingSos}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 rounded-2xl sm:rounded-[1.5rem] border-2 border-blue-500/30 bg-blue-500/5 p-3 sm:p-5 text-center text-blue-600 shadow-sm transition-all hover:bg-blue-500/10 hover:border-blue-500/60 hover:-translate-y-1 dark:text-blue-400 min-w-0 disabled:opacity-50"
                  >
                    <Mail className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
                    <span className="text-[10px] sm:text-sm font-black tracking-wide truncate w-full">EMAIL</span>
                    <span className="text-[8px] sm:text-[10px] opacity-80 font-bold uppercase leading-tight truncate w-full">Alert Admin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Grid (Location & Profile) */}
        <div className="grid gap-6 md:grid-cols-2">
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
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50 overflow-hidden">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Latitude</span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white truncate" title={location.latitude}>{location.latitude}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50 overflow-hidden">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Longitude</span>
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white truncate" title={location.longitude}>{location.longitude}</p>
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
                  src={avatarSrc?.startsWith('http') ? avatarSrc : (avatarSrc ? `${API_BASE_URL?.replace('/api/v1', '')}${avatarSrc.startsWith('/') ? '' : '/'}${avatarSrc}` : null)}
                  name={displayName}
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
                <span className="font-semibold text-slate-900 dark:text-white">{user?.role || "MEMBER"}</span>
              </div>
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
              <span><strong>व्हॉट्सॲप व कॉल:</strong> Direct Call व WhatsApp शेअर लिंकद्वारे तुम्ही एका क्लिकवर तुमच्या जवळच्या व्यक्तींना माहिती पाठवू शकता.</span>
            </li>
          </ul>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
