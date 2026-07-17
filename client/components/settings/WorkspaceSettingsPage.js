"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Copy,
  ImageUp,
  Globe,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import ThemeToggle from "@/components/ThemeToggle";
import CountryPhoneField from "@/components/CountryPhoneField";
import UserAvatar from "@/components/UserAvatar";
import { useForgotPasswordMutation, useUpdateMeMutation } from "@/services/api/authApi";
import { setCurrentUser } from "@/store/slices/authSlice";
import { addNotification } from "@/store/slices/notificationSlice";
import {
  formatRoleLabel,
  getUserOrganizationId,
  hasPermission,
  PERMISSIONS,
  resolveUserPermissions,
  ROLES,
} from "@/utils/roles";
import { getLocalPhoneNumber } from "@/utils/phone";
import { cn } from "@/lib/utils";
import {
  useGetOrgAttendanceSettingsQuery,
  useUpdateOrgAttendanceSettingsMutation,
  useUpdateOrgLogoMutation,
  useUpdateOrgDetailsMutation,
} from "@/services/api/orgApi";
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
} from "@/utils/formValidation";
import { getCurrentCoordinates } from "@/utils/location";

const getSettingsSchema = (isAdmin) => z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Name is too long")
    .regex(
      PERSON_NAME_REGEX,
      "Full name can only include letters, spaces, apostrophes, dots, or hyphens"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  mobileCountryCode: z
    .string()
    .trim()
    .refine((value) => value && /^\+\d{1,3}$/.test(value), "Country code is required"),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .refine(
      (value) => !value || toDigitsOnly(value).length >= PHONE_DIGIT_MIN,
      "Enter a valid mobile number"
    )
    .refine(
      (value) => !value || toDigitsOnly(value).length <= PHONE_DIGIT_MAX,
      "Mobile number is too long"
    ),
  emergencyContact: isAdmin ? z.string().trim().optional() : z.string().trim().min(1, "Emergency mobile is required"),
  currentAddress: z.string().trim().min(1, "Full address is required"),
  permanentAddress: z.string().trim().optional(),
  bloodGroup: z.string().trim().optional(),
});

const labelClassName = "brand-kicker mb-1.5 ml-1 block";
const inputClassName =
  "w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_18px_40px_rgba(30,112,209,0.10)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/10";
const errorInputClassName =
  "border-rose-400 bg-rose-50/80 focus:border-rose-500 focus:ring-rose-500/10";
const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const formatValue = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getFormDefaults = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  mobileCountryCode: user?.mobileCountryCode || "+91",
  mobile: getLocalPhoneNumber(user?.mobile, user?.mobileCountryCode) || "",
  emergencyContact: user?.emergencyContact || "",
  currentAddress: user?.currentAddress || "",
  permanentAddress: user?.permanentAddress || "",
  bloodGroup: user?.bloodGroup || "",
});

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="brand-panel-soft rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <div className="brand-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="brand-kicker">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreferenceCard({ icon: Icon, title, value, children, className }) {
  return (
    <div className={cn("brand-panel-soft rounded-[1.5rem] p-5 flex flex-col h-full", className)}>
      <div className="flex items-start gap-3">
        <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="brand-copy-sm mt-1">{value}</p>
        </div>
      </div>
      {children ? <div className="mt-4 flex-1 flex flex-col justify-end">{children}</div> : null}
    </div>
  );
}

function LocationSettings() {
  const dispatch = useDispatch();
  const { data: settingsData, isLoading: loadingSettings } = useGetOrgAttendanceSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();

  const persistedSettings = settingsData?.settings;
  const persistedLocation = Array.isArray(persistedSettings?.location)
    ? persistedSettings.location
    : [];
  const defaultRadius = Number(persistedSettings?.attendanceRadius) || 25;
  const defaultLongitude = Number(persistedLocation[0]) || 0;
  const defaultLatitude = Number(persistedLocation[1]) || 0;

  const [draftRadius, setDraftRadius] = useState(null);
  const [draftLatitude, setDraftLatitude] = useState(null);
  const [draftLongitude, setDraftLongitude] = useState(null);

  const radius = draftRadius ?? defaultRadius;
  const latitude = draftLatitude ?? defaultLatitude;
  const longitude = draftLongitude ?? defaultLongitude;

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const handleFetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const [lng, lat] = await getCurrentCoordinates();
      setDraftLatitude(lat);
      setDraftLongitude(lng);
      dispatch(
        addNotification({
          type: "success",
          message: "Current coordinates fetched successfully! Please click 'Update Geofencing Settings' to save.",
        })
      );
    } catch (error) {
      dispatch(
        addNotification({
          type: "error",
          message: error?.message || "Failed to fetch current location.",
        })
      );
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        attendanceRadius: radius,
        coordinates: [longitude, latitude],
      }).unwrap();
      dispatch(
        addNotification({
          type: "success",
          message: "Location settings updated successfully.",
        })
      );
    } catch (error) {
      if (!error?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: error?.message || "Failed to update location settings.",
          })
        );
      }
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="light-glow-card-static rounded-[1.75rem] p-6 text-left">
      <div className="flex items-center gap-3">
        <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <MapPin size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            Workspace Geofencing
          </h3>
          <p className="brand-copy-sm mt-1">Configure the organization&apos;s physical boundaries.</p>
        </div>
      </div>



      <div className="mt-6 space-y-5">
        <div>
          <label className="brand-kicker mb-1.5 ml-1 block">Attendance Radius (meters)</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => {
              const val = e.target.value.replace(/^0+(?=\d)/, "");
              setDraftRadius(val === "" ? "" : Number(val));
            }}
            className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
            min="5"
            max="1000"
          />
          <p className="mt-2 text-xs font-medium text-slate-500">Range: 5 to 1000 meters.</p>
        </div>

        <div className="rounded-[1.5rem] bg-slate-50/50 p-4 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
            <span className="brand-kicker">Geofencing Coordinates</span>
            <div className="flex items-center gap-2">
              {(draftLatitude !== null || draftLongitude !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftLatitude(null);
                    setDraftLongitude(null);
                    setFeedback({ type: "", message: "" });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
                >
                  <RotateCcw size={12} />
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={handleFetchCurrentLocation}
                disabled={isFetchingLocation}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 transition-all hover:border-blue-300 hover:text-blue-600 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                {isFetchingLocation ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <MapPin size={12} />
                )}
                {isFetchingLocation ? "Detecting..." : "Detect Location"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="brand-kicker mb-1.5 ml-1 block">Latitude</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setDraftLatitude(Number(e.target.value))}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="brand-kicker mb-1.5 ml-1 block">Longitude</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setDraftLongitude(Number(e.target.value))}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            {latitude && longitude ? (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all hover:underline"
              >
                <Globe size={13} />
                Verify on Google Maps
              </a>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">No coordinates configured</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isUpdating}
          className="brand-btn brand-btn-primary brand-btn-md w-full justify-center"
        >
          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Update Geofencing Settings
        </button>
      </div>
    </div>
  );
}

function TimeSettings() {
  const dispatch = useDispatch();
  const { data: settingsData, isLoading: loadingSettings } = useGetOrgAttendanceSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrgAttendanceSettingsMutation();

  const persistedSettings = settingsData?.settings;
  const defaultStartTime = persistedSettings?.attendanceStartTime || "09:00";
  const defaultEndTime = persistedSettings?.attendanceEndTime || "18:00";
  const defaultGraceMinutes = Number(persistedSettings?.lateGraceMinutes) || 0;

  const [draftStartTime, setDraftStartTime] = useState(null);
  const [draftEndTime, setDraftEndTime] = useState(null);
  const [draftGraceMinutes, setDraftGraceMinutes] = useState(null);

  const startTime = draftStartTime ?? defaultStartTime;
  const endTime = draftEndTime ?? defaultEndTime;
  const graceMinutes = draftGraceMinutes ?? defaultGraceMinutes;

  const hasChanges = draftStartTime !== null || draftEndTime !== null || draftGraceMinutes !== null;

  const handleUndo = () => {
    setDraftStartTime(null);
    setDraftEndTime(null);
    setDraftGraceMinutes(null);
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        attendanceStartTime: startTime,
        attendanceEndTime: endTime,
        lateGraceMinutes: graceMinutes,
      }).unwrap();
      dispatch(
        addNotification({
          type: "success",
          message: "Time settings updated successfully.",
        })
      );
      setDraftStartTime(null);
      setDraftEndTime(null);
      setDraftGraceMinutes(null);
    } catch (error) {
      if (!error?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: error?.message || "Failed to update time settings.",
          })
        );
      }
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="light-glow-card-static rounded-[1.75rem] p-6 text-left">
      <div className="flex items-center gap-3">
        <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Clock size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            Workspace Time Settings
          </h3>
          <p className="brand-copy-sm mt-1">Configure standard working hours and late grace period.</p>
        </div>
      </div>



      <div className="mt-6 space-y-5">
        <div className="rounded-[1.5rem] bg-slate-50/50 p-4 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
            <span className="brand-kicker">Shift Timing</span>
            {hasChanges && (
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
              >
                <RotateCcw size={12} />
                Undo
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="brand-kicker mb-1.5 ml-1 block">Start Time (HH:MM)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setDraftStartTime(e.target.value)}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="brand-kicker mb-1.5 ml-1 block">End Time (HH:MM)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setDraftEndTime(e.target.value)}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="brand-kicker mb-1.5 ml-1 block">Late Grace Period (Minutes)</label>
          <input
            type="number"
            value={graceMinutes}
            onChange={(e) => setDraftGraceMinutes(Number(e.target.value))}
            className="w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50"
            min="0"
            max="180"
          />
          <p className="mt-2 text-xs font-medium text-slate-500">Allowable delay before a late mark is issued (0 to 180 mins).</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          className="brand-btn brand-btn-primary brand-btn-md w-full justify-center"
        >
          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Update Time Settings
        </button>
      </div>
    </div>
  );
}

function OrgLogoSettings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [updateOrgLogo, { isLoading }] = useUpdateOrgLogoMutation();
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef(null);

  const currentLogoUrl = user?.organization?.logoUrl || "";
  const previewLogoUrl = logoDataUrl || (removeLogo ? "" : currentLogoUrl);
  const hasPendingChange = Boolean(logoDataUrl) || removeLogo;

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_DIM = 512;
        
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to read the selected image."));
    });

  const onLogoSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setLogoError("Upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    try {
      const nextDataUrl = await compressImage(file);
      setLogoDataUrl(nextDataUrl);
      setRemoveLogo(false);
      setLogoError("");
    } catch (error) {
      setLogoError(error.message || "Failed to prepare the selected image.");
    }
  };

  const toggleLogoRemoval = () => {
    setLogoError("");
    if (removeLogo) {
      setRemoveLogo(false);
      return;
    }
    if (logoDataUrl) {
      setLogoDataUrl("");
      return;
    }
    if (currentLogoUrl) {
      setRemoveLogo(true);
    }
  };

  const handleSave = async () => {
    setLogoError("");
    try {
      const payload = {};
      if (logoDataUrl) {
        payload.logoDataUrl = logoDataUrl;
      } else if (removeLogo) {
        payload.removeLogo = true;
      }

      const response = await updateOrgLogo(payload).unwrap();
      const updatedLogoUrl = response?.data?.logoUrl || null;

      if (user) {
        const updatedUser = {
          ...user,
          organization: {
            ...(user.organization || {}),
            logoUrl: updatedLogoUrl,
          },
        };
        dispatch(setCurrentUser(updatedUser));
      }

      setLogoDataUrl("");
      setRemoveLogo(false);
      
      dispatch(
        addNotification({
          type: "success",
          message: response?.message || "Organization logo updated successfully.",
        })
      );
    } catch (error) {
      if (error?.data?.message) {
        setLogoError(error.data.message);
      } else {
        setLogoError(error?.message || "Failed to update organization logo.");
      }
    }
  };

  return (
    <div className="light-glow-card-static rounded-[1.75rem] p-6 text-left">
      <div className="flex items-center gap-3">
        <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <ImageUp size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            Organization Logo
          </h3>
          <p className="brand-copy-sm mt-1">Upload a logo to appear in the dashboard navigation.</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="brand-panel-soft rounded-[1.5rem] p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-slate-100 dark:bg-slate-800 shadow-inner">
            {previewLogoUrl ? (
              <img src={previewLogoUrl} alt="Org Logo Preview" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onLogoSelected}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="brand-btn brand-btn-secondary brand-btn-sm"
              >
                <ImageUp size={14} />
                {previewLogoUrl ? "Change Logo" : "Upload Logo"}
              </button>

              {(removeLogo || logoDataUrl || currentLogoUrl) ? (
                <button
                  type="button"
                  onClick={toggleLogoRemoval}
                  className="brand-btn brand-btn-secondary brand-btn-sm"
                >
                  <Trash2 size={14} />
                  {removeLogo ? "Keep Current Logo" : logoDataUrl ? "Clear Selection" : "Remove Logo"}
                </button>
              ) : null}
            </div>

            {logoError && (
              <p className="mt-2 text-xs font-semibold text-rose-500">{logoError}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !hasPendingChange}
          className="brand-btn brand-btn-primary brand-btn-md w-full justify-center"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Logo Update
        </button>
      </div>
    </div>
  );
}

function OrgDetailsSettings() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const organization = user?.organization;
  const [updateOrgDetails, { isLoading: isUpdating }] = useUpdateOrgDetailsMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(1, "Organization Name is required"),
        email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
        mobileCountryCode: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        country: z.string().trim().optional(),
      })
    ),
    defaultValues: {
      name: organization?.name || "",
      email: organization?.email || "",
      mobileCountryCode: organization?.phoneCountryCode || "",
      phone: organization?.phone || "",
      address: organization?.address || "",
      city: organization?.city || "",
      state: organization?.state || "",
      country: organization?.country || "India",
    },
  });

  const formValues = watch();

  const onSubmit = async (values) => {
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        phoneCountryCode: values.mobileCountryCode,
        address: values.address,
        city: values.city,
        state: values.state,
        country: values.country,
      };

      const result = await updateOrgDetails(payload).unwrap();
      
      const updatedUser = {
        ...user,
        organization: {
          ...user.organization,
          ...result.data,
        }
      };
      dispatch(setCurrentUser(updatedUser));
      reset(values);
      
      dispatch(
        addNotification({
          type: "success",
          message: "Organization details updated successfully.",
        })
      );
    } catch (error) {
      if (!error?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: error?.message || "Failed to update organization details.",
          })
        );
      }
    }
  };

  return (
    <div className="light-glow-card-static rounded-[1.75rem] p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Organization Details</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="org-name" className={labelClassName}>Organization Name</label>
            <input id="org-name" type="text" aria-invalid={errors.name ? "true" : "false"} className={cn(inputClassName, errors.name ? errorInputClassName : "")} {...register("name")} />
            {errors.name && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="org-email" className={labelClassName}>Organization Email</label>
            <input id="org-email" type="email" aria-invalid={errors.email ? "true" : "false"} className={cn(inputClassName, errors.email ? errorInputClassName : "")} {...register("email")} />
            {errors.email && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.email.message}</p>}
          </div>
          <div>
            <CountryPhoneField
              label="Contact Number"
              countryCode={formValues.mobileCountryCode || ""}
              phone={formValues.phone || ""}
              onCountryCodeChange={(e) => setValue("mobileCountryCode", e.target.value, { shouldValidate: true, shouldDirty: true })}
              onPhoneChange={(e) => setValue("phone", e.target.value.replace(/[^\d]/g, ""), { shouldValidate: true, shouldDirty: true })}
              countryCodeError={errors.mobileCountryCode?.message}
              phoneError={errors.phone?.message}
              helpText=""
              labelClassName={labelClassName}
            />
            <input type="hidden" {...register("mobileCountryCode")} />
            <input type="hidden" {...register("phone")} />
          </div>
          <div>
            <label htmlFor="org-country" className={labelClassName}>Country</label>
            <input id="org-country" type="text" aria-invalid={errors.country ? "true" : "false"} className={cn(inputClassName, errors.country ? errorInputClassName : "")} {...register("country")} />
            {errors.country && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.country.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="org-address" className={labelClassName}>Street Address</label>
            <input id="org-address" type="text" aria-invalid={errors.address ? "true" : "false"} className={cn(inputClassName, errors.address ? errorInputClassName : "")} {...register("address")} />
            {errors.address && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.address.message}</p>}
          </div>
          <div>
            <label htmlFor="org-city" className={labelClassName}>City</label>
            <input id="org-city" type="text" aria-invalid={errors.city ? "true" : "false"} className={cn(inputClassName, errors.city ? errorInputClassName : "")} {...register("city")} />
            {errors.city && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.city.message}</p>}
          </div>
          <div>
            <label htmlFor="org-state" className={labelClassName}>State / Province</label>
            <input id="org-state" type="text" aria-invalid={errors.state ? "true" : "false"} className={cn(inputClassName, errors.state ? errorInputClassName : "")} {...register("state")} />
            {errors.state && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.state.message}</p>}
          </div>
        </div>
        
        {isDirty && (
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => reset()} disabled={isUpdating} className="brand-btn brand-btn-secondary brand-btn-md flex-1 sm:flex-none justify-center px-6">
                Cancel
              </button>
              <button type="submit" disabled={isUpdating} className="brand-btn brand-btn-primary brand-btn-md flex-1 sm:flex-none justify-center px-6">
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();
  const [forgotPassword, { isLoading: sendingResetLink }] = useForgotPasswordMutation();
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const profileImageInputRef = useRef(null);
  const currentRole = user?.currentRole;
  const effectiveRole = currentRole || user?.role || ROLES.MEMBER;
  const roleLabel = formatRoleLabel(effectiveRole);
  const isSuperAdmin = effectiveRole === ROLES.SUPER_ADMIN;
  const organizationId = getUserOrganizationId(user);
  const permissionsCount = resolveUserPermissions(user).length;
  const workspaceCode = user?.organizationCode || user?.organization?.organizationCode || null;
  const referralCode = user?.organization?.referralCode || null;
  const workspaceCity = user?.city || user?.organization?.city || null;
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  const referralLinkUrl = typeof window !== "undefined" && referralCode ? `${window.location.origin}/register/user?ref=${referralCode}` : "";
  const canManageLocationSettings =
    !isSuperAdmin &&
    Boolean(organizationId) &&
    hasPermission(user, PERMISSIONS.LOCATION.MANAGE);
  const canManageOrgSettings = effectiveRole === ROLES.ORG_ADMIN || effectiveRole === ROLES.SUB_ADMIN;
  const canSkipEmergencyContact = hasPermission(user, PERMISSIONS.USERS.CREATE) || isSuperAdmin;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(getSettingsSchema(canSkipEmergencyContact)),
    mode: "onChange",
    defaultValues: getFormDefaults(user),
  });

  useEffect(() => {
    reset(getFormDefaults(user));
  }, [user, reset]);

  const formValues = useWatch({ control });
  const previewName = formValues.name || user?.name || "Workspace User";
  const previewEmail = formValues.email || user?.email || "-";
  const previewMobile =
    formValues.mobile || user?.mobile
      ? `${formValues.mobileCountryCode || user?.mobileCountryCode || ""}${formValues.mobile || getLocalPhoneNumber(user?.mobile, user?.mobileCountryCode)}`
      : "-";
  const currentProfileImageUrl = user?.profileImageUrl || "";
  const previewProfileImageUrl =
    profileImageDataUrl || (removeProfileImage ? "" : currentProfileImageUrl);
  const hasPendingProfileImageChange = Boolean(profileImageDataUrl) || removeProfileImage;
  const canSubmit = isDirty || hasPendingProfileImageChange;

  const completionState = useMemo(() => {
    if (!user) return { percentage: 0, missing: [] };
    
    const fields = [
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "mobile", label: "Mobile Number" },
      ...(!canSkipEmergencyContact
        ? [{ key: "emergencyContact", label: "Emergency Contact" }]
        : []),
      { key: "currentAddress", label: "Current Address" },
      { key: "permanentAddress", label: "Permanent Address" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "profileImageUrl", label: "Profile Image" },
    ];
    
    let filled = 0;
    const missing = [];
    
    for (const field of fields) {
      if (user[field.key]) {
        filled++;
      } else {
        missing.push(field.label);
      }
    }
    
    return {
      percentage: Math.round((filled / fields.length) * 100),
      missing,
    };
  }, [user, effectiveRole, isSuperAdmin, canSkipEmergencyContact]);

  const detailCards = useMemo(
    () => [
      { icon: User, label: "Full Name", value: formatValue(previewName) },
      { icon: Mail, label: "Email", value: formatValue(previewEmail) },
      { icon: Smartphone, label: "Mobile", value: formatValue(previewMobile) },
      { icon: ShieldCheck, label: "Role", value: roleLabel },
      {
        icon: isSuperAdmin ? Globe : Building2,
        label: isSuperAdmin ? "Access Scope" : "Organization Code",
        value: isSuperAdmin ? "Platform-wide" : formatValue(workspaceCode),
      },
      ...(!isSuperAdmin && referralCode
        ? [{ icon: Link2, label: "My Referral Code", value: referralCode }]
        : []),
      { icon: Users, label: "Permissions", value: `${permissionsCount} Enabled` },
    ],
    [isSuperAdmin, permissionsCount, previewEmail, previewMobile, previewName, referralCode, roleLabel, workspaceCode]
  );

  const resetForm = () => {
    reset(getFormDefaults(user));
    setProfileImageDataUrl("");
    setRemoveProfileImage(false);
    setProfileImageError("");
  };

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_DIM = 1200;
        
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to read the selected image."));
    });

  const onProfileImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfileImageError("Upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    try {
      const nextDataUrl = await compressImage(file);
      
      if (nextDataUrl.length > 5 * 1024 * 1024) {
        setProfileImageError("Image is too large even after compression. Please choose a smaller image.");
        return;
      }

      setProfileImageDataUrl(nextDataUrl);
      setRemoveProfileImage(false);
      setProfileImageError("");
    } catch (error) {
      setProfileImageError(error.message || "Failed to prepare the selected image.");
    }
  };

  const toggleProfileImageRemoval = () => {
    setProfileImageError("");

    if (removeProfileImage) {
      setRemoveProfileImage(false);
      return;
    }

    if (profileImageDataUrl) {
      setProfileImageDataUrl("");
      return;
    }

    if (currentProfileImageUrl) {
      setRemoveProfileImage(true);
    }
  };

  const onSubmit = async (values) => {
    setProfileImageError("");

    const nextMobile = values.mobile.trim();
    const nextMobileCountryCode = values.mobileCountryCode.trim();
    const payload = {
      name: normalizeTextInput(values.name),
      email: normalizeEmailInput(values.email),
    };

    if (nextMobile || user?.mobile) {
      payload.mobile = toDigitsOnly(nextMobile) || user?.mobile || "";
      payload.mobileCountryCode = nextMobileCountryCode || user?.mobileCountryCode || "";
    }

    payload.emergencyContact = values.emergencyContact;
    payload.currentAddress = values.currentAddress;
    payload.permanentAddress = values.permanentAddress;
    payload.bloodGroup = values.bloodGroup;

    if (profileImageDataUrl) {
      payload.profileImageDataUrl = profileImageDataUrl;
    } else if (removeProfileImage) {
      payload.removeProfileImage = true;
    }

    try {
      const result = await updateMe(payload).unwrap();
      dispatch(setCurrentUser(result.user));
      reset(getFormDefaults(result.user));
      setProfileImageDataUrl("");
      setRemoveProfileImage(false);
      setProfileImageError("");
      dispatch(
        addNotification({
          type: "success",
          message: result?.message || "Profile updated successfully.",
        })
      );
    } catch (error) {
      setProfileImageError("");
      if (!error?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: error?.message || "Failed to update profile.",
          })
        );
      }
    }
  };

  const sendResetPasswordLink = async () => {
    const organizationId = getUserOrganizationId(user);
    const organizationCode = user?.organizationCode || user?.organization?.organizationCode || "";
    if (!user?.email || !effectiveRole) {
      dispatch(
        addNotification({
          type: "error",
          message: "Unable to prepare password reset request for this account.",
        })
      );
      return;
    }

    if (!isSuperAdmin && !organizationId && !organizationCode) {
      dispatch(
        addNotification({
          type: "error",
          message: "Organization details are missing for this account.",
        })
      );
      return;
    }

    try {
      const payload = {
        email: user.email,
        loginAs: effectiveRole,
      };

      if (!isSuperAdmin) {
        if (organizationId) payload.organizationId = organizationId;
        if (organizationCode) payload.organizationCode = organizationCode;
      }

      const result = await forgotPassword(payload).unwrap();
      dispatch(
        addNotification({
          type: "success",
          message:
            result?.message || "If this account exists, we have sent a reset link to the registered email address.",
        })
      );
    } catch (error) {
      if (!error?.status) {
        dispatch(
          addNotification({
            type: "error",
            message: error?.message || "Failed to send reset password email.",
          })
        );
      }
    }
  };

  return (
    <section className="pb-32 max-w-5xl mx-auto space-y-6">
      {/* Header Profile Summary */}
      <div className="light-glow-card-static rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex items-center justify-center shrink-0 h-20 w-20">
              <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800/50" />
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round" strokeDasharray="289.02" strokeDashoffset={289.02 - (completionState.percentage / 100) * 289.02} className={cn("transition-all duration-1000 ease-out", completionState.percentage === 100 ? "text-blue-500" : "text-orange-500")} />
              </svg>
              <div className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white dark:bg-slate-950">
                <UserAvatar src={previewProfileImageUrl} name={previewName} className="h-16 w-16 !rounded-full text-2xl" sizes="64px" />
              </div>
              {completionState.percentage === 100 ? (
                <div className="absolute -bottom-1 -right-1 z-20 flex items-center justify-center rounded-full bg-white dark:bg-slate-950 p-[2px]">
                  <BadgeCheck className="h-6 w-6 text-white fill-blue-500" />
                </div>
              ) : (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-full border-[3px] border-white bg-orange-500 px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-sm dark:border-slate-950">
                  {completionState.percentage}%
                </div>
              )}
            </div>
            <div className="mt-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{previewName}</h2>
              <p className="brand-copy-sm mt-1 flex items-center gap-2">
                {previewEmail} &bull; {roleLabel}
              </p>
              {completionState.missing.length > 0 && (
                <p className="mt-2 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                  Missing: {completionState.missing.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-px dark:border-slate-800 no-scrollbar">
        {[
          { id: "personal", label: "Personal Info", icon: User },
          { id: "security", label: "Security & Workspace", icon: ShieldCheck },
          ...(canManageLocationSettings || canManageOrgSettings ? [{ id: "organization", label: "Organization Settings", icon: Building2 }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-all",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon size={16} className={cn(activeTab === tab.id ? "text-blue-500 dark:text-blue-400" : "text-slate-400")} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative">
        {activeTab === "personal" && (
          <div className="grid gap-6">
            {/* Profile Photo Card */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Photo</h3>
              <p className="brand-copy-sm mt-1 mb-6">Upload a clear square image to personalize your workspace profile.</p>
              
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <UserAvatar src={previewProfileImageUrl} name={previewName} className="h-24 w-24 rounded-[2rem] text-3xl shadow-sm" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <input ref={profileImageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onProfileImageSelected} />
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => profileImageInputRef.current?.click()} className="brand-btn brand-btn-secondary brand-btn-md">
                      <ImageUp size={16} /> {previewProfileImageUrl ? "Change Photo" : "Upload Photo"}
                    </button>
                    {(removeProfileImage || profileImageDataUrl || currentProfileImageUrl) ? (
                      <button type="button" onClick={toggleProfileImageRemoval} className="brand-btn brand-btn-secondary brand-btn-md">
                        <Trash2 size={16} /> {removeProfileImage ? "Keep Current Photo" : profileImageDataUrl ? "Clear Selection" : "Remove Photo"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {removeProfileImage ? "Your current profile photo will be removed when you save." : profileImageDataUrl ? "New profile photo is ready. Save changes to publish it." : "Supported formats: JPG, PNG, WEBP, GIF. Max: 10 MB."}
                  </p>
                  {profileImageError && <p className="mt-2 text-xs font-semibold text-rose-500">{profileImageError}</p>}
                </div>
              </div>
            </div>

            {/* Basic Details Card */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Basic Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="settings-name" className={labelClassName}>Full Name</label>
                  <input id="settings-name" type="text" placeholder="Your full name" aria-invalid={errors.name ? "true" : "false"} className={cn(inputClassName, errors.name ? errorInputClassName : "")} {...register("name")} />
                  {errors.name && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="settings-bloodGroup" className={labelClassName}>Blood Group</label>
                  <select id="settings-bloodGroup" aria-invalid={errors.bloodGroup ? "true" : "false"} className={cn(inputClassName, errors.bloodGroup ? errorInputClassName : "")} {...register("bloodGroup")}>
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                  {errors.bloodGroup && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.bloodGroup.message}</p>}
                </div>
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Contact Information</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="settings-email" className={labelClassName}>Email Address</label>
                  <input id="settings-email" type="email" placeholder="name@company.com" aria-invalid={errors.email ? "true" : "false"} className={cn(inputClassName, errors.email ? errorInputClassName : "")} {...register("email")} />
                  {errors.email && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.email.message}</p>}
                </div>
                <div>
                  <CountryPhoneField
                    label="Mobile Number"
                    countryCode={formValues.mobileCountryCode || ""}
                    phone={formValues.mobile || ""}
                    onCountryCodeChange={(e) => setValue("mobileCountryCode", e.target.value, { shouldValidate: true, shouldDirty: true })}
                    onPhoneChange={(e) => setValue("mobile", e.target.value.replace(/[^\d]/g, ""), { shouldValidate: true, shouldDirty: true })}
                    countryCodeError={errors.mobileCountryCode?.message}
                    phoneError={errors.mobile?.message}
                    helpText=""
                    labelClassName={labelClassName}
                  />
                  <input type="hidden" {...register("mobileCountryCode")} />
                  <input type="hidden" {...register("mobile")} />
                </div>
                {!canSkipEmergencyContact && (
                  <div className="md:col-span-2">
                    <label htmlFor="settings-emergencyContact" className={labelClassName}>Emergency Contact</label>
                    <input id="settings-emergencyContact" type="text" placeholder="E.g., +91 9876543210" aria-invalid={errors.emergencyContact ? "true" : "false"} className={cn(inputClassName, errors.emergencyContact ? errorInputClassName : "")} {...register("emergencyContact")} />
                    {errors.emergencyContact && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.emergencyContact.message}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Address Details Card */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Address Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="settings-currentAddress" className={labelClassName}>Current Address</label>
                  <input id="settings-currentAddress" type="text" placeholder="Enter your current address" aria-invalid={errors.currentAddress ? "true" : "false"} className={cn(inputClassName, errors.currentAddress ? errorInputClassName : "")} {...register("currentAddress")} />
                  {errors.currentAddress && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.currentAddress.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="settings-permanentAddress" className={labelClassName}>Permanent Address</label>
                  <input id="settings-permanentAddress" type="text" placeholder="Enter your permanent address" aria-invalid={errors.permanentAddress ? "true" : "false"} className={cn(inputClassName, errors.permanentAddress ? errorInputClassName : "")} {...register("permanentAddress")} />
                  {errors.permanentAddress && <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">{errors.permanentAddress.message}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Security Section */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6 h-full flex flex-col">
              <div className="flex items-start gap-3">
                <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                  <LockKeyhole size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Security</p>
                  <p className="brand-copy-sm mt-1">Your account is protected by role-based access and secure sessions.</p>
                </div>
              </div>
              <div className="mt-8 space-y-4 flex-1 flex flex-col justify-end">
                <button type="button" onClick={sendResetPasswordLink} disabled={sendingResetLink} className="brand-btn brand-btn-secondary brand-btn-md w-full">
                  {sendingResetLink ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                  Send Reset Password Link
                </button>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                  A secure reset link will be sent to {previewEmail}.
                </p>
              </div>
            </div>

            {/* Workspace details read-only card */}
            <div className="light-glow-card-static rounded-[1.75rem] p-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white mb-2">Workspace Context</h3>
                <p className="brand-copy-sm mb-5">Role and workspace scope are managed by the platform or organization admin.</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Role</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{roleLabel}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Workspace</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{isSuperAdmin ? "Platform-wide" : formatValue(workspaceCode, "Not available")}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Location</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatValue(workspaceCity, "Not set")}</span>
                  </div>
                  {!isSuperAdmin && referralCode && (
                    <div className="flex justify-between items-center p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Referral Code</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{referralCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(referralCode);
                            setCopiedReferral(true);
                            setTimeout(() => setCopiedReferral(false), 2000);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="Copy Code"
                        >
                          {copiedReferral ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Link */}
            {!isSuperAdmin && referralCode && (
              <div className="light-glow-card-static rounded-[1.75rem] p-6 lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Referral Link</h3>
                  <p className="text-sm text-slate-500 mt-1 truncate max-w-sm">{referralLinkUrl || referralCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const joinLink = `${window.location.origin}/register/user?ref=${referralCode}`;
                    navigator.clipboard.writeText(joinLink);
                    setCopiedReferral(true);
                    setTimeout(() => setCopiedReferral(false), 2000);
                  }}
                  className="brand-btn brand-btn-secondary brand-btn-md shrink-0 w-full sm:w-auto"
                >
                  {copiedReferral ? <Check size={16} /> : <Copy size={16} />} {copiedReferral ? "Copied!" : "Copy Link"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sticky Save Bar */}
        {(activeTab === "personal" || activeTab === "contact") && (
          <div
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_18px_40px_rgba(30,112,209,0.15)] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-6 transition-all duration-500",
              canSubmit ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
            )}
          >
            <div className="hidden sm:block min-w-[200px]">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Unsaved Changes</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Please save your profile updates.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button type="button" onClick={resetForm} disabled={isSaving} className="brand-btn brand-btn-secondary brand-btn-md flex-1 sm:flex-none justify-center px-6">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="brand-btn brand-btn-primary brand-btn-md flex-1 sm:flex-none justify-center px-6">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Organization Settings */}
      {activeTab === "organization" && (canManageLocationSettings || canManageOrgSettings) && (
        <div className="space-y-6">
          {canManageOrgSettings && (
            <>
              <OrgDetailsSettings />
              <OrgLogoSettings />
            </>
          )}
          {canManageLocationSettings && (
            <>
              <LocationSettings />
              <TimeSettings />
            </>
          )}
        </div>
      )}
    </section>
  );
}
