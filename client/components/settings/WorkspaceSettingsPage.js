"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
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

const settingsSchema = z.object({
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
  emergencyContact: z.string().trim().min(1, "Emergency mobile is required"),
  currentAddress: z.string().trim().min(1, "Full address is required"),
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
            onChange={(e) => setDraftRadius(Number(e.target.value))}
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

  const referralLinkUrl = typeof window !== "undefined" && referralCode ? `${window.location.origin}/register/user?ref=${referralCode}` : "";
  const canManageLocationSettings =
    !isSuperAdmin &&
    Boolean(organizationId) &&
    hasPermission(user, PERMISSIONS.LOCATION_SET);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(settingsSchema),
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
      { key: "emergencyContact", label: "Emergency Contact" },
      { key: "currentAddress", label: "Current Address" },
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
  }, [user]);

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

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read the selected image."));
      reader.readAsDataURL(file);
    });

  const onProfileImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfileImageError("Upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileImageError("Profile image must be 2 MB or smaller.");
      return;
    }

    try {
      const nextDataUrl = await readFileAsDataUrl(file);
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
    <section className="space-y-6 pb-24">
      <div className="light-glow-card-static rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex items-center justify-center shrink-0 h-20 w-20">
              <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800/50"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray="289.02"
                  strokeDashoffset={289.02 - (completionState.percentage / 100) * 289.02}
                  className="text-orange-500 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white dark:bg-slate-950">
                <UserAvatar
                  src={previewProfileImageUrl}
                  name={previewName}
                  className="h-16 w-16 !rounded-full text-2xl"
                  sizes="64px"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-white dark:border-slate-950 bg-orange-500 px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-sm z-20">
                {completionState.percentage}%
              </div>
            </div>
            <div className="mt-1">
              <p className="brand-kicker">Account Settings</p>
              <h2 className="brand-section-title mt-1.5">{previewName}</h2>
              <p className="brand-copy-sm mt-1.5">
                Edit your profile details and keep your workspace preferences in sync.
              </p>
              {completionState.missing.length > 0 && (
                <p className="mt-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Missing fields: {completionState.missing.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="brand-chip self-start">
            {roleLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {detailCards.map((item) => (
          <DetailCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="light-glow-card-static rounded-[1.75rem] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="brand-kicker flex items-center gap-2">
                Editable Profile
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black tracking-widest uppercase", canSubmit ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400")}>
                  {canSubmit ? "Unsaved Changes" : "Up to Date"}
                </span>
              </h3>
              <p className="brand-copy-sm mt-2">
                Update your personal details here. Changes appear across the dashboard right away.
              </p>
            </div>
          </div>



          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="brand-panel-soft rounded-[1.5rem] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <UserAvatar
                  src={previewProfileImageUrl}
                  name={previewName}
                  className="h-24 w-24 rounded-[2rem] text-3xl"
                  sizes="96px"
                />

                <div className="min-w-0 flex-1">
                  <p className="brand-kicker">Profile Photo</p>
                  <p className="brand-copy-sm mt-2">
                    Upload a clear square image to personalize your workspace profile.
                  </p>

                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onProfileImageSelected}
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="brand-btn brand-btn-secondary brand-btn-md"
                    >
                      <ImageUp size={16} />
                      {previewProfileImageUrl ? "Change Photo" : "Upload Photo"}
                    </button>

                    {removeProfileImage || profileImageDataUrl || currentProfileImageUrl ? (
                      <button
                        type="button"
                        onClick={toggleProfileImageRemoval}
                        className="brand-btn brand-btn-secondary brand-btn-md"
                      >
                        <Trash2 size={16} />
                        {removeProfileImage
                          ? "Keep Current Photo"
                          : profileImageDataUrl
                            ? "Clear Selection"
                            : "Remove Photo"}
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-300">
                    {removeProfileImage
                      ? "Your current profile photo will be removed when you save."
                      : profileImageDataUrl
                        ? "New profile photo is ready. Save changes to publish it."
                        : previewProfileImageUrl
                          ? "This profile photo appears anywhere your account avatar is shown."
                          : "Supported formats: JPG, PNG, WEBP, GIF. Maximum size: 10 MB."}
                  </p>

                  {profileImageError ? (
                    <p className="mt-2 text-xs font-semibold text-rose-500">
                      {profileImageError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="settings-name" className={labelClassName}>
                  Full Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  placeholder="Your full name"
                  aria-invalid={errors.name ? "true" : "false"}
                  className={cn(inputClassName, errors.name ? errorInputClassName : "")}
                  {...register("name")}
                />
                {errors.name ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="settings-email" className={labelClassName}>
                  Email Address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  placeholder="name@company.com"
                  aria-invalid={errors.email ? "true" : "false"}
                  className={cn(inputClassName, errors.email ? errorInputClassName : "")}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <CountryPhoneField
                label="Mobile Number"
                countryCode={formValues.mobileCountryCode || ""}
                phone={formValues.mobile || ""}
                onCountryCodeChange={(event) =>
                  setValue("mobileCountryCode", event.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                onPhoneChange={(event) =>
                  setValue("mobile", event.target.value.replace(/[^\d]/g, ""), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                countryCodeError={errors.mobileCountryCode?.message}
                phoneError={errors.mobile?.message}
                helpText="Select the country code, then enter your mobile number."
                containerClassName="md:col-span-2"
                labelClassName={labelClassName}
              />
              <input type="hidden" {...register("mobileCountryCode")} />
              <input type="hidden" {...register("mobile")} />

              <div className="md:col-span-1">
                <label htmlFor="settings-emergencyContact" className={labelClassName}>
                  Emergency Contact
                </label>
                <input
                  id="settings-emergencyContact"
                  type="text"
                  placeholder="E.g., +91 9876543210"
                  aria-invalid={errors.emergencyContact ? "true" : "false"}
                  className={cn(inputClassName, errors.emergencyContact ? errorInputClassName : "")}
                  {...register("emergencyContact")}
                />
                {errors.emergencyContact ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.emergencyContact.message}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-1">
                <label htmlFor="settings-currentAddress" className={labelClassName}>
                  Full Address
                </label>
                <input
                  id="settings-currentAddress"
                  type="text"
                  placeholder="Enter your full address"
                  aria-invalid={errors.currentAddress ? "true" : "false"}
                  className={cn(inputClassName, errors.currentAddress ? errorInputClassName : "")}
                  {...register("currentAddress")}
                />
                {errors.currentAddress ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.currentAddress.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="brand-panel-soft grid gap-4 rounded-[1.5rem] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="brand-kicker">Role</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {roleLabel}
                  </p>
                </div>
                <div>
                  <p className="brand-kicker">Workspace Code</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {isSuperAdmin ? "Platform-wide" : formatValue(workspaceCode, "Not available")}
                  </p>
                </div>
              </div>
              {!isSuperAdmin && referralCode ? (
                <div className="brand-panel-soft rounded-[1.25rem] p-4">
                  <p className="brand-kicker">My Referral Link</p>
                  <div className="mt-2 flex flex-col gap-3">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400" suppressHydrationWarning>
                      {referralLinkUrl ? (
                        <a href={referralLinkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {referralLinkUrl}
                        </a>
                      ) : (
                        referralCode
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const joinLink = `${window.location.origin}/register/user?ref=${referralCode}`;
                          navigator.clipboard.writeText(joinLink);
                          setCopiedReferral(true);
                          setTimeout(() => setCopiedReferral(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 transition-all hover:border-blue-300 hover:text-blue-600 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                      >
                        {copiedReferral ? <Check size={12} /> : <Copy size={12} />}
                        {copiedReferral ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Share this link so new members can request to join your organization.
                  </p>
                </div>
              ) : null}
              <p className="brand-copy-sm text-xs">
                Role and workspace scope are managed by the platform or organization admin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving || !canSubmit}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                <RotateCcw size={16} />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !canSubmit}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PreferenceCard
            icon={LockKeyhole}
            title="Security"
            value="Your account is protected by role-based access and secure sessions."
            className="h-full"
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={sendResetPasswordLink}
                disabled={sendingResetLink}
                className="brand-btn brand-btn-secondary brand-btn-md w-full"
              >
                {sendingResetLink ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                Send Reset Password Link
              </button>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                A secure reset link will be sent to {previewEmail}. Use it to set a new password.
              </p>

            </div>
          </PreferenceCard>

          <div className="light-glow-card-static rounded-[1.75rem] p-6 h-full">
            <h3 className="brand-kicker">Workspace Details</h3>
            <div className="mt-4 grid gap-4">
              <div className="brand-panel-soft rounded-[1.5rem] p-5">
                <p className="brand-kicker">Location</p>
                <div className="mt-3 flex items-center gap-3">
                  <MapPin size={18} className="text-blue-600 dark:text-blue-300" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatValue(workspaceCity, "Not set")}
                  </p>
                </div>
              </div>

              <div className="brand-panel-soft rounded-[1.5rem] p-5">
                <p className="brand-kicker">Workspace</p>
                <div className="mt-3 flex items-center gap-3">
                  <Globe size={18} className="text-blue-600 dark:text-blue-300" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isSuperAdmin ? "Global Control Panel" : "Organization Workspace"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {canManageLocationSettings && (
            <div className="space-y-4 lg:col-span-2">
              <LocationSettings />
              <TimeSettings />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
