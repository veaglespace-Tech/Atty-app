import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Linking, Image, Platform } from "react-native";
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
} from "lucide-react-native";

const EMERGENCY_TEST_NUMBER = "8237999101";

export default function MobileHerSecurityContent() {
  const { user, token } = useAuthSession();
  const { data: meData } = useGetMeQuery(undefined, { skip: !token });
  const currentUser = meData?.data || meData?.user || meData?.result || user;

  const displayName = user?.name || currentUser?.name || "User Name";
  const displayEmail = user?.email || currentUser?.email || "N/A";
  const displayMobile = user?.mobile || currentUser?.mobile || "N/A";
  const displayEmergencyContact =
    user?.emergencyContact || currentUser?.emergencyContact || displayMobile || EMERGENCY_TEST_NUMBER;
  
  const avatarSrc =
    user?.profileImageUrl ||
    user?.profileImage ||
    user?.avatarUrl ||
    user?.avatar ||
    currentUser?.profileImageUrl ||
    currentUser?.profileImage ||
    currentUser?.avatarUrl ||
    currentUser?.avatar ||
    null;

  const getFullImageUrl = (url) => {
    if (!url) return null;
    
    // Get the base url from API_BASE_URL (strip /api)
    const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '') : '';
    
    if (url.startsWith("http")) {
      if (url.includes("localhost:") || url.includes("127.0.0.1:")) {
        try {
          const urlObj = new URL(url);
          const apiObj = new URL(API_BASE_URL);
          return url.replace(urlObj.origin, apiObj.origin);
        } catch (e) {
          return url;
        }
      }
      return url;
    }
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const publicPhotoUrl = avatarSrc
    ? getFullImageUrl(avatarSrc)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=dc2626&color=ffffff&size=250&bold=true`;

  const orgLogoUrl = getFullImageUrl(
    user?.organization?.logoUrl || currentUser?.organization?.logoUrl || user?.logoUrl || currentUser?.logoUrl
  );

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

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: "initializing",
    errorMessage: "",
  });

  const [isSendingSos, setIsSendingSos] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [isSosActive, setIsSosActive] = useState(false);

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = React.useRef(null);

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
        // Only trigger because stop is handled immediately
        handleTriggerSosAlert();
      }
    }, 1000);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const [avatarError, setAvatarError] = useState(false);
  const [orgLogoError, setOrgLogoError] = useState(false);

  useEffect(() => {
    setOrgLogoError(false);
  }, [orgLogoUrl]);

  useEffect(() => {
    setAvatarError(false);
  }, [publicPhotoUrl]);

  // Keep phone awake while SOS is active
  useEffect(() => {
    const SOS_AWAKE_TAG = 'her-security-sos';
    
    const enableWakeLock = async () => {
      try {
        if (isSosActive) {
          await activateKeepAwakeAsync(SOS_AWAKE_TAG);
        } else {
          await deactivateKeepAwake(SOS_AWAKE_TAG);
        }
      } catch (e) {
        // Silently ignore wake lock errors
      }
    };
    
    enableWakeLock();

    return () => {
      deactivateKeepAwake(SOS_AWAKE_TAG).catch(() => {});
    };
  }, [isSosActive]);

  const requestLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, status: "initializing" }));
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: "denied",
          errorMessage: "Location permission denied. Please allow location access in your device settings.",
        });
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: Math.round(locationData.coords.accuracy || 0),
        status: "success",
        errorMessage: "",
      });
    } catch (error) {
      setLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        status: "error",
        errorMessage: "Could not fetch location.",
      });
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const getSafeApiEndpoint = (endpointPath) => {
    let baseUrl = API_BASE_URL || "https://atty.veaglespace.com/api";
    if (Platform.OS !== "web" && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))) {
      baseUrl = "https://atty.veaglespace.com/api";
    }
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
    return `${cleanBase}${cleanPath}`;
  };

  // Periodic Location & Email Updates every 15 minutes during active SOS
  useEffect(() => {
    let intervalId;
    
    if (isSosActive) {
      intervalId = setInterval(async () => {
        try {
          let locationData = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          const lat = locationData.coords.latitude;
          const lng = locationData.coords.longitude;
          const liveMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          
          const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
          const targetUrl = getSafeApiEndpoint("/her-security/sos-alert");
          await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: authToken } : {}),
            },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              mapsUrl: liveMapsUrl,
              isUpdate: true,
              deviceInfo: "Mobile App Interval (15 min)",
            }),
          });
        } catch (e) {
          console.error("Failed to send 15-min background location update", e);
        }
      }, 15 * 60 * 1000); // Every 15 minutes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSosActive, token]);

  const mapsUrl =
    location.latitude && location.longitude
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : null;

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
    return `whatsapp://send?text=${text}`;
  };

  const handleTriggerSosAlert = async () => {
    if (isSendingSos) return;
    setIsSendingSos(true);
    setIsSosActive(true); // Convert immediately to STOP state
    setSosResult(null);

    // Fetch fresh live location right away
    let currentLat = location.latitude;
    let currentLng = location.longitude;
    let currentMapsUrl = mapsUrl;

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        currentLat = loc.coords.latitude;
        currentLng = loc.coords.longitude;
        currentMapsUrl = `https://maps.google.com/?q=${currentLat},${currentLng}`;
        setLocation({
          latitude: currentLat,
          longitude: currentLng,
          accuracy: Math.round(loc.coords.accuracy || 0),
          status: "success",
          errorMessage: "",
        });
      }
    } catch (err) {
      console.log("Error getting live location on SOS trigger:", err);
    }

    // 1. WhatsApp
    try {
      const emergencyNum = displayEmergencyContact;
      const text = encodeURIComponent(
        `🚨 *EMERGENCY SOS DISTRESS ALERT* 🚨\n\n` +
        `👤 *Name:* ${displayName}\n` +
        `📧 *Email:* ${displayEmail}\n` +
        `📱 *Contact:* ${displayMobile}\n` +
        `🆘 *Emergency Contact:* ${emergencyNum}\n` +
        `🏢 *Organisation:* ${displayOrgName} (ID: ${displayOrgId})\n` +
        `🖼️ *Profile Photo:* ${publicPhotoUrl}\n\n` +
        `📍 *LIVE GPS LOCATION:* ${currentMapsUrl || "Location Permission Denied"}\n\n` +
        `⚠️ *I need immediate assistance! Please verify my safety.*`
      );
      const waUrl = `whatsapp://send?text=${text}`;
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        console.log("WhatsApp not installed");
      }
    } catch (e) {
      console.log(e);
    }

    // 2. Dialer
    if (Platform.OS !== 'web') {
      setTimeout(() => {
        Linking.openURL(`tel:${displayEmergencyContact}`).catch((err) => console.log(err));
      }, 400);
    } else {
      console.log("Web platform detected: Auto-dialing is disabled due to browser security restrictions.");
    }

    // 3. Email API
    try {
      const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const targetUrl = getSafeApiEndpoint("/her-security/sos-alert");
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: authToken } : {}),
        },
        body: JSON.stringify({
          latitude: currentLat,
          longitude: currentLng,
          mapsUrl: currentMapsUrl,
          deviceInfo: "Mobile App",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
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
  };

  const handleStopSosAlert = async () => {
    if (isSendingSos) return;
    setIsSendingSos(true);
    setSosResult(null);

    try {
      const authToken = token ? (String(token).startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const targetUrl = getSafeApiEndpoint("/her-security/stop-sos-alert");
      const response = await fetch(targetUrl, {
        method: "POST",
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
      setIsSosActive(false);
      setSosResult({
        success: false,
        message: "Network error occurred while cancelling SOS alert.",
      });
    } finally {
      setIsSendingSos(false);
    }
  };

  return (
    <View className="flex-1 relative">
    <ScrollView className="flex-1 bg-pink-50/50 dark:bg-pink-950/20" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header Banner Area */}
      <View className="px-5 pt-8 pb-4 items-center gap-4">
        
        {/* Top Logos Row */}
        <View className="w-full flex-row justify-between items-center px-1">
          <View className="bg-white rounded-2xl shadow-xl border-2 border-indigo-900/10 p-2 h-20 w-32 items-center justify-center overflow-hidden">
            {orgLogoUrl && !orgLogoError ? (
              <Image
                source={{ uri: orgLogoUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                onError={() => setOrgLogoError(true)}
              />
            ) : (
              <Text className="text-sm font-black text-slate-800 text-center" numberOfLines={2}>
                {displayOrgName}
              </Text>
            )}
          </View>

          <View className="bg-white rounded-2xl shadow-xl border-2 border-indigo-900/10 p-2 h-20 w-32 items-center justify-center">
            <Image
              source={require("../../../assets/images/police-logo.jpg")}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Orange Gradient Banner Block */}
        <View className="w-full rounded-[2rem] bg-orange-500 p-6 items-center shadow-lg overflow-hidden border border-white/20 mt-2">
          {/* Decorative shapes imitating blur */}
          <View className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-yellow-400/30" />
          <View className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-400/20 -translate-y-1/2 translate-x-1/3" />

          {/* Logo Center */}
          <View className="relative h-24 w-24 rounded-full border-4 border-pink-200 bg-pink-100 shadow-xl items-center justify-center mb-4 z-10 overflow-hidden">
            <Image 
              source={require("../../../assets/images/her-security-logo.png")}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-3xl font-black text-white mb-2 text-center drop-shadow-md tracking-tight z-10">“तिची सुरक्षा”</Text>
          <View className="bg-white/20 px-4 py-1.5 rounded-full border border-white/20 shadow-sm z-10 mt-1 mb-4">
            <Text className="text-xs font-bold text-white text-center tracking-wide">तिची सुरक्षा, आपली जबाबदारी</Text>
          </View>
        </View>
      </View>

      <View className={`mx-5 my-4 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 p-6 shadow-2xl relative overflow-hidden ${isSosActive ? "border-rose-500/40" : "border-emerald-500/40"}`}>
        <View className="items-center z-10">
          <View className="flex-row items-center gap-2 mb-6">
            {isSosActive ? (
              <ShieldAlert size={24} color="#e11d48" />
            ) : (
              <ShieldAlert size={24} color="#10b981" />
            )}
            <Text className={`text-lg font-bold uppercase tracking-tight ${isSosActive ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              Emergency SOS Dispatch
            </Text>
          </View>
          
          <Pressable
            onPressIn={startHold}
            onPressOut={cancelHold}
            disabled={isSendingSos}
            className={`h-56 w-56 rounded-full items-center justify-center active:scale-95 transition-all shadow-xl ${
              isSosActive ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {isSendingSos ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              isSosActive ? (
                <Shield size={64} color="#ffffff" />
              ) : (
                <ShieldAlert size={64} color="#ffffff" />
              )
            )}
            {isHolding ? (
              <Text className="text-3xl font-black text-white mt-3 text-center tracking-wide drop-shadow-md">
                Hold... {3 - holdProgress}s
              </Text>
            ) : (
              <Text className="text-3xl font-black text-white mt-3 text-center tracking-wide drop-shadow-md">
                {isSendingSos ? "..." : (isSosActive ? "STOP SOS" : "START SOS")}
              </Text>
            )}
            {!isSendingSos && (
              <Text className="text-xs font-bold text-white/90 uppercase tracking-widest mt-2">
                {isHolding ? "Keep Holding" : (isSosActive ? "Tap to Cancel" : "Hold 3s to Alert")}
              </Text>
            )}
          </Pressable>

          <Text className="mt-8 text-xs text-center font-semibold text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
            {isSosActive
              ? "Tap STOP SOS to cancel the alert when safe."
              : "Hold START SOS for 3 seconds to automatically dispatch an emergency email with your live location every 15 minutes."}
          </Text>
        </View>

        {sosResult && (
          <View className={`mt-6 rounded-2xl p-4 border shadow-inner ${sosResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <View className="flex-row items-start gap-3">
              {sosResult.success ? <CheckCircle2 size={24} color="#059669" /> : <AlertTriangle size={24} color="#e11d48" />}
              <View className="flex-1">
                <Text className={`font-bold ${sosResult.success ? 'text-emerald-900' : 'text-rose-900'}`}>{sosResult.message}</Text>
                {sosResult.recipients?.length > 0 && (
                  <Text className={`mt-2 text-xs font-medium opacity-90 p-1.5 rounded-lg inline-flex ${sosResult.success ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100'}`}>
                    Dispatched to: {sosResult.recipients.join(", ")}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View className="mt-8 space-y-4">
          <View className="flex-row items-center justify-center gap-2 mb-2">
            <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
            <Text className="text-xs font-bold uppercase text-slate-400 tracking-widest">Direct Emergency Channels</Text>
            <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => Linking.openURL(`tel:${EMERGENCY_TEST_NUMBER}`)}
              className="flex-1 rounded-[1.5rem] border-2 border-rose-500/30 bg-rose-50 p-4 items-center shadow-sm"
            >
              <PhoneCall size={28} color="#e11d48" />
              <Text className="text-xs font-black text-rose-600 mt-2 tracking-wide">CALL 112</Text>
              <Text className="text-[9px] font-bold text-rose-500/80 uppercase mt-0.5">Emergency</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const url = generateWhatsAppUrl();
                if (await Linking.canOpenURL(url)) Linking.openURL(url);
              }}
              className="flex-1 rounded-[1.5rem] border-2 border-emerald-500/30 bg-emerald-50 p-4 items-center shadow-sm"
            >
              <MessageSquare size={28} color="#059669" />
              <Text className="text-xs font-black text-emerald-600 mt-2 tracking-wide">WHATSAPP</Text>
              <Text className="text-[9px] font-bold text-emerald-500/80 uppercase mt-0.5">Location</Text>
            </Pressable>
            <Pressable
              onPress={handleTriggerSosAlert}
              disabled={isSendingSos}
              className="flex-1 rounded-[1.5rem] border-2 border-blue-500/30 bg-blue-50 p-4 items-center shadow-sm opacity-100"
            >
              <Mail size={28} color="#2563eb" />
              <Text className="text-xs font-black text-blue-600 mt-2 tracking-wide">EMAIL</Text>
              <Text className="text-[9px] font-bold text-blue-500/80 uppercase mt-0.5">Alert Org</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Info Cards Grid */}
      <View className="mx-5 mb-4 gap-4">
        {/* Live Location Card */}
        <View className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:bg-slate-900 dark:border-slate-800">
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <View className="flex-row items-center gap-2">
              <MapPin size={20} color="#e11d48" />
              <Text className="font-bold text-slate-900 dark:text-white">Live GPS Location</Text>
            </View>
            <Pressable onPress={requestLocation} className="flex-row items-center gap-1">
              <RefreshCw size={14} color="#e11d48" />
              <Text className="text-xs font-bold text-rose-600">Refresh</Text>
            </Pressable>
          </View>

          {location.status === "initializing" && (
            <View className="flex-row items-center gap-2 bg-amber-50 p-3 rounded-xl">
              <ActivityIndicator size="small" color="#d97706" />
              <Text className="text-xs font-bold text-amber-800">Acquiring high-accuracy GPS...</Text>
            </View>
          )}

          {location.status === "success" && (
            <View>
              <View className="flex-row items-center justify-between bg-emerald-50 p-3 rounded-xl mb-3">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color="#059669" />
                  <Text className="text-xs font-bold text-emerald-900">Location Locked</Text>
                </View>
                <Text className="text-[10px] font-bold bg-emerald-200 px-2 py-1 rounded-lg text-emerald-800">±{location.accuracy}m</Text>
              </View>
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <Text className="text-[10px] font-bold text-slate-400">LATITUDE</Text>
                  <Text className="text-xs font-mono font-bold text-slate-900 dark:text-white" numberOfLines={1}>{location.latitude}</Text>
                </View>
                <View className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <Text className="text-[10px] font-bold text-slate-400">LONGITUDE</Text>
                  <Text className="text-xs font-mono font-bold text-slate-900 dark:text-white" numberOfLines={1}>{location.longitude}</Text>
                </View>
              </View>
              {mapsUrl && (
                <Pressable onPress={() => Linking.openURL(mapsUrl)} className="flex-row items-center justify-center gap-2 bg-slate-900 py-3 rounded-xl">
                  <ExternalLink size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">View on Google Maps</Text>
                </Pressable>
              )}
            </View>
          )}

          {location.status === "denied" && (
            <View className="bg-rose-50 p-3 rounded-xl">
              <View className="flex-row items-center gap-2 mb-1">
                <AlertTriangle size={16} color="#be123c" />
                <Text className="text-xs font-bold text-rose-800">Permission Denied</Text>
              </View>
              <Text className="text-xs text-rose-700">{location.errorMessage}</Text>
            </View>
          )}
        </View>

        {/* User Profile Card */}
        <View className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:bg-slate-900 dark:border-slate-800">
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <View className="flex-row items-center gap-2">
              <UserCheck size={20} color="#e11d48" />
              <Text className="font-bold text-slate-900 dark:text-white">Profile Information</Text>
            </View>
            <View className="bg-emerald-100 px-2 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-800">Verified</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4 mb-5">
            <View className="h-16 w-16 rounded-2xl border-2 border-rose-500/30 overflow-hidden items-center justify-center bg-slate-100 dark:bg-slate-800">
              {publicPhotoUrl && !avatarError ? (
                <Image 
                  source={{ uri: publicPhotoUrl }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover" 
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <Text className="text-xl font-bold text-slate-500">{displayName.charAt(0)}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">{displayName}</Text>
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{displayEmail}</Text>
              <View className="mt-1 flex-row items-center gap-1 bg-slate-100 self-start px-2 py-1 rounded-lg dark:bg-slate-800">
                <Building size={12} color="#3b82f6" />
                <Text className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{displayOrgName}</Text>
              </View>
            </View>
          </View>

          <View className="bg-slate-50 rounded-xl p-3 gap-2 dark:bg-slate-800/50">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-slate-500">Contact:</Text>
              <Text className="text-xs font-bold text-slate-900 dark:text-white">{displayMobile}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-slate-500">Emergency Contact:</Text>
              <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">{displayEmergencyContact}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-slate-500">Role:</Text>
              <Text className="text-xs font-bold text-slate-900 dark:text-white">{user?.role || "MEMBER"}</Text>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>


    </View>
  );
}
